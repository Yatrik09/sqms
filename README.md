# SQMS — AI-Powered Smart Queue Management and Waiting Time Prediction System for Vehicle Service Centers

> **Automotive AI / Vehicle Service Industry Decision Support Platform**  
> *Core Technical Contribution:* Tabular Machine Learning Prediction + Real-Time Reactive Queue State Machine + Multi-Service-Center Optimization.

---

## 1. Project Overview

**SQMS (Smart Queue Management System)** is a full-stack, software-first AI/ML software platform built to solve changing workloads, bay bottlenecks, and unpredictable service turnaround times in the automotive service industry.

Instead of issuing static token numbers (e.g. *"Your token is 17"*), SQMS continuously analyzes real-time workshop state—including active queue length, available certified mechanics, occupied service bays, repair complexity, and historical durations—to provide accurate, dynamic predictions:

```
+-------------------------------------------------------------------------------+
|  Digital Token: T-17                                                          |
|  Estimated Waiting Time:   35 minutes                                         |
|  Estimated Service Duration: 70 minutes                                       |
|  Expected Completion:       4:45 PM                                           |
|  Prediction Engine:         Production Gradient Boosting Regressor (v1.0)     |
+-------------------------------------------------------------------------------+
```

---

## 2. Key Capabilities

- **Digital Token & Queue Lifecycle**: Supports online bookings, walk-in tokens, reordering, and state progression (`Booking Confirmed -> Vehicle Received -> Waiting -> Service In Progress -> Washing -> Quality Check -> Ready for Pickup -> Completed`).
- **Machine Learning Regression Pipeline**:
  - **Model A**: Waiting time prediction ($T_{wait}$) based on queue depth, available mechanics, available bays, and workload.
  - **Model B**: Service duration prediction ($T_{service}$) based on service type, repair complexity, and vehicle type.
  - **Model C**: Total completion time synthesis ($T_{total} = Now + T_{wait} + T_{service}$).
  - **Explainability**: Contributing factors displayed directly on UI.
  - **Transparent Fallback**: Baseline heuristic fallback when ML artifacts are not loaded.
- **20 Service Centers Network**: Demo cluster of 20 fully configured service centers with individual capacities, bay counts, mechanic specializations, coordinates, and live workloads.
- **Intelligent Multi-Center Recommendation**: Evaluates service compatibility, distance, workshop workload, capacity, and customer required completion time (*"I need my car back by 5:00 PM"*).
- **Accident Repair Assistance**: Preliminary AI damage classification (Minor/Moderate/Major) with specialized routing to centers with accidental repair bays.
- **Real-Time WebSocket Synchronization**: Automatic live updates across customer dashboards without page refreshes when technicians advance vehicle stages.
- **Role-Based Access Control (4 Personas)**: Super Admin, Franchise Owner, Branch Manager, and Customer.
- **Admin ML Evaluation & Experiment Dashboard**: Model benchmark comparison table (Baseline, Linear Regression, Decision Tree, Random Forest, Gradient Boosting), real computed MAE/RMSE/R², actual vs predicted charts, and one-click retraining.
- **Interactive Demo Controls**: On-demand workload surges (Normal/High/Peak), walk-in injections, and stage advance simulations.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, Uvicorn, WebSockets.
- **Database**: SQLite (Zero-config local development) / PostgreSQL (Docker production).
- **Machine Learning**: Scikit-learn, Pandas, NumPy, SciPy, Joblib.
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing.
- **Testing**: Pytest, FastAPI TestClient.

---

## 4. Repository Structure

