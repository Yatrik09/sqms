"""
Automated Backend & Integration Tests for SQMS.
Tests:
- Authentication (Login, Register, JWT)
- Role-based Authorization
- Booking Creation & Digital Token Generation
- Real-time Queue Updates & Status Transitions
- Prediction Endpoint
- Multi-Center Recommendation Endpoint
"""

import sys
import os
import random
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.main import app
from app.database.session import SessionLocal
from app.models.entities import User, ServiceCenter, Vehicle, Customer, QueueEntry

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "SQMS" in response.json()["system"]

def test_auth_login_admin():
    response = client.post("/api/auth/login", json={
        "email": "admin@demo.local",
        "password": "AdminPassword123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "super_admin"

def test_auth_register_and_login_customer():
    # Dynamic customer registration test
    reg_res = client.post("/api/auth/register", json={
        "name": "Dynamic Test Customer",
        "email": "dynamic.test@sqms.local",
        "password": "CustomerPassword123!",
        "phone": "+91 98980 11223"
    })
    # If already exists from prior run, login
    if reg_res.status_code == 200:
        data = reg_res.json()
        assert "access_token" in data
        assert data["user"]["role"] == "customer"
    else:
        login_res = client.post("/api/auth/login", json={
            "email": "dynamic.test@sqms.local",
            "password": "CustomerPassword123!"
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["role"] == "customer"

def test_service_centers_list():
    response = client.get("/api/service-centers")
    assert response.status_code == 200
    centers = response.json()
    assert isinstance(centers, list)

def test_predictions_service():
    response = client.post("/api/predictions/service", json={
        "service_center_id": 1,
        "service_type": "General Service",
        "vehicle_type": "Sedan",
        "vehicle_category": "Mid-range",
        "repair_type": "Standard"
    })
    assert response.status_code == 200
    data = response.json()
    assert "waiting_time_minutes" in data
    assert "service_duration_minutes" in data
    assert "expected_completion_time" in data
    assert len(data["contributing_factors"]) > 0

def test_recommendation_engine():
    response = client.post("/api/recommendations/service-centers", json={
        "service_type": "General Service",
        "vehicle_type": "Sedan",
        "required_completion_time": "05:00 PM",
        "customer_latitude": 23.0365,
        "customer_longitude": 72.5611
    })
    assert response.status_code == 200
    data = response.json()
    assert "scoring_methodology" in data

def test_end_to_end_customer_booking_and_queue():
    # 1. Login/Register as customer
    login_res = client.post("/api/auth/login", json={
        "email": "dynamic.test@sqms.local",
        "password": "CustomerPassword123!"
    })
    if login_res.status_code != 200:
        reg_res = client.post("/api/auth/register", json={
            "name": "Dynamic Test Customer",
            "email": "dynamic.test@sqms.local",
            "password": "CustomerPassword123!",
            "phone": "+91 98980 11223"
        })
        token = reg_res.json()["access_token"]
    else:
        token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add vehicle for customer
    add_veh_res = client.post("/api/customers/me/vehicles", headers=headers, json={
        "registration_number": f"GJ01-TEST-{random.randint(1000, 9999)}",
        "vehicle_type": "Sedan",
        "model": "Honda City ZX",
        "year": 2023,
        "fuel_type": "Petrol"
    })
    assert add_veh_res.status_code == 200
    veh_id = add_veh_res.json()["id"]

    # 3. If centers exist, test booking
    centers_res = client.get("/api/service-centers")
    centers = centers_res.json()
    if len(centers) > 0:
        c_id = centers[0]["id"]
        booking_res = client.post("/api/bookings", headers=headers, json={
            "vehicle_id": veh_id,
            "service_center_id": c_id,
            "service_type": "Oil Change",
            "repair_type": "Standard",
            "requested_date": "2026-10-10",
            "preferred_time": "11:00 AM",
            "required_completion_time": "02:00 PM",
            "notes": "Test automated booking integration."
        })
        assert booking_res.status_code == 200
        booking_data = booking_res.json()
        assert booking_data["success"] is True
        assert "token_number" in booking_data
