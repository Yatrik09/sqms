import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="customer") # super_admin, franchise_owner, branch_manager, customer
    status = Column(String(30), default="active") # active, inactive, suspended
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # User Geographical Location
    city = Column(String(100), default="Ahmedabad")
    area = Column(String(100), default="Science City")
    latitude = Column(Float, nullable=True, default=23.0784)
    longitude = Column(Float, nullable=True, default=72.5074)

    # Franchise Subscription & Plan Details
    plan_tier = Column(String(50), default="none") # none, starter, growth, enterprise
    plan_name = Column(String(100), default="None")
    max_allowed_centers = Column(Integer, default=0) # 0 for customer, 1 for starter, 5 for growth, 999 for enterprise
    subscription_status = Column(String(30), default="inactive") # active, inactive, expired
    subscription_id = Column(String(100), nullable=True)

    # Assigned Service Center (for technicians and branch staff)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=True)

    # Relationships
    customer_profile = relationship("Customer", back_populates="user", uselist=False)
    managed_centers = relationship("ServiceCenter", back_populates="manager", foreign_keys="ServiceCenter.manager_id")
    assigned_service_center = relationship("ServiceCenter", foreign_keys=[service_center_id])
    owned_franchises = relationship("Franchise", back_populates="owner")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    invoices = relationship("SubscriptionInvoice", back_populates="user")


class SubscriptionInvoice(Base):
    __tablename__ = "subscription_invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    plan_id = Column(String(50), nullable=False)
    plan_name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    gst_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    billing_period = Column(String(20), default="monthly")
    payment_method = Column(String(50), default="card")
    payment_reference = Column(String(100), nullable=False)
    payment_status = Column(String(30), default="succeeded")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="invoices")
    franchise = relationship("Franchise")


class SubscriptionPlanModel(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    price_monthly = Column(Float, nullable=False, default=499.0)
    price_yearly = Column(Float, nullable=False, default=5000.0)
    max_centers = Column(Integer, default=1)
    max_bays_per_center = Column(Integer, default=8)
    max_managers = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    features = Column(JSON, default=list)
    badge = Column(String(50), nullable=True, default="Standard")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Franchise(Base):
    __tablename__ = "franchises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(30), default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_franchises")
    service_centers = relationship("ServiceCenter", back_populates="franchise")


class ServiceCenter(Base):
    __tablename__ = "service_centers"

    id = Column(Integer, primary_key=True, index=True)
    franchise_id = Column(Integer, ForeignKey("franchises.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(150), nullable=False, index=True)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    area = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(30), nullable=False)
    capacity = Column(Integer, default=50)
    total_bays = Column(Integer, default=8)
    total_mechanics = Column(Integer, default=8)
    current_workload = Column(Float, default=0.5) # 0.0 to 1.0
    status = Column(String(30), default="active") # active, busy, maintenance, closed
    operating_hours_start = Column(String(10), default="08:00")
    operating_hours_end = Column(String(10), default="19:00")
    supported_services = Column(JSON, default=list) # List of service names

    # Relationships
    franchise = relationship("Franchise", back_populates="service_centers")
    manager = relationship("User", back_populates="managed_centers", foreign_keys=[manager_id])
    mechanics = relationship("Mechanic", back_populates="service_center")
    service_bays = relationship("ServiceBay", back_populates="service_center")
    service_requests = relationship("ServiceRequest", back_populates="service_center")


class Mechanic(Base):
    __tablename__ = "mechanics"

    id = Column(Integer, primary_key=True, index=True)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), default="General Service") # General Service, Engine, Electrical, Painting, Accidental
    availability = Column(String(30), default="Available") # Available, Busy, Break, Off Duty
    status = Column(String(30), default="active")
    current_service_id = Column(Integer, nullable=True)

    # Relationships
    service_center = relationship("ServiceCenter", back_populates="mechanics")
    user = relationship("User", foreign_keys=[user_id])


