import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8001/api"

def api_call(endpoint, method="GET", payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        print(f"HTTP ERROR {e.code} on {method} {url}: {err_body}")
        raise

def run_test():
    print("[1] Logging in as Customer...")
    r = api_call("/auth/login", method="POST", payload={
        "email": "customer@demo.local",
        "password": "CustomerPassword123!"
    })
    cust_token = r["access_token"]
    print(" -> Customer logged in successfully.")

    print("\n[2] Logging in as Branch Manager...")
    r = api_call("/auth/login", method="POST", payload={
        "email": "manager@demo.local",
        "password": "ManagerPassword123!"
    })
    mgr_token = r["access_token"]
    print(" -> Manager logged in successfully.")

    print("\n[3] Logging in as Service Technician (Staff)...")
    r = api_call("/auth/login", method="POST", payload={
        "email": "tech@demo.local",
        "password": "TechPassword123!"
    })
    tech_token = r["access_token"]
    print(" -> Technician logged in successfully.")

    print("\n[4] Fetching Customer's Registered Vehicles...")
    vehicles = api_call("/customers/me/vehicles", method="GET", token=cust_token)
    vehicle_id = vehicles[0]["id"]
    reg_num = vehicles[0]["registration_number"]
    print(f" -> Using vehicle ID: {vehicle_id} ({reg_num})")

    print("\n[5] Customer creates booking at Center 1...")
    booking = api_call("/bookings", method="POST", payload={
        "vehicle_id": vehicle_id,
        "service_center_id": 1,
        "service_type": "General Service",
        "requested_date": "2026-10-21",
        "preferred_time": "10:00 AM",
        "required_completion_time": "14:00",
        "notes": "Urgent oil change & brake inspection"
    }, token=cust_token)
    
    service_request_id = booking["service_request_id"]
    token_number = booking["token_number"]
    print(f" -> Booking created! ServiceRequest ID: {service_request_id}, Token: {token_number}")

    print("\n[6] Branch Manager checks live queue for Center 1...")
    queue_entries = api_call("/queue/center/1", method="GET", token=mgr_token)
    found_mgr = next((e for e in queue_entries if e.get("service_request_id") == service_request_id or e.get("token_number") == token_number), None)
    assert found_mgr is not None, f"Booking {service_request_id} / Token {token_number} not found in Manager's Queue!"
    entry_id = found_mgr["id"]
    print(f" -> Verified! Manager immediately sees queue entry {entry_id} (Token: {found_mgr['token_number']}) with status: {found_mgr['status']}")

    print("\n[7] Technician processes vehicle through each workshop stage...")
    stages = ["Vehicle Received", "Service In Progress", "Washing", "Quality Check", "Ready for Pickup"]
    for next_stage in stages:
        updated = api_call(f"/queue/{entry_id}/status", method="PATCH", payload={
            "new_status": next_stage,
            "notes": f"Technician moved vehicle to {next_stage}"
        }, token=tech_token)
        print(f"   [Floor Staff] Stage advanced to: {updated['status']}")

        # Verify Customer view
        cust_active = api_call("/customers/me/active-service", method="GET", token=cust_token)
        assert cust_active is not None and cust_active.get("has_active"), f"Customer active tracking lost at {next_stage}!"
        assert cust_active["service_request_id"] == service_request_id, f"Expected active request {service_request_id}, got {cust_active['service_request_id']}"
        assert cust_active["status"] == next_stage, f"Expected customer status {next_stage}, got {cust_active['status']}"
        print(f"   [Customer Portal] Reflected in real time: {cust_active['status']}")

        # Verify Manager view
        mgr_q = api_call("/queue/center/1", method="GET", token=mgr_token)
        mgr_e = next((e for e in mgr_q if e["id"] == entry_id), None)
        assert mgr_e is not None, f"Manager queue entry missing at {next_stage}!"
        assert mgr_e["status"] == next_stage, f"Expected manager status {next_stage}, got {mgr_e['status']}"
        print(f"   [Manager Portal] Reflected in real time: {mgr_e['status']}")

    print("\n[8] Technician completes handover...")
    final_update = api_call(f"/queue/{entry_id}/status", method="PATCH", payload={
        "new_status": "Completed",
        "notes": "Vehicle delivered to owner with digital invoice"
    }, token=tech_token)
    assert final_update["status"] == "Completed"
    print(" -> Vehicle marked Completed!")

    print("\n" + "="*70)
    print(" SUCCESS: END-TO-END REAL-TIME WORKFLOW 100% VERIFIED!")
    print(" Customer Booking -> Manager & Staff Real-time Queue -> Workshop Stages -> Live Updates")
    print("="*70)

if __name__ == "__main__":
    run_test()
