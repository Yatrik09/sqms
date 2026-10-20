# SQMS System Architecture Document

## 1. Executive Summary

**SQMS (Smart Queue Management System)** is an enterprise-grade, software-first AI/ML platform tailored for the automobile and vehicle service industry. Unlike generic queue or token-dispensing tools, SQMS integrates **real-time resource allocation, multi-center decision support, and tabular machine learning regression models** to accurately predict customer waiting times, workshop service durations, and expected vehicle completion times.

---

## 2. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|                                                                                 |
|   +-------------------+  +-------------------+  +-----------------------------+ |
|   |  Customer Portal  |  |  Branch Manager   |  | Franchise Owner / Admin     | |
|   |  (React + TS)     |  |  (Live Workshop)  |  | (Multi-Center Analytics)    | |
|   +---------+---------+  +---------+---------+  +--------------+--------------+ |
+-------------|----------------------|---------------------------|----------------+
              |                      |                           |
              | REST (HTTP/JSON)     | WebSocket (ws://)         | REST
              v                      v                           v
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                        FastAPI Gateway & Auth                           |   |
|   |                  (JWT, OAuth2, RBAC Authorization)                      |   |
|   +------------------------------------+------------------------------------+   |
|                                        |                                        |
|   +------------------+  +--------------+-----+  +---------------------------+   |
|   | Recommendation   |  | Queue Engine &     |  | WebSocket Broadcast       |   |
|   | Service (Multi-  |  | State Machine      |  | Manager                   |   |
|   | Criteria Factor) |  | (Bays & Mechanics) |  | (Real-time live push)     |   |
|   +--------+---------+  +--------------+-----+  +---------------------------+   |
|            |                           |                                        |
+------------|---------------------------|----------------------------------------+
             |                           |
             v                           v
+---------------------------------------------------------------------------------+
|                           AI & DATA SCIENCE TIER                                |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                            ML Predictor                                 |   |
|   |  - Model A: Waiting Time Prediction (Gradient Boosting / Random Forest) |   |
|   |  - Model B: Service Duration Prediction (Gradient Boosting)             |   |
|   |  - Model C: Turnaround & Completion Time Synthesis                      |   |
|   |  - Transparent Baseline Fallback Heuristic                              |   |
|   +------------------------------------+------------------------------------+   |
|                                        |                                        |
|   +------------------+  +--------------+-----+  +---------------------------+   |
|   | Synthetic Data   |  | Model Training &   |  | Model Artifact Store      |   |
|   | Generator        |  | Cross-Comparison   |  | (.joblib & metadata.json) |   |
|   | (12,000 records) |  | (MAE, RMSE, R²)    |  |                           |   |
|   +------------------+  +--------------------+  +---------------------------+   |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                              PERSISTENCE TIER                                   |
|                                                                                 |
|      SQLAlchemy ORM -> PostgreSQL (Docker) / SQLite Local Zero-Config           |
|      (20 Service Centers, Users, Bays, Mechanics, Queues, Audit Logs)           |
+---------------------------------------------------------------------------------+
```

---

## 3. Core Architectural Subsystems

### 3.1 Role-Based Access Hierarchy (RBAC)
1. **Super Admin**: Complete governance across franchises, all 20 service centers, dataset administration, ML retraining triggers, and audit trails.
2. **Franchise Owner**: Multi-branch operational overview, workload balancing, and cross-branch comparative analytics.
3. **Branch Manager**: Assigned service center operational control, live queue sequencing, mechanic/bay allocation, and status transitions.
4. **Customer**: Self-service vehicle management, booking, AI multi-center search, token tracking, and accident damage assistance.

### 3.2 Real-time Synchronization Engine
- WebSocket endpoint `/ws` maintains duplex stateful connections.
- When workshop staff changes a vehicle's status (e.g., `Waiting -> Service In Progress` or `Washing -> Completed`):
  1. The database records the state transition in `service_status_history`.
  2. Associated bay and mechanic statuses are updated automatically.
  3. The queue service recalculates positions and waiting predictions for all subsequent vehicles.
  4. The WebSocket connection manager broadcasts a targeted JSON payload to connected customer dashboards and manager consoles, triggering immediate DOM updates without page refreshes.

### 3.3 Multi-Center Recommendation Engine
Unlike simple proximity lookups, SQMS computes a multi-attribute utility score combining:
- **Service Type Compatibility** (25%)
- **Customer Required Completion Time Feasibility** (25%)
- **Waiting Time Efficiency** (20%)
- **Capacity Availability** (15%)
- **Haversine Distance** (15%)
The engine outputs explicit, human-readable rationale statements explaining why a center was chosen over alternatives.
