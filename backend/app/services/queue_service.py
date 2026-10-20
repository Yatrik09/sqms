from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.entities import (
    QueueEntry, ServiceRequest, ServiceBay, Mechanic, ServiceStatusHistory,
    AuditLog, Notification, ServiceCenter, Prediction, Vehicle, Customer, User
)
from ml.prediction.predictor import predictor
from app.api.websockets import ws_manager

VALID_STATUS_ORDER = [
    "Booking Confirmed",
    "Vehicle Received",
    "Waiting",
    "Inspection",
    "Waiting for Bay",
    "Service In Progress",
    "Washing",
    "Repair In Progress",
    "Quality Check",
    "Ready for Pickup",
    "Completed",
    "Cancelled"
]

def generate_next_token(db: Session, service_center_id: int) -> str:
    count = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == service_center_id
    ).count()
    return f"T-{service_center_id:02d}-{count + 1:03d}"

def recalculate_center_workload(db: Session, center_id: int):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        return
    total_bays = max(1, center.total_bays or 8)
    occupied_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center_id,
        ServiceBay.status == "Occupied"
    ).count()
    active_queue = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()
    
    workload = (occupied_bays / total_bays) * 0.65 + min(1.0, active_queue / 10.0) * 0.35
    center.current_workload = max(0.05, min(0.98, round(workload, 2)))
    db.commit()

def find_best_bay_for_service(db: Session, center_id: int, service_type: str) -> Optional[ServiceBay]:
    """
    Intelligently select the best available service bay based on service type.
    E.g. Washing -> Washing bay, Accident/Dent/Paint -> Repair/Accident Repair bay,
    General -> General Service bay. If occupied, selects next free available bay.
    """
    query = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center_id,
        ServiceBay.status == "Available"
    )
    all_available = query.order_by(ServiceBay.id.asc()).all()
    if not all_available:
        return None

    st_lower = (service_type or "").lower()
    for bay in all_available:
        bay_support = (bay.supported_service_type or "").lower()
        if "wash" in st_lower and "wash" in bay_support:
            return bay
        if any(w in st_lower for w in ["accident", "dent", "paint", "body", "repair"]) and any(w in bay_support for w in ["repair", "accident"]):
            return bay
        if "general" in st_lower and "general" in bay_support:
            return bay

    # Fallback to the first available bay
    return all_available[0]


def find_best_mechanic_for_service(db: Session, center_id: int, service_type: str) -> Optional[Mechanic]:
    """
    Intelligently select the best available mechanic based on specialization.
    E.g. AC / Electrical -> Electrical/AC specialist.
    Accidental / Body -> Accidental specialist.
    General -> General Service technician.
    """
    query = db.query(Mechanic).filter(
        Mechanic.service_center_id == center_id,
        Mechanic.availability == "Available",
        Mechanic.status == "active"
    )
    all_available = query.order_by(Mechanic.id.asc()).all()
    if not all_available:
        return None

    st_lower = (service_type or "").lower()
    for mech in all_available:
        mech_spec = (mech.specialization or "").lower()
        if any(w in st_lower for w in ["ac", "cool", "heat", "electric", "battery"]) and any(w in mech_spec for w in ["ac", "electric"]):
            return mech
        if any(w in st_lower for w in ["accident", "dent", "paint", "body", "repair"]) and any(w in mech_spec for w in ["accident", "body", "repair"]):
            return mech
        if "general" in st_lower and "general" in mech_spec:
            return mech

    # Fallback to first available technician
    return all_available[0]


def reconcile_center_resources(db: Session, center_id: int):
    """
    Ensures workshop bays and mechanics perfectly reflect reality.
    - If active in-service count == 0, ALL non-maintenance bays are marked 'Available'
      and ALL non-offduty mechanics are marked 'Available'.
    - If active services exist, frees any bay or mechanic not assigned to an active service.
    - Recalculates workload accordingly.
    """
    active_in_service = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        QueueEntry.status == "In Service"
    ).all()

    center_bays = db.query(ServiceBay).filter(ServiceBay.service_center_id == center_id).all()
    center_mechs = db.query(Mechanic).filter(Mechanic.service_center_id == center_id).all()

    if not active_in_service:
        # No vehicle currently being serviced -> ALL bays and mechanics are free!
        for bay in center_bays:
            if bay.status == "Occupied":
                bay.status = "Available"
                bay.current_service_id = None
        for mech in center_mechs:
            if mech.availability == "Busy":
                mech.availability = "Available"
                mech.current_service_id = None
    else:
        active_bay_ids = {q.assigned_bay_id for q in active_in_service if q.assigned_bay_id}
        active_mech_ids = {q.assigned_mechanic_id for q in active_in_service if q.assigned_mechanic_id}
        active_req_ids = {q.service_request_id for q in active_in_service}

        for bay in center_bays:
            if bay.status == "Occupied":
                if bay.id not in active_bay_ids and bay.current_service_id not in active_req_ids:
                    bay.status = "Available"
                    bay.current_service_id = None

        for mech in center_mechs:
            if mech.availability == "Busy":
                if mech.id not in active_mech_ids and mech.current_service_id not in active_req_ids:
                    mech.availability = "Available"
                    mech.current_service_id = None

    recalculate_center_workload(db, center_id)
    db.commit()


