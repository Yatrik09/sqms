"""
Synthetic Service Records Generator for SQMS.
Generates 10,000+ realistic vehicle service records with non-linear relationships,
realistic variation, and automotive industry distributions.

NOTE: This is synthetic research data clearly labeled as such.
"""

import os
import csv
import random
import numpy as np
import pandas as pd

# Set fixed seed for reproducibility while maintaining variance
np.random.seed(42)
random.seed(42)

SERVICE_TYPES = {
    'General Service': {'base_duration': 65, 'variance': 15, 'complexity': 1.0},
    'Oil Change': {'base_duration': 30, 'variance': 8, 'complexity': 0.6},
    'Car Wash': {'base_duration': 25, 'variance': 5, 'complexity': 0.4},
    'AC Service': {'base_duration': 55, 'variance': 12, 'complexity': 0.9},
    'Brake Service': {'base_duration': 50, 'variance': 10, 'complexity': 0.85},
    'Battery Check': {'base_duration': 20, 'variance': 5, 'complexity': 0.4},
    'Tyre Service': {'base_duration': 35, 'variance': 8, 'complexity': 0.6},
    'Electrical Repair': {'base_duration': 75, 'variance': 20, 'complexity': 1.2},
    'Diagnosis': {'base_duration': 40, 'variance': 12, 'complexity': 0.7},
    'Denting and Painting': {'base_duration': 180, 'variance': 45, 'complexity': 2.2},
    'Minor Accident Repair': {'base_duration': 150, 'variance': 35, 'complexity': 1.9},
    'Major Accident Repair': {'base_duration': 280, 'variance': 60, 'complexity': 3.2},
}

VEHICLE_TYPES = {
    'Hatchback': {'duration_multiplier': 0.9, 'weight': 0.25},
    'Sedan': {'duration_multiplier': 1.0, 'weight': 0.35},
    'SUV': {'duration_multiplier': 1.2, 'weight': 0.22},
    'Luxury': {'duration_multiplier': 1.45, 'weight': 0.08},
    'Bike': {'duration_multiplier': 0.65, 'weight': 0.07},
    'EV': {'duration_multiplier': 1.1, 'weight': 0.03},
}

VEHICLE_CATEGORIES = ['Economy', 'Mid-range', 'Premium', 'Commercial']
REPAIR_TYPES = ['Standard', 'Minor Repair', 'Major Repair', 'Inspection Only', 'Accidental']

