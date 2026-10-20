from typing import List, Optional
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.session import get_db
from app.models.entities import User, Franchise, ServiceCenter, ServiceBay, Mechanic, AuditLog, SubscriptionInvoice
from app.schemas.schemas import (
    SubscriptionPlan, SubscriptionPurchaseRequest, BranchCreateRequest, BranchManagerCreate,
    BranchManagerResponse, UserResponse
)
from app.core.security import get_password_hash
from app.api.deps import get_current_user

router = APIRouter(prefix="/subscription", tags=["Subscriptions & Franchise"])

AVAILABLE_PLANS = [
    SubscriptionPlan(
        id="starter",
        name="Single Hub Starter",
        price_monthly=499,
        price_yearly=5000,
        max_centers=1,
        max_bays_per_center=8,
        max_managers=1,
        description="Designed for single-location automotive service centers wanting real-time queue intelligence.",
        features=[
            "1 Service Center / Workshop listing",
            "Real-Time Dynamic Waiting Time Prediction",
            "Up to 8 Service Bays & 8 Technicians",
            "1 Branch Operations Manager account",
            "Live Customer Token Tracking & QR codes",
            "Standard Business Hours Support",
        ],
        badge="Single Workshop"
    ),
    SubscriptionPlan(
        id="growth",
        name="Multi-Branch Growth",
        price_monthly=1499,
        price_yearly=15000,
        max_centers=5,
        max_bays_per_center=15,
        max_managers=5,
        description="Ideal for growing auto service brands with multiple city locations and cross-branch balancing.",
        features=[
            "Up to 5 Service Centers across cities",
            "Multi-Branch Load Balancing & Workload Transfer",
            "Individual Branch Manager credentials (up to 5)",
            "Accident Repair AI Damage Classification",
            "Consolidated Executive Performance Analytics",
            "Priority Customer SMS & In-App Alerts",
            "Automated Workload Surge Predictions",
        ],
        badge="Most Popular"
    ),
    SubscriptionPlan(
        id="enterprise",
        name="Enterprise Franchise",
        price_monthly=1999,
        price_yearly=20000,
        max_centers=999,
        max_bays_per_center=30,
        max_managers=999,
        description="Full multi-city automotive franchise network with custom ML retraining and unlimited scale.",
        features=[
            "Unlimited Service Center branches",
            "Unlimited Branch Manager accounts",
            "Custom ML Model Retraining on center's proprietary data",
            "Cross-franchise resource dispatching & reordering",
            "Custom ERP & DMS Webhook Integrations",
            "Dedicated 24/7 Account Management & SLA",
            "White-glove data onboarding & technician training",
        ],
        badge="Full Network"
    ),
]

@router.get("/plans", response_model=List[SubscriptionPlan])
def get_plans():
    return AVAILABLE_PLANS