async def update_service_status(
    db: Session,
    queue_entry_id: int,
    new_status: str,
    changed_by_user_id: Optional[int] = None,
    assigned_bay_id: Optional[int] = None,
    assigned_mechanic_id: Optional[int] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    queue_entry = db.query(QueueEntry).filter(QueueEntry.id == queue_entry_id).first()
    if not queue_entry:
        raise ValueError("Queue entry not found")

    service_request = queue_entry.service_request
    center_id = service_request.service_center_id
    old_status = service_request.status
    old_queue_status = queue_entry.status

    is_finishing = new_status in ["Completed", "Cancelled", "Ready for Pickup"]
    is_in_service = ("In Progress" in new_status) or (new_status in ["Washing", "Quality Check", "Inspection", "Repair In Progress"])

    # Update status
    service_request.status = new_status
    if new_status in ["Completed", "Cancelled"]:
        queue_entry.status = new_status
    elif is_in_service:
        queue_entry.status = "In Service"
    else:
        queue_entry.status = "Waiting"

    # Resource Allocation Management
    if is_in_service:
        # Bay allocation
        bay_to_assign = None
        if assigned_bay_id:
            bay_to_assign = db.query(ServiceBay).filter(ServiceBay.id == assigned_bay_id).first()
        elif not queue_entry.assigned_bay_id:
            # Auto-assign next best available matching bay
            bay_to_assign = find_best_bay_for_service(db, center_id, service_request.service_type)

        if bay_to_assign:
            queue_entry.assigned_bay_id = bay_to_assign.id
            bay_to_assign.status = "Occupied"
            bay_to_assign.current_service_id = service_request.id

        # Mechanic allocation
        mech_to_assign = None
        if assigned_mechanic_id:
            mech_to_assign = db.query(Mechanic).filter(Mechanic.id == assigned_mechanic_id).first()
        elif not queue_entry.assigned_mechanic_id:
            # Auto-assign next best available matching technician
            mech_to_assign = find_best_mechanic_for_service(db, center_id, service_request.service_type)

        if mech_to_assign:
            queue_entry.assigned_mechanic_id = mech_to_assign.id
            mech_to_assign.availability = "Busy"
            mech_to_assign.current_service_id = service_request.id

    elif is_finishing:
        # Free assigned bay
        if queue_entry.assigned_bay_id:
            bay = db.query(ServiceBay).filter(ServiceBay.id == queue_entry.assigned_bay_id).first()
            if bay:
                bay.status = "Available"
                bay.current_service_id = None

        # Free any bay associated with this service request
        bays_linked = db.query(ServiceBay).filter(ServiceBay.current_service_id == service_request.id).all()
        for b in bays_linked:
            b.status = "Available"
            b.current_service_id = None

        # Free assigned mechanic
        if queue_entry.assigned_mechanic_id:
            mech = db.query(Mechanic).filter(Mechanic.id == queue_entry.assigned_mechanic_id).first()
            if mech:
                mech.availability = "Available"
                mech.current_service_id = None

        # Free any mechanic associated with this service request
        mechs_linked = db.query(Mechanic).filter(Mechanic.current_service_id == service_request.id).all()
        for m in mechs_linked:
            m.availability = "Available"
            m.current_service_id = None

        # Reconcile resources
        reconcile_center_resources(db, center_id)

    # Status History Log
    history = ServiceStatusHistory(
        service_request_id=service_request.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by_user_id,
        notes=notes
    )
    db.add(history)

    # Audit Log
    audit = AuditLog(
        user_id=changed_by_user_id,
        action="UPDATE_SERVICE_STATUS",
        entity="ServiceRequest",
        entity_id=str(service_request.id),
        details=f"Status changed from '{old_status}' to '{new_status}' for Token {queue_entry.token_number}."
    )
    db.add(audit)

    # In-App Notification to Customer
    customer = service_request.customer
    if customer and customer.user_id:
        notif_msg = f"Your vehicle ({service_request.vehicle.registration_number}) status is now: {new_status}."
        if new_status == "Ready for Pickup":
            notif_msg = f"Good news! Your vehicle ({service_request.vehicle.registration_number}) is ready for pickup."
        elif new_status == "Service In Progress":
            notif_msg = f"Technician has started service on your vehicle ({service_request.vehicle.registration_number})."

        notif = Notification(
            user_id=customer.user_id,
            type="status",
            title=f"Service Update: {queue_entry.token_number}",
            message=notif_msg
        )
        db.add(notif)

    db.commit()

    # Recalculate center workload
    recalculate_center_workload(db, center_id)

    # Recalculate predictions for remaining queue entries in this center
    await recalculate_queue_predictions(db, center_id)

    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center_id,
        ServiceBay.status == "Available"
    ).count()
    total_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center_id
    ).count()
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == center_id,
        Mechanic.availability == "Available"
    ).count()
    total_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == center_id
    ).count()
    active_q = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    # Real-time WebSocket Broadcast
    broadcast_data = {
        "event": "QUEUE_STATUS_CHANGED",
        "service_center_id": center_id,
        "service_request_id": service_request.id,
        "token_number": queue_entry.token_number,
        "old_status": old_status,
        "new_status": new_status,
        "customer_name": customer.name if customer else "Customer",
        "vehicle_registration": service_request.vehicle.registration_number if service_request.vehicle else "",
        "assigned_bay_number": queue_entry.assigned_bay.bay_number if queue_entry.assigned_bay else None,
        "assigned_mechanic_name": queue_entry.assigned_mechanic.name if queue_entry.assigned_mechanic else None,
        "available_bays": avail_bays,
        "total_bays": total_bays,
        "available_mechanics": avail_mechs,
        "total_mechanics": total_mechs,
        "active_queue_count": active_q,
        "timestamp": datetime.utcnow().isoformat()
    }
    await ws_manager.broadcast(broadcast_data)

    return {
        "success": True,
        "token_number": queue_entry.token_number,
        "status": new_status,
        "assigned_bay": queue_entry.assigned_bay.bay_number if queue_entry.assigned_bay else None,
        "assigned_mechanic": queue_entry.assigned_mechanic.name if queue_entry.assigned_mechanic else None,
        "updated_at": datetime.utcnow().isoformat()
    }

