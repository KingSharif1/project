/**
 * Backend API Service
 * Handles all communication with Express backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    role: string;
    clinicId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface ApiError {
  error: string;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Login failed');
  }

  return data as LoginResponse;
}

/**
 * Logout current user
 */
export async function logout(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(token: string): Promise<LoginResponse['user']> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Failed to get user');
  }

  return data.user;
}

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('transportHub_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Generic API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Request failed');
  }

  return data;
}

// ============ DRIVERS API ============

export async function getDrivers() {
  return apiRequest<{ success: boolean; data: any[] }>('/drivers');
}

export async function getDriver(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${id}`);
}

export async function createDriver(driverData: any) {
  return apiRequest<{ success: boolean; data: any; temporaryPassword?: string }>('/drivers', {
    method: 'POST',
    body: JSON.stringify(driverData),
  });
}

export async function updateDriver(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteDriver(id: string) {
  return apiRequest<{ success: boolean }>(`/drivers/${id}`, {
    method: 'DELETE',
  });
}

export async function updateDriverLocation(id: string, latitude: number, longitude: number) {
  return apiRequest<{ success: boolean }>(`/drivers/${id}/location`, {
    method: 'PUT',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function updateDriverStatus(id: string, status: string) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ============ VEHICLES API ============

export async function getVehicles() {
  return apiRequest<{ success: boolean; data: any[] }>('/vehicles');
}

export async function getVehicle(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/vehicles/${id}`);
}

export async function createVehicle(vehicleData: any) {
  return apiRequest<{ success: boolean; data: any }>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
}

export async function updateVehicle(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteVehicle(id: string) {
  return apiRequest<{ success: boolean }>(`/vehicles/${id}`, {
    method: 'DELETE',
  });
}

// ============ PATIENTS/RIDERS API ============

export async function getPatients() {
  return apiRequest<{ success: boolean; data: any[] }>('/patients');
}

export async function getPatient(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/patients/${id}`);
}

export async function createPatient(patientData: any) {
  return apiRequest<{ success: boolean; data: any }>('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
}

export async function updatePatient(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deletePatient(id: string) {
  return apiRequest<{ success: boolean }>(`/patients/${id}`, {
    method: 'DELETE',
  });
}

export async function searchPatients(query: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/patients/search/${encodeURIComponent(query)}`);
}

// ============ TRIPS API ============

export async function getTrips(filters?: { status?: string; date?: string; driverId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.date) params.append('date', filters.date);
  if (filters?.driverId) params.append('driverId', filters.driverId);
  
  const queryString = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/trips${queryString ? `?${queryString}` : ''}`);
}

export async function getTrip(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/trips/${id}`);
}

export async function createTrip(tripData: any) {
  return apiRequest<{ success: boolean; data: any }>('/trips', {
    method: 'POST',
    body: JSON.stringify(tripData),
  });
}

export async function updateTrip(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTrip(id: string) {
  return apiRequest<{ success: boolean }>(`/trips/${id}`, {
    method: 'DELETE',
  });
}

export async function assignDriverToTrip(tripId: string, driverId: string, vehicleId?: string) {
  return apiRequest<{ success: boolean; data: any }>(`/trips/${tripId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ driverId, vehicleId }),
  });
}

export async function updateTripStatus(tripId: string, status: string, location?: { latitude: number; longitude: number }) {
  return apiRequest<{ success: boolean; data: any }>(`/trips/${tripId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...location }),
  });
}

export async function getTodaysTrips() {
  return apiRequest<{ success: boolean; data: any[] }>('/trips/dashboard/today');
}

// ============ CLINICS API ============

export async function getClinics() {
  return apiRequest<{ success: boolean; data: any[] }>('/clinics');
}

export async function getClinic(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/clinics/${id}`);
}

export async function createClinic(clinicData: any) {
  return apiRequest<{ success: boolean; data: any }>('/clinics', {
    method: 'POST',
    body: JSON.stringify(clinicData),
  });
}

export async function updateClinic(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/clinics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteClinic(id: string) {
  return apiRequest<{ success: boolean }>(`/clinics/${id}`, {
    method: 'DELETE',
  });
}

// ============ FACILITIES API ============

export async function getFacilities() {
  return apiRequest<{ success: boolean; data: any[] }>('/facilities');
}

export async function getFacility(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/facilities/${id}`);
}

export async function createFacility(facilityData: any) {
  return apiRequest<{ success: boolean; data: any }>('/facilities', {
    method: 'POST',
    body: JSON.stringify(facilityData),
  });
}

export async function updateFacility(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/facilities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteFacility(id: string) {
  return apiRequest<{ success: boolean }>(`/facilities/${id}`, {
    method: 'DELETE',
  });
}

// ============ DATA LOADING API ============

export async function loadAllData() {
  const [driversRes, vehiclesRes, patientsRes, tripsRes, clinicsRes, facilitiesRes] = await Promise.all([
    getDrivers(),
    getVehicles(),
    getPatients(),
    getTrips(),
    getClinics(),
    getFacilities(),
  ]);

  return {
    drivers: driversRes.data,
    vehicles: vehiclesRes.data,
    patients: patientsRes.data,
    trips: tripsRes.data,
    clinics: clinicsRes.data,
    facilities: facilitiesRes.data,
  };
}
