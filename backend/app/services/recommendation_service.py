import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import ServiceCenter, Mechanic, ServiceBay, QueueEntry, ServiceRequest
from app.core.config import settings
from ml.prediction.predictor import predictor

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def parse_time_str(time_str: str) -> Optional[datetime]:
    """Parse time string like '17:00' or '5:00 PM' to today's datetime."""
    now = datetime.now()
    clean = time_str.strip()
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p", "%H:%M:%S"):
        try:
            t = datetime.strptime(clean, fmt).time()
            return datetime.combine(now.date(), t)
        except ValueError:
            continue
    return None

def compute_center_recommendations(
    db: Session,
    service_type: str,
    vehicle_type: str = "Sedan",
    required_completion_time_str: Optional[str] = None,
    customer_lat: float = 23.0225,
    customer_lon: float = 72.5714
) -> Dict[str, Any]:
    centers = db.query(ServiceCenter).filter(ServiceCenter.status == "active").all()
    if not centers:
        return {
            "service_type": service_type,
            "required_completion_time": required_completion_time_str,
            "recommended_center": None,
            "alternative_centers": [],
            "scoring_methodology": "No active service centers found."
        }

    now = datetime.now()
    req_time_dt = parse_time_str(required_completion_time_str) if required_completion_time_str else None

    evaluated_centers = []

    for center in centers:
        # 1. Operational resources
        total_bays = center.total_bays or 8
        total_mechs = center.total_mechanics or 8
        
        # Count live available bays and mechanics
        avail_bays = db.query(ServiceBay).filter(
            ServiceBay.service_center_id == center.id,
            ServiceBay.status == "Available"
        ).count()
        
        avail_mechs = db.query(Mechanic).filter(
            Mechanic.service_center_id == center.id,
            Mechanic.availability == "Available"
        ).count()
        
        # Count active waiting vehicles
        active_queue = db.query(QueueEntry).join(ServiceRequest).filter(
            ServiceRequest.service_center_id == center.id,
            QueueEntry.status.in_(["Waiting", "In Service"])
        ).count()
        
        # 2. Check service compatibility
        supp_services = center.supported_services or []
        # If list is empty, default assume standard services supported
        is_compatible = (service_type in supp_services) if supp_services else True
        if "Accident" in service_type and supp_services and "Accidental" not in supp_services and service_type not in supp_services:
            is_compatible = False

        # 3. Distance calculation
        dist = haversine_distance(customer_lat, customer_lon, center.latitude, center.longitude)

        # 4. Predict Waiting & Duration via ML Predictor
        pred = predictor.predict_service(
            service_type=service_type,
            vehicle_type=vehicle_type,
            queue_position=max(0, active_queue),
            queue_length=max(1, active_queue + 1),
            active_mechanics=total_mechs,
            available_mechanics=avail_mechs,
            total_bays=total_bays,
            available_bays=avail_bays,
            current_workload=center.current_workload,
            ongoing_services=max(0, total_bays - avail_bays),
            request_time=now
        )

        wait_min = pred['waiting_time_minutes']
        dur_min = pred['service_duration_minutes']
        total_min = wait_min + dur_min
        pred_comp_dt = now + timedelta(minutes=total_min)

        # 5. Time feasibility check
        is_time_feasible = True
        feasibility_label = "Likely to complete in expected timeframe"
        
        if req_time_dt:
            # If required time has passed today, assume it's for the upcoming period or evaluate margin
            diff_min = (req_time_dt - pred_comp_dt).total_seconds() / 60.0
            if diff_min >= 0:
                is_time_feasible = True
                feasibility_label = f"Likely to meet requested time (margin: ~{int(diff_min)} min)"
            else:
                is_time_feasible = False
                feasibility_label = f"May exceed requested completion by ~{abs(int(diff_min))} min"

        # 6. Recommendation Scoring (0 to 100)
        # Factors:
        # - Service Compatibility: 25 pts
        # - Completion Feasibility: 25 pts
        # - Waiting efficiency: up to 20 pts (shorter wait = higher)
        # - Capacity availability: up to 15 pts
        # - Distance: up to 15 pts (closer = higher)
        score = 0.0
        reasons = []

        if is_compatible:
            score += settings.WEIGHT_SERVICE_COMPATIBILITY * 100
        else:
            reasons.append("Warning: Limited specialized capability for this repair type")

        if is_time_feasible:
            score += settings.WEIGHT_COMPLETION_FEASIBILITY * 100
            if req_time_dt:
                reasons.append(f"Estimated completion ({pred_comp_dt.strftime('%I:%M %p')}) satisfies requested deadline")
        else:
            reasons.append(f"Estimated completion ({pred_comp_dt.strftime('%I:%M %p')}) exceeds requested deadline")

        # Waiting efficiency (0 to 20): max 20 at <= 15 min, 0 at >= 120 min
        wait_score = max(0.0, min(1.0, 1.0 - (wait_min / 90.0))) * (settings.WEIGHT_WAITING_EFFICIENCY * 100)
        score += wait_score
        if wait_min <= 25:
            reasons.append(f"Low waiting time (~{wait_min} min)")

        # Capacity score: based on available bays and mechanics
        cap_ratio = (avail_bays / max(1, total_bays) + avail_mechs / max(1, total_mechs)) / 2.0
        cap_score = min(1.0, cap_ratio * 1.5) * (settings.WEIGHT_CAPACITY_AVAILABILITY * 100)
        score += cap_score
        if avail_bays >= 2 and avail_mechs >= 2:
            reasons.append(f"Dedicated bay and technician currently available ({avail_bays} bays, {avail_mechs} mechanics)")

        # Distance score: max 15 at <= 2 km, 0 at >= 30 km
        dist_score = max(0.0, min(1.0, 1.0 - (dist / 25.0))) * (settings.WEIGHT_DISTANCE * 100)
        score += dist_score
        if dist <= 5.0:
            reasons.append(f"Close proximity ({dist} km)")
        elif dist > 15.0:
            reasons.append(f"Located {dist} km away")

        # Current workload label
        workload_label = (
            "Peak" if center.current_workload >= 0.85
            else "High" if center.current_workload >= 0.70
            else "Moderate" if center.current_workload >= 0.40
            else "Low"
        )
        if center.current_workload <= 0.45:
            reasons.append(f"Favorable workshop workload ({int(center.current_workload*100)}%)")

        evaluated_centers.append({
            "service_center_id": center.id,
            "name": center.name,
            "address": center.address,
            "city": center.city,
            "area": center.area,
            "distance_km": dist,
            "current_workload": center.current_workload,
            "workload_label": workload_label,
            "active_queue_length": active_queue,
            "available_bays": avail_bays,
            "available_mechanics": avail_mechs,
            "predicted_waiting_minutes": wait_min,
            "predicted_service_minutes": dur_min,
            "predicted_completion_time": pred_comp_dt.strftime('%I:%M %p'),
            "required_completion_time": required_completion_time_str,
            "is_time_feasible": is_time_feasible,
            "feasibility_status": feasibility_label,
            "recommendation_score": round(score, 1),
            "recommendation_reasons": reasons,
            "is_recommended": False
        })

    # Sort centers by recommendation score descending
    evaluated_centers.sort(key=lambda x: x["recommendation_score"], reverse=True)

    if evaluated_centers:
        evaluated_centers[0]["is_recommended"] = True
        recommended_center = evaluated_centers[0]
        alternative_centers = evaluated_centers[1:7] # Next top 6 alternatives
    else:
        recommended_center = None
        alternative_centers = []

    scoring_methodology = (
        "Multi-factor weighted recommendation model incorporating: "
        f"Service Compatibility ({int(settings.WEIGHT_SERVICE_COMPATIBILITY*100)}%), "
        f"Completion Feasibility ({int(settings.WEIGHT_COMPLETION_FEASIBILITY*100)}%), "
        f"Waiting Efficiency ({int(settings.WEIGHT_WAITING_EFFICIENCY*100)}%), "
        f"Capacity Availability ({int(settings.WEIGHT_CAPACITY_AVAILABILITY*100)}%), "
        f"and Distance ({int(settings.WEIGHT_DISTANCE*100)}%). Predictions powered by SQMS AI Engine."
    )

    return {
        "service_type": service_type,
        "required_completion_time": required_completion_time_str,
        "recommended_center": recommended_center,
        "alternative_centers": alternative_centers,
        "scoring_methodology": scoring_methodology
    }
