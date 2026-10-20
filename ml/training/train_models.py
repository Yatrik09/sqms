"""
Model Training and Comparison Pipeline for SQMS.
Trains candidate models:
1. Baseline (Dummy Regressor)
2. Linear Regression
3. Decision Tree Regressor
4. Random Forest Regressor
5. Gradient Boosting Regressor

Computes actual MAE, RMSE, and R2 on a 20% validation split.
Saves model artifacts, comparison reports, and feature importance.
"""

import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from ml.preprocessing.pipeline import (
    build_waiting_time_preprocessor,
    build_service_duration_preprocessor,
    WAITING_TIME_NUMERICAL_FEATURES,
    WAITING_TIME_CATEGORICAL_FEATURES,
    SERVICE_DURATION_NUMERICAL_FEATURES,
    SERVICE_DURATION_CATEGORICAL_FEATURES,
    extract_feature_names
)

def evaluate_predictions(y_true, y_pred):
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    return {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'r2': round(r2, 4)
    }

def train_candidate_models(data_path: str, artifacts_dir: str):
    os.makedirs(artifacts_dir, exist_ok=True)
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # -------------------------------------------------------------------------
    # 1. MODEL A: WAITING TIME PREDICTION
    # -------------------------------------------------------------------------
    print("\n--- Training Model A: Waiting Time Prediction ---")
    wait_features = WAITING_TIME_NUMERICAL_FEATURES + WAITING_TIME_CATEGORICAL_FEATURES
    X_wait = df[wait_features]
    y_wait = df['actual_waiting_time'].values
    
    X_train_w, X_test_w, y_train_w, y_test_w = train_test_split(
        X_wait, y_wait, test_size=0.2, random_state=42
    )
    
    waiting_candidates = {
        'Baseline (Median)': DummyRegressor(strategy='median'),
        'Linear Regression': LinearRegression(),
        'Decision Tree': DecisionTreeRegressor(max_depth=8, random_state=42),
        'Random Forest': RandomForestRegressor(n_estimators=75, max_depth=10, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=85, max_depth=5, learning_rate=0.08, random_state=42)
    }
    
    waiting_results = {}
    fitted_pipelines_w = {}
    
    for name, model in waiting_candidates.items():
        t0 = time.time()
        pipe = Pipeline(steps=[
            ('preprocessor', build_waiting_time_preprocessor()),
            ('regressor', model)
        ])
        pipe.fit(X_train_w, y_train_w)
        train_time = round(time.time() - t0, 2)
        
        preds = pipe.predict(X_test_w)
        metrics = evaluate_predictions(y_test_w, preds)
        metrics['training_time_sec'] = train_time
        waiting_results[name] = metrics
        fitted_pipelines_w[name] = pipe
        print(f"Waiting Time [{name}]: MAE={metrics['mae']}, RMSE={metrics['rmse']}, R2={metrics['r2']}")
        
    # Select best model based on lowest MAE (excluding baseline)
    non_baseline_w = {k: v for k, v in waiting_results.items() if 'Baseline' not in k}
    best_w_name = min(non_baseline_w.keys(), key=lambda k: non_baseline_w[k]['mae'])
    best_w_pipe = fitted_pipelines_w[best_w_name]
    print(f"Selected Best Model for Waiting Time: {best_w_name}")
    
    # -------------------------------------------------------------------------
    # 2. MODEL B: SERVICE DURATION PREDICTION
    # -------------------------------------------------------------------------
    print("\n--- Training Model B: Service Duration Prediction ---")
    dur_features = SERVICE_DURATION_NUMERICAL_FEATURES + SERVICE_DURATION_CATEGORICAL_FEATURES
    X_dur = df[dur_features]
    y_dur = df['actual_service_duration'].values
    
    X_train_d, X_test_d, y_train_d, y_test_d = train_test_split(
        X_dur, y_dur, test_size=0.2, random_state=42
    )
    
    duration_candidates = {
        'Baseline (Median)': DummyRegressor(strategy='median'),
        'Linear Regression': LinearRegression(),
        'Decision Tree': DecisionTreeRegressor(max_depth=8, random_state=42),
        'Random Forest': RandomForestRegressor(n_estimators=75, max_depth=10, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=85, max_depth=5, learning_rate=0.08, random_state=42)
    }
    
    duration_results = {}
    fitted_pipelines_d = {}
    
    for name, model in duration_candidates.items():
        t0 = time.time()
        pipe = Pipeline(steps=[
            ('preprocessor', build_service_duration_preprocessor()),
            ('regressor', model)
        ])
        pipe.fit(X_train_d, y_train_d)
        train_time = round(time.time() - t0, 2)
        
        preds = pipe.predict(X_test_d)
        metrics = evaluate_predictions(y_test_d, preds)
        metrics['training_time_sec'] = train_time
        duration_results[name] = metrics
        fitted_pipelines_d[name] = pipe
        print(f"Service Duration [{name}]: MAE={metrics['mae']}, RMSE={metrics['rmse']}, R2={metrics['r2']}")
        
    non_baseline_d = {k: v for k, v in duration_results.items() if 'Baseline' not in k}
    best_d_name = min(non_baseline_d.keys(), key=lambda k: non_baseline_d[k]['mae'])
    best_d_pipe = fitted_pipelines_d[best_d_name]
    print(f"Selected Best Model for Service Duration: {best_d_name}")
    
    # -------------------------------------------------------------------------
    # 3. FEATURE IMPORTANCES & EXPLAINABILITY
    # -------------------------------------------------------------------------
    # Get feature importance for Random Forest or Gradient Boosting
    feature_importance_w = {}
    reg_w = best_w_pipe.named_steps['regressor']
    if hasattr(reg_w, 'feature_importances_'):
        prep_w = best_w_pipe.named_steps['preprocessor']
        f_names_w = extract_feature_names(prep_w, WAITING_TIME_NUMERICAL_FEATURES, WAITING_TIME_CATEGORICAL_FEATURES)
        importances_w = reg_w.feature_importances_
        for f, imp in sorted(zip(f_names_w, importances_w), key=lambda x: x[1], reverse=True)[:10]:
            feature_importance_w[f] = round(float(imp) * 100, 2)
            
    feature_importance_d = {}
    reg_d = best_d_pipe.named_steps['regressor']
    if hasattr(reg_d, 'feature_importances_'):
        prep_d = best_d_pipe.named_steps['preprocessor']
        f_names_d = extract_feature_names(prep_d, SERVICE_DURATION_NUMERICAL_FEATURES, SERVICE_DURATION_CATEGORICAL_FEATURES)
        importances_d = reg_d.feature_importances_
        for f, imp in sorted(zip(f_names_d, importances_d), key=lambda x: x[1], reverse=True)[:10]:
            feature_importance_d[f] = round(float(imp) * 100, 2)
            
    # Sample actual vs predicted points for UI charts (sample 100 test points)
    sample_indices = np.random.choice(len(y_test_w), size=min(100, len(y_test_w)), replace=False)
    actual_vs_pred_w = []
    preds_best_w = best_w_pipe.predict(X_test_w)
    for idx in sample_indices:
        actual_vs_pred_w.append({
            'index': int(idx),
            'actual': round(float(y_test_w[idx]), 1),
            'predicted': round(float(preds_best_w[idx]), 1),
            'error': round(float(abs(y_test_w[idx] - preds_best_w[idx])), 1)
        })
        
    actual_vs_pred_d = []
    preds_best_d = best_d_pipe.predict(X_test_d)
    for idx in sample_indices:
        actual_vs_pred_d.append({
            'index': int(idx),
            'actual': round(float(y_test_d[idx]), 1),
            'predicted': round(float(preds_best_d[idx]), 1),
            'error': round(float(abs(y_test_d[idx] - preds_best_d[idx])), 1)
        })
        
    # Error by service type
    error_by_service_type = []
    test_df_w = X_test_w.copy()
    test_df_w['actual'] = y_test_w
    test_df_w['predicted'] = preds_best_w
    test_df_w['abs_error'] = np.abs(test_df_w['actual'] - test_df_w['predicted'])
    for stype, grp in test_df_w.groupby('service_type'):
        error_by_service_type.append({
            'service_type': stype,
            'mae': round(float(grp['abs_error'].mean()), 2),
            'sample_count': int(len(grp))
        })
        
    # Save artifacts
    joblib.dump(best_w_pipe, os.path.join(artifacts_dir, 'waiting_time_model.joblib'))
    joblib.dump(best_d_pipe, os.path.join(artifacts_dir, 'service_duration_model.joblib'))
    
    metadata = {
        'training_timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'dataset_records': len(df),
        'dataset_version': 'synthetic_v1.0',
        'waiting_time': {
            'active_model': best_w_name,
            'model_version': '1.0.0',
            'comparison': waiting_results,
            'best_metrics': waiting_results[best_w_name],
            'feature_importance': feature_importance_w,
            'actual_vs_pred': actual_vs_pred_w,
            'error_by_service_type': error_by_service_type
        },
        'service_duration': {
            'active_model': best_d_name,
            'model_version': '1.0.0',
            'comparison': duration_results,
            'best_metrics': duration_results[best_d_name],
            'feature_importance': feature_importance_d,
            'actual_vs_pred': actual_vs_pred_d
        }
    }
    
    with open(os.path.join(artifacts_dir, 'model_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nTraining complete! Artifacts saved to {artifacts_dir}")
    return metadata

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
    data_file = os.path.join(project_root, 'data', 'synthetic_service_records.csv')
    artifacts_dir = os.path.join(project_root, 'ml', 'artifacts')
    train_candidate_models(data_file, artifacts_dir)