@router.post("/purchase")
def purchase_plan(
    req: SubscriptionPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = next((p for p in AVAILABLE_PLANS if p.id == req.plan_id), None)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid subscription plan selected.")

    is_yearly = req.billing_period == "yearly"
    base_price = float(plan.price_yearly if is_yearly else plan.price_monthly)
    gst_amount = round(base_price * 0.18, 2)
    total_price = round(base_price + gst_amount, 2)

    payment_ref = f"PAY-SQMS-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    invoice_num = f"INV-SQMS-{datetime.utcnow().year}-{random.randint(10000, 99999)}"

    # 1. Upgrade user role to franchise_owner with plan specifications
    current_user.role = "franchise_owner"
    current_user.plan_tier = plan.id
    current_user.plan_name = plan.name
    current_user.max_allowed_centers = plan.max_centers
    current_user.subscription_status = "active"
    current_user.subscription_id = payment_ref
    db.add(current_user)
    db.commit()

    # 2. Create or find Franchise
    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    if not franchise:
        franchise = Franchise(
            name=req.franchise_name.strip(),
            owner_id=current_user.id,
            status="active"
        )
        db.add(franchise)
        db.commit()
        db.refresh(franchise)
    else:
        franchise.name = req.franchise_name.strip()
        db.add(franchise)
        db.commit()

    # 3. Create Subscription Invoice Record
    invoice = SubscriptionInvoice(
        user_id=current_user.id,
        franchise_id=franchise.id,
        invoice_number=invoice_num,
        plan_id=plan.id,
        plan_name=plan.name,
        amount=base_price,
        gst_amount=gst_amount,
        total_amount=total_price,
        billing_period=req.billing_period or "monthly",
        payment_method=req.payment_method or "card",
        payment_reference=payment_ref,
        payment_status="succeeded"
    )
    db.add(invoice)
    db.commit()

    # 4. Check if primary center already exists for this franchise (Plan Upgrade scenario)
    center = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).first()
    if not center:
        # Create Primary Service Center only on first plan purchase
        center = ServiceCenter(
            franchise_id=franchise.id,
            manager_id=None, # Will be assigned when a branch manager is created
            name=req.primary_center_name.strip(),
            address=req.address.strip(),
            city=req.city.strip(),
            area=req.area.strip(),
            latitude=23.03, # Default regional geo coordinates
            longitude=72.55,
            phone=req.phone.strip(),
            capacity=req.total_bays * 8,
            total_bays=req.total_bays,
            total_mechanics=req.total_mechanics,
            current_workload=0.0,
            status="active",
            operating_hours_start="08:00",
            operating_hours_end="20:00",
            supported_services=[
                "General Service", "Oil Change", "Car Wash", "Brake Service",
                "AC Service", "Battery Check", "Tyre Service", "Electrical Repair", "Diagnosis"
            ]
        )
        db.add(center)
        db.commit()
        db.refresh(center)

        # 5. Generate Initial Service Bays and Mechanics
        bay_types = ["General Service", "Quick Service", "Inspection", "Washing", "Accidental Repair"]
        for i in range(1, req.total_bays + 1):
            st = bay_types[(i - 1) % len(bay_types)]
            bay = ServiceBay(
                service_center_id=center.id,
                bay_number=f"Bay-{i:02d}",
                supported_service_type=st,
                status="Available"
            )
            db.add(bay)

        for i in range(1, req.total_mechanics + 1):
            spec = bay_types[(i - 1) % len(bay_types)]
            mech = Mechanic(
                service_center_id=center.id,
                name=f"Technician {i} ({center.name[:10]})",
                specialization=spec,
                availability="Available",
                status="active"
            )
            db.add(mech)
        db.commit()

    # 6. Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="FRANCHISE_PLAN_PURCHASED",
        entity="Franchise",
        entity_id=str(franchise.id),
        details=f"User {current_user.email} purchased {plan.name} plan (₹{total_price:,.2f} via {req.payment_method}). Created center '{center.name}'"
    )
    db.add(audit)
    db.commit()

    db.refresh(current_user)

    return {
        "success": True,
        "message": f"Payment verified successfully! Subscribed to {plan.name}.",
        "plan_id": plan.id,
        "plan_name": plan.name,
        "max_centers": plan.max_centers,
        "invoice_number": invoice_num,
        "payment_reference": payment_ref,
        "total_amount": total_price,
        "franchise_id": franchise.id,
        "franchise_name": franchise.name,
        "primary_center_id": center.id,
        "primary_center_name": center.name,
        "user": UserResponse.model_validate(current_user)
    }

@router.get("/my-franchise")
def get_my_franchise(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Franchise Owner role required.")

    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    if not franchise:
        # Default or first franchise for seeded demo owner
        franchise = db.query(Franchise).first()

    centers = []
    if franchise:
        raw_centers = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).all()
        for c in raw_centers:
            mgr = c.manager
            centers.append({
                "id": c.id,
                "name": c.name,
                "city": c.city,
                "address": c.address,
                "phone": c.phone,
                "total_bays": c.total_bays,
                "total_mechanics": c.total_mechanics,
                "current_workload": c.current_workload,
                "manager_id": c.manager_id,
                "manager_name": mgr.name if mgr else "Unassigned",
                "manager_email": mgr.email if mgr else None,
            })

    return {
        "franchise_id": franchise.id if franchise else None,
        "franchise_name": franchise.name if franchise else "My Franchise",
        "centers": centers
    }

