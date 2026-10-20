# SQMS Live Demonstration Scenarios

This document provides step-by-step walkthroughs for demonstrating the core technical contributions of SQMS.

---

## SCENARIO 1 — End-to-End Service Booking with Required Completion Time

### Objective:
Demonstrate how SQMS evaluates customer time constraints, queries 20 service centers, predicts completion times using machine learning, recommends the best center, and coordinates live service delivery.

### Walkthrough Steps:
1. **Open Customer Portal**:
   - Log in as Customer (`customer@demo.local` / `CustomerPassword123!`) or click the Persona dropdown in the navbar and select **Customer**.
2. **Configure Service Request**:
   - Go to **Book Service & Recommendation** tab.
   - Select Vehicle: `GJ01-AB-4501 — Honda City ZX (Sedan)`.
   - Select Service: `General Service`.
   - Enter Required Completion Time: `05:00 PM`.
3. **Observe AI Recommendation Engine**:
   - Notice how the system compares candidate centers:
     - Center 01 (Apex Central Hub): High workload (85%), predicted completion later in evening.
     - Center 08 / Center 02: Lower workload, bays available, predicted completion earlier (e.g. `04:25 PM`).
   - The system flags: **"Likely to meet requested time"** and gives clear reasons (favorable capacity, low wait).
4. **Confirm Booking**:
   - Click **Confirm Booking & Generate Digital Token**.
   - Token is immediately generated (e.g. `T-01-005`).
5. **Manager Workflow**:
   - Switch role in navbar to **Branch Manager** (`manager@demo.local`).
   - Center 01 queue table displays the newly generated token in `Waiting` state.
   - Manager clicks **Update Status**, moves vehicle to `Service In Progress`, and assigns Bay-02 and Tech-01.
6. **Customer Tracking**:
   - Switch back to **Customer** view.
   - The timeline moves forward to `Service In Progress`, with assigned bay and technician shown live.

---

## SCENARIO 2 — Real-time Queue Recalculation via WebSockets

### Objective:
Demonstrate that SQMS is a real-time reactive system where staff status updates dynamically recalculate waiting times for subsequent vehicles without page refreshes.

### Setup:
Seeded demonstration queue at Center 01:
- **Token 14**: `Washing` (Occupying washing bay)
- **Token 15**: `Service In Progress`
- **Token 17**: `Waiting` (Estimated wait: ~35 mins)
- **Token 50**: `Ready for Washing`

### Walkthrough Steps:
1. Open two browser windows or side-by-side tabs:
   - Window A: Logged in as **Customer** on **Live Service Tracking** (tracking Token 17).
   - Window B: Logged in as **Branch Manager** on **Live Workshop Queue**.
2. In Window B (Manager):
   - Locate Token 14 (`Washing`).
   - Click **Update Status** and mark it as `Completed` (or use the Demo Controls modal -> **Advance Vehicle Stage**).
3. In Window A (Customer):
   - Notice that **WITHOUT REFRESHING THE PAGE**, the WebSocket event triggers:
     - Washing bay becomes available.
     - Token 17's estimated waiting time drops dynamically.
     - Expected completion time recalculates automatically!

---

## SCENARIO 3 — Accident Repair Preliminary AI Assessment

### Objective:
Demonstrate multimodal preliminary damage assessment and specialized body-repair workshop routing.

### Walkthrough Steps:
1. As Customer, navigate to **Accident Repair AI** in the navbar.
2. Select **Scenario 2: Major (Structural collision)** or upload a vehicle damage photo.
3. Visible damage area: `Structural Frame & Suspension`.
4. Click **Analyze & Find Eligible Centers**.
5. System evaluates:
   - Categorizes damage as **Major Damage** with clear research disclaimer.
   - Filters only service centers that have dedicated accidental repair bays and paint booths.
   - Recommends the optimal center with current accidental repair capacity and expected turnaround.