class ServiceBay(Base):
    __tablename__ = "service_bays"

    id = Column(Integer, primary_key=True, index=True)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=False, index=True)
    bay_number = Column(String(20), nullable=False)
    supported_service_type = Column(String(100), default="General Service")
    status = Column(String(30), default="Available") # Available, Occupied, Maintenance, Disabled
    current_service_id = Column(Integer, nullable=True)

    # Relationships
    service_center = relationship("ServiceCenter", back_populates="service_bays")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    email = Column(String(150), nullable=False)

    # Relationships
    user = relationship("User", back_populates="customer_profile")
    vehicles = relationship("Vehicle", back_populates="customer")
    service_requests = relationship("ServiceRequest", back_populates="customer")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    registration_number = Column(String(30), unique=True, index=True, nullable=False)
    vehicle_type = Column(String(50), nullable=False) # Sedan, SUV, Hatchback, Luxury, Bike, EV
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    fuel_type = Column(String(30), default="Petrol") # Petrol, Diesel, Electric, Hybrid, CNG

    # Relationships
    customer = relationship("Customer", back_populates="vehicles")
    service_requests = relationship("ServiceRequest", back_populates="vehicle")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50), default="Maintenance") # Maintenance, Repair, Detailing, Inspection
    estimated_base_duration = Column(Integer, default=60) # minutes
    active = Column(Boolean, default=True)


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=False, index=True)
    service_type = Column(String(100), nullable=False)
    repair_type = Column(String(50), default="Standard")
    requested_date = Column(String(20), nullable=False)
    preferred_time = Column(String(20), nullable=True)
    required_completion_time = Column(String(20), nullable=True) # e.g. "17:00" or "5:00 PM"
    priority = Column(String(20), default="Normal") # Normal, High, Emergency, Walk-in
    status = Column(String(50), default="Booking Confirmed", index=True)
    notes = Column(Text, nullable=True)
    damage_assessment = Column(String(50), nullable=True) # Minor, Moderate, Major Damage
    damage_image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="service_requests")
    vehicle = relationship("Vehicle", back_populates="service_requests")
    service_center = relationship("ServiceCenter", back_populates="service_requests")
    queue_entry = relationship("QueueEntry", back_populates="service_request", uselist=False)
    status_history = relationship("ServiceStatusHistory", back_populates="service_request")
    predictions = relationship("Prediction", back_populates="service_request")
    booking = relationship("Booking", back_populates="service_request", uselist=False)


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), unique=True, nullable=False)
    token_number = Column(String(30), unique=True, index=True, nullable=False)
    queue_position = Column(Integer, default=1, index=True)
    status = Column(String(50), default="Waiting", index=True) # Waiting, In Service, Completed, Cancelled
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    assigned_bay_id = Column(Integer, ForeignKey("service_bays.id"), nullable=True)
    assigned_mechanic_id = Column(Integer, ForeignKey("mechanics.id"), nullable=True)

    # Relationships
    service_request = relationship("ServiceRequest", back_populates="queue_entry")
    assigned_bay = relationship("ServiceBay")
    assigned_mechanic = relationship("Mechanic")


class ServiceStatusHistory(Base):
    __tablename__ = "service_status_history"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=False, index=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    service_request = relationship("ServiceRequest", back_populates="status_history")
    changer = relationship("User")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=False, index=True)
    waiting_time = Column(Integer, nullable=False) # minutes
    service_duration = Column(Integer, nullable=False) # minutes
    completion_time = Column(String(50), nullable=False) # formatted string
    model_version = Column(String(50), default="v1.0")
    prediction_source = Column(String(50), default="Production ML Model")
    factors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    service_request = relationship("ServiceRequest", back_populates="predictions")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_requests.id"), unique=True, nullable=False)
    booking_date = Column(String(20), nullable=False)
    slot = Column(String(50), nullable=False) # e.g. "09:00 - 10:00"
    status = Column(String(30), default="Confirmed") # Confirmed, Completed, Cancelled

    # Relationships
    service_request = relationship("ServiceRequest", back_populates="booking")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), default="info") # booking, queue, status, delay, ready
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class MLModelRecord(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    target = Column(String(50), nullable=False) # waiting_time, service_duration
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2 = Column(Float, nullable=False)
    dataset_version = Column(String(50), default="synthetic_v1.0")
    trained_at = Column(DateTime, default=datetime.datetime.utcnow)
    active = Column(Boolean, default=False)
    feature_importances = Column(JSON, default=dict)
    parameters = Column(JSON, default=dict)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)