@router.post("/create-branch-manager", response_model=BranchManagerResponse)
def create_branch_manager(
    req: BranchManagerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only Franchise Owners can create Branch Managers.")

    # 1. Verify service center belongs to this franchise owner
    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    center = db.query(ServiceCenter).filter(ServiceCenter.id == req.service_center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found.")

    if current_user.role != "super_admin" and franchise and center.franchise_id != franchise.id:
        raise HTTPException(status_code=403, detail="You do not own this service center.")

    # 2. Check if email already exists
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email address already exists. Please choose a unique email.")

    # 3. Create User with role = branch_manager
    manager_user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        phone=req.phone.strip() if req.phone else None,
        password_hash=get_password_hash(req.password),
        role="branch_manager",
        status="active",
        service_center_id=center.id
    )
    db.add(manager_user)
    db.commit()
    db.refresh(manager_user)

    # 4. Assign manager to the specified service center
    center.manager_id = manager_user.id
    db.add(center)
    db.commit()

    # 5. Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="BRANCH_MANAGER_CREATED",
        entity="User",
        entity_id=str(manager_user.id),
        details=f"Franchise Owner {current_user.email} created Branch Manager '{manager_user.name}' ({manager_user.email}) for center '{center.name}'"
    )
    db.add(audit)
    db.commit()

    return BranchManagerResponse(
        id=manager_user.id,
        name=manager_user.name,
        email=manager_user.email,
        phone=manager_user.phone,
        role=manager_user.role,
        status=manager_user.status,
        created_at=manager_user.created_at,
        service_center_id=center.id,
        service_center_name=center.name
    )

@router.get("/branch-managers", response_model=List[BranchManagerResponse])
def get_branch_managers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Franchise Owner role required.")

    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    if not franchise and current_user.role == "super_admin":
        # Admin can view all
        managers = db.query(User).filter(User.role == "branch_manager").all()
    elif franchise:
        # Get centers of this franchise
        centers = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).all()
        mgr_ids = [c.manager_id for c in centers if c.manager_id is not None]
        managers = db.query(User).filter(User.id.in_(mgr_ids)).all() if mgr_ids else []
    else:
        managers = []

    res = []
    for m in managers:
        assigned_c = db.query(ServiceCenter).filter(ServiceCenter.manager_id == m.id).first()
        res.append(BranchManagerResponse(
            id=m.id,
            name=m.name,
            email=m.email,
            phone=m.phone,
            role=m.role,
            status=m.status,
            created_at=m.created_at,
            service_center_id=assigned_c.id if assigned_c else None,
            service_center_name=assigned_c.name if assigned_c else "Unassigned"
        ))

    return res

