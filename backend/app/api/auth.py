import re
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import User, Customer, AuditLog, ServiceCenter, PasswordResetOTP
from app.schemas.schemas import (
    UserLogin, UserRegister, UserResponse, UserProfileUpdate, Token, UserPasswordReset,
    ForgotPasswordRequest, ForgotPasswordResponse, VerifyOTPResetPasswordRequest
)
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user
from app.core.email_service import send_password_reset_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])

def make_user_response(user: User, db: Session) -> UserResponse:
    resp = UserResponse.model_validate(user)
    cid = user.service_center_id
    cname = None
    if user.role == "branch_manager":
        center = db.query(ServiceCenter).filter(ServiceCenter.manager_id == user.id).first()
        if center:
            cid = center.id
            cname = center.name
        elif cid:
            center = db.query(ServiceCenter).filter(ServiceCenter.id == cid).first()
            if center:
                cname = center.name
    elif cid:
        center = db.query(ServiceCenter).filter(ServiceCenter.id == cid).first()
        if center:
            cname = center.name
    resp.service_center_id = cid
    resp.service_center_name = cname
    return resp

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    clean_name = re.sub(r'\s*\([^)]*\)', '', user_in.name).strip()
    clean_phone = user_in.phone.strip() if user_in.phone else None

    # Public registration is strictly restricted to regular customers.
    # Staff roles (branch_manager, technician) are provisioned through Franchise Owner and Branch Manager portals.
    if user_in.role and user_in.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Public registration is only permitted for customers. Branch Managers are provisioned by the Franchise Owner, and Workshop Technicians are provisioned by the Branch Manager."
        )

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This email ID already exists. Please Sign In or use Reset Password."
        )

    user = User(
        name=clean_name,
        email=clean_email,
        phone=clean_phone,
        password_hash=get_password_hash(user_in.password),
        role="customer",
        status="active",
        city=user_in.city or "Ahmedabad",
        area=user_in.area or "Science City",
        latitude=user_in.latitude or 23.0784,
        longitude=user_in.longitude or 72.5074
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If role is customer, create corresponding customer profile
    if user.role == "customer":
        customer = Customer(
            user_id=user.id,
            name=user.name,
            phone=user.phone,
            email=user.email
        )
        db.add(customer)
        db.commit()

    # Log audit
    audit = AuditLog(
        user_id=user.id,
        action="USER_REGISTER",
        entity="User",
        entity_id=str(user.id),
        details=f"User registered with role: {user.role}"
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=make_user_response(user, db)
    )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    clean_email = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrong Email: No account found with this email address. Please check your email or create an account.",
        )

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong Password: The password you entered is incorrect. Please verify your password or use Reset Password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active":
        raise HTTPException(status_code=400, detail="Account is disabled or inactive.")

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity="User",
        entity_id=str(user.id),
        details=f"Successful login for {user.email}"
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=make_user_response(user, db)
    )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def request_password_reset_otp(request_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1 of Secure Password Reset:
    Verifies user identity by checking if registered account exists,
    generates a secure 6-digit OTP, and dispatches it via email.
    """
    clean_email = request_data.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrong Email: No account found with this email address. Please check your email or click Create Account.",
        )

    # Invalidate any existing active OTPs for this email
    existing_otps = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == clean_email,
        PasswordResetOTP.is_used == False
    ).all()
    for o in existing_otps:
        o.is_used = True

    # Generate cryptographically secure 6-digit OTP code (100000 - 999999)
    otp_code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    new_otp = PasswordResetOTP(
        email=clean_email,
        otp_code=otp_code,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        is_used=False,
        attempts=0
    )
    db.add(new_otp)
    db.commit()

    # Dispatch email (or safe simulation)
    dispatch_result = send_password_reset_otp(
        to_email=clean_email,
        otp_code=otp_code,
        user_name=user.name
    )

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_OTP_REQUESTED",
        entity="PasswordResetOTP",
        entity_id=str(new_otp.id),
        details=f"Verification OTP requested for {clean_email}"
    )
    db.add(audit)
    db.commit()

    return ForgotPasswordResponse(
        status="success",
        message="A 6-digit verification code has been dispatched to your email address.",
        email=clean_email,
        expires_in_seconds=600,
        dev_otp=dispatch_result.get("dev_otp")
    )

@router.post("/verify-otp-reset-password", response_model=Token)
def verify_otp_and_reset_password(
    data: VerifyOTPResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Step 2 of Secure Password Reset:
    Verifies the 6-digit OTP code before permitting the password change.
    Only when the OTP code is valid, non-expired, and matches does it update the password hash.
    """
    clean_email = data.email.strip().lower()
    clean_otp = data.otp.strip()

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrong Email: No account found with this email address.",
        )

    # Find the latest unexpired, unused OTP record
    now = datetime.utcnow()
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.email == clean_email,
            PasswordResetOTP.is_used == False,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification session. Please request a new OTP code.",
        )

    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect OTP attempts. For your security, this code is now void. Please request a new code.",
        )

    if now > otp_record.expires_at:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired (10-minute limit exceeded). Please request a new code.",
        )

    if otp_record.otp_code != clean_otp:
        otp_record.attempts += 1
        db.commit()
        remaining = max(0, 5 - otp_record.attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. Please check your OTP and try again ({remaining} attempts remaining).",
        )

    # OTP is valid! Consume it and update password
    otp_record.is_used = True
    user.password_hash = get_password_hash(data.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=user.id,
        action="USER_PASSWORD_RESET_SUCCESS",
        entity="User",
        entity_id=str(user.id),
        details=f"Password successfully reset via OTP verification for {user.email}"
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=make_user_response(user, db)
    )

@router.post("/reset-password", response_model=Token)
def reset_password(reset_data: UserPasswordReset, db: Session = Depends(get_db)):
    """Legacy endpoint kept for backward compatibility; enforces minimum 6 chars."""
    clean_email = reset_data.email.strip().lower()
    if len(reset_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wrong Email: No account found with this email address.",
        )
    user.password_hash = get_password_hash(reset_data.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=make_user_response(user, db)
    )

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return make_user_response(current_user, db)

@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.email and profile_data.email.lower() != current_user.email:
        existing = db.query(User).filter(User.email == profile_data.email.lower()).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="This email is already in use by another account.")
        current_user.email = profile_data.email.lower()

    if profile_data.name:
        current_user.name = re.sub(r'\s*\([^)]*\)', '', profile_data.name).strip()

    if profile_data.phone is not None:
        current_user.phone = profile_data.phone.strip()

    if profile_data.city is not None:
        current_user.city = profile_data.city.strip()

    if profile_data.area is not None:
        current_user.area = profile_data.area.strip()

    if profile_data.latitude is not None:
        current_user.latitude = profile_data.latitude

    if profile_data.longitude is not None:
        current_user.longitude = profile_data.longitude

    if profile_data.new_password:
        if not profile_data.current_password or not verify_password(profile_data.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password verification failed.")
        if len(profile_data.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
        current_user.password_hash = get_password_hash(profile_data.new_password)

    db.add(current_user)
    db.commit()

    # Sync with customer profile if present
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if customer:
        customer.name = current_user.name
        customer.email = current_user.email
        customer.phone = current_user.phone
        db.add(customer)
        db.commit()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="USER_PROFILE_UPDATE",
        entity="User",
        entity_id=str(current_user.id),
        details=f"User updated profile details: {current_user.name} ({current_user.email})"
    )
    db.add(audit)
    db.commit()

    db.refresh(current_user)
    return make_user_response(current_user, db)

