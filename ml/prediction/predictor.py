"""
ML Predictor Engine for SQMS.
Loads trained production models and provides predictions for:
- Waiting Time (Model A)
- Service Duration (Model B)
- Expected Completion Time (Model C)
- Feature Explanations and Confidence Indicators
- Transparent Baseline Fallback Mechanism
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

DEFAULT_FALLBACK_BASE_DURATIONS = {
    'General Service': 65,
    'Oil Change': 30,
    'Car Wash': 25,
    'AC Service': 55,
    'Brake Service': 50,
    'Battery Check': 20,
    'Tyre Service': 35,
    'Electrical Repair': 75,
    'Diagnosis': 40,
    'Denting and Painting': 180,
    'Minor Accident Repair': 150,
    'Major Accident Repair': 280,
}

class SQMSPredictor:
    def __init__(self, artifacts_dir: Optional[str] = None):
        if artifacts_dir is None:
            # Default relative path from this file
            curr_dir = os.path.dirname(os.path.abspath(__file__))
            artifacts_dir = os.path.abspath(os.path.join(curr_dir, '..', 'artifacts'))
            
        self.artifacts_dir = artifacts_dir
        self.waiting_model = None
        self.duration_model = None
        self.metadata = {}
        self.load_models()
        
    def load_models(self):
        w_path = os.path.join(self.artifacts_dir, 'waiting_time_model.joblib')
        d_path = os.path.join(self.artifacts_dir, 'service_duration_model.joblib')
        meta_path = os.path.join(self.artifacts_dir, 'model_metadata.json')
        
        if os.path.exists(w_path) and os.path.exists(d_path):
            try:
                self.waiting_model = joblib.load(w_path)
                self.duration_model = joblib.load(d_path)
                if os.path.exists(meta_path):
                    with open(meta_path, 'r') as f:
                        self.metadata = json.load(f)
                print("SQMS ML Production Models loaded successfully.")
            except Exception as e:
                print(f"Warning: Failed to load ML model artifacts ({e}). Using baseline fallback.")
                self.waiting_model = None
                self.duration_model = None
        else:
            print("Notice: ML model artifacts not found. Active mode: Baseline Fallback.")
            self.waiting_model = None
            self.duration_model = None

    def predict_service(
        self,
        service_type: str,
        vehicle_type: str = 'Sedan',
        vehicle_category: str = 'Mid-range',
        repair_type: str = 'Standard',
        queue_position: int = 1,
        queue_length: int = 3,
        active_mechanics: int = 6,
        available_mechanics: int = 2,
        total_bays: int = 8,
        available_bays: int = 2,
        current_workload: float = 0.65,
        ongoing_services: int = 5,
        day_of_week: Optional[int] = None,
        hour: Optional[int] = None,
        request_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes prediction for waiting time, duration, and completion.
        Returns complete metrics along with explanatory factors.
        """
        now = request_time or datetime.now()
        if day_of_week is None:
            day_of_week = now.weekday()
        if hour is None:
            hour = now.hour
            
        peak_hour = 1 if (9 <= hour <= 11 or 15 <= hour <= 18 or day_of_week in [5, 6]) else 0
        base_dur = DEFAULT_FALLBACK_BASE_DURATIONS.get(service_type, 60)
        
        v_mult = 1.0
        if vehicle_type == 'SUV':
            v_mult = 1.2
        elif vehicle_type == 'Luxury':
            v_mult = 1.45
        elif vehicle_type == 'Bike':
            v_mult = 0.65
        elif vehicle_type == 'Hatchback':
            v_mult = 0.9
            
        historical_avg_duration = round(base_dur * v_mult, 1)

        # ---------------------------------------------------------------------
        # PREDICTION LOGIC: ML OR BASELINE FALLBACK
        # ---------------------------------------------------------------------
        if self.waiting_model is not None and self.duration_model is not None:
            # 1. ML-Based Prediction
            prediction_source = "Production ML Model"
            model_version = self.metadata.get('waiting_time', {}).get('model_version', 'v1.0')
            model_name = self.metadata.get('waiting_time', {}).get('active_model', 'Random Forest')
            
            # Prepare DataFrames for scikit-learn pipelines
            df_wait = pd.DataFrame([{
                'queue_position': queue_position,
                'queue_length': queue_length,
                'active_mechanics': active_mechanics,
                'available_mechanics': available_mechanics,
                'total_bays': total_bays,
                'available_bays': available_bays,
                'current_workload': current_workload,
                'ongoing_services': ongoing_services,
                'day_of_week': day_of_week,
                'hour': hour,
                'peak_hour': peak_hour,
                'vehicle_type': vehicle_type,
                'service_type': service_type
            }])
            
            df_dur = pd.DataFrame([{
                'historical_average_duration': historical_avg_duration,
                'active_mechanics': active_mechanics,
                'available_mechanics': available_mechanics,
                'total_bays': total_bays,
                'available_bays': available_bays,
                'current_workload': current_workload,
                'day_of_week': day_of_week,
                'hour': hour,
                'peak_hour': peak_hour,
                'vehicle_type': vehicle_type,
                'vehicle_category': vehicle_category,
                'service_type': service_type,
                'repair_type': repair_type
            }])
            
            try:
                pred_wait = float(self.waiting_model.predict(df_wait)[0])
                pred_dur = float(self.duration_model.predict(df_dur)[0])
            except Exception as e:
                # Fallback on inference error
                print(f"Inference error: {e}. Falling back to baseline.")
                return self._baseline_prediction(
                    base_dur, v_mult, queue_position, available_mechanics, available_bays,
                    current_workload, peak_hour, now, service_type
                )
        else:
            # 2. Transparent Baseline Fallback
            return self._baseline_prediction(
                base_dur, v_mult, queue_position, available_mechanics, available_bays,
                current_workload, peak_hour, now, service_type
            )
            
        # Post-processing bounds
        waiting_time_minutes = max(2, int(round(pred_wait)))
        service_duration_minutes = max(10, int(round(pred_dur)))
        
        # Expected completion calculation
        total_minutes = waiting_time_minutes + service_duration_minutes
        expected_completion = now + timedelta(minutes=total_minutes)
        
        # Explanatory factors
        workload_label = (
            "Peak" if current_workload >= 0.85
            else "High" if current_workload >= 0.70
            else "Moderate" if current_workload >= 0.40
            else "Low"
        )
        
        contributing_factors = [
            f"{queue_position} vehicle(s) ahead in queue",
            f"{available_mechanics} available mechanic(s) on duty",
            f"{available_bays} available service bay(s)",
            f"Current workshop workload: {workload_label} ({int(current_workload*100)}%)",
            f"Service category: {service_type} ({'Peak hours active' if peak_hour else 'Normal hours'})"
        ]
        
        expected_turn = now + timedelta(minutes=waiting_time_minutes)
        return {
            'waiting_time_minutes': waiting_time_minutes,
            'service_duration_minutes': service_duration_minutes,
            'total_turnaround_minutes': total_minutes,
            'expected_turn_time': expected_turn.strftime('%I:%M %p'),
            'expected_completion_time': expected_completion.strftime('%I:%M %p'),
            'expected_completion_iso': expected_completion.isoformat(),
            'prediction_source': prediction_source,
            'model_name': model_name,
            'model_version': model_version,
            'contributing_factors': contributing_factors,
            'workload_level': workload_label
        }
        
    def _baseline_prediction(
        self, base_dur, v_mult, queue_position, available_mechanics, available_bays,
        current_workload, peak_hour, now, service_type
    ):
        eff_capacity = max(1, available_mechanics * 0.6 + available_bays * 0.4)
        wait_est = (queue_position * 14.0) / eff_capacity + (current_workload * 20.0)
        if peak_hour:
            wait_est *= 1.2
            
        dur_est = base_dur * v_mult
        waiting_time_minutes = max(3, int(round(wait_est)))
        service_duration_minutes = max(10, int(round(dur_est)))
        total_minutes = waiting_time_minutes + service_duration_minutes
        expected_turn = now + timedelta(minutes=waiting_time_minutes)
        expected_completion = now + timedelta(minutes=total_minutes)
        
        workload_label = "High" if current_workload >= 0.70 else ("Moderate" if current_workload >= 0.40 else "Low")
        
        return {
            'waiting_time_minutes': waiting_time_minutes,
            'service_duration_minutes': service_duration_minutes,
            'total_turnaround_minutes': total_minutes,
            'expected_turn_time': expected_turn.strftime('%I:%M %p'),
            'expected_completion_time': expected_completion.strftime('%I:%M %p'),
            'expected_completion_iso': expected_completion.isoformat(),
            'prediction_source': "Transparent Baseline Estimation",
            'model_name': "Historical Average Heuristic",
            'model_version': "baseline-v1.0",
            'contributing_factors': [
                f"{queue_position} vehicle(s) ahead",
                f"{available_mechanics} available mechanics",
                f"{available_bays} available service bays",
                f"Workload level: {workload_label}",
                "Prediction calculated using transparent baseline rules"
            ],
            'workload_level': workload_label
        }

# Global singleton instance
predictor = SQMSPredictor()
