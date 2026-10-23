from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import compute_center_recommendations

router = APIRouter(prefix="/recommendations", tags=["Recommendation Engine"])

@router.post("/service-centers", response_model=RecommendationResponse)
def get_service_center_recommendations(
    req: RecommendationRequest,
    db: Session = Depends(get_db)
):
    result = compute_center_recommendations(
        db=db,
        service_type=req.service_type,
        vehicle_type=req.vehicle_type,
        required_completion_time_str=req.required_completion_time,
        service_date_str=req.service_date,
        client_current_time_str=req.client_current_time,
        customer_lat=req.customer_latitude or 23.0225,
        customer_lon=req.customer_longitude or 72.5714
    )
    return RecommendationResponse(**result)
