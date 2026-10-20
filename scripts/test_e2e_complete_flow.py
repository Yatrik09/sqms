import time
import hmac
import hashlib
import requests

API = 'http://localhost:8001/api'
RAZORPAY_KEY_SECRET = 'Kpc1V74SFbEstKPAL5bk2X6a'
ts = int(time.time())

print("=================================================================")
print("SQMS E2E PLATFORM & RAZORPAY CUSTOMER-TO-OWNER UPGRADE TEST")
print("=================================================================")

# -------------------------------------------------------------
# 1. Customer Registration & Vehicle Setup
# -------------------------------------------------------------
cust_email = f"journey_cust_{ts}@demo.local"
cust_pass = "Password123!"
reg_res = requests.post(f"{API}/auth/register", json={
    "name": "Meera Joshi",
    "email": cust_email,
    "password": cust_pass,
    "phone": "+91 98250 88991",
    "city": "Ahmedabad",
    "area": "Science City"
})
assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
cust_data = reg_res.json()
cust_token = cust_data["access_token"]
cust_id = cust_data["user"]["id"]
cust_headers = {"Authorization": f"Bearer {cust_token}"}
print(f"Step 1: Registered Customer '{cust_data['user']['name']}' (ID: {cust_id}, Role: {cust_data['user']['role']})")
assert cust_data["user"]["role"] == "customer"

# Add vehicle
v_res = requests.post(f"{API}/customers/me/vehicles", json={
    "registration_number": f"GJ-01-MJ-{ts % 10000}",
    "vehicle_type": "Sedan",
    "model": "Hyundai Verna",
    "year": 2023,
    "fuel_type": "Petrol"
}, headers=cust_headers)
assert v_res.status_code == 200, f"Add vehicle failed: {v_res.text}"
veh_id = v_res.json()["id"]
print(f"Step 2: Registered Vehicle ID: {veh_id}")

# -------------------------------------------------------------
# 2. ML Prediction & Service Booking
# -------------------------------------------------------------
pred_res = requests.post(f"{API}/predictions/service", json={
    "service_center_id": 1,
    "service_type": "General Service",
    "vehicle_type": "Sedan"
}, headers=cust_headers)
assert pred_res.status_code == 200, f"ML prediction failed: {pred_res.text}"
pred_data = pred_res.json()
print(f"Step 3: ML Turnaround Prediction: ~{pred_data.get('total_turnaround_minutes')} mins (Waiting: ~{pred_data.get('waiting_time_minutes')} mins)")

book_res = requests.post(f"{API}/bookings", json={
    "vehicle_id": veh_id,
    "service_center_id": 1,
    "service_type": "General Service",
    "requested_date": "2026-10-21",
    "preferred_time": "10:30 AM",
    "notes": "Annual service checkup"
}, headers=cust_headers)
assert book_res.status_code == 200, f"Booking failed: {book_res.text}"
book_data = book_res.json()
token_num = book_data["token_number"]
req_id = book_data["service_request_id"]
print(f"Step 4: Booked Service Confirmed! Digital Token: {token_num}, Request ID: {req_id}")

# -------------------------------------------------------------
# 3. Branch Manager Queue & Floor Technician Stage Transition
# -------------------------------------------------------------
mgr_login = requests.post(f"{API}/auth/login", json={"email": "manager@demo.local", "password": "ManagerPassword123!"}).json()
mgr_headers = {"Authorization": f"Bearer {mgr_login['access_token']}"}
queue_res = requests.get(f"{API}/queue/center/1", headers=mgr_headers).json()
matched = [q for q in queue_res if q.get("token_number") == token_num]
assert len(matched) > 0, "Booked token not found in Manager queue"
entry_id = matched[0]["id"]
print(f"Step 5: Booking verified in Branch Manager queue (Entry ID: {entry_id})")

tech_login = requests.post(f"{API}/auth/login", json={"email": "tech@demo.local", "password": "TechPassword123!"}).json()
tech_headers = {"Authorization": f"Bearer {tech_login['access_token']}"}
tech_update = requests.patch(f"{API}/queue/{entry_id}/status", json={
    "new_status": "Service In Progress",
    "assigned_bay_id": 1,
    "assigned_mechanic_id": 1,
    "notes": "Vehicle on ramp 1, oil flush in progress"
}, headers=tech_headers)
assert tech_update.status_code == 200, f"Technician status update failed: {tech_update.text}"
print("Step 6: Floor Technician updated vehicle stage to 'Service In Progress'")

active_tracking = requests.get(f"{API}/customers/me/active-service", headers=cust_headers).json()
assert active_tracking.get("status") == "Service In Progress"
print(f"Step 7: Customer live tracking verified real-time stage: '{active_tracking.get('status')}'")

# -------------------------------------------------------------
# 4. Customer Upgrades to Franchise Owner via Razorpay Payment
# -------------------------------------------------------------
print("\n--- INITIATING RAZORPAY FRANCHISE UPGRADE ---")
plan_tier = "growth"
amount_paise = 1770000 # ₹15,000 + 18% GST = ₹17,700 in paise
f_name = f"Joshi Mobility Group {ts % 1000}"
primary_center = f"Joshi Auto Center - Science City Hub"

