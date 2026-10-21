from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import (
    QueueEntry, ServiceRequest, ServiceCenter, Customer, Vehicle, Prediction,
    ServiceBay, Mechanic, User, AuditLog
)
from app.schemas.schemas import WalkInCreate, QueueStatusUpdate, QueueEntryResponse
from app.api.deps import get_current_user, get_current_manager, get_current_floor_operator
from app.services.queue_service import (
    generate_next_token, update_service_status, recalculate_center_workload, recalculate_queue_predictions,
    reconcile_center_resources, find_best_bay_for_service, find_best_mechanic_for_service
)
from ml.prediction.predictor import predictor
from app.api.websockets import ws_manager

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("/center/{center_id}")
def get_center_queue(
    center_id: int,
    db: Session = Depends(get_db)
):
    reconcile_center_resources(db, center_id)
    entries = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        ServiceRequest.status.notin_(["Completed", "Cancelled"]),
        QueueEntry.status.notin_(["Completed", "Cancelled"])
    ).order_by(QueueEntry.queue_position.asc()).all()

    result = []
    for q in entries:
        sreq = q.service_request
        pred = db.query(Prediction).filter(
            Prediction.service_request_id == sreq.id
        ).order_by(Prediction.id.desc()).first()

        cust = sreq.customer
        veh = sreq.vehicle
        bay = q.assigned_bay
        mech = q.assigned_mechanic

        result.append({
            "id": q.id,
            "service_request_id": sreq.id,
            "token_number": q.token_number,
            "queue_position": q.queue_position,
            "status": sreq.status,
            "queue_status": q.status,
            "joined_at": q.joined_at.isoformat() if q.joined_at else None,
            "customer_name": cust.name if cust else "Walk-in Customer",
            "customer_phone": cust.phone if cust else "N/A",
            "vehicle_registration": veh.registration_number if veh else "N/A",
            "vehicle_type": veh.vehicle_type if veh else "Sedan",
            "vehicle_model": veh.model if veh else "Standard",
            "service_type": sreq.service_type,
            "repair_type": sreq.repair_type,
            "priority": sreq.priority,
            "assigned_bay_id": q.assigned_bay_id,
            "assigned_mechanic_id": q.assigned_mechanic_id,
            "bay_number": bay.bay_number if bay else None,
            "mechanic_name": mech.name if mech else None,
            "estimated_waiting_minutes": pred.waiting_time if pred else 20,
            "estimated_service_minutes": pred.service_duration if pred else 50,
            "expected_completion_time": pred.completion_time if pred else "N/A",
            "prediction_source": pred.prediction_source if pred else "Production ML Model",
            "factors": pred.factors if pred and pred.factors else []
        })
    return result

