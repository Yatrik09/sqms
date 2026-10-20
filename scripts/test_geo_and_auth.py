import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("--- 1. Testing Login with Wrong Password ---")
res = client.post("/api/auth/login", json={"email": "yatrikpatel1331@gmail.com", "password": "WrongPassword999!"})
print("Status:", res.status_code)
print("Detail:", res.json())
assert res.status_code == 401
assert "password is incorrect" in res.json()["detail"].lower()

print("\n--- 2. Testing Login with Non-Existent Email ---")
res = client.post("/api/auth/login", json={"email": "nonexistent_email_12345@gmail.com", "password": "Password123!"})
print("Status:", res.status_code)
print("Detail:", res.json())
assert res.status_code == 404
assert "no account found" in res.json()["detail"].lower()

print("\n--- 3. Testing Login with Correct Password ---")
res = client.post("/api/auth/login", json={"email": "yatrikpatel1331@gmail.com", "password": "Password123!"})
print("Status:", res.status_code)
data = res.json()
print("Logged in user:", data["user"]["name"], "| Area:", data["user"].get("area"), "| City:", data["user"].get("city"))
assert res.status_code == 200

print("\n--- 4. Testing Service Centers Proximity from Science City (23.0784, 72.5074) ---")
res = client.get("/api/service-centers?latitude=23.0784&longitude=72.5074")
assert res.status_code == 200
centers = res.json()
print(f"Total Centers Returned: {len(centers)}")
for c in centers:
    print(f" -> {c['name']} [{c['area']}]: {c['distance_km']} km away")

assert centers[0]["area"] == "Science City", f"Expected Science City first, got {centers[0]['area']}"
assert centers[-1]["area"] == "Nikol", f"Expected Nikol furthest, got {centers[-1]['area']}"

print("\n--- 5. Testing Service Centers Proximity from Nikol (23.0520, 72.6710) ---")
res = client.get("/api/service-centers?latitude=23.0520&longitude=72.6710")
assert res.status_code == 200
centers_nikol = res.json()
for c in centers_nikol:
    print(f" -> {c['name']} [{c['area']}]: {c['distance_km']} km away")

assert centers_nikol[0]["area"] == "Nikol", f"Expected Nikol first, got {centers_nikol[0]['area']}"
assert centers_nikol[-1]["area"] == "Science City", f"Expected Science City furthest, got {centers_nikol[-1]['area']}"

print("\nALL VERIFICATIONS PASSED PERFECTLY!")