# Step 4.1: Create Razorpay Order
order_res = requests.post(f"{API}/create-order", json={
    "amount": amount_paise,
    "currency": "INR",
    "receipt": f"rcpt_upgrade_{ts}",
    "notes": {
        "user_id": cust_id,
        "plan_id": plan_tier,
        "franchise_name": f_name,
        "primary_center_name": primary_center
    }
}, headers=cust_headers)
assert order_res.status_code == 200, f"Create Razorpay order failed: {order_res.text}"
order_data = order_res.json()
order_id = order_data["order_id"]
print(f"Step 8: Razorpay Order created: {order_id} for INR {order_data['amount'] // 100}")

# Step 4.2: Simulate Razorpay Gateway Payment and generate HMAC-SHA256 signature
payment_id = f"pay_rzp_live_{ts}"
sig_message = f"{order_id}|{payment_id}".encode("utf-8")
generated_signature = hmac.new(
    RAZORPAY_KEY_SECRET.encode("utf-8"),
    sig_message,
    hashlib.sha256
).hexdigest()

# Step 4.3: Verify Payment Signature & Trigger Full Franchise Workshop Provisioning
verify_res = requests.post(f"{API}/verify-payment", json={
    "razorpay_order_id": order_id,
    "razorpay_payment_id": payment_id,
    "razorpay_signature": generated_signature,
    "user_id": cust_id,
    "user_email": cust_email,
    "plan_id": plan_tier,
    "billing_period": "monthly",
    "franchise_name": f_name,
    "primary_center_name": primary_center,
    "city": "Ahmedabad",
    "area": "Science City",
    "address": "401 Science City Crossroad, Sola",
    "phone": "+91 98250 88991",
    "total_bays": 8,
    "total_mechanics": 8
}, headers=cust_headers)
assert verify_res.status_code == 200, f"Verify payment failed: {verify_res.text}"
verify_data = verify_res.json()
print(f"Step 9: Razorpay Payment Verified! Invoice: {verify_data.get('invoice_id')}, Franchise: '{verify_data.get('franchise_name')}', Center ID: {verify_data.get('primary_center_id')}")
assert verify_data.get("user_role") == "franchise_owner", f"Expected role franchise_owner, got {verify_data.get('user_role')}"

# -------------------------------------------------------------
# 5. Verify User State Upgraded in Auth Me
# -------------------------------------------------------------
me_res = requests.get(f"{API}/auth/me", headers=cust_headers).json()
print(f"Step 10: Authenticated Profile (/auth/me) Role: '{me_res['role']}', Plan: '{me_res['plan_name']}', Max Centers: {me_res['max_allowed_centers']}")
assert me_res["role"] == "franchise_owner"
assert me_res["subscription_status"] == "active"

# -------------------------------------------------------------
# 6. Verify Franchise Command Center Data
# -------------------------------------------------------------
franchise_res = requests.get(f"{API}/subscription/my-franchise", headers=cust_headers).json()
print(f"Step 11: Franchise Network: '{franchise_res['franchise_name']}', Centers Count: {len(franchise_res['centers'])}")
assert len(franchise_res["centers"]) >= 1
new_center = franchise_res["centers"][0]

print(f"         Primary Center: '{new_center['name']}' (Bays: {new_center['total_bays']}, Mechanics: {new_center['total_mechanics']})")

# -------------------------------------------------------------
# 7. Franchise Owner Creates Branch Manager
# -------------------------------------------------------------
new_mgr_email = f"mgr_joshi_{ts}@demo.local"
new_mgr_res = requests.post(f"{API}/subscription/create-branch-manager", json={
    "name": "Karan Joshi",
    "email": new_mgr_email,
    "password": "ManagerPassword123!",
    "phone": "+91 98250 77112",
    "service_center_id": new_center["id"]
}, headers=cust_headers)
assert new_mgr_res.status_code == 200, f"Create Branch Manager failed: {new_mgr_res.text}"
new_mgr_data = new_mgr_res.json()
print(f"Step 12: Franchise Owner created Branch Manager '{new_mgr_data['name']}' ({new_mgr_data['email']})")

# -------------------------------------------------------------
# 8. Branch Manager Logs in & Creates Floor Technician
# -------------------------------------------------------------
new_mgr_login = requests.post(f"{API}/auth/login", json={"email": new_mgr_email, "password": "ManagerPassword123!"}).json()
new_mgr_headers = {"Authorization": f"Bearer {new_mgr_login['access_token']}"}
assert new_mgr_login["user"]["role"] == "branch_manager"

new_tech_email = f"tech_joshi_{ts}@demo.local"
new_tech_res = requests.post(f"{API}/service-centers/{new_center['id']}/technicians", json={
    "name": "Vikram Mistri",
    "email": new_tech_email,
    "password": "TechPassword123!",
    "phone": "+91 98250 66113",
    "specialization": "General Service"
}, headers=new_mgr_headers)
assert new_tech_res.status_code == 200, f"Create Technician failed: {new_tech_res.text}"
new_tech_data = new_tech_res.json()
print(f"Step 13: Branch Manager created Workshop Floor Technician '{new_tech_data['name']}' ({new_tech_data['email']})")

# -------------------------------------------------------------
# 9. Floor Technician Logs in
# -------------------------------------------------------------
new_tech_login = requests.post(f"{API}/auth/login", json={"email": new_tech_email, "password": "TechPassword123!"}).json()
assert new_tech_login["user"]["role"] == "technician"
print(f"Step 14: Workshop Floor Technician Logged In Successfully! Assigned Center ID: {new_tech_login['user']['service_center_id']}")

print("\n=================================================================")
print(">>> ALL 14 E2E WORKFLOW STEPS PASSED WITH 100% SUCCESS! <<<")
print("=================================================================")