```
sqms/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # REST & WebSocket endpoints
│   │   ├── core/             # Configuration & security
│   │   ├── database/         # SQLAlchemy session & Base
│   │   ├── models/           # Relational entities
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Queue, recommendation, and notification logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/       # UI components (Navbar, PredictionCard, RecommendationCard, DemoModal)
│   │   ├── context/          # AuthContext with WebSocket listener
│   │   ├── pages/            # Customer, Manager, Owner, Admin, and ML portals
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript interfaces
│   ├── package.json
│   └── tailwind.config.js
├── ml/                       # Machine Learning Engineering
│   ├── data_generation/      # Synthetic dataset generator (12,000 records)
│   ├── preprocessing/        # One-Hot & Scaling pipeline
│   ├── training/             # Candidate models comparison (Baseline, Linear, Trees, Boosting)
│   ├── prediction/           # Predictor engine with explainability & fallback
│   └── artifacts/            # Serialized .joblib models & metadata
├── data/                     # CSV storage for datasets
├── docs/                     # Technical documentation
│   ├── architecture.md
│   ├── database.md
│   ├── ml_pipeline.md
│   ├── api.md
│   └── demo_scenarios.md
├── scripts/                  # Seed scripts & utilities
│   └── seed_demo_data.py
├── tests/                    # Automated backend & ML test suite
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. Development Demo Accounts

> **DEVELOPMENT DEMO ACCOUNTS — NOT FOR PRODUCTION USE**

| Persona | Email | Password | Role Description |
|---|---|---|---|
| **Super Admin** | `admin@demo.local` | `AdminPassword123!` | System-wide control, 20 centers, ML retraining, audit logs |
| **Franchise Owner** | `owner@demo.local` | `OwnerPassword123!` | Multi-branch overview, cross-branch comparison, analytics |
| **Branch Manager** | `manager@demo.local` | `ManagerPassword123!` | Center 01 live queue, mechanic/bay assignment, status updates |
| **Floor Technician** | `tech@demo.local` | `TechPassword123!` | Workshop floor mobile screen, 1-tap stage advancement, washing, QC |
| **Customer** | `customer@demo.local` | `CustomerPassword123!` | Booking, vehicle tracking, token tracking, accident repair |

*(Strict Role-Based Access Control: Users must log in via the Login page to access their authorized portal. To change roles, log out and authenticate as the designated persona, or click any account in the Demo Accounts helper on the login page to fill its credentials).*

---

## 6. Local Quick Start (Without Docker)

### Prerequisites:
- Python 3.10+ (Python 3.12 recommended)
- Node.js v18+ and npm

### Step 1: Install Backend & ML Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### Step 2: Generate Synthetic Dataset (12,000 Records)
```bash
python ../ml/data_generation/generate_dataset.py
```

### Step 3: Train and Benchmark Candidate Models
```bash
python ../ml/training/train_models.py
```
*Outputs empirical MAE, RMSE, and R² scores and serializes production models.*

### Step 4: Seed Database with 20 Centers & Demo Queues
```bash
python ../scripts/seed_demo_data.py
```

### Step 5: Start Backend API & WebSocket Server
```bash
# In backend/ directory:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API will be accessible at: `http://localhost:8000`
- Interactive Swagger documentation: `http://localhost:8000/docs`

### Step 6: Start Frontend Application
```bash
# In frontend/ directory:
npm install
npm run dev
```
- Frontend will be accessible at: `http://localhost:5173`

---

## 7. Docker Quick Start

To run the entire ecosystem (PostgreSQL 15, FastAPI backend, React frontend) with a single command:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## 8. Running Automated Tests

Run the full automated test suite covering authentication, authorization, booking flow, live queue status transitions, ML models, and dataset integrity:

```bash
python -m pytest tests -v
```

---

## 9. Live Demonstration Guide

Follow the detailed walkthroughs in [`docs/demo_scenarios.md`](file:///y:/sqms/docs/demo_scenarios.md):
- **Scenario 1**: Customer booking with required completion time ("5:00 PM"), multi-center prediction, recommendation, manager workflow, and pickup.
- **Scenario 2**: Real-time queue recalculation demonstration (Token 14 Washing -> Completed, Token 17 updates without refresh).
- **Scenario 3**: Accident repair preliminary AI damage classification and specialized body-repair workshop routing.

---

## 10. Research & Academic Integrity Notice

This software is developed as an academic and engineering decision-support platform.
- All service records in `data/synthetic_service_records.csv` are **synthetically generated research data** clearly labeled as such.
- The 20 demo service centers represent simulated sample operational units for software evaluation and do not represent real-world commercial partnerships.
- AI accident damage classification is **preliminary decision support** and does not guarantee insurance approvals or final repair costs.
