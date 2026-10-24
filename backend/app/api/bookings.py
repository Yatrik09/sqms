from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import (
    User, Customer, Vehicle, ServiceCenter, ServiceRequest, Booking, QueueEntry,
    Prediction, ServiceStatusHistory, Notification, AuditLog, ServiceBay, Mechanic
)
from app.schemas.schemas import BookingCreate
from app.api.deps import get_current_user, get_current_manager
from app.services.queue_service import generate_next_token, recalculate_center_workload, recalculate_queue_predictions
from ml.prediction.predictor import predictor
from app.api.websockets import ws_manager

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.post("")
async def create_service_booking(
    b_in: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        customer = Customer(
            user_id=current_user.id,
            name=current_user.name,
            phone=current_user.phone or "N/A",
            email=current_user.email
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    vehicle = db.query(Vehicle).filter(
        Vehicle.id == b_in.vehicle_id,
        Vehicle.customer_id == customer.id
    ).first()
    if not vehicle:
        # Graceful fallback: check if customer has any registered vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.customer_id == customer.id).first()
    if not vehicle:
        raise HTTPException(
            status_code=400,
            detail="Selected vehicle not found for this account. Please add a vehicle first in the My Vehicles tab."
        )

    center = db.query(ServiceCenter).filter(ServiceCenter.id == b_in.service_center_id).first()
    if not center or center.status != "active":
        raise HTTPException(status_code=400, detail="Selected service center is not currently active.")

    # 1. Create Service Request
    s_req = ServiceRequest(
        customer_id=customer.id,
        vehicle_id=vehicle.id,
        service_center_id=center.id,
        service_type=b_in.service_type,
        repair_type=b_in.repair_type or "Standard",
        requested_date=b_in.requested_date,
        preferred_time=b_in.preferred_time or "10:00 AM",
        required_completion_time=b_in.required_completion_time,
        priority="Normal",
        status="Booking Confirmed",
        notes=b_in.notes
    )
    db.add(s_req)
    db.commit()
    db.refresh(s_req)

    # 2. Create Booking Record
    booking = Booking(
        service_request_id=s_req.id,
        booking_date=b_in.requested_date,
        slot=b_in.preferred_time or "10:00 AM",
        status="Confirmed"
    )
    db.add(booking)

    # 3. Generate Digital Token and Queue Entry
    token_str = generate_next_token(db, center.id)
    active_q_count = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center.id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    q_entry = QueueEntry(
        service_request_id=s_req.id,
        token_number=token_str,
        queue_position=active_q_count + 1,
        status="Waiting"
    )
    db.add(q_entry)

    # 4. Compute ML Prediction
    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center.id,
        ServiceBay.status == "Available"
    ).count()
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == center.id,
        Mechanic.availability == "Available"
    ).count()

    pred = predictor.predict_service(
        service_type=b_in.service_type,
        vehicle_type=vehicle.vehicle_type,
        repair_type=b_in.repair_type or "Standard",
        queue_position=q_entry.queue_position,
        queue_length=active_q_count + 1,
        active_mechanics=center.total_mechanics or 8,
        available_mechanics=avail_mechs,
        total_bays=center.total_bays or 8,
        available_bays=avail_bays,
        current_workload=center.current_workload or 0.5,
        ongoing_services=max(0, (center.total_bays or 8) - avail_bays)
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

    # 5. Service Status History
    history = ServiceStatusHistory(
        service_request_id=s_req.id,
        old_status=None,
        new_status="Booking Confirmed",
        changed_by=current_user.id,
        notes="Online booking confirmed and token issued."
    )
    db.add(history)

    # 6. Customer Notification
    notif = Notification(
        user_id=current_user.id,
        type="booking",
        title="Booking Confirmed",
        message=f"Booking confirmed at {center.name}! Your Digital Token is {token_str}. Estimated turnaround: ~{pred['total_turnaround_minutes']} min."
    )
    db.add(notif)

    # 6b. Branch Manager Notification (if assigned)
    if center.manager_id:
        mgr_notif = Notification(
            user_id=center.manager_id,
            type="booking",
            title="New Booking Received",
            message=f"New booking confirmed: Token {token_str} for {customer.name} ({vehicle.registration_number}) - {b_in.service_type}."
        )
        db.add(mgr_notif)

    # 7. Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_BOOKING",
        entity="ServiceRequest",
        entity_id=str(s_req.id),
        details=f"Booking created for {vehicle.registration_number}, Token: {token_str} at {center.name}"
    )
    db.add(audit)
    db.commit()

    # Recalculate center workload
    recalculate_center_workload(db, center.id)

    # Broadcast new booking via WebSocket
    await ws_manager.broadcast({
        "event": "NEW_BOOKING_CREATED",
        "service_center_id": center.id,
        "token_number": token_str,
        "customer_name": customer.name,
        "vehicle_registration": vehicle.registration_number,
        "service_type": b_in.service_type,
        "queue_position": q_entry.queue_position
    })

    return {
        "success": True,
        "message": "Service booking confirmed successfully",
        "booking_id": booking.id,
        "service_request_id": s_req.id,
        "token_number": token_str,
        "queue_position": q_entry.queue_position,
        "estimated_waiting_minutes": pred['waiting_time_minutes'],
        "estimated_service_minutes": pred['service_duration_minutes'],
        "expected_completion_time": pred['expected_completion_time'],
        "prediction_source": pred['prediction_source'],
        "contributing_factors": pred['contributing_factors']
    }

