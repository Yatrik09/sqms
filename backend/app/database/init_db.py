"""
Database initialization and automatic seed routine on application startup.
Ensures core services and essential demo persona accounts exist so the system is immediately usable.
"""
from app.database.session import engine, Base, SessionLocal
from app.models.entities import (
    User, Service, Franchise, ServiceCenter, Customer, Vehicle, ServiceRequest, QueueEntry, Prediction
)
from app.core.security import get_password_hash

DEMO_SERVICES = [
    {"name": "General Service", "category": "Maintenance", "estimated_base_duration": 65},
    {"name": "Oil Change", "category": "Maintenance", "estimated_base_duration": 30},
    {"name": "Car Wash", "category": "Detailing", "estimated_base_duration": 25},
    {"name": "AC Service", "category": "Maintenance", "estimated_base_duration": 55},
    {"name": "Brake Service", "category": "Repair", "estimated_base_duration": 50},
    {"name": "Battery Check", "category": "Inspection", "estimated_base_duration": 20},
    {"name": "Tyre Service", "category": "Maintenance", "estimated_base_duration": 35},
    {"name": "Electrical Repair", "category": "Repair", "estimated_base_duration": 75},
    {"name": "Diagnosis", "category": "Inspection", "estimated_base_duration": 40},
    {"name": "Denting and Painting", "category": "Repair", "estimated_base_duration": 180},
    {"name": "Minor Accident Repair", "category": "Repair", "estimated_base_duration": 150},
    {"name": "Major Accident Repair", "category": "Repair", "estimated_base_duration": 280},
]

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Ensure Services Catalog
        existing_services = db.query(Service).count()
        if existing_services == 0:
            for s in DEMO_SERVICES:
                db.add(Service(**s))
            db.commit()
            print("[InitDB] Core automotive services catalog seeded.")

        # 2. Ensure Super Admin
        admin = db.query(User).filter(User.email == "admin@demo.local").first()
        if not admin:
            admin = User(
                name="Super Administrator",
                email="admin@demo.local",
                phone="+91 98765 00001",
                password_hash=get_password_hash("AdminPassword123!"),
                role="super_admin",
                status="active"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("[InitDB] Super Admin created: admin@demo.local / AdminPassword123!")

        # 3. Ensure Franchise Owner
        owner = db.query(User).filter(User.email == "owner@demo.local").first()
        if not owner:
            owner = User(
                name="Vikramaditya Singhania",
                email="owner@demo.local",
                phone="+91 98250 88990",
                password_hash=get_password_hash("OwnerPassword123!"),
                role="franchise_owner",
                status="active",
                plan_tier="growth",
                plan_name="Multi-Branch Growth",
                max_allowed_centers=5,
                subscription_status="active"
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)
            print("[InitDB] Franchise Owner created: owner@demo.local / OwnerPassword123!")

        # 4. Ensure Franchise
        franchise = db.query(Franchise).first()
        if not franchise:
            franchise = Franchise(
                name="Apex Auto Mobility Group",
                owner_id=owner.id
            )
            db.add(franchise)
            db.commit()
            db.refresh(franchise)
            print("[InitDB] Franchise created.")

        # 5. Ensure Service Center
        center = db.query(ServiceCenter).first()
        if not center:
            center = ServiceCenter(
                name="Apex Auto Express - Central Hub",
                address="Plot 42, MIDC Central Road, Andheri East",
                city="Mumbai",
                area="Andheri East",
                latitude=19.1136,
                longitude=72.8697,
                phone="+91 22 2830 0001",
                franchise_id=franchise.id,
                total_bays=6,
                total_mechanics=5,
                operating_hours_start="08:00",
                operating_hours_end="20:00"
            )
            db.add(center)
            db.commit()
            db.refresh(center)
            print("[InitDB] Primary Service Center created.")

        # 6. Ensure Branch Manager
        manager = db.query(User).filter(User.email == "manager@demo.local").first()
        if not manager:
            manager = User(
                name="Arjun Mehta",
                email="manager@demo.local",
                phone="+91 98765 44321",
                password_hash=get_password_hash("ManagerPassword123!"),
                role="branch_manager",
                status="active"
            )
            db.add(manager)
            db.commit()
            db.refresh(manager)
            center.manager_id = manager.id
            db.commit()
            print("[InitDB] Branch Manager created: manager@demo.local / ManagerPassword123!")

        # 7. Ensure Customer
        cust_user = db.query(User).filter(User.email == "customer@demo.local").first()
        if not cust_user:
            cust_user = User(
                name="Amitabh Verma",
                email="customer@demo.local",
                phone="+91 98111 22334",
                password_hash=get_password_hash("CustomerPassword123!"),
                role="customer",
                status="active"
            )
            db.add(cust_user)
            db.commit()
            db.refresh(cust_user)

            cust_profile = Customer(
                user_id=cust_user.id,
                name=cust_user.name,
                email=cust_user.email,
                phone=cust_user.phone
            )
            db.add(cust_profile)
            db.commit()
            db.refresh(cust_profile)

            v1 = Vehicle(
                customer_id=cust_profile.id,
                registration_number="MH 02 BG 4521",
                vehicle_type="Sedan",
                model="Honda City ZX",
                fuel_type="Petrol",
                year=2023
            )
            db.add(v1)
            db.commit()
            print("[InitDB] Demo Customer & vehicle created: customer@demo.local / CustomerPassword123!")

        # 8. Ensure Technician
        tech = db.query(User).filter(User.email == "tech@demo.local").first()
        if not tech:
            tech = User(
                name="Ramesh Patel",
                email="tech@demo.local",
                phone="+91 98980 55667",
                password_hash=get_password_hash("TechPassword123!"),
                role="technician",
                status="active",
                service_center_id=1
            )
            db.add(tech)
            db.commit()
            print("[InitDB] Technician created: tech@demo.local / TechPassword123!")
        else:
            tech.role = "technician"
            tech.status = "active"
            if not tech.service_center_id:
                tech.service_center_id = 1
            db.commit()
            print("[InitDB] Technician verified: tech@demo.local / TechPassword123!")


    except Exception as e:
        print(f"[InitDB Error] {e}")
        db.rollback()
    finally:
        db.close()
