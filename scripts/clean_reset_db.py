"""
Clean Database Reset Script for SQMS.
Resets the platform to a pristine, clean, real-world state:
- Retains ONLY the Main Platform Super Admin: admin@demo.local / AdminPassword123!
- Seeds the 12 standard automotive service types (General Service, Oil Change, etc.)
- Clears all mock/dummy users, franchise owners, branch managers, customers.
- Clears all 20 dummy service centers, bays, mechanics, queues, bookings, tokens.
Ready for fresh user registration, plan purchases, and dynamic workshop creation!
"""

import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.database.session import engine, Base, SessionLocal
from app.models.entities import (
    User, Franchise, ServiceCenter, Mechanic, ServiceBay,
    Customer, Vehicle, Service, ServiceRequest, QueueEntry,
    ServiceStatusHistory, Prediction, Booking, Notification,
    MLModelRecord, AuditLog, SubscriptionInvoice
)
from app.core.security import get_password_hash

STANDARD_SERVICES = [
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

from sqlalchemy import text

def clean_reset_database():
    print("Re-creating all Database tables...")
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys = OFF;"))
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [row[0] for row in result if not row[0].startswith("sqlite_")]
        for t in tables:
            conn.execute(text(f"DROP TABLE IF EXISTS \"{t}\";"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n1. Seeding Standard Service Catalog...")
        for s in STANDARD_SERVICES:
            serv = Service(**s)
            db.add(serv)
        db.commit()

        print("\n2. Seeding Sole Main Platform Administrator...")
        admin_user = User(
            name="Apex Central Platform Administrator",
            email="admin@demo.local",
            phone="+91 98765 00001",
            password_hash=get_password_hash("AdminPassword123!"),
            role="super_admin",
            status="active",
            plan_tier="none",
            plan_name=None,
            max_allowed_centers=999,
            subscription_status=None
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # Audit Log
        audit = AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INITIALIZED",
            entity="System",
            entity_id="1",
            details="SQMS platform initialized in clean production mode with sole Super Administrator."
        )
        db.add(audit)
        db.commit()

        print("\n=======================================================")
        print("SQMS DATABASE CLEANED & INITIALIZED SUCCESSFULLY!")
        print("-------------------------------------------------------")
        print(f"Main Admin Email:    {admin_user.email}")
        print(f"Main Admin Password: AdminPassword123!")
        print("All mock users, centers, and queues have been wiped.")
        print("Ready for live user signups, plan purchases & workshop creation.")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"Error during clean reset: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clean_reset_database()
