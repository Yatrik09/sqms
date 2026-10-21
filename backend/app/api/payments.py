import hmac
import hashlib
import time
import uuid
import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
try:
    import razorpay
except ImportError:
    razorpay = None

from app.core.config import settings
from app.database.session import get_db
from app.models.entities import User, Franchise, ServiceCenter, ServiceBay, Mechanic, SubscriptionInvoice, AuditLog, SubscriptionPlanModel
from app.api.deps import get_optional_current_user
from app.api.subscriptions import AVAILABLE_PLANS
from app.schemas.schemas import (
    RazorpayOrderCreateRequest,
    RazorpayOrderResponse,
    RazorpayPaymentVerifyRequest,
    RazorpayPaymentVerifyResponse
)

router = APIRouter(tags=["Razorpay Payments"])

def get_razorpay_client():
    """Initialize and return Razorpay client using configured environment credentials."""
    if not razorpay:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay library is not installed."
        )
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay API keys are not configured in environment."
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.get("/razorpay/config")
def get_razorpay_config():
    """Return public Razorpay configuration (Public Key ID only)."""
    return {
        "key_id": settings.RAZORPAY_KEY_ID,
        "currency": "INR"
    }


@router.post("/create-order", response_model=RazorpayOrderResponse)
@router.post("/payments/create-order", response_model=RazorpayOrderResponse)
def create_razorpay_order(
    req: RazorpayOrderCreateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Create a Razorpay Order.
    - Validates amount >= 100 paise (₹1.00).
    - Calls Razorpay Orders API: POST https://api.razorpay.com/v1/orders
    - Returns { order_id, amount, currency, key_id, receipt }
    """
    # 1. Minimum amount validation (in paise)
    if req.amount < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum order amount must be at least 100 paise (₹1.00)."
        )

    client = get_razorpay_client()

    receipt_id = req.receipt or f"rcpt_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    order_payload = {
        "amount": int(req.amount),
        "currency": req.currency or "INR",
        "receipt": receipt_id,
        "notes": req.notes or {}
    }

    if current_user:
        order_payload["notes"]["user_id"] = str(current_user.id)
        order_payload["notes"]["user_email"] = current_user.email

    try:
        razorpay_order = client.order.create(data=order_payload)
    except razorpay.errors.AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Razorpay authentication failed: {str(e)}"
        )
    except razorpay.errors.BadRequestError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Razorpay bad request: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay order: {str(e)}"
        )

    return RazorpayOrderResponse(
        order_id=razorpay_order["id"],
        amount=razorpay_order["amount"],
        currency=razorpay_order["currency"],
        key_id=settings.RAZORPAY_KEY_ID,
        receipt=razorpay_order.get("receipt", receipt_id)
    )


@router.post("/verify-payment", response_model=RazorpayPaymentVerifyResponse)
@router.post("/payments/verify-payment", response_model=RazorpayPaymentVerifyResponse)
def verify_razorpay_payment(
    req: RazorpayPaymentVerifyRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 3: Verify Razorpay Payment Signature.
    - Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    - Compares generated signature with razorpay_signature.
    - Fails with 400 if missing fields or signature mismatch.
    - Marks subscription / records invoice upon success.
    """
    # 1. Missing fields validation
    if not req.razorpay_order_id or not req.razorpay_payment_id or not req.razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all mandatory."
        )

    # 2. Signature verification using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8")
    secret_bytes = settings.RAZORPAY_KEY_SECRET.encode("utf-8")

    generated_signature = hmac.new(
        secret_bytes,
        message,
        hashlib.sha256
    ).hexdigest()

    is_valid = hmac.compare_digest(generated_signature, req.razorpay_signature)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Payment verification failed."
        )

    # Also verify via Razorpay client SDK utility for completeness
    try:
        client = get_razorpay_client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Razorpay SDK signature verification failed: {str(e)}"
        )

    invoice_number = None
    target_user = current_user
    if not target_user:
        if req.user_id:
            target_user = db.query(User).filter(User.id == req.user_id).first()
        elif req.user_email:
            target_user = db.query(User).filter(User.email == req.user_email.strip().lower()).first()
        elif req.notes:
            uid = req.notes.get("user_id") or req.notes.get("sqms_user_id")
            if uid:
                try:
                    target_user = db.query(User).filter(User.id == int(uid)).first()
                except Exception:
                    pass
            if not target_user:
                email = req.notes.get("customer_email") or req.notes.get("email") or req.notes.get("user_email")
                if email:
                    target_user = db.query(User).filter(User.email == str(email).strip().lower()).first()

    if not target_user and req.phone:
        target_user = db.query(User).filter(User.phone == req.phone.strip()).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot identify customer account to upgrade. Please ensure you are logged in."
        )

    franchise_obj = None
    center_obj = None

    # 3. Post-verification: Fulfill subscription and upgrade customer to franchise_owner
    plan_id = (req.plan_id or (req.notes and req.notes.get("plan_id")) or "growth").lower()
    plan_obj = db.query(SubscriptionPlanModel).filter(SubscriptionPlanModel.id == plan_id).first()
    if not plan_obj:
        plan_obj = next((p for p in AVAILABLE_PLANS if p.id.lower() == plan_id), None)

    plan_names = {
        "starter": "Single Hub Starter",
        "growth": "Multi-Branch Growth",
        "enterprise": "Enterprise Franchise"
    }
    plan_name = plan_obj.name if plan_obj else plan_names.get(plan_id, plan_id.title())
    max_centers_map = {
        "starter": 1,
        "growth": 5,
        "enterprise": 999
    }
    max_centers = plan_obj.max_centers if plan_obj else max_centers_map.get(plan_id, 1)

    is_yearly = (req.billing_period == "yearly")
    base_price = float(plan_obj.price_yearly if is_yearly else plan_obj.price_monthly) if plan_obj else 1499.0
    gst_amount = round(base_price * 0.18, 2)
    total_price = round(base_price + gst_amount, 2)

    # 3.1 Upgrade User Role & Plan Tier if target_user exists
    invoice_number = None
    if target_user:
        target_user.plan_tier = plan_id
        target_user.plan_name = plan_name
        target_user.max_allowed_centers = max_centers
        target_user.subscription_status = "active"
        target_user.subscription_id = f"sub_rzp_{req.razorpay_payment_id}"
        if target_user.role != "super_admin":
            target_user.role = "franchise_owner"
        db.add(target_user)
        db.commit()

        # 3.2 Create or find Franchise
        f_name = (
            req.franchise_name or
            (req.notes and req.notes.get("franchise_name")) or
            f"{target_user.name.split()[0]} Auto Mobility Group"
        ).strip()

        franchise_obj = db.query(Franchise).filter(Franchise.owner_id == target_user.id).first()
        if not franchise_obj:
            franchise_obj = Franchise(
                name=f_name,
                owner_id=target_user.id,
                status="active"
            )
            db.add(franchise_obj)
            db.commit()
            db.refresh(franchise_obj)
        else:
            if req.franchise_name:
                franchise_obj.name = req.franchise_name.strip()
                db.add(franchise_obj)
                db.commit()

        # 3.3 Record Invoice
        invoice_number = f"INV-RZP-{datetime.datetime.utcnow().year}-{req.razorpay_payment_id[-6:]}"
        invoice = SubscriptionInvoice(
            user_id=target_user.id,
            franchise_id=franchise_obj.id,
            invoice_number=invoice_number,
            plan_id=plan_id,
            plan_name=plan_name,
            amount=base_price,
            gst_amount=gst_amount,
            total_amount=total_price,
            billing_period=req.billing_period or "monthly",
            payment_method="razorpay",
            payment_reference=req.razorpay_payment_id,
            payment_status="succeeded"
        )
        db.add(invoice)
        db.commit()

        # 3.4 Check if primary center already exists for this franchise
        center_obj = db.query(ServiceCenter).filter(ServiceCenter.franchise_id == franchise_obj.id).first()
        if not center_obj:
            c_name = (
                req.primary_center_name or
                (req.notes and req.notes.get("primary_center_name")) or
                f"{f_name} - Central Hub"
            ).strip()
            c_city = (req.city or (req.notes and req.notes.get("city")) or target_user.city or "Ahmedabad").strip()
            c_area = (req.area or (req.notes and req.notes.get("area")) or target_user.area or "Science City").strip()
            c_address = (req.address or (req.notes and req.notes.get("address")) or "Plot 42, Motorway Hub").strip()
            c_phone = (req.phone or (req.notes and req.notes.get("phone")) or target_user.phone or "+91 98250 12345").strip()
            bays_count = int(req.total_bays or (req.notes and req.notes.get("total_bays")) or 6)
            mechs_count = int(req.total_mechanics or (req.notes and req.notes.get("total_mechanics")) or 6)

            center_obj = ServiceCenter(
                franchise_id=franchise_obj.id,
                manager_id=None,
                name=c_name,
                address=c_address,
                city=c_city,
                area=c_area,
                latitude=23.03,
                longitude=72.55,
                phone=c_phone,
                capacity=bays_count * 8,
                total_bays=bays_count,
                total_mechanics=mechs_count,
                current_workload=0.0,
                status="active",
                operating_hours_start="08:00",
                operating_hours_end="20:00",
                supported_services=[
                    "General Service", "Oil Change", "Car Wash", "Brake Service",
                    "AC Service", "Battery Check", "Tyre Service", "Electrical Repair", "Diagnosis"
                ]
            )
            db.add(center_obj)
            db.commit()
            db.refresh(center_obj)

            # Generate Initial Service Bays and Mechanics
            bay_types = ["General Service", "Quick Service", "Inspection", "Washing", "Accidental Repair"]
            for i in range(1, bays_count + 1):
                st = bay_types[(i - 1) % len(bay_types)]
                bay = ServiceBay(
                    service_center_id=center_obj.id,
                    bay_number=f"Bay-{i:02d}",
                    supported_service_type=st,
                    status="Available"
                )
                db.add(bay)

            for i in range(1, mechs_count + 1):
                spec = bay_types[(i - 1) % len(bay_types)]
                mech = Mechanic(
                    service_center_id=center_obj.id,
                    name=f"Technician {i} ({center_obj.name[:10]})",
                    specialization=spec,
                    availability="Available",
                    status="active"
                )
                db.add(mech)
            db.commit()

        # 3.5 Record Audit Log
        audit = AuditLog(
            user_id=target_user.id,
            action="FRANCHISE_PLAN_PURCHASED_RAZORPAY",
            entity="Franchise",
            entity_id=str(franchise_obj.id),
            details=f"User {target_user.email} purchased {plan_name} via Razorpay ({req.razorpay_payment_id}). Created/linked center '{center_obj.name}'"
        )
        db.add(audit)
        db.commit()
        db.refresh(target_user)

    return RazorpayPaymentVerifyResponse(
        success=True,
        message="Payment verified successfully! Subscribed to franchise plan.",
        order_id=req.razorpay_order_id,
        payment_id=req.razorpay_payment_id,
        signature_valid=True,
        invoice_id=invoice_number,
        plan_id=target_user.plan_tier if target_user else None,
        plan_name=target_user.plan_name if target_user else None,
        max_centers=target_user.max_allowed_centers if target_user else None,
        franchise_id=franchise_obj.id if franchise_obj else None,
        franchise_name=franchise_obj.name if franchise_obj else None,
        primary_center_id=center_obj.id if center_obj else None,
        primary_center_name=center_obj.name if center_obj else None,
        user_role=target_user.role if target_user else None
    )
