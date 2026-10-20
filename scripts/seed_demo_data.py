"""
Clean Production Seeder for SQMS.
Seeds:
- Core Services Catalog (12 standard vehicle service types)
- Super Admin Account (admin@demo.local / AdminPassword123!)
All other entities (Franchises, Service Centers, Bays, Mechanics, Customers, Queues)
start clean for dynamic end-to-end user onboarding.
"""

import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.database.session import engine, Base, SessionLocal
from app.models.entities import (
    User, Service, AuditLog
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

def seed_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Cleaning previous data to establish clean baseline...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        print("\n1. Seeding Core Automotive Services...")
        for s in DEMO_SERVICES:
            serv = Service(**s)
            db.add(serv)
        db.commit()

        print("\n2. Seeding Sole Super Admin Account...")
        admin_user = User(
            name="Super Administrator",
            email="admin@demo.local",
            phone="+91 98765 00001",
            password_hash=get_password_hash("AdminPassword123!"),
            role="super_admin",
            status="active"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # Audit log
        audit = AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INIT",
            entity="System",
            entity_id="1",
            details="SQMS platform initialized with clean baseline and Super Admin account."
        )
        db.add(audit)
        db.commit()

        print("\n=======================================================")
        print("SEEDING COMPLETE SUCCESSFUL!")
        print("=======================================================")
        print("Super Admin Account:")
        print("  Email:    admin@demo.local")
        print("  Password: AdminPassword123!")
        print("Platform status: Clean baseline ready for Customer & Franchise onboarding.")
        print("=======================================================")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