@router.get("/my")
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        return []

    reqs = db.query(ServiceRequest).filter(
        ServiceRequest.customer_id == customer.id
    ).order_by(ServiceRequest.id.desc()).all()

    items = []
    for r in reqs:
        items.append({
            "id": r.id,
            "token_number": r.queue_entry.token_number if r.queue_entry else "N/A",
            "service_center_name": r.service_center.name if r.service_center else "N/A",
            "vehicle_reg": r.vehicle.registration_number if r.vehicle else "N/A",
            "service_type": r.service_type,
            "requested_date": r.requested_date,
            "preferred_time": r.preferred_time,
            "status": r.status,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "N/A"
        })
    return items

@router.get("")
def list_all_bookings(
    center_id: Optional[int] = None,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    query = db.query(ServiceRequest)
    if center_id:
        query = query.filter(ServiceRequest.service_center_id == center_id)
    reqs = query.order_by(ServiceRequest.id.desc()).limit(100).all()

    items = []
    for r in reqs:
        items.append({
            "id": r.id,
            "token_number": r.queue_entry.token_number if r.queue_entry else "N/A",
            "customer_name": r.customer.name if r.customer else "N/A",
            "customer_phone": r.customer.phone if r.customer else "N/A",
            "vehicle_reg": r.vehicle.registration_number if r.vehicle else "N/A",
            "service_center_name": r.service_center.name if r.service_center else "N/A",
            "service_type": r.service_type,
            "status": r.status,
            "requested_date": r.requested_date,
            "preferred_time": r.preferred_time,
            "required_completion_time": r.required_completion_time,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "N/A"
        })
    return items

@router.delete("/my")
@router.post("/clear-my")
async def clear_my_bookings(
    customer_email: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user = current_user
    if customer_email:
        clean_email = customer_email.strip().lower()
        if current_user.role in ["super_admin", "branch_manager", "franchise_owner"] or current_user.email == clean_email:
            target_user = db.query(User).filter(User.email == clean_email).first()
            if not target_user:
                raise HTTPException(status_code=404, detail=f"No account found with email {clean_email}")
        else:
            raise HTTPException(status_code=403, detail="Not authorized to clear other customer's bookings")

    customer = db.query(Customer).filter(Customer.user_id == target_user.id).first()
    if not customer:
        return {"success": True, "message": "No customer profile found, 0 bookings cleared", "deleted_count": 0}

    reqs = db.query(ServiceRequest).filter(ServiceRequest.customer_id == customer.id).all()
    if not reqs:
        return {"success": True, "message": "No booked services found for this customer", "deleted_count": 0}

    req_ids = [r.id for r in reqs]
    center_ids = list(set([r.service_center_id for r in reqs if r.service_center_id]))

    # 1. Free any occupied service bays & mechanics
    bays = db.query(ServiceBay).filter(ServiceBay.current_service_id.in_(req_ids)).all()
    for b in bays:
        b.current_service_id = None
        b.status = "Available"

    mechs = db.query(Mechanic).filter(Mechanic.current_service_id.in_(req_ids)).all()
    for m in mechs:
        m.current_service_id = None
        m.availability = "Available"

    # 2. Delete Queue Entries
    db.query(QueueEntry).filter(QueueEntry.service_request_id.in_(req_ids)).delete(synchronize_session=False)

    # 3. Delete Bookings
    db.query(Booking).filter(Booking.service_request_id.in_(req_ids)).delete(synchronize_session=False)

    # 4. Delete ServiceStatusHistory
    db.query(ServiceStatusHistory).filter(ServiceStatusHistory.service_request_id.in_(req_ids)).delete(synchronize_session=False)

    # 5. Delete Predictions
    db.query(Prediction).filter(Prediction.service_request_id.in_(req_ids)).delete(synchronize_session=False)

    # 6. Delete ServiceRequests
    deleted_count = db.query(ServiceRequest).filter(ServiceRequest.id.in_(req_ids)).delete(synchronize_session=False)
    db.commit()

    # 7. Recalculate workloads and predictions for affected centers
    for cid in center_ids:
        try:
            recalculate_center_workload(db, cid)
            await recalculate_queue_predictions(db, cid)
        except Exception:
            pass

    # 8. Broadcast live websocket event
    try:
        await ws_manager.broadcast({
            "event": "BOOKINGS_CLEARED",
            "customer_id": customer.id,
            "user_id": target_user.id
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Successfully removed all {deleted_count} booked service(s) for {target_user.email}",
        "deleted_count": deleted_count
    }

@router.delete("/{service_request_id}")
async def delete_single_booking(
    service_request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    query = db.query(ServiceRequest).filter(ServiceRequest.id == service_request_id)
    if current_user.role not in ["super_admin", "branch_manager", "franchise_owner"]:
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        query = query.filter(ServiceRequest.customer_id == customer.id)

    sreq = query.first()
    if not sreq:
        raise HTTPException(status_code=404, detail="Service booking not found")

    cid = sreq.service_center_id

    # Free bays & mechanics if associated
    bays = db.query(ServiceBay).filter(ServiceBay.current_service_id == sreq.id).all()
    for b in bays:
        b.current_service_id = None
        b.status = "Available"

    mechs = db.query(Mechanic).filter(Mechanic.current_service_id == sreq.id).all()
    for m in mechs:
        m.current_service_id = None
        m.availability = "Available"

    # Delete related records
    db.query(QueueEntry).filter(QueueEntry.service_request_id == sreq.id).delete(synchronize_session=False)
    db.query(Booking).filter(Booking.service_request_id == sreq.id).delete(synchronize_session=False)
    db.query(ServiceStatusHistory).filter(ServiceStatusHistory.service_request_id == sreq.id).delete(synchronize_session=False)
    db.query(Prediction).filter(Prediction.service_request_id == sreq.id).delete(synchronize_session=False)
    db.delete(sreq)
    db.commit()

    if cid:
        try:
            recalculate_center_workload(db, cid)
            await recalculate_queue_predictions(db, cid)
        except Exception:
            pass

    try:
        await ws_manager.broadcast({
            "event": "BOOKING_CANCELLED",
            "service_request_id": service_request_id
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Successfully cancelled booking #{service_request_id}"
    }

