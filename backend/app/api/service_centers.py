from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import ServiceCenter, ServiceBay, Mechanic, QueueEntry, ServiceRequest, User, AuditLog
from app.schemas.schemas import (
    ServiceCenterResponse, ServiceCenterCreate, ServiceBayResponse, ServiceBayCreate,
    MechanicResponse, MechanicCreate, TechnicianCreate, TechnicianResponse
)
from app.api.deps import get_current_user, get_current_super_admin, get_current_manager, get_current_manager_or_owner
from app.services.queue_service import reconcile_center_resources, recalculate_center_workload
from app.api.websockets import ws_manager
from app.core.security import get_password_hash

from app.services.recommendation_service import haversine_distance

router = APIRouter(prefix="/service-centers", tags=["Service Centers"])

@router.get("/my-managed-center")
def get_my_managed_center(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.manager_id == current_user.id).first()
    if not center:
        return {"has_center": False, "center_id": 1, "center_name": "Center 01 — Apex Central Hub"}
    
    return {
        "has_center": True,
        "center_id": center.id,
        "center_name": center.name,
        "address": center.address,
        "city": center.city,
        "total_bays": center.total_bays,
        "total_mechanics": center.total_mechanics,
        "current_workload": center.current_workload
    }

@router.get("", response_model=List[ServiceCenterResponse])
def get_service_centers(
    city: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    sort_by_distance: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(ServiceCenter)
    if city:
        query = query.filter(ServiceCenter.city.ilike(f"%{city}%"))
    centers = query.order_by(ServiceCenter.id.asc()).all()

    result = []
    for c in centers:
        avail_bays = db.query(ServiceBay).filter(
            ServiceBay.service_center_id == c.id,
            ServiceBay.status == "Available"
        ).count()
        avail_mechs = db.query(Mechanic).filter(
            Mechanic.service_center_id == c.id,
            Mechanic.availability == "Available"
        ).count()
        active_q = db.query(QueueEntry).join(ServiceRequest).filter(
            ServiceRequest.service_center_id == c.id,
            QueueEntry.status.in_(["Waiting", "In Service"])
        ).count()

        mgr_name = c.manager.name if c.manager else "Unassigned"

        dist = None
        if latitude is not None and longitude is not None:
            dist = haversine_distance(latitude, longitude, c.latitude, c.longitude)

        item = ServiceCenterResponse(
            id=c.id,
            franchise_id=c.franchise_id,
            manager_id=c.manager_id,
            name=c.name,
            address=c.address,
            city=c.city,
            area=c.area,
            latitude=c.latitude,
            longitude=c.longitude,
            phone=c.phone,
            capacity=c.capacity,
            total_bays=c.total_bays,
            total_mechanics=c.total_mechanics,
            current_workload=c.current_workload,
            status=c.status,
            operating_hours_start=c.operating_hours_start,
            operating_hours_end=c.operating_hours_end,
            supported_services=c.supported_services or [],
            available_bays=avail_bays,
            available_mechanics=avail_mechs,
            active_queue_count=active_q,
            manager_name=mgr_name,
            distance_km=dist
        )
        result.append(item)

    if sort_by_distance and latitude is not None and longitude is not None:
        result.sort(key=lambda x: (x.distance_km if x.distance_km is not None else 9999))

    return result

@router.get("/{center_id}", response_model=ServiceCenterResponse)
def get_service_center_by_id(center_id: int, db: Session = Depends(get_db)):
    c = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Service center not found")

    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == c.id,
        ServiceBay.status == "Available"
    ).count()
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == c.id,
        Mechanic.availability == "Available"
    ).count()
    active_q = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == c.id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    return ServiceCenterResponse(
        id=c.id,
        franchise_id=c.franchise_id,
        manager_id=c.manager_id,
        name=c.name,
        address=c.address,
        city=c.city,
        area=c.area,
        latitude=c.latitude,
        longitude=c.longitude,
        phone=c.phone,
        capacity=c.capacity,
        total_bays=c.total_bays,
        total_mechanics=c.total_mechanics,
        current_workload=c.current_workload,
        status=c.status,
        operating_hours_start=c.operating_hours_start,
        operating_hours_end=c.operating_hours_end,
        supported_services=c.supported_services or [],
        available_bays=avail_bays,
        available_mechanics=avail_mechs,
        active_queue_count=active_q,
        manager_name=c.manager.name if c.manager else "Unassigned"
    )

