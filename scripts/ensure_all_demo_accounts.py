"""
Script to ensure all 4 standard SQMS demo persona accounts exist with proper roles,
credentials, relationships, and sample data.
"""

import sys
import os
from datetime import datetime

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.session import SessionLocal
from app.models.entities import (
    User, Franchise, ServiceCenter, Customer, Vehicle, ServiceRequest, QueueEntry, Prediction
)
from app.core.security import get_password_hash

def ensure_demo_accounts():
    db = SessionLocal()
    try:
        print("Ensuring demo accounts in SQMS database...")

        # 1. Super Admin: admin@demo.local
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
            print("  [+] Created Super Admin: admin@demo.local / AdminPassword123!")
        else:
            admin.password_hash = get_password_hash("AdminPassword123!")
            admin.status = "active"
            db.commit()
            print("  [*] Updated Super Admin: admin@demo.local / AdminPassword123!")

        # 2. Franchise Owner: owner@demo.local
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
            print("  [+] Created Franchise Owner: owner@demo.local / OwnerPassword123!")
        else:
            owner.password_hash = get_password_hash("OwnerPassword123!")
            owner.role = "franchise_owner"
            owner.plan_tier = "growth"
            owner.plan_name = "Multi-Branch Growth"
            owner.max_allowed_centers = 5
            owner.subscription_status = "active"
            owner.status = "active"
            db.commit()
            print("  [*] Updated Franchise Owner: owner@demo.local / OwnerPassword123!")

        # Also support rajesh.patel@apexauto.in if present
        rajesh = db.query(User).filter(User.email == "rajesh.patel@apexauto.in").first()
        if rajesh:
            rajesh.password_hash = get_password_hash("PartnerPassword123!")
            db.commit()
            print("  [*] Verified secondary Franchise Owner: rajesh.patel@apexauto.in / PartnerPassword123!")

        # Ensure franchise belongs to owner
        franchise = db.query(Franchise).first()
        if not franchise:
            franchise = Franchise(
                name="Apex Auto Mobility Group",
                owner_id=owner.id
            )
            db.add(franchise)
            db.commit()
            db.refresh(franchise)
            print(f"  [+] Created Franchise: {franchise.name}")
        else:
            franchise.owner_id = owner.id
            db.commit()
            print(f"  [*] Linked Franchise #{franchise.id} ({franchise.name}) to owner #{owner.id}")

        # Ensure centers are linked to franchise
        centers = db.query(ServiceCenter).all()
        for c in centers:
            c.franchise_id = franchise.id
        db.commit()
        print(f"  [*] Linked {len(centers)} service centers to Franchise #{franchise.id}")

        # 3. Branch Manager: manager@demo.local
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
            print("  [+] Created Branch Manager: manager@demo.local / ManagerPassword123!")
        else:
            manager.name = "Arjun Mehta"
            manager.password_hash = get_password_hash("ManagerPassword123!")
            manager.role = "branch_manager"
            manager.status = "active"
            db.commit()
            print("  [*] Updated Branch Manager: manager@demo.local / ManagerPassword123!")

        # Assign manager to Center 1
        center1 = db.query(ServiceCenter).filter(ServiceCenter.id == 1).first()
        if center1:
            center1.manager_id = manager.id
            db.commit()
            print(f"  [*] Assigned manager #{manager.id} to Center #{center1.id} ({center1.name})")

        # 4. Customer: customer@demo.local
        customer_user = db.query(User).filter(User.email == "customer@demo.local").first()
        if not customer_user:
            customer_user = User(
                name="Amitabh Verma",
                email="customer@demo.local",
                phone="+91 98111 22334",
                password_hash=get_password_hash("CustomerPassword123!"),
                role="customer",
                status="active"
            )
            db.add(customer_user)
            db.commit()
            db.refresh(customer_user)
            print("  [+] Created Customer User: customer@demo.local / CustomerPassword123!")
        else:
            customer_user.name = "Amitabh Verma"
            customer_user.password_hash = get_password_hash("CustomerPassword123!")
            customer_user.role = "customer"
            customer_user.status = "active"
            db.commit()
            print("  [*] Updated Customer User: customer@demo.local / CustomerPassword123!")

        # Ensure Customer profile
        customer_profile = db.query(Customer).filter(Customer.user_id == customer_user.id).first()
        if not customer_profile:
            customer_profile = Customer(
                user_id=customer_user.id,
                name=customer_user.name,
                email=customer_user.email,
                phone=customer_user.phone
            )
            db.add(customer_profile)
            db.commit()
            db.refresh(customer_profile)
            print(f"  [+] Created Customer profile #{customer_profile.id}")
        else:
            customer_profile.name = "Amitabh Verma"
            db.commit()

        # 5. Workshop Floor Technician: tech@demo.local
        tech_user = db.query(User).filter(User.email == "tech@demo.local").first()
        if not tech_user:
            tech_user = User(
                name="Ramesh Patel",
                email="tech@demo.local",
                phone="+91 98980 55667",
                password_hash=get_password_hash("TechPassword123!"),
                role="technician",
                status="active"
            )
            db.add(tech_user)
            db.commit()
            db.refresh(tech_user)
            print("  [+] Created Technician: tech@demo.local / TechPassword123!")
        else:
            tech_user.password_hash = get_password_hash("TechPassword123!")
            tech_user.role = "technician"
            tech_user.status = "active"
            db.commit()
            print("  [*] Updated Technician: tech@demo.local / TechPassword123!")

        # Ensure customer has demo vehicles
        v1 = db.query(Vehicle).filter(Vehicle.customer_id == customer_profile.id, Vehicle.registration_number == "MH 02 BG 4521").first()
        if not v1:
            v1 = Vehicle(
                customer_id=customer_profile.id,
                registration_number="MH 02 BG 4521",
                vehicle_type="Sedan",
                model="Honda City ZX",
                fuel_type="Petrol",
                year=2023
            )
            db.add(v1)

        v2 = db.query(Vehicle).filter(Vehicle.customer_id == customer_profile.id, Vehicle.registration_number == "DL 01 AB 7890").first()
        if not v2:
            v2 = Vehicle(
                customer_id=customer_profile.id,
                registration_number="DL 01 AB 7890",
                vehicle_type="SUV",
                model="Hyundai Creta SX",
                fuel_type="Diesel",
                year=2024
            )
            db.add(v2)
        db.commit()
        print("  [*] Verified customer vehicles: MH 02 BG 4521 (Sedan) & DL 01 AB 7890 (SUV)")

        # Ensure an active service request and queue entry for customer demo
        active_req = db.query(ServiceRequest).filter(
            ServiceRequest.customer_id == customer_profile.id,
            ServiceRequest.status.notin_(["Completed", "Cancelled"])
        ).first()

        if not active_req:
            active_req = ServiceRequest(
                customer_id=customer_profile.id,
                vehicle_id=v1.id,
                service_center_id=1,
                service_type="General Service",
                requested_date=datetime.now().strftime("%Y-%m-%d"),
                preferred_time="10:00 AM",
                required_completion_time="05:00 PM",
                status="Waiting"
            )
            db.add(active_req)
            db.commit()
            db.refresh(active_req)

            q_entry = QueueEntry(
                service_request_id=active_req.id,
                token_number="T-01-007",
                status="Waiting",
                queue_position=1
            )
            db.add(q_entry)
            db.commit()
            db.refresh(q_entry)

            pred = Prediction(
                service_request_id=active_req.id,
                waiting_time=25,
                service_duration=55,
                completion_time="04:30 PM",
                model_version="v1.0",
                prediction_source="Production Gradient Boosting ML",
                factors=[
                    {"factor": "Active Queue Length", "impact": "+15 min", "direction": "increase"},
                    {"factor": "Mechanic Availability", "impact": "-5 min", "direction": "decrease"}
                ]
            )
            db.add(pred)
            db.commit()
            print("  [+] Created active service ticket T-01-007 for customer@demo.local")

        print("\nAll demo accounts and relationships successfully verified and ready!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    ensure_demo_accounts()
