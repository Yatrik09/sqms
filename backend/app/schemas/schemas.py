from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- AUTH SCHEMAS ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    role: Optional[str] = "customer"
    city: Optional[str] = "Ahmedabad"
    area: Optional[str] = "Science City"
    latitude: Optional[float] = 23.0784
    longitude: Optional[float] = 72.5074

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    plan_tier: Optional[str] = "none"
    plan_name: Optional[str] = "None"
    max_allowed_centers: Optional[int] = 0
    subscription_status: Optional[str] = "inactive"
    city: Optional[str] = "Ahmedabad"
    area: Optional[str] = "Science City"
    latitude: Optional[float] = 23.0784
    longitude: Optional[float] = 72.5074
    service_center_id: Optional[int] = None
    service_center_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class TechnicianCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    specialization: Optional[str] = "General Service"

class TechnicianResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "technician"
    specialization: Optional[str] = "General Service"
    availability: Optional[str] = "Available"
    status: str = "active"
    service_center_id: int
    service_center_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserPasswordReset(BaseModel):
    email: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ForgotPasswordResponse(BaseModel):
    status: str
    message: str
    email: str
    expires_in_seconds: int = 600

class VerifyOTPResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# --- SUBSCRIPTION & FRANCHISE SCHEMAS ---
class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price_monthly: float
    price_yearly: float
    max_centers: int
    max_bays_per_center: int
    max_managers: int
    description: str
    features: List[str] = []
    badge: Optional[str] = None
    is_active: Optional[bool] = True

class SubscriptionPlanCreate(BaseModel):
    id: Optional[str] = None
    name: str
    price_monthly: float
    price_yearly: float
    max_centers: int = 1
    max_bays_per_center: int = 8
    max_managers: int = 1
    description: str = ""
    features: List[str] = []
    badge: Optional[str] = "Standard"

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    max_centers: Optional[int] = None
    max_bays_per_center: Optional[int] = None
    max_managers: Optional[int] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    badge: Optional[str] = None
    is_active: Optional[bool] = None


class SubscriptionPurchaseRequest(BaseModel):
    plan_id: str
    billing_period: Optional[str] = "monthly"
    franchise_name: str
    primary_center_name: str
    address: str
    city: str
    area: str
    phone: str
    total_bays: Optional[int] = 6
    total_mechanics: Optional[int] = 6
    payment_method: Optional[str] = "card"
    card_number: Optional[str] = None
    card_exp: Optional[str] = None
    card_cvv: Optional[str] = None
    cardholder_name: Optional[str] = None
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None

class BranchCreateRequest(BaseModel):
    name: str
    city: str
    area: str
    address: str
    phone: str
    total_bays: Optional[int] = 6
    total_mechanics: Optional[int] = 6
    latitude: Optional[float] = 23.03
    longitude: Optional[float] = 72.55

class BranchUpdateRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    total_bays: Optional[int] = None
    total_mechanics: Optional[int] = None
    operating_hours_start: Optional[str] = None
    operating_hours_end: Optional[str] = None
    manager_id: Optional[int] = None


class BranchManagerCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    service_center_id: int

class BranchManagerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    service_center_id: Optional[int] = None
    service_center_name: Optional[str] = None

# --- VEHICLE SCHEMAS ---
class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: str # Sedan, SUV, Hatchback, Luxury, Bike, EV
    model: str
    year: int
    fuel_type: str = "Petrol"

class VehicleResponse(BaseModel):
    id: int
    customer_id: int
    registration_number: str
    vehicle_type: str
    model: str
    year: int
    fuel_type: str
    
    class Config:
        from_attributes = True

# --- SERVICE CENTER SCHEMAS ---
class ServiceCenterBase(BaseModel):
    name: str
    address: str
    city: str
    area: str
    latitude: float
    longitude: float
    phone: str
    capacity: int = 50
    total_bays: int = 8
    total_mechanics: int = 8
    status: str = "active"
    operating_hours_start: str = "08:00"
    operating_hours_end: str = "19:00"
    supported_services: List[str] = []

class ServiceCenterCreate(ServiceCenterBase):
    franchise_id: Optional[int] = None
    manager_id: Optional[int] = None

class ServiceCenterResponse(ServiceCenterBase):
    id: int
    franchise_id: Optional[int] = None
    manager_id: Optional[int] = None
    current_workload: float
    available_bays: Optional[int] = 0
    available_mechanics: Optional[int] = 0
    active_queue_count: Optional[int] = 0
    manager_name: Optional[str] = None
    distance_km: Optional[float] = None
    
    class Config:
        from_attributes = True

# --- MECHANIC SCHEMAS ---
class MechanicBase(BaseModel):
    name: str
    specialization: str
    availability: str = "Available" # Available, Busy, Break, Off Duty
    status: str = "active"

class MechanicCreate(MechanicBase):
    service_center_id: int

class MechanicResponse(MechanicBase):
    id: int
    service_center_id: int
    current_service_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- SERVICE BAY SCHEMAS ---
class ServiceBayBase(BaseModel):
    bay_number: str
    supported_service_type: str
    status: str = "Available" # Available, Occupied, Maintenance, Disabled