@router.post("", response_model=ServiceCenterResponse)
def create_service_center(
    sc_in: ServiceCenterCreate,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    sc = ServiceCenter(**sc_in.model_dump())
    db.add(sc)
    db.commit()
    db.refresh(sc)

    # Automatically initialize default service bays and mechanics
    for i in range(1, (sc.total_bays or 8) + 1):
        bay = ServiceBay(
            service_center_id=sc.id,
            bay_number=f"Bay-{i:02d}",
            supported_service_type="General Service" if i <= 4 else ("Washing" if i == 5 else "Accident Repair"),
            status="Available"
        )
        db.add(bay)

    for j in range(1, (sc.total_mechanics or 8) + 1):
        mech = Mechanic(
            service_center_id=sc.id,
            name=f"Technician {j}",
            specialization="General Service" if j <= 4 else ("Electrical" if j == 5 else "Accidental Repair"),
            availability="Available",
            status="active"
        )
        db.add(mech)

    audit = AuditLog(
        user_id=current_admin.id,
        action="CREATE_SERVICE_CENTER",
        entity="ServiceCenter",
        entity_id=str(sc.id),
        details=f"Created service center: {sc.name}"
    )
    db.add(audit)
    db.commit()

    return get_service_center_by_id(sc.id, db)

@router.put("/{center_id}", response_model=ServiceCenterResponse)
def update_service_center(
    center_id: int,
    sc_update: ServiceCenterCreate,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    c = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Service center not found")

    for k, v in sc_update.model_dump(exclude_unset=True).items():
        setattr(c, k, v)

    audit = AuditLog(
        user_id=current_admin.id,
        action="UPDATE_SERVICE_CENTER",
        entity="ServiceCenter",
        entity_id=str(c.id),
        details=f"Updated service center: {c.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(c)
    return get_service_center_by_id(c.id, db)

# --- BAYS AND MECHANICS ENDPOINTS ---
@router.get("/{center_id}/bays", response_model=List[ServiceBayResponse])
def get_service_bays(center_id: int, db: Session = Depends(get_db)):
    reconcile_center_resources(db, center_id)
    return db.query(ServiceBay).filter(ServiceBay.service_center_id == center_id).all()

@router.post("/{center_id}/bays", response_model=ServiceBayResponse)
def create_service_bay(
    center_id: int,
    bay_in: ServiceBayCreate,
    current_user: User = Depends(get_current_manager_or_owner),
    db: Session = Depends(get_db)
):
    bay = ServiceBay(**bay_in.model_dump())
    db.add(bay)
    
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if center:
        center.total_bays = (center.total_bays or 0) + 1
        db.add(center)
        
    db.commit()
    db.refresh(bay)
    return bay

@router.patch("/bays/{bay_id}/status")
async def toggle_bay_status(
    bay_id: int,
    status: str, # Available, Occupied, Maintenance, Disabled
    current_user: User = Depends(get_current_manager_or_owner),
    db: Session = Depends(get_db)
):
    bay = db.query(ServiceBay).filter(ServiceBay.id == bay_id).first()
    if not bay:
        raise HTTPException(status_code=404, detail="Bay not found")
    bay.status = status
    if status == "Available":
        bay.current_service_id = None
    db.commit()
    recalculate_center_workload(db, bay.service_center_id)
    await ws_manager.broadcast({
        "event": "BAY_UPDATED",
        "service_center_id": bay.service_center_id,
        "bay_id": bay.id,
        "bay_number": bay.bay_number,
        "status": bay.status
    })
@router.delete("/{center_id}/bays/{bay_id}")
async def delete_service_bay(
    center_id: int,
    bay_id: int,
    current_user: User = Depends(get_current_manager_or_owner),
    db: Session = Depends(get_db)
):
    bay = db.query(ServiceBay).filter(ServiceBay.id == bay_id, ServiceBay.service_center_id == center_id).first()
    if not bay:
        raise HTTPException(status_code=404, detail="Service bay not found in this center")
    if bay.status == "Occupied" and bay.current_service_id:
        raise HTTPException(status_code=400, detail="Cannot remove an active bay currently servicing a vehicle.")
    
    bay_num = bay.bay_number
    db.delete(bay)
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if center and center.total_bays and center.total_bays > 0:
        center.total_bays = max(0, center.total_bays - 1)
        db.add(center)
        
    db.commit()
    recalculate_center_workload(db, center_id)
    await ws_manager.broadcast({
        "event": "BAY_DELETED",
        "service_center_id": center_id,
        "bay_id": bay_id,
        "bay_number": bay_num
    })
    return {"message": f"Service Bay {bay_num} removed successfully", "bay_id": bay_id}

@router.get("/{center_id}/mechanics", response_model=List[MechanicResponse])
def get_service_mechanics(center_id: int, db: Session = Depends(get_db)):
    reconcile_center_resources(db, center_id)
    return db.query(Mechanic).filter(Mechanic.service_center_id == center_id).all()

@router.post("/{center_id}/mechanics", response_model=MechanicResponse)
def create_mechanic(
    center_id: int,
    mech_in: MechanicCreate,
    current_user: User = Depends(get_current_manager_or_owner),
    db: Session = Depends(get_db)
):
    mech = Mechanic(**mech_in.model_dump())
    db.add(mech)
    
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if center:
        center.total_mechanics = (center.total_mechanics or 0) + 1
        db.add(center)
        
    db.commit()
    db.refresh(mech)
    return mech

@router.patch("/mechanics/{mech_id}/status")
async def toggle_mechanic_status(
    mech_id: int,
    availability: str, # Available, Busy, Break, Off Duty
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    mech = db.query(Mechanic).filter(Mechanic.id == mech_id).first()
    if not mech:
        raise HTTPException(status_code=404, detail="Mechanic not found")
    mech.availability = availability
    if availability == "Available":
        mech.current_service_id = None
    db.commit()
    recalculate_center_workload(db, mech.service_center_id)
    await ws_manager.broadcast({
        "event": "MECHANIC_UPDATED",
        "service_center_id": mech.service_center_id,
        "mechanic_id": mech.id,
        "mechanic_name": mech.name,
        "availability": mech.availability
    })
    return {"message": "Mechanic availability updated", "mech_id": mech.id, "availability": mech.availability}

@router.delete("/{center_id}/mechanics/{mech_id}")
async def delete_service_mechanic(
    center_id: int,
    mech_id: int,
    current_user: User = Depends(get_current_manager_or_owner),
    db: Session = Depends(get_db)
):
    mech = db.query(Mechanic).filter(Mechanic.id == mech_id, Mechanic.service_center_id == center_id).first()
    if not mech:
        raise HTTPException(status_code=404, detail="Mechanic not found in this center")
    if mech.availability == "Busy" and mech.current_service_id:
        raise HTTPException(status_code=400, detail="Cannot remove a mechanic currently assigned to an active vehicle.")
    
    mech_name = mech.name
    if mech.user_id:
        tech_user = db.query(User).filter(User.id == mech.user_id).first()
        if tech_user:
            tech_user.status = "inactive"
            
    db.delete(mech)
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if center and center.total_mechanics and center.total_mechanics > 0:
        center.total_mechanics = max(0, center.total_mechanics - 1)
        db.add(center)
        
    db.commit()
    recalculate_center_workload(db, center_id)
    await ws_manager.broadcast({
        "event": "MECHANIC_DELETED",
        "service_center_id": center_id,
        "mechanic_id": mech_id,
        "mechanic_name": mech_name
    })
    return {"message": f"Technician {mech_name} removed successfully", "mechanic_id": mech_id}

@router.post("/{center_id}/sync-resources")
async def sync_center_resources(
    center_id: int,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    reconcile_center_resources(db, center_id)
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

    await ws_manager.broadcast({
        "event": "CENTER_RESOURCES_SYNCED",
        "service_center_id": center_id,
        "available_bays": avail_bays,
        "total_bays": total_bays,
        "available_mechanics": avail_mechs,
        "total_mechanics": total_mechs,
        "active_queue_count": active_q
    })
    return {
        "success": True,
        "available_bays": avail_bays,
        "total_bays": total_bays,
        "available_mechanics": avail_mechs,
        "total_mechanics": total_mechs,
        "active_queue_count": active_q
    }

@router.get("/{center_id}/technicians", response_model=List[TechnicianResponse])
def get_center_technicians(
    center_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    # If caller is technician, they can only view technicians for their assigned center
    if current_user.role == "technician" and current_user.service_center_id and current_user.service_center_id != center_id:
        raise HTTPException(status_code=403, detail="Technicians can only access their assigned service center crew.")

    # Fetch technician users assigned to this center
    tech_users = db.query(User).filter(
        User.role == "technician",
        User.service_center_id == center_id
    ).all()

    mechanics = db.query(Mechanic).filter(Mechanic.service_center_id == center_id).all()
    mech_by_user = {m.user_id: m for m in mechanics if m.user_id}
    mech_by_name = {m.name.lower(): m for m in mechanics}

    result = []
    used_mech_ids = set()

    for u in tech_users:
        m = mech_by_user.get(u.id) or mech_by_name.get(u.name.lower())
        if m:
            used_mech_ids.add(m.id)
        result.append(TechnicianResponse(
            id=u.id,
            user_id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            role="technician",
            specialization=m.specialization if m else "General Service",
            availability=m.availability if m else "Available",
            status=u.status,
            service_center_id=center_id,
            service_center_name=center.name,
            created_at=u.created_at
        ))

    # Also list on-floor mechanics assigned to this center
    for m in mechanics:
        if m.id not in used_mech_ids:
            result.append(TechnicianResponse(
                id=m.id + 10000,
                user_id=m.user_id,
                name=m.name,
                email=f"tech_{m.id}@{center.name.lower().replace(' ', '')[:8]}.local",
                phone="Floor Duty",
                role="technician",
                specialization=m.specialization or "General Service",
                availability=m.availability or "Available",
                status="active",
                service_center_id=center_id,
                service_center_name=center.name,
                created_at=None
            ))

    return result

@router.post("/{center_id}/technicians", response_model=TechnicianResponse)
async def create_floor_technician(
    center_id: int,
    tech_in: TechnicianCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    # Strict authorization: Only the branch manager assigned to this center (or franchise owner / super admin)
    if current_user.role == "branch_manager":
        is_assigned = (center.manager_id == current_user.id) or (current_user.service_center_id == center_id)
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Branch managers can only provision technicians for their own workshop.")
    elif current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only Branch Managers can provision floor technician credentials.")

    clean_email = tech_in.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email address already exists. Please choose a unique email.")

    # 1. Create User account with role = technician and bound to this center
    tech_user = User(
        name=tech_in.name.strip(),
        email=clean_email,
        phone=tech_in.phone.strip() if tech_in.phone else None,
        password_hash=get_password_hash(tech_in.password),
        role="technician",
        status="active",
        service_center_id=center.id
    )
    db.add(tech_user)
    db.commit()
    db.refresh(tech_user)

    # 2. Add corresponding Mechanic resource
    mech = Mechanic(
        service_center_id=center.id,
        user_id=tech_user.id,
        name=tech_user.name,
        specialization=tech_in.specialization or "General Service",
        availability="Available",
        status="active"
    )
    db.add(mech)
    center.total_mechanics = (center.total_mechanics or 0) + 1
    db.add(center)

    # 3. Audit trail
    audit = AuditLog(
        user_id=current_user.id,
        action="BRANCH_TECHNICIAN_CREATED",
        entity="User",
        entity_id=str(tech_user.id),
        details=f"Branch Manager '{current_user.name}' ({current_user.email}) created floor technician '{tech_user.name}' ({tech_user.email}) for '{center.name}'"
    )
    db.add(audit)
    db.commit()

    # 4. Broadcast via WebSocket
    await ws_manager.broadcast({
        "event": "TECHNICIAN_CREATED",
        "service_center_id": center.id,
        "technician_id": tech_user.id,
        "name": tech_user.name,
        "email": tech_user.email,
        "specialization": mech.specialization
    })

    return TechnicianResponse(
        id=tech_user.id,
        user_id=tech_user.id,
        name=tech_user.name,
        email=tech_user.email,
        phone=tech_user.phone,
        role="technician",
        specialization=mech.specialization,
        availability=mech.availability,
        status=tech_user.status,
        service_center_id=center.id,
        service_center_name=center.name,
        created_at=tech_user.created_at
    )

@router.delete("/{center_id}/technicians/{tech_user_id}")
async def deactivate_floor_technician(
    center_id: int,
    tech_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    if current_user.role == "branch_manager":
        is_assigned = (center.manager_id == current_user.id) or (current_user.service_center_id == center_id)
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Unauthorized")
    elif current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    tech_user = db.query(User).filter(User.id == tech_user_id, User.service_center_id == center_id).first()
    # Also remove corresponding Mechanic row if exists
    mech = db.query(Mechanic).filter(
        (Mechanic.user_id == tech_user_id) | ((Mechanic.service_center_id == center_id) & (Mechanic.name == tech_user.name))
    ).first()
    if mech:
        db.delete(mech)
        if center.total_mechanics and center.total_mechanics > 0:
            center.total_mechanics = max(0, center.total_mechanics - 1)
            db.add(center)

    tech_user.status = "inactive"
    db.commit()
    recalculate_center_workload(db, center_id)
    await ws_manager.broadcast({
        "event": "TECHNICIAN_DEACTIVATED",
        "service_center_id": center_id,
        "technician_id": tech_user_id,
        "name": tech_user.name
    })

    return {"message": f"Technician {tech_user.name} removed successfully", "technician_id": tech_user_id}
