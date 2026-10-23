export type UserRole = 'super_admin' | 'franchise_owner' | 'branch_manager' | 'customer' | 'technician';

export interface User {
  id: number;
  name: str;
  email: str;
  phone?: str;
  role: UserRole;
  status: str;
  created_at: str;
  plan_tier?: string;
  plan_name?: string;
  max_allowed_centers?: number;
  subscription_status?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  service_center_id?: number;
  service_center_name?: string;
}

type str = string;

export interface Vehicle {
  id: number;
  customer_id: number;
  registration_number: string;
  vehicle_type: string;
  model: string;
  year: number;
  fuel_type: string;
}

export interface ServiceCenter {
  id: number;
  franchise_id?: number;
  manager_id?: number;
  name: string;
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  phone: string;
  capacity: number;
  total_bays: number;
  total_mechanics: number;
  current_workload: number;
  status: string;
  operating_hours_start: string;
  operating_hours_end: string;
  supported_services: string[];
  available_bays: number;
  available_mechanics: number;
  active_queue_count: number;
  manager_name?: string;
  distance_km?: number;
}

export interface ServiceBay {
  id: number;
  service_center_id: number;
  bay_number: string;
  supported_service_type: string;
  status: string;
  current_service_id?: number;
}

export interface Mechanic {
  id: number;
  service_center_id: number;
  name: string;
  specialization: string;
  availability: string;
  status: string;
  current_service_id?: number;
}

export interface QueueEntry {
  id: number;
  service_request_id: number;
  token_number: string;
  queue_position: number;
  status: string;
  queue_status: string;
  joined_at?: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_registration?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  service_type: string;
  repair_type?: string;
  priority: string;
  assigned_bay_id?: number;
  assigned_mechanic_id?: number;
  bay_number?: string;
  mechanic_name?: string;
  estimated_waiting_minutes?: number;
  estimated_service_minutes?: number;
  expected_completion_time?: string;
  prediction_source?: string;
  factors?: string[];
}

export interface PredictionResult {
  waiting_time_minutes: number;
  service_duration_minutes: number;
  total_turnaround_minutes: number;
  expected_completion_time: string;
  expected_completion_iso: string;
  prediction_source: string;
  model_name: string;
  model_version: string;
  contributing_factors: string[];
  workload_level: string;
}

export interface CenterRecommendationItem {
  service_center_id: number;
  name: string;
  address: string;
  city?: string;
  area?: string;
  distance_km: number;
  current_workload: number;
  workload_label: string;
  active_queue_length: number;
  available_bays: number;
  available_mechanics: number;
  predicted_waiting_minutes: number;
  predicted_service_minutes: number;
  predicted_completion_time: string;
  required_completion_time?: string;
  is_time_feasible: boolean;
  feasibility_status: string;
  slot_availability_status?: string;
  recommendation_score: number;
  recommendation_reasons: string[];
  is_recommended: boolean;
}

export interface RecommendationResponse {
  service_type: string;
  required_completion_time?: string;
  recommended_center: CenterRecommendationItem;
  alternative_centers: CenterRecommendationItem[];
  scoring_methodology: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export interface MLModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  training_time_sec?: number;
}

export interface MLStatusResponse {
  status: string;
  training_timestamp?: string;
  dataset_records: number;
  dataset_version: string;
  waiting_time?: {
    active_model: string;
    model_version: string;
    comparison: Record<string, MLModelMetrics>;
    best_metrics: MLModelMetrics;
    feature_importance: Record<string, number>;
  };
  service_duration?: {
    active_model: string;
    model_version: string;
    comparison: Record<string, MLModelMetrics>;
    best_metrics: MLModelMetrics;
    feature_importance: Record<string, number>;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_centers: number;
  max_bays_per_center: number;
  max_managers: number;
  description: string;
  features: string[];
  badge?: string;
  is_active?: boolean;
}

export interface SubscriptionPurchaseRequest {
  plan_id: string;
  franchise_name: string;
  primary_center_name: string;
  address: string;
  city: string;
  area: string;
  phone: string;
  total_bays?: number;
  total_mechanics?: number;
  payment_method?: string;
}

export interface BranchManagerCreate {
  name: string;
  email: string;
  password: string;
  phone?: string;
  service_center_id: number;
}

export interface BranchManagerItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  service_center_id?: number;
  service_center_name?: string;
}

export interface BranchCreateRequest {
  name: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  total_bays?: number;
  total_mechanics?: number;
  latitude?: number;
  longitude?: number;
}

export interface MyFranchiseResponse {
  franchise_id: number | null;
  franchise_name: string;
  centers: Array<{
    id: number;
    name: string;
    city: string;
    address: string;
    phone: string;
    total_bays: number;
    total_mechanics: number;
    current_workload: number;
    manager_id: number | null;
    manager_name: string;
    manager_email?: string | null;
  }>;
}

export interface TechnicianItem {
  id: number;
  user_id?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  specialization?: string;
  availability?: string;
  status: string;
  service_center_id: number;
  service_center_name?: string;
  created_at?: string | null;
}

// --- RAZORPAY TYPES ---
export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  receipt?: string;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPaymentVerifyResponse {
  success: boolean;
  message: string;
  order_id: string;
  payment_id: string;
  signature_valid: boolean;
  invoice_id?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentSuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}


