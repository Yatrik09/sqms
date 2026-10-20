import requests

API = 'http://localhost:8001/api'

# 1. Super Admin
admin_login = requests.post(f'{API}/auth/login', json={'email': 'admin@demo.local', 'password': 'AdminPassword123!'}).json()
admin_headers = {'Authorization': f"Bearer {admin_login['access_token']}"}
print('1. Super Admin Login OK:', admin_login['user']['name'])

# 2. Customer
reg_cust = requests.post(f'{API}/auth/register', json={
    'name': 'Kavita Patel',
    'email': 'kavita_booking_test@demo.local',
    'password': 'Password123!',
    'phone': '+91 98250 99001',
    'city': 'Ahmedabad',
    'area': 'Science City'
})
cust_login = reg_cust.json() if reg_cust.status_code == 200 else requests.post(f'{API}/auth/login', json={'email': 'kavita_booking_test@demo.local', 'password': 'Password123!'}).json()
cust_token = cust_login['access_token']
cust_headers = {'Authorization': f"Bearer {cust_token}"}
cust_id = cust_login['user']['id']
print('2. Customer Login OK:', cust_login['user']['name'])

# Add Vehicle
vehicles = requests.get(f'{API}/customers/me/vehicles', headers=cust_headers).json()
if not vehicles:
    v_res = requests.post(f'{API}/customers/me/vehicles', json={
        'registration_number': f'GJ-01-KP-{cust_id}11',
        'vehicle_type': 'Sedan',
        'model': 'Honda City',
        'year': 2023,
        'fuel_type': 'Petrol'
    }, headers=cust_headers).json()
    v_id = v_res['id']
else:
    v_id = vehicles[0]['id']

# ML Prediction via /predictions/service
pred_res = requests.post(f'{API}/predictions/service', json={
    'service_center_id': 1,
    'service_type': 'General Service',
    'vehicle_type': 'Sedan'
}, headers=cust_headers).json()
print('3. ML Prediction Turnaround (mins):', pred_res.get('total_turnaround_minutes'), 'Predicted Waiting:', pred_res.get('waiting_time_minutes'))
assert pred_res.get('total_turnaround_minutes') is not None

# Book Service via POST /api/bookings
book_res = requests.post(f'{API}/bookings', json={
    'vehicle_id': v_id,
    'service_center_id': 1,
    'service_type': 'General Service',
    'requested_date': '2026-10-21',
    'preferred_time': '11:00 AM',
    'notes': 'Periodic maintenance & filter check.'
}, headers=cust_headers)
print('Booking status:', book_res.status_code)
assert book_res.status_code == 200, f'Booking failed: {book_res.text}'
book_data = book_res.json()
token_num = book_data.get('token_number')
req_id = book_data.get('service_request_id')
print(f'4. Booking Confirmed: Token {token_num}, Request ID {req_id}')

# 5. Branch Manager Queue
mgr_login = requests.post(f'{API}/auth/login', json={'email': 'manager@demo.local', 'password': 'ManagerPassword123!'}).json()
mgr_headers = {'Authorization': f"Bearer {mgr_login['access_token']}"}
queue_res = requests.get(f'{API}/queue/center/1', headers=mgr_headers).json()
matched_entries = [item for item in queue_res if item.get('token_number') == token_num]
print(f'5. Newly booked token visible in Manager Queue: {len(matched_entries) > 0}')
assert len(matched_entries) > 0, "Token not found in manager queue"
entry_id = matched_entries[0]['id']

# 6. Floor Technician Advances Stage
tech_login = requests.post(f'{API}/auth/login', json={'email': 'tech@demo.local', 'password': 'TechPassword123!'}).json()
tech_headers = {'Authorization': f"Bearer {tech_login['access_token']}"}
stage_res = requests.patch(f'{API}/queue/{entry_id}/status', json={
    'new_status': 'Service In Progress',
    'assigned_bay_id': 1,
    'assigned_mechanic_id': 1,
    'notes': 'Vehicle inspection completed, in active servicing.'
}, headers=tech_headers)
assert stage_res.status_code == 200, f"Technician status update failed: {stage_res.text}"
print('6. Technician advanced vehicle stage to Service In Progress!')

# 7. Customer Live Tracking
active_service = requests.get(f'{API}/customers/me/active-service', headers=cust_headers).json()
print('7. Customer Real-Time Status:', active_service.get('status'), 'Bay:', active_service.get('assigned_bay'), 'Mechanic:', active_service.get('assigned_mechanic'))
assert active_service is not None
assert active_service.get('token_number') == token_num
assert 'Service In Progress' in active_service.get('status')

print('\n>>> ALL SQMS PLATFORM WORKFLOWS VERIFIED 100% OPERATIONAL! <<<')

