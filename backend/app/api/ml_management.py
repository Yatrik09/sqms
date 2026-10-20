import os
import json
import pandas as pd
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import MLModelRecord, AuditLog, User
from app.api.deps import get_current_super_admin
from app.core.config import settings
from ml.training.train_models import train_candidate_models
from ml.prediction.predictor import predictor

router = APIRouter(prefix="/admin/ml", tags=["ML Model Management"])

@router.get("/models")
def get_ml_models_status():
    meta_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        return {
            "status": "No trained model found",
            "active_mode": "Baseline Fallback",
            "waiting_time": None,
            "service_duration": None
        }

    with open(meta_path, "r") as f:
        meta = json.load(f)

    return {
        "status": "Production Models Loaded",
        "training_timestamp": meta.get("training_timestamp"),
        "dataset_records": meta.get("dataset_records", 12000),
        "dataset_version": meta.get("dataset_version", "synthetic_v1.0"),
        "waiting_time": meta.get("waiting_time"),
        "service_duration": meta.get("service_duration")
    }

@router.get("/evaluation-data")
def get_evaluation_charts_data():
    meta_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Model evaluation data not available.")

    with open(meta_path, "r") as f:
        meta = json.load(f)

    return {
        "waiting_time_comparison": meta.get("waiting_time", {}).get("comparison", {}),
        "service_duration_comparison": meta.get("service_duration", {}).get("comparison", {}),
        "feature_importance_waiting": meta.get("waiting_time", {}).get("feature_importance", {}),
        "feature_importance_duration": meta.get("service_duration", {}).get("feature_importance", {}),
        "actual_vs_predicted_waiting": meta.get("waiting_time", {}).get("actual_vs_pred", [])[:60],
        "actual_vs_predicted_duration": meta.get("service_duration", {}).get("actual_vs_pred", [])[:60],
        "error_by_service_type": meta.get("waiting_time", {}).get("error_by_service_type", [])
    }

@router.post("/train")
def trigger_training(
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    data_path = settings.DATASET_PATH
    if not os.path.exists(data_path):
        raise HTTPException(status_code=400, detail="Dataset file not found. Generate dataset first.")

    # Audit log
    audit = AuditLog(
        user_id=current_admin.id,
        action="TRIGGER_ML_TRAIN",
        entity="MLModel",
        entity_id="ALL",
        details="Super Admin triggered model training on dataset."
    )
    db.add(audit)
    db.commit()

    # Run training
    meta = train_candidate_models(data_path, settings.ML_ARTIFACTS_DIR)
    predictor.load_models()

    return {
        "success": True,
        "message": "Models successfully retrained and evaluated across candidates (Baseline, Linear, Decision Tree, Random Forest, Gradient Boosting).",
        "best_waiting_model": meta.get("waiting_time", {}).get("active_model"),
        "best_duration_model": meta.get("service_duration", {}).get("active_model"),
        "metrics_waiting": meta.get("waiting_time", {}).get("best_metrics"),
        "metrics_duration": meta.get("service_duration", {}).get("best_metrics")
    }

@router.get("/dataset/preview")
def preview_dataset():
    data_path = settings.DATASET_PATH
    if not os.path.exists(data_path):
        return {"exists": False, "records": 0, "preview": []}

    df = pd.read_csv(data_path)
    sample_records = df.head(15).to_dict(orient="records")

    summary = {
        "exists": True,
        "total_records": len(df),
        "columns": list(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "mean_waiting_time": round(float(df["actual_waiting_time"].mean()), 1),
        "mean_service_duration": round(float(df["actual_service_duration"].mean()), 1),
        "preview": sample_records
    }
    return summary