@router.post("/add-branch")
def add_branch(
    req: BranchCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["franchise_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Franchise Owner or Admin role required.")

    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    if not franchise:
        if current_user.role == "super_admin":
            franchise = db.query(Franchise).first()
        if not franchise:
            raise HTTPException(status_code=404, detail="No active franchise found for this user.")

    # Strictly verify plan center limit
    existing_centers_count = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).count()
    max_allowed = current_user.max_allowed_centers or (1 if current_user.role == 'franchise_owner' else 999)

    if current_user.role != "super_admin" and existing_centers_count >= max_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Plan Limit Reached! Your '{current_user.plan_name or 'Single Hub Starter'}' plan allows a maximum of {max_allowed} service center(s). You already have {existing_centers_count} active center(s). Please upgrade your subscription plan to add more workshop branches."
        )

    # Area coordinates lookup for accurate location matching
    area_coords = {
        "science city": (23.0784, 72.5074),
        "thaltej": (23.0500, 72.5167),
        "sg highway": (23.0380, 72.5120),
        "bodakdev": (23.0350, 72.5150),
        "vastrapur": (23.0350, 72.5290),
        "navrangpura": (23.0360, 72.5580),
        "chandkheda": (23.1080, 72.5850),
        "motera": (23.0950, 72.5950),
        "maninagar": (22.9970, 72.6030),
        "bapunagar": (23.0420, 72.6350),
        "nikol": (23.0520, 72.6710),
        "naroda": (23.0650, 72.6550),
        "bopal": (23.0320, 72.4680),
        "south bopal": (23.0180, 72.4620),
        "prahlad nagar": (23.0120, 72.5050),
        "iscon": (23.0280, 72.5060),
        "satellite": (23.0250, 72.5200),
        "ranip": (23.0800, 72.5700),
        "gota": (23.1020, 72.5350),
    }
    clean_area_key = req.area.strip().lower()
    default_lat, default_lon = area_coords.get(clean_area_key, (23.0380, 72.5120))
    resolved_lat = req.latitude if (req.latitude and req.latitude != 23.03) else default_lat
    resolved_lon = req.longitude if (req.longitude and req.longitude != 72.55) else default_lon

    # Create new Service Center under this franchise
    center = ServiceCenter(
        franchise_id=franchise.id,
        manager_id=None,
        name=req.name.strip(),
        address=req.address.strip(),
        city=req.city.strip(),
        area=req.area.strip(),
        latitude=resolved_lat,
        longitude=resolved_lon,
        phone=req.phone.strip(),
        capacity=(req.total_bays or 6) * 8,
        total_bays=req.total_bays or 6,
        total_mechanics=req.total_mechanics or 6,
        current_workload=0.0,
        status="active",
        operating_hours_start="08:00",
        operating_hours_end="20:00",
        supported_services=[
            "General Service", "Oil Change", "Car Wash", "Brake Service",
            "AC Service", "Battery Check", "Tyre Service", "Electrical Repair", "Diagnosis"
        ]
    )
    db.add(center)
    db.commit()
    db.refresh(center)

    # Initial bays & technicians
    bay_types = ["General Service", "Quick Service", "Inspection", "Washing", "Accidental Repair"]
    bays_count = req.total_bays or 6
    mechs_count = req.total_mechanics or 6

    for i in range(1, bays_count + 1):
        st = bay_types[(i - 1) % len(bay_types)]
        bay = ServiceBay(
            service_center_id=center.id,
            bay_number=f"Bay-{i:02d}",
            supported_service_type=st,
            status="Available"
        )
        db.add(bay)

    for i in range(1, mechs_count + 1):
        spec = bay_types[(i - 1) % len(bay_types)]
        mech = Mechanic(
            service_center_id=center.id,
            name=f"Technician {i} ({center.name[:10]})",
            specialization=spec,
            availability="Available",
            status="active"
        )
        db.add(mech)

    audit = AuditLog(
        user_id=current_user.id,
        action="FRANCHISE_BRANCH_ADDED",
        entity="ServiceCenter",
        entity_id=str(center.id),
        details=f"Franchise Owner {current_user.email} added new branch '{center.name}' in {center.city}"
    )
    db.add(audit)
    db.commit()
    db.refresh(center)

    return {
        "success": True,
        "message": f"Service center branch '{center.name}' successfully added!",
        "center": {
            "id": center.id,
            "name": center.name,
            "city": center.city,
            "address": center.address,
            "phone": center.phone,
            "total_bays": center.total_bays,
            "total_mechanics": center.total_mechanics
        }
    }