@router.post("/walk-in")
async def create_walk_in_token(
    w_in: WalkInCreate,
    current_user: User = Depends(get_current_floor_operator),
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == w_in.service_center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    if current_user.role == "technician" and current_user.service_center_id and current_user.service_center_id != w_in.service_center_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Technicians can only issue walk-in tokens for their assigned workshop center."
        )

    # Create temporary or lookup customer
    cust = db.query(Customer).filter(Customer.phone == w_in.customer_phone).first()
    if not cust:
        # Create an associated user account for the walk-in customer
        dummy_user = User(
            name=w_in.customer_name,
            email=w_in.customer_email or f"walkin_{datetime.utcnow().timestamp()}@demo.local",
            phone=w_in.customer_phone,
            password_hash="WALKIN_NOLOGIN",
            role="customer",
            status="active"
        )
        db.add(dummy_user)
        db.commit()
        db.refresh(dummy_user)

        cust = Customer(
            user_id=dummy_user.id,
            name=w_in.customer_name,
            phone=w_in.customer_phone,
            email=dummy_user.email
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

    # Check vehicle
    veh = db.query(Vehicle).filter(
        Vehicle.registration_number == w_in.registration_number.upper().strip()
    ).first()
    if not veh:
        veh = Vehicle(
            customer_id=cust.id,
            registration_number=w_in.registration_number.upper().strip(),
            vehicle_type=w_in.vehicle_type,
            model=w_in.model,
            year=2022,
            fuel_type="Petrol"
        )
        db.add(veh)
        db.commit()
        db.refresh(veh)

    token_str = generate_next_token(db, center.id)
    active_q = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center.id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    # Service Request
    s_req = ServiceRequest(
        customer_id=cust.id,
        vehicle_id=veh.id,
        service_center_id=center.id,
        service_type=w_in.service_type,
        repair_type=w_in.repair_type or "Standard",
        requested_date=datetime.now().strftime("%Y-%m-%d"),
        preferred_time=datetime.now().strftime("%I:%M %p"),
        priority=w_in.priority or "Normal",
        status="Vehicle Received",
        notes=w_in.notes
    )
    db.add(s_req)
    db.commit()
    db.refresh(s_req)

    # Queue Entry
    q_entry = QueueEntry(
        service_request_id=s_req.id,
        token_number=token_str,
        queue_position=active_q + 1,
        status="Waiting"
    )
    db.add(q_entry)

    # Prediction
    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center.id,
        ServiceBay.status == "Available"
    ).count()
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == center.id,
        Mechanic.availability == "Available"
    ).count()

    pred = predictor.predict_service(
        service_type=w_in.service_type,
        vehicle_type=veh.vehicle_type,
        repair_type=w_in.repair_type or "Standard",
        queue_position=q_entry.queue_position,
        queue_length=active_q + 1,
        active_mechanics=center.total_mechanics or 8,
        available_mechanics=avail_mechs,
        total_bays=center.total_bays or 8,
        available_bays=avail_bays,
        current_workload=center.current_workload or 0.5
    )

    prediction = Prediction(
        service_request_id=s_req.id,
        waiting_time=pred['waiting_time_minutes'],
        service_duration=pred['service_duration_minutes'],
        completion_time=pred['expected_completion_time'],
        model_version=pred['model_version'],
        prediction_source=pred['prediction_source'],
        factors=pred['contributing_factors']
    )
    db.add(prediction)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_WALKIN_TOKEN",
        entity="QueueEntry",
        entity_id=token_str,
        details=f"Walk-in token {token_str} created for {w_in.registration_number}"
    )
    db.add(audit)
    db.commit()

    recalculate_center_workload(db, center.id)

    # WebSocket broadcast
    await ws_manager.broadcast({
        "event": "WALK_IN_TOKEN_CREATED",
        "service_center_id": center.id,
        "token_number": token_str,
        "vehicle_registration": veh.registration_number,
        "queue_position": q_entry.queue_position
    })

    return {
        "success": True,
        "id": q_entry.id,
        "queue_entry_id": q_entry.id,
        "token_number": token_str,
        "queue_position": q_entry.queue_position,
        "waiting_time_minutes": pred['waiting_time_minutes'],
        "service_duration_minutes": pred['service_duration_minutes'],
        "expected_completion_time": pred['expected_completion_time'],
        "prediction_source": pred['prediction_source']
    }

@router.put("/{entry_id}/status")
@router.patch("/{entry_id}/status")
async def change_vehicle_status(
    entry_id: int,
    status_update: QueueStatusUpdate,
    current_user: User = Depends(get_current_floor_operator),
    db: Session = Depends(get_db)
):
    q_entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not q_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    if current_user.role == "technician" and current_user.service_center_id:
        if q_entry.service_request and q_entry.service_request.service_center_id != current_user.service_center_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Technicians can only update vehicles belonging to their assigned workshop center."
            )

    try:
        result = await update_service_status(
            db=db,
            queue_entry_id=entry_id,
            new_status=status_update.new_status,
            changed_by_user_id=current_user.id,
            assigned_bay_id=status_update.assigned_bay_id,
            assigned_mechanic_id=status_update.assigned_mechanic_id,
            notes=status_update.notes
        )
        return result
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
