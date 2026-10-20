# SQMS Relational Database Specification

## 1. Overview
SQMS utilizes SQLAlchemy ORM with support for PostgreSQL (production/docker) and SQLite (zero-config local development). All models enforce referential integrity with cascading behavior, foreign keys, unique constraints, and indexes.

---

## 2. Entity-Relationship Overview

```
 [Users] 1 ---- * [Franchises]
   |  1
   |  +--------- * [ServiceCenters] 1 ---- * [ServiceBays]
   |  |                   |
   |  |                   +--------------- * [Mechanics]
   |  |                   |
   |  +--------- * [Customers] 1 ---- * [Vehicles]
   |                      |                 |
   |                      +---------+-------+
   |                                | 1
   |                         [ServiceRequests]
   |                                |
   |            +-------------------+-------------------+
   |            | 1                 | 1                 | *
   |      [QueueEntries]        [Bookings]       [ServiceStatusHistory]
   |            |                                       |
   |            +---------------------------------------+
   |
   +--------- * [AuditLogs]
   +--------- * [Notifications]
```

---

## 3. Data Dictionary

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | Full name of user |
| `email` | VARCHAR(150) | UNIQUE, NOT NULL, INDEX | Login email address |
| `phone` | VARCHAR(30) | NULLABLE | Contact telephone |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt password hash |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'customer' | `super_admin`, `franchise_owner`, `branch_manager`, `customer` |
| `status` | VARCHAR(30) | DEFAULT 'active' | `active`, `suspended`, `inactive` |
| `created_at` | DATETIME | DEFAULT UTC NOW | Registration timestamp |

### `service_centers`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique center ID (1 to 20 seeded) |
| `franchise_id`| INTEGER | FK `franchises.id` | Owning franchise |
| `manager_id` | INTEGER | FK `users.id` | Assigned branch manager |
| `name` | VARCHAR(150) | NOT NULL, INDEX | Center title |
| `city` | VARCHAR(100) | NOT NULL, INDEX | Municipal area |
| `latitude` | FLOAT | NOT NULL | Geographical coordinate |
| `longitude`| FLOAT | NOT NULL | Geographical coordinate |
| `total_bays`| INTEGER | DEFAULT 8 | Total operational service bays |
| `total_mechanics`| INTEGER | DEFAULT 8 | Total staffed mechanics |
| `current_workload`| FLOAT | DEFAULT 0.5 | Normalized workload ratio (0.0 to 1.0) |
| `supported_services`| JSON | DEFAULT [] | List of supported service names |

### `service_requests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Service request ID |
| `customer_id` | INTEGER | FK `customers.id` | Requesting customer |
| `vehicle_id` | INTEGER | FK `vehicles.id` | Vehicle to be serviced |
| `service_center_id`| INTEGER | FK `service_centers.id` | Target center |
| `service_type` | VARCHAR(100) | NOT NULL | E.g., General Service, Oil Change |
| `required_completion_time`| VARCHAR(20) | NULLABLE | Customer requested deadline |
| `status` | VARCHAR(50) | INDEX | State machine status |

---

## 4. Operational State Machine

Allowed transition progression:
```
BOOKING_CONFIRMED 
   -> VEHICLE_RECEIVED 
   -> WAITING 
   -> INSPECTION 
   -> WAITING_FOR_BAY 
   -> SERVICE_IN_PROGRESS 
   -> WASHING 
   -> REPAIR_IN_PROGRESS 
   -> QUALITY_CHECK 
   -> READY_FOR_PICKUP 
   -> COMPLETED (or CANCELLED)
```
When entering `SERVICE_IN_PROGRESS`, assigned bays are set to `Occupied` and mechanics to `Busy`.
When reaching `READY_FOR_PICKUP` or `COMPLETED`, resources are freed to `Available`.