class ServiceBayCreate(ServiceBayBase):
    service_center_id: int

class ServiceBayResponse(ServiceBayBase):
    id: int
    service_center_id: int
    current_service_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- BOOKING & QUEUE SCHEMAS ---
class BookingCreate(BaseModel):
    vehicle_id: int
    service_center_id: int
    service_type: str
    repair_type: Optional[str] = "Standard"
    requested_date: str
    preferred_time: Optional[str] = "10:00 AM"
    required_completion_time: Optional[str] = None # e.g. "05:00 PM"
    notes: Optional[str] = None

class WalkInCreate(BaseModel):
    service_center_id: int
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    registration_number: str
    vehicle_type: str = "Sedan"
    model: str = "Standard Model"
    service_type: str
    repair_type: Optional[str] = "Standard"
    priority: Optional[str] = "Normal"
    notes: Optional[str] = None

class QueueStatusUpdate(BaseModel):
    new_status: str # e.g. Waiting, Service In Progress, Washing, Quality Check, Ready for Pickup, Completed, Cancelled
    assigned_bay_id: Optional[int] = None
    assigned_mechanic_id: Optional[int] = None
    notes: Optional[str] = None

class QueueEntryResponse(BaseModel):
    id: int
    service_request_id: int
    token_number: str
    queue_position: int
    status: str
    joined_at: datetime
    assigned_bay_id: Optional[int] = None
    assigned_mechanic_id: Optional[int] = None
    customer_name: Optional[str] = None
    vehicle_registration: Optional[str] = None
    vehicle_type: Optional[str] = None
    service_type: Optional[str] = None
    estimated_waiting_minutes: Optional[int] = None
    estimated_service_minutes: Optional[int] = None
    expected_completion_time: Optional[str] = None
    prediction_source: Optional[str] = None
    bay_number: Optional[str] = None
    mechanic_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- PREDICTION SCHEMAS ---
class PredictionRequest(BaseModel):
    service_center_id: int
    service_type: str
    vehicle_type: str = "Sedan"
    vehicle_category: str = "Mid-range"
    repair_type: str = "Standard"

class PredictionResponse(BaseModel):
    waiting_time_minutes: int
    service_duration_minutes: int
    total_turnaround_minutes: int
    expected_completion_time: str
    expected_completion_iso: str
    prediction_source: str
    model_name: str
    model_version: str
    contributing_factors: List[str]
    workload_level: str

# --- RECOMMENDATION SCHEMAS ---
class RecommendationRequest(BaseModel):
    service_type: str
    vehicle_type: str = "Sedan"
    required_completion_time: Optional[str] = None # e.g. "05:00 PM"
    customer_latitude: Optional[float] = 23.0225 # Default Demo City Center (Ahmedabad)
    customer_longitude: Optional[float] = 72.5714

class CenterRecommendationItem(BaseModel):
    service_center_id: int
    name: str
    address: str
    city: Optional[str] = "Ahmedabad"
    area: Optional[str] = "Science City"
    distance_km: float
    current_workload: float
    workload_label: str
    active_queue_length: int
    available_bays: int
    available_mechanics: int
    predicted_waiting_minutes: int
    predicted_service_minutes: int
    predicted_completion_time: str
    required_completion_time: Optional[str] = None
    is_time_feasible: bool
    feasibility_status: str
    recommendation_score: float
    recommendation_reasons: List[str]
    is_recommended: bool

class RecommendationResponse(BaseModel):
    service_type: str
    required_completion_time: Optional[str] = None
    recommended_center: CenterRecommendationItem
    alternative_centers: List[CenterRecommendationItem]
    scoring_methodology: str

# --- NOTIFICATION SCHEMA ---
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    read_status: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- AUDIT LOG SCHEMA ---
class AuditLogResponse(BaseModel):
    id: int
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

# --- RAZORPAY PAYMENT SCHEMAS ---
class RazorpayOrderCreateRequest(BaseModel):
    amount: int = Field(..., description="Amount in paise (minimum 100 paise = 1 INR)")
    currency: Optional[str] = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None

class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: Optional[str] = None
    receipt: Optional[str] = None

class RazorpayPaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    plan_id: Optional[str] = None
    billing_period: Optional[str] = "monthly"
    franchise_name: Optional[str] = None
    primary_center_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    phone: Optional[str] = None
    total_bays: Optional[int] = 6
    total_mechanics: Optional[int] = 6
    notes: Optional[Dict[str, Any]] = None


class RazorpayPaymentVerifyResponse(BaseModel):
    success: bool
    message: str
    order_id: str
    payment_id: str
    signature_valid: bool
    invoice_id: Optional[str] = None
    plan_id: Optional[str] = None
    plan_name: Optional[str] = None
    max_centers: Optional[int] = None
    franchise_id: Optional[int] = None
    franchise_name: Optional[str] = None
    primary_center_id: Optional[int] = None
    primary_center_name: Optional[str] = None
    user_role: Optional[str] = None


class ReallocateTechnicianRequest(BaseModel):
    technician_id: int
    from_center_id: int
    to_center_id: int
    reason: Optional[str] = "AI Workload Rebalance"

