from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import User, Customer, Vehicle, ServiceRequest, QueueEntry, Prediction, ServiceCenter
from app.schemas.schemas import VehicleCreate, VehicleResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/me/vehicles", response_model=List[VehicleResponse])
def get_my_vehicles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer and current_user.role == "customer":
        customer = Customer(
            user_id=current_user.id,
            name=current_user.name,
            phone=current_user.phone or "N/A",
            email=current_user.email
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    if not customer:
        return []
    return customer.vehicles

@router.post("/me/vehicles", response_model=VehicleResponse)
def add_vehicle(
    v_in: VehicleCreate,
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

    # Check existing registration
    existing = db.query(Vehicle).filter(
        Vehicle.registration_number == v_in.registration_number.upper().strip()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A vehicle with this registration number already exists.")

    vehicle = Vehicle(
        customer_id=customer.id,
        registration_number=v_in.registration_number.upper().strip(),
        vehicle_type=v_in.vehicle_type,
        model=v_in.model,
        year=v_in.year,
        fuel_type=v_in.fuel_type
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.delete("/me/vehicles/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")
        
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.customer_id == customer.id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or unauthorized")
        
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted successfully"}

@router.get("/me/active-service")
def get_my_active_service(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        return {"has_active": False}

    active_req = db.query(ServiceRequest).join(QueueEntry).filter(
        ServiceRequest.customer_id == customer.id,
        ServiceRequest.status.notin_(["Completed", "Cancelled"])
    ).order_by(ServiceRequest.id.desc()).first()

    if not active_req:
        return {"has_active": False}

    q_entry = active_req.queue_entry
    prediction = db.query(Prediction).filter(
        Prediction.service_request_id == active_req.id
    ).order_by(Prediction.id.desc()).first()

    center = active_req.service_center
    bay_name = q_entry.assigned_bay.bay_number if q_entry.assigned_bay else "Assigned when bay frees"
    mech_name = q_entry.assigned_mechanic.name if q_entry.assigned_mechanic else "Assigned at bay check-in"

    return {
        "has_active": True,
        "service_request_id": active_req.id,
        "token_number": q_entry.token_number if q_entry else "N/A",
        "queue_position": q_entry.queue_position if q_entry else 1,
        "status": active_req.status,
        "service_type": active_req.service_type,
        "repair_type": active_req.repair_type,
        "vehicle_registration": active_req.vehicle.registration_number if active_req.vehicle else "N/A",
        "vehicle_model": active_req.vehicle.model if active_req.vehicle else "N/A",
        "service_center_id": center.id if center else None,
        "service_center_name": center.name if center else "Service Center",
        "service_center_address": center.address if center else "",
        "assigned_bay": bay_name,
        "assigned_mechanic": mech_name,
        "estimated_waiting_minutes": prediction.waiting_time if prediction else 25,
        "estimated_service_minutes": prediction.service_duration if prediction else 60,
        "expected_completion_time": prediction.completion_time if prediction else "In ~85 mins",
        "prediction_source": prediction.prediction_source if prediction else "Production ML Model",
        "model_version": prediction.model_version if prediction else "v1.0",
        "contributing_factors": prediction.factors if prediction and prediction.factors else [],
        "last_updated": datetime_now_str()
    }

@router.get("/me/history")
def get_service_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        return []

    reqs = db.query(ServiceRequest).filter(
        ServiceRequest.customer_id == customer.id
    ).order_by(ServiceRequest.id.desc()).all()

    history_items = []
    for r in reqs:
        history_items.append({
            "id": r.id,
            "token_number": r.queue_entry.token_number if r.queue_entry else f"T-{r.id:04d}",
            "service_type": r.service_type,
            "vehicle_reg": r.vehicle.registration_number if r.vehicle else "N/A",
            "service_center": r.service_center.name if r.service_center else "N/A",
            "status": r.status,
            "requested_date": r.requested_date,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "N/A"
        })
    return history_items

def datetime_now_str():
    from datetime import datetime
    return datetime.now().strftime("%I:%M %p")
