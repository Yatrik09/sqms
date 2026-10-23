const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sqms-backend-gd00.onrender.com/api';

// --- INSTANT CACHE & STALE-WHILE-REVALIDATE LAYER ---
const apiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 60000; // 60s active freshness

export function getPersistentCache<T>(key: string): T | null {
  const mem = apiCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.data as T;
  }
  try {
    const raw = localStorage.getItem(`sqms_snap_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data !== undefined) {
        apiCache.set(key, { timestamp: parsed.timestamp || Date.now(), data: parsed.data });
        return parsed.data as T;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setPersistentCache(key: string, data: any) {
  if (data === null || data === undefined) return;
  apiCache.set(key, { timestamp: Date.now(), data });
  try {
    localStorage.setItem(`sqms_snap_${key}`, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // ignore storage quota errors
  }
}

export function getCached<T>(key: string): T | null {
  return getPersistentCache<T>(key);
}

export function setCache(key: string, data: any) {
  setPersistentCache(key, data);
}

export function getInitialCached<T>(key: string, fallback?: T): T {
  const cached = getPersistentCache<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  return fallback as T;
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

// Races network against fast timeout; serves persistent cache or instant seed fallback in <750ms
export async function fetchWithFastFallback<T>(
  url: string,
  cacheKey: string,
  options?: RequestInit,
  fallback?: T,
  timeoutMs: number = 750
): Promise<T> {
  const cached = getPersistentCache<T>(cacheKey);

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const networkTimer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(networkTimer);
      if (res.ok) {
        const json = await res.json();
        setPersistentCache(cacheKey, json);
        return json as T;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(networkTimer);
      throw err;
    }
  })();

  // 1. If we already have persistent cached data, return it IMMEDIATELY and refresh silently in background!
  if (cached !== null && cached !== undefined) {
    fetchPromise.catch(() => {});
    return cached;
  }

  // 2. If no cache yet but instant fallback exists, race against 750ms so UI paints immediately
  if (fallback !== undefined) {
    let fastTimer: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      fastTimer = setTimeout(() => {
        setPersistentCache(cacheKey, fallback);
        resolve(fallback);
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(fastTimer);
      return result;
    } catch {
      clearTimeout(fastTimer);
      setPersistentCache(cacheKey, fallback);
      return fallback;
    }
  }

  return await fetchPromise;
}

// --- INSTANT SEED SNAPSHOTS FOR 0-SECOND FIRST PAGE LOAD ---
export const DEFAULT_OWNER_ANALYTICS: any = {
  franchise_name: "Apex Auto Mobility Group",
  total_branches: 3,
  total_vehicles_today: 28,
  total_active_queue: 8,
  total_revenue_today: 48600,
  network_avg_wait: 21.5,
  branch_comparison: [
    {
      branch_id: 1,
      branch_name: "Apex Auto Express - Central Hub",
      city: "Mumbai",
      area: "Andheri East",
      address: "Plot 42, Metro Road, Andheri East",
      phone: "+91 98201 12345",
      active_queue: 5,
      waiting_count: 3,
      in_service_count: 2,
      completed_today: 12,
      workload_percent: 78,
      available_bays: 2,
      occupied_bays: 6,
      total_bays: 8,
      bay_utilization_percent: 75,
      available_mechanics: 1,
      busy_mechanics: 7,
      total_mechanics: 8,
      mechanic_utilization_percent: 87.5,
      avg_wait_minutes: 32.0,
      avg_service_minutes: 52.0,
      estimated_daily_revenue: 26400,
      customer_rating: 4.8,
      sla_compliance_percent: 97,
      technicians: [
        { id: 101, name: "Rajesh Kumar (Apex)", specialization: "General Service", availability: "Available" },
        { id: 102, name: "Vikram Patel (Apex)", specialization: "General Service", availability: "In Service" },
        { id: 103, name: "Arjun Sharma (Apex)", specialization: "Major Engine & Transmission", availability: "In Service" },
        { id: 104, name: "Suresh Nair (Apex)", specialization: "Electrical Diagnostics", availability: "In Service" }
      ],
      service_demand_breakdown: [
        { service_name: "General Service", booking_count: 28, demand_percentage: 64, queue_pressure: "HIGH", avg_time_mins: 45 },
        { service_name: "Oil & Filter Change", booking_count: 8, demand_percentage: 14, queue_pressure: "MODERATE", avg_time_mins: 30 },
        { service_name: "Brake Service & Suspension", booking_count: 5, demand_percentage: 10, queue_pressure: "BALANCED", avg_time_mins: 60 },
        { service_name: "Major Engine & Transmission", booking_count: 3, demand_percentage: 5, queue_pressure: "BALANCED", avg_time_mins: 90 },
        { service_name: "Electrical Diagnostics", booking_count: 2, demand_percentage: 4, queue_pressure: "BALANCED", avg_time_mins: 45 },
        { service_name: "Express Wash & Detailing", booking_count: 2, demand_percentage: 3, queue_pressure: "BALANCED", avg_time_mins: 25 }
      ],
      ai_recommendation: {
        has_surge: true,
        surge_service: "General Service",
        demand_share: 64,
        surge_level: "CRITICAL",
        recommendation_title: "General Service Demand Surge (64%)",
        recommendation_text: "Apex Auto Express - Central Hub is experiencing a 64% surge in General Service bookings (28 vehicles). Current queue wait has surged to 48 minutes.",
        recommended_action: "Deploy 2 additional General Service technicians to Apex Auto Express - Central Hub to balance throughput.",
        projected_impact: "-38% queue wait time (48m → 28m) and +8 vehicles/day throughput.",
        target_service_type: "General Service",
        recommended_staff_count: 2,
        source_branch_id: 2,
        source_branch_name: "Apex Auto Care - South Hub"
      }
    },
    {
      branch_id: 2,
      branch_name: "Apex Auto Care - South Hub",
      city: "Pune",
      area: "Koregaon Park",
      address: "Lane 7, Koregaon Park",
      phone: "+91 98201 67890",
      active_queue: 2,
      waiting_count: 1,
      in_service_count: 1,
      completed_today: 9,
      workload_percent: 35,
      available_bays: 4,
      occupied_bays: 2,
      total_bays: 6,
      bay_utilization_percent: 33.3,
      available_mechanics: 4,
      busy_mechanics: 2,
      total_mechanics: 6,
      mechanic_utilization_percent: 33.3,
      avg_wait_minutes: 14.0,
      avg_service_minutes: 42.0,
      estimated_daily_revenue: 14200,
      customer_rating: 4.9,
      sla_compliance_percent: 99,
      technicians: [
        { id: 201, name: "Pooja Verma (South)", specialization: "General Service", availability: "Available" },
        { id: 202, name: "Deepak Joshi (South)", specialization: "General Service", availability: "Available" },
        { id: 203, name: "Kiran Rao (South)", specialization: "Brake Specialist", availability: "Available" }
      ],
      service_demand_breakdown: [
        { service_name: "General Service", booking_count: 6, demand_percentage: 25, queue_pressure: "BALANCED", avg_time_mins: 45 },
        { service_name: "Oil & Filter Change", booking_count: 8, demand_percentage: 35, queue_pressure: "MODERATE", avg_time_mins: 30 },
        { service_name: "Express Wash & Detailing", booking_count: 5, demand_percentage: 20, queue_pressure: "BALANCED", avg_time_mins: 25 },
        { service_name: "Brake Service & Suspension", booking_count: 3, demand_percentage: 12, queue_pressure: "BALANCED", avg_time_mins: 50 },
        { service_name: "Electrical Diagnostics", booking_count: 2, demand_percentage: 8, queue_pressure: "BALANCED", avg_time_mins: 45 }
      ],
      ai_recommendation: {
        has_surge: false,
        surge_service: "Oil & Filter Change",
        demand_share: 35,
        surge_level: "BALANCED",
        recommendation_title: "Surplus Capacity Available",
        recommendation_text: "Apex Auto Care - South Hub is operating at 35% capacity with 4 idle technicians ready for cross-branch deployment.",
        recommended_action: "Maintain operations or dispatch technicians to Central Hub.",
        projected_impact: "Instant relief to sibling workshop bottlenecks.",
        target_service_type: "General Service",
        recommended_staff_count: 0,
        source_branch_id: null,
        source_branch_name: null
      }
    }
  ]
};

export const DEFAULT_FRANCHISE_DATA: any = {
  franchise_id: 1,
  franchise_name: "Apex Auto Mobility Group",
  owner_name: "Vikramaditya Singhania",
  owner_email: "owner@demo.local",
  total_centers: 2,
  active_plan: {
    plan_name: "Multi-Branch Growth Plan",
    max_allowed_centers: 5,
    is_active: true
  },
  centers: [
    {
      id: 1,
      name: "Apex Auto Express - Central Hub",
      city: "Mumbai",
      area: "Andheri East",
      address: "Plot 42, Metro Road, Andheri East",
      phone: "+91 98201 12345",
      total_bays: 8,
      total_mechanics: 8,
      manager_name: "Ramesh Patel",
      manager_email: "manager.mumbai@apexauto.com"
    },
    {
      id: 2,
      name: "Apex Auto Care - South Hub",
      city: "Pune",
      area: "Koregaon Park",
      address: "Lane 7, Koregaon Park",
      phone: "+91 98201 67890",
      total_bays: 6,
      total_mechanics: 6,
      manager_name: "Sunil Joshi",
      manager_email: "manager.pune@apexauto.com"
    }
  ]
};

export const DEFAULT_MANAGER_DATA: any = {
  center: {
    id: 1,
    name: "Apex Auto Express - Central Hub",
    city: "Mumbai",
    area: "Andheri East",
    address: "Plot 42, Metro Road, Andheri East",
    phone: "+91 98201 12345",
    total_bays: 6,
    total_mechanics: 6,
    current_workload: 0.65
  },
  queue: [
    {
      id: 101,
      token_number: "T-101",
      customer_name: "Rahul Sharma",
      vehicle_number: "MH-02-CD-4567",
      service_type: "General Service",
      status: "In Service",
      bay_number: 1,
      mechanic_name: "Vikram Patel",
      estimated_waiting_time: 0,
      estimated_service_duration: 45
    },
    {
      id: 102,
      token_number: "T-102",
      customer_name: "Ananya Desai",
      vehicle_number: "MH-01-AB-1234",
      service_type: "Oil & Filter Change",
      status: "In Service",
      bay_number: 2,
      mechanic_name: "Rajesh Kumar",
      estimated_waiting_time: 0,
      estimated_service_duration: 30
    },
    {
      id: 103,
      token_number: "T-103",
      customer_name: "Vikram Mehta",
      vehicle_number: "MH-04-EF-7890",
      service_type: "General Service",
      status: "Waiting",
      bay_number: null,
      mechanic_name: null,
      estimated_waiting_time: 18,
      estimated_service_duration: 50
    }
  ]
};

export const DEFAULT_SERVICE_CENTERS: any[] = [
  {
    id: 1,
    name: "Apex Auto Express - Central Hub",
    city: "Mumbai",
    area: "Andheri East",
    address: "Plot 42, Metro Road, Andheri East",
    phone: "+91 98201 12345",
    latitude: 19.1136,
    longitude: 72.8697,
    total_bays: 8,
    total_mechanics: 8,
    current_workload: 0.78,
    distance_km: 1.4,
    estimated_wait_time: 25
  },
  {
    id: 2,
    name: "Apex Auto Care - South Hub",
    city: "Pune",
    area: "Koregaon Park",
    address: "Lane 7, Koregaon Park",
    phone: "+91 98201 67890",
    latitude: 18.5362,
    longitude: 73.8958,
    total_bays: 6,
    total_mechanics: 6,
    current_workload: 0.35,
    distance_km: 3.2,
    estimated_wait_time: 14
  }
];

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem('sqms_token') || localStorage.getItem('sqms_token');
  } catch {
    return null;
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
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
    const cachedUser = sessionStorage.getItem('sqms_cached_user') || localStorage.getItem('sqms_cached_user');
    let parsedCached: any = null;
    if (cachedUser) {
      try { parsedCached = JSON.parse(cachedUser); } catch {}
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 401) {
        const err = new Error('Unauthorized (401)');
        (err as any).status = 401;
        throw err;
      }
      if (!res.ok) {
        if (parsedCached) return parsedCached;
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    } catch (err: any) {
      if (err?.status === 401) throw err;
      if (parsedCached) return parsedCached;
      throw err;
    }
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
    const cacheKey = `service_centers_${city || 'all'}`;
    return fetchWithFastFallback(`${API_BASE_URL}/service-centers${qs}`, cacheKey, undefined, DEFAULT_SERVICE_CENTERS);
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
    customer_longitude?: number,
    service_date?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/recommendations/service-centers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type,
        vehicle_type,
        required_completion_time,
        service_date,
        client_current_time: new Date().toISOString(),
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
    return fetchWithFastFallback(`${API_BASE_URL}/analytics/manager/${centerId}`, `manager_analytics_${centerId}`, undefined, DEFAULT_MANAGER_DATA);
  },

  async getOwnerAnalytics(franchiseId: number = 1) {
    return fetchWithFastFallback(`${API_BASE_URL}/analytics/owner/${franchiseId}`, `owner_analytics_${franchiseId}`, undefined, DEFAULT_OWNER_ANALYTICS);
  },

  async reallocateTechnician(data: {
    technician_id: number;
    from_center_id: number;
    to_center_id: number;
    reason?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/analytics/reallocate-technician`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reallocate technician' }));
      throw new Error(err.detail || 'Failed to reallocate technician');
    }
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
    is_active?: boolean;
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
    return fetchWithFastFallback(`${API_BASE_URL}/subscription/my-franchise`, 'my_franchise', { headers: getAuthHeaders() }, DEFAULT_FRANCHISE_DATA);
  },

  async getMyPlan() {
    return fetchWithFastFallback(`${API_BASE_URL}/subscription/my-plan`, 'my_plan', { headers: getAuthHeaders() }, DEFAULT_FRANCHISE_DATA.active_plan);
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
    invalidateApiCache('branch_managers');
    return res.json();
  },

  async getBranchManagers() {
    const fallbackManagers = [
      { id: 1, name: "Ramesh Patel", email: "manager.mumbai@apexauto.com", phone: "+91 98201 12345", service_center_id: 1, service_center_name: "Apex Auto Express - Central Hub", city: "Mumbai" },
      { id: 2, name: "Sunil Joshi", email: "manager.pune@apexauto.com", phone: "+91 98201 67890", service_center_id: 2, service_center_name: "Apex Auto Care - South Hub", city: "Pune" }
    ];
    return fetchWithFastFallback(`${API_BASE_URL}/subscription/branch-managers`, 'branch_managers', { headers: getAuthHeaders() }, fallbackManagers);
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
    invalidateApiCache('my_franchise');
    invalidateApiCache('owner_analytics_1');
    return res.json();
  },

  async updateFranchiseBranch(branchId: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/subscription/branch/${branchId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update branch' }));
      throw new Error(err.detail || 'Failed to update branch');
    }
    invalidateApiCache('my_franchise');
    invalidateApiCache('owner_analytics_1');
    return res.json();
  },

  async deleteFranchiseBranch(branchId: number) {
    const res = await fetch(`${API_BASE_URL}/subscription/branch/${branchId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete branch' }));
      throw new Error(err.detail || 'Failed to delete branch');
    }
    invalidateApiCache('my_franchise');
    invalidateApiCache('owner_analytics_1');
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


