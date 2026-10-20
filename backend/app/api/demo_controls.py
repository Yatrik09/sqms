from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from datetime import datetime

from app.database.session import get_db
from app.models.entities import (
    ServiceCenter, ServiceBay, Mechanic, QueueEntry, ServiceRequest, Prediction, User, AuditLog
)
from app.api.deps import get_current_manager
from app.services.queue_service import (
    generate_next_token, recalculate_center_workload, recalculate_queue_predictions, update_service_status
)
from app.api.websockets import ws_manager

router = APIRouter(prefix="/demo", tags=["Demo Controls"])

@router.post("/set-workload/{center_id}")
async def set_workload_level(
    center_id: int,
    level: str, # normal, high, peak
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    bays = db.query(ServiceBay).filter(ServiceBay.service_center_id == center_id).all()
    mechs = db.query(Mechanic).filter(Mechanic.service_center_id == center_id).all()

    if level == "peak":
        center.current_workload = 0.92
        # Occupy most bays and mechs
        for idx, bay in enumerate(bays):
            bay.status = "Occupied" if idx < len(bays) - 1 else "Available"
        for idx, m in enumerate(mechs):
            m.availability = "Busy" if idx < len(mechs) - 1 else "Available"
    elif level == "high":
        center.current_workload = 0.75
        for idx, bay in enumerate(bays):
            bay.status = "Occupied" if idx < int(len(bays) * 0.75) else "Available"
        for idx, m in enumerate(mechs):
            m.availability = "Busy" if idx < int(len(mechs) * 0.75) else "Available"
    else: # normal
        center.current_workload = 0.40
        for idx, bay in enumerate(bays):
            bay.status = "Available" if idx % 2 == 0 else "Occupied"
        for idx, m in enumerate(mechs):
            m.availability = "Available" if idx % 2 == 0 else "Busy"

    db.commit()
    await recalculate_queue_predictions(db, center_id)

    # Broadcast update
    await ws_manager.broadcast({
        "event": "DEMO_WORKLOAD_CHANGED",
        "service_center_id": center_id,
        "level": level,
        "workload": center.current_workload
    })

    return {
        "success": True,
        "service_center_id": center_id,
        "workload_level": level,
        "new_workload": center.current_workload
    }

@router.post("/add-batch-queue/{center_id}")
async def add_batch_queue(
    center_id: int,
    count: int = 3,
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    demo_names = ["Rajesh Sharma", "Priya Verma", "Amit Patel", "Sneha Iyer", "Vikas Rao"]
    demo_regs = ["GJ01-AB-1290", "MH02-CD-5432", "DL03-EF-9876", "KA04-GH-3344", "GJ05-JK-7788"]
    demo_services = ["General Service", "Oil Change", "Brake Service", "AC Service"]

    active_count = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    created_tokens = []
    for i in range(count):
        token_str = generate_next_token(db, center_id)
        cust_name = demo_names[i % len(demo_names)]
        reg_no = demo_regs[i % len(demo_regs)]
        stype = demo_services[i % len(demo_services)]

        # Get first customer or dummy
        sreq = ServiceRequest(
            customer_id=1,
            vehicle_id=1,
            service_center_id=center_id,
            service_type=stype,
            repair_type="Standard",
            requested_date=datetime.now().strftime("%Y-%m-%d"),
            preferred_time=datetime.now().strftime("%I:%M %p"),
            priority="Normal",
            status="Vehicle Received",
            notes=f"Demo simulation vehicle for {cust_name} ({reg_no})"
        )
        db.add(sreq)
        db.commit()
        db.refresh(sreq)

        q_entry = QueueEntry(
            service_request_id=sreq.id,
            token_number=token_str,
            queue_position=active_count + i + 1,
            status="Waiting"
        )
        db.add(q_entry)
        created_tokens.append(token_str)

    db.commit()
    recalculate_center_workload(db, center_id)
    await recalculate_queue_predictions(db, center_id)

    await ws_manager.broadcast({
        "event": "DEMO_BATCH_ADDED",
        "service_center_id": center_id,
        "tokens_added": created_tokens
    })

    return {
        "success": True,
        "service_center_id": center_id,
        "tokens_added": created_tokens
    }

@router.post("/advance-first-vehicle/{center_id}")
async def advance_first_vehicle(
    center_id: int,
    db: Session = Depends(get_db)
):
    entry = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center_id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).order_by(QueueEntry.queue_position.asc()).first()

    if not entry:
        return {"success": False, "message": "No active vehicles in queue"}

    curr_status = entry.service_request.status
    if curr_status == "Waiting" or curr_status == "Vehicle Received" or curr_status == "Booking Confirmed":
        next_status = "Service In Progress"
    elif curr_status == "Service In Progress":
        next_status = "Washing"
    elif curr_status == "Washing":
        next_status = "Quality Check"
    elif curr_status == "Quality Check":
        next_status = "Ready for Pickup"
    elif curr_status == "Ready for Pickup":
        next_status = "Completed"
    else:
        next_status = "Completed"

    # Find an available bay & mechanic if advancing to in progress
    bay = db.query(ServiceBay).filter(ServiceBay.service_center_id == center_id, ServiceBay.status == "Available").first()
    mech = db.query(Mechanic).filter(Mechanic.service_center_id == center_id, Mechanic.availability == "Available").first()

    res = await update_service_status(
        db=db,
        queue_entry_id=entry.id,
        new_status=next_status,
        changed_by_user_id=1,
        assigned_bay_id=bay.id if bay else None,
        assigned_mechanic_id=mech.id if mech else None,
        notes="Advanced via demo interactive controls."
    )
    return res