async def recalculate_queue_predictions(db: Session, service_center_id: int):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == service_center_id).first()
    if not center:
        return
        
    waiting_entries = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == service_center_id,
        QueueEntry.status == "Waiting"
    ).order_by(QueueEntry.queue_position.asc()).all()

    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == service_center_id,
        ServiceBay.status == "Available"
    ).count()
    
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == service_center_id,
        Mechanic.availability == "Available"
    ).count()

    total_bays = center.total_bays or 8
    total_mechs = center.total_mechanics or 8
    workload = center.current_workload or 0.5
    now = datetime.now()

    for idx, entry in enumerate(waiting_entries):
        entry.queue_position = idx + 1
        sreq = entry.service_request
        v_type = sreq.vehicle.vehicle_type if sreq.vehicle else "Sedan"
        
        pred = predictor.predict_service(
            service_type=sreq.service_type,
            vehicle_type=v_type,
            repair_type=sreq.repair_type or "Standard",
            queue_position=entry.queue_position,
            queue_length=len(waiting_entries),
            active_mechanics=total_mechs,
            available_mechanics=avail_mechs,
            total_bays=total_bays,
            available_bays=avail_bays,
            current_workload=workload,
            ongoing_services=max(0, total_bays - avail_bays),
            request_time=now
        )

        # Update or create prediction record
        existing_pred = db.query(Prediction).filter(
            Prediction.service_request_id == sreq.id
        ).order_by(Prediction.id.desc()).first()

        if existing_pred:
            existing_pred.waiting_time = pred['waiting_time_minutes']
            existing_pred.service_duration = pred['service_duration_minutes']
            existing_pred.completion_time = pred['expected_completion_time']
            existing_pred.prediction_source = pred['prediction_source']
            existing_pred.model_version = pred['model_version']
            existing_pred.factors = pred['contributing_factors']
        else:
            new_pred = Prediction(
                service_request_id=sreq.id,
                waiting_time=pred['waiting_time_minutes'],
                service_duration=pred['service_duration_minutes'],
                completion_time=pred['expected_completion_time'],
                prediction_source=pred['prediction_source'],
                model_version=pred['model_version'],
                factors=pred['contributing_factors']
            )
            db.add(new_pred)

    db.commit()
