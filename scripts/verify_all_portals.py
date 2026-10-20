import urllib.request
import urllib.error
import json

base_url = 'http://localhost:8001/api'

def login(email, pwd):
    data = json.dumps({'email': email, 'password': pwd}).encode('utf-8')
    req = urllib.request.Request(f'{base_url}/auth/login', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode('utf-8'))
        return body['access_token'], body['user']

def test_endpoint(token, path):
    req = urllib.request.Request(f'{base_url}{path}', headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            print(f'  [200 OK] {path} -> response size {len(data)} bytes')
            return True
    except urllib.error.HTTPError as e:
        print(f'  [HTTP {e.code}] {path} -> {e.read().decode("utf-8")[:150]}')
        return False
    except Exception as e:
        print(f'  [ERROR] {path} -> {e}')
        return False

# 1. Admin
print('--- 1. Testing Super Admin (admin@demo.local) ---')
adm_token, adm_user = login('admin@demo.local', 'AdminPassword123!')
test_endpoint(adm_token, '/service-centers')
test_endpoint(adm_token, '/analytics/admin')
test_endpoint(adm_token, '/admin/audit-logs?limit=30')
test_endpoint(adm_token, '/subscription/admin/overview')

# 2. Franchise Owner
print('\n--- 2. Testing Franchise Owner (owner@demo.local) ---')
owner_token, owner_user = login('owner@demo.local', 'OwnerPassword123!')
test_endpoint(owner_token, '/subscription/my-franchise')
test_endpoint(owner_token, '/analytics/owner/1')
test_endpoint(owner_token, '/subscription/branch-managers')
test_endpoint(owner_token, '/subscription/my-plan')

# 3. Branch Manager
print('\n--- 3. Testing Branch Manager (manager@demo.local) ---')
mgr_token, mgr_user = login('manager@demo.local', 'ManagerPassword123!')
test_endpoint(mgr_token, '/service-centers/my-managed-center')
test_endpoint(mgr_token, '/service-centers/1')
test_endpoint(mgr_token, '/queue/center/1')
test_endpoint(mgr_token, '/service-centers/1/bays')
test_endpoint(mgr_token, '/service-centers/1/mechanics')
test_endpoint(mgr_token, '/analytics/manager/1')

# 4. Customer
print('\n--- 4. Testing Customer (customer@demo.local) ---')
cust_token, cust_user = login('customer@demo.local', 'CustomerPassword123!')
test_endpoint(cust_token, '/customers/me/vehicles')
test_endpoint(cust_token, '/customers/me/active-service')
test_endpoint(cust_token, '/customers/me/history')
