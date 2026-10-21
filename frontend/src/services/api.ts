const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sqms-backend-gd00.onrender.com/api';

// In-memory lightweight cache with TTL for static/infrequent data (prevents redundant network round-trips)
const apiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 30000; // 30s cache

function getCached<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  apiCache.set(key, { timestamp: Date.now(), data });
}

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.startsWith(prefix)) {
        apiCache.delete(key);
      }
    }
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sqms_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // --- KEEPALIVE & WARMUP (Prevents Render cold starts) ---
  warmupBackend() {
    try {
      const rootUrl = API_BASE_URL.replace(/\/api\/?$/, '');
      fetch(`${rootUrl}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    } catch {
      // ignore
    }
  },

  // --- AUTH ---
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(
    name: string,
    email: string,
    password: string,
    phone?: string,
    city?: string,
    area?: string,
    latitude?: number,
    longitude?: number
  ) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone ? phone.trim() : undefined,
        role: 'customer',
        city: city || 'Ahmedabad',
        area: area || 'Science City',
        latitude: latitude ?? 23.0784,
        longitude: longitude ?? 72.5074,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async requestPasswordResetOTP(email: string) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to request OTP' }));
      throw new Error(err.detail || 'Failed to request OTP');
    }
    return res.json() as Promise<{
      status: string;
      message: string;
      email: string;
      expires_in_seconds: number;
      dev_otp?: string;
    }>;
  },

  async verifyOTPAndResetPassword(email: string, otp: string, new_password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Verification failed');
    }
    return res.json();
  },

  async resetPassword(email: string, new_password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        new_password,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Password reset failed' }));
      throw new Error(err.detail || 'Password reset failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    current_password?: string;
    new_password?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
      throw new Error(err.detail || 'Failed to update profile');
    }
    return res.json();
  },

  // --- CUSTOMER ---
  async getMyVehicles() {
    const res = await fetch(`${API_BASE_URL}/customers/me/vehicles`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async addVehicle(data: { registration_number: string; vehicle_type: string; model: string; year: number; fuel_type: string }) {
    const res = await fetch(`${API_BASE_URL}/customers/me/vehicles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to add vehicle');
    }
    return res.json();
  },

  async deleteVehicle(vehicleId: number) {
    const res = await fetch(`${API_BASE_URL}/customers/me/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getMyActiveService() {
    const res = await fetch(`${API_BASE_URL}/customers/me/active-service`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getMyHistory() {
    const res = await fetch(`${API_BASE_URL}/customers/me/history`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // --- SERVICE CENTERS ---
  async getServiceCenters(city?: string, latitude?: number, longitude?: number) {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (latitude !== undefined && latitude !== null) params.append('latitude', String(latitude));
    if (longitude !== undefined && longitude !== null) params.append('longitude', String(longitude));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/service-centers${qs}`);
    return res.json();
  },

  async getServiceCenterById(id: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${id}`);
    return res.json();
  },

  async getMyManagedCenter() {
    const res = await fetch(`${API_BASE_URL}/service-centers/my-managed-center`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getCenterBays(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/bays`);
    return res.json();
  },

  async getCenterMechanics(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/mechanics`);
    return res.json();
  },

  async toggleBayStatus(bayId: number, status: string) {
    const res = await fetch(`${API_BASE_URL}/service-centers/bays/${bayId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async toggleMechanicStatus(mechId: number, availability: string) {
    const res = await fetch(`${API_BASE_URL}/service-centers/mechanics/${mechId}/status?availability=${encodeURIComponent(availability)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async syncCenterResources(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/sync-resources`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createBay(centerId: number, data: { bay_number: string; service_center_id: number; supported_service_type: string; status?: string }) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/bays`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create service bay' }));
      throw new Error(err.detail || 'Failed to create service bay');
    }
    return res.json();
  },

  async createMechanic(centerId: number, data: { name: string; service_center_id: number; specialization: string; availability?: string }) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/mechanics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create mechanic' }));
      throw new Error(err.detail || 'Failed to create mechanic');
    }
    return res.json();
  },

  async deleteBay(centerId: number, bayId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/bays/${bayId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to remove service bay' }));
      throw new Error(err.detail || 'Failed to remove service bay');
    }
    return res.json();
  },

  async deleteMechanic(centerId: number, mechId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/mechanics/${mechId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to remove mechanic' }));
      throw new Error(err.detail || 'Failed to remove mechanic');
    }
    return res.json();
  },

  // --- BOOKINGS & QUEUE ---
  async createBooking(data: {
    vehicle_id: number;
    service_center_id: number;
    service_type: string;
    repair_type?: string;
    requested_date: string;
    preferred_time?: string;
    required_completion_time?: string;
    notes?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Booking creation failed');
    }
    return res.json();
  },

  async getCenterQueue(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/queue/center/${centerId}`);
    return res.json();
  },

  async createWalkIn(data: any) {
    const res = await fetch(`${API_BASE_URL}/queue/walk-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Walk-in creation failed');
    }
    return res.json();
  },

  async updateQueueStatus(entryId: number, data: { new_status: string; assigned_bay_id?: number; assigned_mechanic_id?: number; notes?: string }) {
    const res = await fetch(`${API_BASE_URL}/queue/${entryId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Status update failed');
    }
    return res.json();
  },

  // --- PREDICTIONS & RECOMMENDATIONS ---
  async getPrediction(service_center_id: number, service_type: string, vehicle_type: string = 'Sedan') {
    const res = await fetch(`${API_BASE_URL}/predictions/service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_center_id, service_type, vehicle_type }),
    });
    return res.json();
  },

  async getRecommendations(
    service_type: string,
    vehicle_type: string = 'Sedan',
    required_completion_time?: string,
    customer_latitude?: number,
    customer_longitude?: number
  ) {
    const res = await fetch(`${API_BASE_URL}/recommendations/service-centers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type,
        vehicle_type,
        required_completion_time,
        customer_latitude,
        customer_longitude,
      }),
    });
    return res.json();
  },

  // --- ACCIDENT REPAIR ---
  async submitPreliminaryAssessment(formData: FormData) {
    const token = localStorage.getItem('sqms_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/accident-repair/preliminary-assessment`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Assessment failed');
    }
    return res.json();
  },

  // --- ANALYTICS ---
  async getManagerAnalytics(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/analytics/manager/${centerId}`);
    return res.json();
  },

  async getOwnerAnalytics(franchiseId: number = 1) {
    const res = await fetch(`${API_BASE_URL}/analytics/owner/${franchiseId}`);
    return res.json();
  },

  async getAdminAnalytics() {
    const res = await fetch(`${API_BASE_URL}/analytics/admin`);
    return res.json();
  },

  // --- ML MANAGEMENT ---
  async getMLStatus() {
    const res = await fetch(`${API_BASE_URL}/admin/ml/models`);
    return res.json();
  },

  async getMLEvaluationData() {
    const res = await fetch(`${API_BASE_URL}/admin/ml/evaluation-data`);
    return res.json();
  },

  async triggerMLTraining() {
    const res = await fetch(`${API_BASE_URL}/admin/ml/train`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training failed');
    }
    return res.json();
  },

  async getDatasetPreview() {
    const res = await fetch(`${API_BASE_URL}/admin/ml/dataset/preview`);
    return res.json();
  },

  // --- DEMO CONTROLS ---
  async setDemoWorkload(centerId: number, level: string) {
    const res = await fetch(`${API_BASE_URL}/demo/set-workload/${centerId}?level=${encodeURIComponent(level)}`, {
      method: 'POST',
    });
    return res.json();
  },

  async addBatchQueue(centerId: number, count: number = 3) {
    const res = await fetch(`${API_BASE_URL}/demo/add-batch-queue/${centerId}?count=${count}`, {
      method: 'POST',
    });
    return res.json();
  },

  async advanceFirstVehicle(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/demo/advance-first-vehicle/${centerId}`, {
      method: 'POST',
    });
    return res.json();
  },

  // --- NOTIFICATIONS ---
  async getMyNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications/my`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async markNotificationRead(id: number) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(limit: number = 50) {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // --- SUBSCRIPTIONS & FRANCHISE ---
  async getSubscriptionPlans(forceRefresh: boolean = false) {
    const cacheKey = 'subscription_plans';
    if (!forceRefresh) {
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;
    }
    const res = await fetch(`${API_BASE_URL}/subscription/plans`);
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  },

  async getAdminSubscriptionPlans() {
    const res = await fetch(`${API_BASE_URL}/subscription/plans/admin`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch admin subscription plans' }));
      throw new Error(err.detail || 'Failed to fetch admin subscription plans');
    }
    return res.json();
  },

  async createSubscriptionPlan(data: {
    id?: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    max_centers: number;
    max_bays_per_center: number;
    max_managers: number;
    description?: string;
    features?: string[];
    badge?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/subscription/plans`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create subscription plan' }));
      throw new Error(err.detail || 'Failed to create subscription plan');
    }
    invalidateApiCache('subscription_plans');
    return res.json();
  },

  async updateSubscriptionPlan(planId: string, data: {
    name?: string;
    price_monthly?: number;
    price_yearly?: number;
    max_centers?: number;
    max_bays_per_center?: number;
    max_managers?: number;
    description?: string;
    features?: string[];
    badge?: string;
    is_active?: boolean;
  }) {
    const res = await fetch(`${API_BASE_URL}/subscription/plans/${encodeURIComponent(planId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update subscription plan' }));
      throw new Error(err.detail || 'Failed to update subscription plan');
    }
    invalidateApiCache('subscription_plans');
    return res.json();
  },

  async deleteSubscriptionPlan(planId: string) {
    const res = await fetch(`${API_BASE_URL}/subscription/plans/${encodeURIComponent(planId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete subscription plan' }));
      throw new Error(err.detail || 'Failed to delete subscription plan');
    }
    invalidateApiCache('subscription_plans');
    return res.json();
  },

  async purchaseSubscription(data: any) {
    const res = await fetch(`${API_BASE_URL}/subscription/purchase`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to process subscription purchase' }));
      throw new Error(err.detail || 'Failed to process subscription purchase');
    }
    return res.json();
  },

  async getMyFranchise() {
    const res = await fetch(`${API_BASE_URL}/subscription/my-franchise`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch franchise details' }));
      throw new Error(err.detail || 'Failed to fetch franchise details');
    }
    return res.json();
  },

  async getMyPlan() {
    const res = await fetch(`${API_BASE_URL}/subscription/my-plan`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch plan details' }));
      throw new Error(err.detail || 'Failed to fetch plan details');
    }
    return res.json();
  },

  async createBranchManager(data: any) {
    const res = await fetch(`${API_BASE_URL}/subscription/create-branch-manager`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create branch manager' }));
      throw new Error(err.detail || 'Failed to create branch manager');
    }
    return res.json();
  },

  async getBranchManagers() {
    const res = await fetch(`${API_BASE_URL}/subscription/branch-managers`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load branch managers' }));
      throw new Error(err.detail || 'Failed to load branch managers');
    }
    return res.json();
  },

  async addFranchiseBranch(data: any) {
    const res = await fetch(`${API_BASE_URL}/subscription/add-branch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add branch' }));
      throw new Error(err.detail || 'Failed to add branch');
    }
    return res.json();
  },

  async getAdminSubscriptionOverview() {
    const res = await fetch(`${API_BASE_URL}/subscription/admin/overview`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load subscription overview' }));
      throw new Error(err.detail || 'Failed to load subscription overview');
    }
    return res.json();
  },

  async getCenterTechnicians(centerId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/technicians`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load technicians' }));
      throw new Error(err.detail || 'Failed to load technicians');
    }
    return res.json();
  },

  async createFloorTechnician(centerId: number, data: { name: string; email: string; password: string; phone?: string; specialization?: string }) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/technicians`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create technician account' }));
      throw new Error(err.detail || 'Failed to create technician account');
    }
    return res.json();
  },

  async deactivateFloorTechnician(centerId: number, techUserId: number) {
    const res = await fetch(`${API_BASE_URL}/service-centers/${centerId}/technicians/${techUserId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to deactivate technician' }));
      throw new Error(err.detail || 'Failed to deactivate technician');
    }
    return res.json();
  },

  // --- RAZORPAY PAYMENTS ---
  async getRazorpayConfig() {
    const res = await fetch(`${API_BASE_URL}/razorpay/config`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch Razorpay config' }));
      throw new Error(err.detail || 'Failed to fetch Razorpay config');
    }
    return res.json();
  },

  async createRazorpayOrder(data: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, any>;
  }) {
    const res = await fetch(`${API_BASE_URL}/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create Razorpay order' }));
      throw new Error(err.detail || 'Failed to create Razorpay order');
    }
    return res.json();
  },

  async verifyRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    user_id?: number;
    user_email?: string;
    plan_id?: string;
    billing_period?: string;
    franchise_name?: string;
    primary_center_name?: string;
    address?: string;
    city?: string;
    area?: string;
    phone?: string;
    total_bays?: number;
    total_mechanics?: number;
    notes?: Record<string, any>;
  }) {
    const res = await fetch(`${API_BASE_URL}/verify-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Payment verification failed' }));
      throw new Error(err.detail || 'Payment verification failed');
    }
    return res.json();
  },
};


