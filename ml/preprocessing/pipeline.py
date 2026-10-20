"""
Preprocessing Pipeline for SQMS Machine Learning Models.
Handles feature extraction, categorical encoding, scaling, and transformation.
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

WAITING_TIME_NUMERICAL_FEATURES = [
    'queue_position',
    'queue_length',
    'active_mechanics',
    'available_mechanics',
    'total_bays',
    'available_bays',
    'current_workload',
    'ongoing_services',
    'day_of_week',
    'hour',
    'peak_hour',
]

WAITING_TIME_CATEGORICAL_FEATURES = [
    'vehicle_type',
    'service_type'
]

SERVICE_DURATION_NUMERICAL_FEATURES = [
    'historical_average_duration',
    'active_mechanics',
    'available_mechanics',
    'total_bays',
    'available_bays',
    'current_workload',
    'day_of_week',
    'hour',
    'peak_hour'
]

SERVICE_DURATION_CATEGORICAL_FEATURES = [
    'vehicle_type',
    'vehicle_category',
    'service_type',
    'repair_type'
]

def build_waiting_time_preprocessor():
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, WAITING_TIME_NUMERICAL_FEATURES),
            ('cat', categorical_transformer, WAITING_TIME_CATEGORICAL_FEATURES)
        ]
    )
    return preprocessor

def build_service_duration_preprocessor():
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, SERVICE_DURATION_NUMERICAL_FEATURES),
            ('cat', categorical_transformer, SERVICE_DURATION_CATEGORICAL_FEATURES)
        ]
    )
    return preprocessor

def extract_feature_names(preprocessor, num_features, cat_features, fitted=True):
    """Retrieve full feature names after one-hot encoding for model explainability."""
    try:
        cat_encoder = preprocessor.named_transformers_['cat'].named_steps['onehot']
        cat_feature_names = cat_encoder.get_feature_names_out(cat_features).tolist()
        return num_features + cat_feature_names
    except Exception:
        return num_features + [f"{c}_encoded" for c in cat_features]
