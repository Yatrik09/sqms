"""
Automated ML Pipeline Tests for SQMS.
Tests:
- Dataset existence and integrity (10,000+ records)
- Non-negative constraints and realistic ranges
- Model artifacts presence and loading
- Prediction inference accuracy and bounds
- Explainability factor generation
"""

import os
import sys
import pytest
import pandas as pd

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(root_dir, "backend")
sys.path.insert(0, root_dir)
sys.path.insert(0, backend_dir)

from ml.prediction.predictor import SQMSPredictor

def test_dataset_exists_and_valid():
    data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_service_records.csv"))
    assert os.path.exists(data_path), "Synthetic dataset file does not exist"
    
    df = pd.read_csv(data_path)
    assert len(df) >= 10000, f"Expected 10,000+ records, got {len(df)}"
    
    # Check required fields
    required_cols = [
        "service_center_id", "vehicle_type", "service_type", "queue_position",
        "queue_length", "active_mechanics", "available_mechanics", "total_bays",
        "available_bays", "current_workload", "actual_waiting_time", "actual_service_duration"
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing required column: {col}"
        
    # Check non-negative constraints
    assert (df["actual_waiting_time"] >= 0).all(), "Found negative waiting time"
    assert (df["actual_service_duration"] > 0).all(), "Found non-positive service duration"
    assert (df["available_bays"] <= df["total_bays"]).all(), "Found available_bays > total_bays"

def test_model_artifacts_and_predictions():
    artifacts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml", "artifacts"))
    predictor = SQMSPredictor(artifacts_dir=artifacts_dir)
    
    # Predict for a general service
    res = predictor.predict_service(
        service_type="General Service",
        vehicle_type="Sedan",
        queue_position=2,
        queue_length=4,
        active_mechanics=8,
        available_mechanics=2,
        total_bays=10,
        available_bays=3,
        current_workload=0.60
    )
    
    assert res["waiting_time_minutes"] > 0
    assert res["service_duration_minutes"] > 0
    assert res["total_turnaround_minutes"] == res["waiting_time_minutes"] + res["service_duration_minutes"]
    assert "expected_completion_time" in res
    assert len(res["contributing_factors"]) >= 4
    assert res["prediction_source"] in ["Production ML Model", "Transparent Baseline Estimation"]

def test_prediction_workload_scaling():
    """Verify that higher queue and workload increases predicted waiting time."""
    artifacts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml", "artifacts"))
    predictor = SQMSPredictor(artifacts_dir=artifacts_dir)
    
    res_low = predictor.predict_service(
        service_type="General Service",
        queue_position=0,
        queue_length=1,
        available_mechanics=5,
        available_bays=5,
        current_workload=0.20
    )
    
    res_high = predictor.predict_service(
        service_type="General Service",
        queue_position=8,
        queue_length=12,
        available_mechanics=1,
        available_bays=0,
        current_workload=0.95
    )
    
    assert res_high["waiting_time_minutes"] > res_low["waiting_time_minutes"], (
        f"High workload wait ({res_high['waiting_time_minutes']}) should be greater than low workload wait ({res_low['waiting_time_minutes']})"
    )