@router.get("/my-plan")
def get_my_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    franchise = db.query(Franchise).filter(Franchise.owner_id == current_user.id).first()
    centers_count = 0
    if franchise:
        centers_count = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).count()
    
    invoices = db.query(SubscriptionInvoice).filter(SubscriptionInvoice.user_id == current_user.id).order_by(SubscriptionInvoice.created_at.desc()).all()
    
    max_allowed = current_user.max_allowed_centers or (1 if current_user.role == 'franchise_owner' else 0)
    if current_user.role == "super_admin":
        max_allowed = 999
    
    return {
        "plan_tier": current_user.plan_tier or "none",
        "plan_name": current_user.plan_name or ("Platform Admin" if current_user.role == "super_admin" else "No Active Plan"),
        "max_allowed_centers": max_allowed,
        "current_centers_count": centers_count,
        "subscription_status": current_user.subscription_status or ("active" if current_user.role == "super_admin" else "inactive"),
        "can_add_more": (centers_count < max_allowed) or current_user.role == "super_admin",
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "plan_name": inv.plan_name,
                "amount": inv.amount,
                "gst_amount": inv.gst_amount,
                "total_amount": inv.total_amount,
                "billing_period": inv.billing_period,
                "payment_method": inv.payment_method,
                "payment_reference": inv.payment_reference,
                "created_at": inv.created_at.isoformat()
            } for inv in invoices
        ]
    }


@router.get("/admin/overview")
def get_admin_subscriptions_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin role required.")

    invoices = db.query(SubscriptionInvoice).order_by(SubscriptionInvoice.created_at.desc()).all()
    total_revenue = sum(inv.total_amount for inv in invoices)
    total_plans_sold = len(invoices)

    starter_invoices = [inv for inv in invoices if inv.plan_id == "starter"]
    growth_invoices = [inv for inv in invoices if inv.plan_id == "growth"]
    enterprise_invoices = [inv for inv in invoices if inv.plan_id == "enterprise"]

    tier_breakdown = {
        "starter": {
            "id": "starter",
            "name": "Single Hub Starter",
            "count": len(starter_invoices),
            "revenue": round(sum(inv.total_amount for inv in starter_invoices), 2),
            "price_monthly": 499,
            "badge": "Single Workshop"
        },
        "growth": {
            "id": "growth",
            "name": "Multi-Branch Growth",
            "count": len(growth_invoices),
            "revenue": round(sum(inv.total_amount for inv in growth_invoices), 2),
            "price_monthly": 11999,
            "badge": "Most Popular"
        },
        "enterprise": {
            "id": "enterprise",
            "name": "Enterprise Franchise",
            "count": len(enterprise_invoices),
            "revenue": round(sum(inv.total_amount for inv in enterprise_invoices), 2),
            "price_monthly": 24999,
            "badge": "Full Network"
        }
    }

    franchise_owners = db.query(User).filter(User.role == "franchise_owner").all()
    owners_list = []
    for fo in franchise_owners:
        franchise = db.query(Franchise).filter(Franchise.owner_id == fo.id).first()
        centers_count = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise.id).count() if franchise else 0
        owners_list.append({
            "id": fo.id,
            "name": fo.name,
            "email": fo.email,
            "phone": fo.phone,
            "franchise_id": franchise.id if franchise else None,
            "franchise_name": franchise.name if franchise else "Apex Mobility Hub",
            "plan_name": fo.plan_name or "Multi-Branch Growth",
            "max_allowed_centers": fo.max_allowed_centers or 5,
            "centers_count": centers_count,
            "status": fo.status or "active",
            "created_at": fo.created_at.strftime("%Y-%m-%d %H:%M") if fo.created_at else datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        })

    invoice_list = []
    for inv in invoices:
        u = db.query(User).filter(User.id == inv.user_id).first()
        invoice_list.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": u.name if u else "Franchise Owner",
            "customer_email": u.email if u else "",
            "plan_id": inv.plan_id,
            "plan_name": inv.plan_name,
            "amount": inv.amount,
            "gst_amount": inv.gst_amount,
            "total_amount": inv.total_amount,
            "billing_period": inv.billing_period,
            "payment_method": inv.payment_method,
            "payment_reference": inv.payment_reference,
            "payment_status": inv.payment_status or "succeeded",
            "created_at": inv.created_at.strftime("%Y-%m-%d %H:%M") if inv.created_at else datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        })

    return {
        "total_revenue": round(total_revenue, 2),
        "total_plans_sold": total_plans_sold,
        "tier_breakdown": tier_breakdown,
        "invoices": invoice_list,
        "franchise_owners": owners_list,
        "total_franchise_owners": len(owners_list),
        "total_franchises": db.query(Franchise).count()
    }


