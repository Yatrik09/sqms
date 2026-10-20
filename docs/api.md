# SQMS REST and WebSocket API Reference

Base URL: `http://localhost:8000/api`  
WebSocket URL: `ws://localhost:8000/ws`

---

## 1. Authentication Endpoints

### `POST /auth/login`
- **Request Body**: `{ "email": "customer@demo.local", "password": "CustomerPassword123!" }`
- **Response**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": 4,
    "name": "Aarav Sharma",
    "email": "customer@demo.local",
    "role": "customer"
  }
}
```

### `POST /auth/register`
- **Request Body**: `{ "name": "...", "email": "...", "password": "...", "phone": "..." }`

---

## 2. Customer & Vehicle Endpoints

### `GET /customers/me/vehicles`
- Returns array of customer's registered vehicles.

### `POST /customers/me/vehicles`
- **Request Body**: `{ "registration_number": "GJ01-ZZ-1234", "vehicle_type": "SUV", "model": "Tata Harrier", "year": 2023, "fuel_type": "Diesel" }`

### `GET /customers/me/active-service`
- Returns current queued token, live status, bay allocation, mechanic, and real-time AI prediction.

---

## 3. Booking & Queue Endpoints

### `POST /bookings`
- Creates booking, auto-issues token, inserts into queue, computes ML prediction.
- **Request Body**:
```json
{
  "vehicle_id": 1,
  "service_center_id": 1,
  "service_type": "General Service",
  "requested_date": "2026-10-05",
  "preferred_time": "10:00 AM",
  "required_completion_time": "05:00 PM"
}
```

### `GET /queue/center/{center_id}`
- Returns live queue table for branch manager.

### `POST /queue/walk-in`
- Issues walk-in token for customer arriving directly at workshop.

### `PATCH /queue/{id}/status`
- Transitions vehicle status (`Waiting -> Service In Progress -> Washing -> Completed`), auto-allocates bays/mechanics, recalculates subsequent waiting times, and broadcasts WebSocket event.

---

## 4. Multi-Center Recommendation & Prediction

### `POST /recommendations/service-centers`
- Compares all 20 centers based on distance, service compatibility, workload, bays, mechanics, and required completion time.
- **Request**: `{ "service_type": "General Service", "vehicle_type": "Sedan", "required_completion_time": "05:00 PM" }`
- **Response**: `{ "recommended_center": { ... }, "alternative_centers": [ ... ], "scoring_methodology": "..." }`

### `POST /predictions/service`
- Generates on-demand waiting time, duration, and completion forecast with contributing factors.

---

## 5. WebSocket Real-Time Channel (`/ws`)
- Clients connect on app load.
- Broadcast payload on vehicle status transition:
```json
{
  "event": "QUEUE_STATUS_CHANGED",
  "service_center_id": 1,
  "token_number": "T-14",
  "old_status": "Washing",
  "new_status": "Completed",
  "timestamp": "2026-10-02T16:30:00Z"
}
```
Customer dashboards automatically update without page refreshes.