def generate_records(num_records: int = 12000, output_path: str = None) -> pd.DataFrame:
    records = []
    
    v_types = list(VEHICLE_TYPES.keys())
    v_weights = [VEHICLE_TYPES[k]['weight'] for k in v_types]
    
    for i in range(1, num_records + 1):
        record_id = f"REC-{i:06d}"
        service_center_id = random.randint(1, 20)
        
        # Vehicle selection
        vehicle_type = np.random.choice(v_types, p=v_weights)
        v_multiplier = VEHICLE_TYPES[vehicle_type]['duration_multiplier']
        vehicle_category = random.choice(VEHICLE_CATEGORIES)
        
        # Service type selection
        service_type = random.choice(list(SERVICE_TYPES.keys()))
        s_info = SERVICE_TYPES[service_type]
        base_dur = s_info['base_duration']
        s_variance = s_info['variance']
        complexity = s_info['complexity']
        
        # Repair type mapping
        if 'Accident' in service_type:
            repair_type = 'Accidental'
        elif 'Major' in service_type:
            repair_type = 'Major Repair'
        elif service_type in ['Car Wash', 'Battery Check', 'Tyre Service']:
            repair_type = 'Standard'
        elif service_type == 'Diagnosis':
            repair_type = 'Inspection Only'
        else:
            repair_type = random.choice(['Standard', 'Minor Repair', 'Major Repair'])
        
        # Time variables
        day_of_week = random.randint(0, 6) # 0=Mon, 6=Sun
        hour = random.randint(8, 18) # 8 AM to 6 PM
        peak_hour = 1 if (9 <= hour <= 11 or 15 <= hour <= 18 or day_of_week in [5, 6]) else 0
        
        # Center operational capacities
        total_bays = random.randint(6, 16)
        total_mechanics = random.randint(5, 14)
        
        # Workload factor influenced by hour and peak
        base_workload = 0.5 + (0.35 if peak_hour else 0.0) + random.uniform(-0.15, 0.15)
        current_workload = max(0.1, min(0.98, round(base_workload, 2)))
        
        ongoing_services = int(round(current_workload * total_bays))
        ongoing_services = min(ongoing_services, total_bays)
        
        available_bays = max(0, total_bays - ongoing_services)
        
        # Mechanics
        active_mechanics = int(round(total_mechanics * (0.85 if peak_hour else 0.75)))
        busy_mechanics = min(active_mechanics, ongoing_services)
        available_mechanics = max(0, active_mechanics - busy_mechanics)
        
        # Queue metrics
        queue_multiplier = 1.6 if peak_hour else 0.9
        queue_length = int(np.random.poisson(lam=4.5 * queue_multiplier))
        queue_position = random.randint(0, queue_length) if queue_length > 0 else 0
        
        historical_average_duration = round(base_dur * v_multiplier, 1)
        
        # --- TARGET 1: ACTUAL WAITING TIME ---
        # Non-linear relationship:
        # Waiting is heavily driven by queue_position, available_mechanics, available_bays, and workload.
        if queue_position == 0 and available_bays > 0 and available_mechanics > 0:
            # Immediate or almost immediate intake
            wait_base = random.uniform(3.0, 9.0)
        else:
            # Queue position backlog
            bay_bottleneck = max(1, available_bays)
            mech_bottleneck = max(1, available_mechanics)
            effective_processing_capacity = (mech_bottleneck * 0.6 + bay_bottleneck * 0.4)
            
            wait_base = (queue_position * 14.5) / effective_processing_capacity
            wait_base += (current_workload * 22.0)
            if peak_hour:
                wait_base *= 1.25
        
        # Add realistic noise/variance (unexpected check-in delays, inspection pauses)
        noise_wait = np.random.normal(0, 4.5)
        actual_waiting_time = max(2.0, round(wait_base + noise_wait, 1))
        
        # --- TARGET 2: ACTUAL SERVICE DURATION ---
        # Driven by base service duration, vehicle type multiplier, repair complexity, mechanic availability
        eff_mech_factor = 1.1 if available_mechanics == 0 else (0.92 if available_mechanics >= 3 else 1.0)
        dur_base = base_dur * v_multiplier * eff_mech_factor
        
        if repair_type == 'Major Repair':
            dur_base *= 1.3
        elif repair_type == 'Minor Repair':
            dur_base *= 1.08
        
        # Add realistic Gaussian noise scaled to service variance
        noise_dur = np.random.normal(0, s_variance * 0.6)
        actual_service_duration = max(10.0, round(dur_base + noise_dur, 1))
        
        # Total vehicle turnaround
        actual_completion_minutes = round(actual_waiting_time + actual_service_duration, 1)
        
        records.append({
            'record_id': record_id,
            'service_center_id': service_center_id,
            'vehicle_type': vehicle_type,
            'vehicle_category': vehicle_category,
            'service_type': service_type,
            'repair_type': repair_type,
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
            'historical_average_duration': historical_average_duration,
            'actual_waiting_time': actual_waiting_time,
            'actual_service_duration': actual_service_duration,
            'actual_completion_minutes': actual_completion_minutes
        })
        
    df = pd.DataFrame(records)
    
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Dataset generated: {len(df)} records saved to {output_path}")
        
    return df

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
    out_file = os.path.join(project_root, 'data', 'synthetic_service_records.csv')
    df = generate_records(num_records=12000, output_path=out_file)
    print("Summary statistics:")
    print(df[['actual_waiting_time', 'actual_service_duration', 'actual_completion_minutes']].describe())
