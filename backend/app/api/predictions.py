from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.session import get_db
from app.models.entities import ServiceCenter, ServiceBay, Mechanic, QueueEntry, ServiceRequest
from app.schemas.schemas import PredictionRequest, PredictionResponse
from ml.prediction.predictor import predictor

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])

@router.post("/service", response_model=PredictionResponse)
def get_service_prediction(
    req: PredictionRequest,
    db: Session = Depends(get_db)
):
    center = db.query(ServiceCenter).filter(ServiceCenter.id == req.service_center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Service center not found")

    avail_bays = db.query(ServiceBay).filter(
        ServiceBay.service_center_id == center.id,
        ServiceBay.status == "Available"
    ).count()
    
    avail_mechs = db.query(Mechanic).filter(
        Mechanic.service_center_id == center.id,
        Mechanic.availability == "Available"
    ).count()

    active_q = db.query(QueueEntry).join(ServiceRequest).filter(
        ServiceRequest.service_center_id == center.id,
        QueueEntry.status.in_(["Waiting", "In Service"])
    ).count()

    pred = predictor.predict_service(
        service_type=req.service_type,
        vehicle_type=req.vehicle_type,
        vehicle_category=req.vehicle_category,
        repair_type=req.repair_type,
        queue_position=active_q + 1,
        queue_length=active_q + 1,
        active_mechanics=center.total_mechanics or 8,
        available_mechanics=avail_mechs,
        total_bays=center.total_bays or 8,
        available_bays=avail_bays,
        current_workload=center.current_workload or 0.5,
        ongoing_services=max(0, (center.total_bays or 8) - avail_bays),
        request_time=datetime.now()
    )

    return PredictionResponse(**pred)
