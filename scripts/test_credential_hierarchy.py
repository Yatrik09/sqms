import urllib.request
import urllib.parse
import json
import time

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
        return {"_error_code": e.code, "_error_body": err_body}

def run_tests():
    print("="*75)
    print("TEST SUITE: HIERARCHICAL CREDENTIAL PROVISIONING & WORKSHOP ISOLATION")
    print("="*75)

    ts = int(time.time())

    # --- 1. TEST PUBLIC REGISTRATION SAFEGUARDS ---
    print("\n[1] Testing Public Registration Security...")
    # Attempt 1a: Public user trying to sign up as a branch manager
    bad_reg = api_call("/auth/register", method="POST", payload={
        "name": "Intruder Manager",
        "email": f"intruder.mgr_{ts}@demo.local",
        "password": "Password123!",
        "role": "branch_manager"
    })
    assert bad_reg.get("_error_code") == 403, f"Expected 403 for external manager registration, got: {bad_reg}"
    print(" -> Correctly blocked external registration for 'branch_manager' (HTTP 403)")

    # Attempt 1b: Public user trying to sign up as a technician
    bad_tech_reg = api_call("/auth/register", method="POST", payload={
        "name": "Intruder Tech",
        "email": f"intruder.tech_{ts}@demo.local",
        "password": "Password123!",
        "role": "technician"
    })
    assert bad_tech_reg.get("_error_code") == 403, f"Expected 403 for external technician registration, got: {bad_tech_reg}"
    print(" -> Correctly blocked external registration for 'technician' (HTTP 403)")

    # Attempt 1c: Public customer registration allowed
    cust_reg = api_call("/auth/register", method="POST", payload={
        "name": "Genuine Customer",
        "email": f"cust_{ts}@demo.local",
        "password": "CustomerPassword123!",
        "role": "customer"
    })
    assert "access_token" in cust_reg, f"Customer registration failed: {cust_reg}"
    assert cust_reg["user"]["role"] == "customer"
    print(" -> Public registration for 'customer' is approved.")

    # --- 2. FRANCHISE OWNER CREATES BRANCH MANAGER ---
    print("\n[2] Testing Franchise Owner Provisioning Branch Manager...")
    owner_login = api_call("/auth/login", method="POST", payload={
        "email": "owner@demo.local",
        "password": "OwnerPassword123!"
    })
    assert "access_token" in owner_login
    owner_token = owner_login["access_token"]
    print(" -> Franchise Owner logged in.")

    # Owner creates manager for Center 2
    mgr_email = f"manager.center2_{ts}@demo.local"
    mgr_create = api_call("/subscription/create-branch-manager", method="POST", payload={
        "name": "Center 2 Branch Manager",
        "email": mgr_email,
        "password": "ManagerPassword123!",
        "phone": "+91 98765 22222",
        "service_center_id": 2
    }, token=owner_token)
    assert "id" in mgr_create, f"Manager creation failed: {mgr_create}"
    assert mgr_create["service_center_id"] == 2
    print(f" -> Franchise Owner created Branch Manager '{mgr_create['name']}' ({mgr_email}) assigned to Center 2.")

    # Verify Center 2 Manager can login
    mgr2_login = api_call("/auth/login", method="POST", payload={
        "email": mgr_email,
        "password": "ManagerPassword123!"
    })
    assert "access_token" in mgr2_login
    mgr2_token = mgr2_login["access_token"]
    mgr2_profile = api_call("/auth/me", method="GET", token=mgr2_token)
    assert mgr2_profile["service_center_id"] == 2
    print(f" -> Branch Manager logged in successfully. Verified profile is bound to Center #{mgr2_profile['service_center_id']}.")

    # --- 3. BRANCH MANAGER PROVISIONS FLOOR TECHNICIAN ---
    print("\n[3] Testing Branch Manager Provisioning Floor Technician...")
    # Manager 1 (for Center 1) logs in
    mgr1_login = api_call("/auth/login", method="POST", payload={
        "email": "manager@demo.local",
        "password": "ManagerPassword123!"
    })
    mgr1_token = mgr1_login["access_token"]

    # Manager 1 creates a technician for Center 1
    tech_email = f"tech.c1_{ts}@demo.local"
    tech_create = api_call("/service-centers/1/technicians", method="POST", payload={
        "name": "Karan Sharma (Engine Tech)",
        "email": tech_email,
        "password": "TechPassword123!",
        "phone": "+91 98765 11111",
        "specialization": "Engine & Transmission"
    }, token=mgr1_token)
    assert "id" in tech_create, f"Technician creation failed: {tech_create}"
    assert tech_create["service_center_id"] == 1
    assert tech_create["specialization"] == "Engine & Transmission"
    print(f" -> Manager created Floor Technician '{tech_create['name']}' ({tech_email}) bound to Center 1.")

    # Manager 1 attempts to create a technician for Center 2 (unauthorized center!)
    illegal_tech_create = api_call("/service-centers/2/technicians", method="POST", payload={
        "name": "Cross Center Tech",
        "email": f"illegal.tech_{ts}@demo.local",
        "password": "TechPassword123!",
        "specialization": "General Service"
    }, token=mgr1_token)
    assert illegal_tech_create.get("_error_code") == 403, f"Expected 403 for cross-center technician creation, got: {illegal_tech_create}"
    print(" -> Correctly blocked Manager from provisioning technicians for a different center (HTTP 403).")

    # --- 4. TECHNICIAN WORKSHOP ISOLATION & PERMISSIONS ---
    print("\n[4] Testing Floor Technician Workshop Isolation...")
    tech_login = api_call("/auth/login", method="POST", payload={
        "email": tech_email,
        "password": "TechPassword123!"
    })
    assert "access_token" in tech_login
    tech_token = tech_login["access_token"]

    # Check technician profile
    tech_me = api_call("/auth/me", method="GET", token=tech_token)
    assert tech_me["role"] == "technician"
    assert tech_me["service_center_id"] == 1
    print(f" -> Technician logged in. Role: {tech_me['role']}, Assigned Hub: Center #{tech_me['service_center_id']} ({tech_me.get('service_center_name')}).")

    # Technician tries to view queue for Center 2 (cross-center access)
    cross_crew_view = api_call("/service-centers/2/technicians", method="GET", token=tech_token)
    assert cross_crew_view.get("_error_code") == 403, f"Expected 403 for cross-center crew access, got: {cross_crew_view}"
    print(" -> Technician blocked from accessing other centers' workshop staff (HTTP 403).")

    # Technician views their own center technicians
    my_crew = api_call("/service-centers/1/technicians", method="GET", token=tech_token)
    assert isinstance(my_crew, list) and len(my_crew) > 0
    print(f" -> Technician can access their own workshop crew ({len(my_crew)} staff members).")

    # Technician attempts to issue a walk-in token for Center 2 (forbidden)
    illegal_walkin = api_call("/queue/walk-in", method="POST", payload={
        "service_center_id": 2,
        "customer_name": "Test Walkin",
        "customer_phone": "+91 99999 88888",
        "registration_number": f"GJ02-X-{ts % 10000}",
        "vehicle_type": "Sedan",
        "service_type": "General Service"
    }, token=tech_token)
    assert illegal_walkin.get("_error_code") == 403, f"Expected 403 for issuing token in other center, got: {illegal_walkin}"
    print(" -> Technician blocked from issuing walk-in tokens in other centers (HTTP 403).")

    # Technician issues walk-in token for their assigned Center 1 (allowed)
    valid_walkin = api_call("/queue/walk-in", method="POST", payload={
        "service_center_id": 1,
        "customer_name": "Test Walkin Center 1",
        "customer_phone": "+91 99999 88888",
        "registration_number": f"GJ01-T-{ts % 10000}",
        "vehicle_type": "Sedan",
        "service_type": "General Service"
    }, token=tech_token)
    assert valid_walkin.get("success") is True
    print(f" -> Technician successfully created walk-in token {valid_walkin['token_number']} in assigned Center 1.")

    print("\n" + "="*75)
    print(" ALL 4 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print(" 1. Public sign-up restricted strictly to customers.")
    print(" 2. Franchise Owner can provision Branch Managers with assigned centers.")
    print(" 3. Branch Manager can provision Floor Technicians with specialization.")
    print(" 4. Technicians cannot be mixed across centers and are strictly isolated.")
    print("="*75)

if __name__ == "__main__":
    run_tests()
