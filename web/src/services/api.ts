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

// ============ VEHICLE DOCUMENTS API ============

export async function getVehicleDocuments(vehicleId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/vehicles/${vehicleId}/documents`);
}

export async function uploadVehicleDocument(vehicleId: string, doc: { documentType: string; fileName: string; fileUrl: string; fileSize?: number; expiryDate?: string }) {
  return apiRequest<{ success: boolean; data: any }>(`/vehicles/${vehicleId}/documents`, {
    method: 'POST',
    body: JSON.stringify(doc),
  });
}

export async function deleteVehicleDocument(vehicleId: string, docId: string) {
  return apiRequest<{ success: boolean }>(`/vehicles/${vehicleId}/documents/${docId}`, {
    method: 'DELETE',
  });
}

// ============ FILE UPLOAD API (via backend → Supabase Storage) ============

export async function uploadFileToStorage(bucket: 'driver-documents' | 'vehicle-documents', filePath: string, file: File): Promise<{ success: boolean; filePath: string }> {
  const token = localStorage.getItem('transportHub_token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', filePath);

  const response = await fetch(`${API_URL}/uploads/${bucket}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const result = await apiRequest<{ success: boolean; signedUrl: string }>(`/uploads/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`);
  return result.signedUrl;
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

// ============ CONTRACTORS API ============

export async function getContractors() {
  return apiRequest<{ success: boolean; data: any[] }>('/contractors');
}

export async function getContractor(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/contractors/${id}`);
}

export async function createContractor(contractorData: any) {
  return apiRequest<{ success: boolean; data: any }>('/contractors', {
    method: 'POST',
    body: JSON.stringify(contractorData),
  });
}

export async function updateContractor(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/contractors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteContractor(id: string) {
  return apiRequest<{ success: boolean }>(`/contractors/${id}`, {
    method: 'DELETE',
  });
}

// ============ TRIP SOURCES API ============

export async function getTripSources() {
  return apiRequest<{ success: boolean; data: any[] }>('/trip-sources');
}

// ============ USERS API ============

export async function getUsers() {
  return apiRequest<{ success: boolean; data: any[] }>('/users');
}

export async function createUser(userData: any) {
  return apiRequest<{ success: boolean; data: any; temporaryPassword?: string }>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id: string, updates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function toggleUserActive(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/users/${id}/toggle-active`, {
    method: 'PUT',
  });
}

export async function deleteUser(id: string) {
  return apiRequest<{ success: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function resetUserPassword(id: string, newPassword: string) {
  return apiRequest<{ success: boolean }>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export async function resetPasswordByEmail(email: string, userType: string, temporaryPassword: string, sendSMS?: boolean) {
  return apiRequest<{ success: boolean; smsError?: string; error?: string; accountCreated?: boolean }>('/users/reset-password-by-email', {
    method: 'POST',
    body: JSON.stringify({ email, userType, temporaryPassword, sendSMS }),
  });
}

// ============ RATES API ============

export async function getContractorRates(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/contractors/${id}/rates`);
}

export async function updateContractorRates(id: string, rates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/contractors/${id}/rates`, {
    method: 'PUT',
    body: JSON.stringify(rates),
  });
}

export async function getDriverRates(id: string) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${id}/rates`);
}

export async function updateDriverRates(id: string, rates: any) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${id}/rates`, {
    method: 'PUT',
    body: JSON.stringify(rates),
  });
}

// ============ DRIVER DOCUMENTS API ============

export async function getDriverDocuments(driverId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/drivers/${driverId}/documents`);
}

export async function uploadDriverDocument(driverId: string, doc: { documentType: string; fileName: string; fileUrl: string; fileSize?: number; expiryDate?: string }) {
  return apiRequest<{ success: boolean; data: any }>(`/drivers/${driverId}/documents`, {
    method: 'POST',
    body: JSON.stringify(doc),
  });
}

export async function deleteDriverDocument(driverId: string, docId: string) {
  return apiRequest<{ success: boolean }>(`/drivers/${driverId}/documents/${docId}`, {
    method: 'DELETE',
  });
}

// ============ NOTIFICATIONS API ============

export async function sendSms(to: string, message: string, tripId?: string) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/sms', {
    method: 'POST',
    body: JSON.stringify({ to, message, tripId }),
  });
}

export async function sendEmailNotification(logId: string) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/email', {
    method: 'POST',
    body: JSON.stringify({ logId }),
  });
}

export async function processAutomatedNotification(type: string, logId?: string, tripId?: string) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/automated', {
    method: 'POST',
    body: JSON.stringify({ type, logId, tripId }),
  });
}

export async function logNotification(data: { tripId?: string; phoneNumber?: string; message?: string; status?: string; type?: string }) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/log', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function bulkInsertNotifications(notifications: any[]) {
  return apiRequest<{ success: boolean }>('/notifications/bulk-insert', {
    method: 'POST',
    body: JSON.stringify({ notifications }),
  });
}

export async function getPendingEmails() {
  return apiRequest<{ success: boolean; data: any[] }>('/notifications/pending-emails');
}

export async function getPendingNotifications() {
  return apiRequest<{ success: boolean; data: any[] }>('/notifications/pending');
}

export async function logSmsNotification(data: { tripId: string; phoneNumber: string; message: string; messageType: string; patientName?: string; status?: string }) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/sms-log', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSmsHistory(startDate?: string, endDate?: string, limit?: number) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/notifications/sms-history${qs ? '?' + qs : ''}`);
}

export async function logTripReminder(data: { tripId: string; reminderType?: string; status?: string; smsSent?: boolean; emailSent?: boolean }) {
  return apiRequest<{ success: boolean; data: any }>('/notifications/trip-reminders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ TRIP HISTORY API ============

export async function getTripHistory(tripId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/trips/${tripId}/history`);
}

export async function getTripCreator(tripId: string) {
  return apiRequest<{ success: boolean; data: { creatorName: string | null; lastModifierName: string | null } }>(`/trips/${tripId}/creator`);
}

export async function getTripAssignmentHistory(tripId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/trips/${tripId}/assignment-history`);
}

export async function getTripSmsHistory(tripId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/trips/${tripId}/sms-history`);
}

export async function getDriverLocations() {
  return apiRequest<{ success: boolean; data: any[] }>('/drivers/locations');
}

export async function getDriverPayouts(startDate: string, endDate: string, driverId?: string) {
  const params = new URLSearchParams({ startDate, endDate });
  if (driverId) params.set('driverId', driverId);
  return apiRequest<{ success: boolean; data: any[] }>(`/drivers/payouts?${params.toString()}`);
}

export async function getTripRoute(tripId: string) {
  return apiRequest<{ success: boolean; data: { route: any; locations: any[] } }>(`/trips/${tripId}/route`);
}

export async function checkAllDriverDocuments() {
  return apiRequest<{ success: boolean; notificationsSent: number; driversChecked: number }>('/drivers/check-documents', {
    method: 'POST',
  });
}

// ============ CLINIC STATS API (Superadmin) ============

export async function getClinicStats() {
  return apiRequest<{ success: boolean; data: { clinics: any[]; stats: Record<string, any> } }>('/clinics/stats');
}

export async function getClinicMembers(clinicId: string) {
  return apiRequest<{ success: boolean; data: { users: any[]; drivers: any[] } }>(`/clinics/${clinicId}/members`);
}

// ============ TRIP SIGNATURES API ============

export async function getTripSignatures(tripIds: string[]) {
  return apiRequest<{ success: boolean; data: any[] }>('/trips/signatures', {
    method: 'POST',
    body: JSON.stringify({ tripIds }),
  });
}

// ============ USER NOTIFICATIONS API ============

export async function getUserNotifications() {
  return apiRequest<{ success: boolean; data: any[] }>('/notifications/user');
}

export async function markNotificationRead(id: string) {
  return apiRequest<{ success: boolean }>(`/notifications/read/${id}`, { method: 'PUT' });
}

export async function markAllNotificationsRead(ids: string[]) {
  return apiRequest<{ success: boolean }>('/notifications/read-all', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

export async function deleteNotification(id: string) {
  return apiRequest<{ success: boolean }>(`/notifications/user/${id}`, { method: 'DELETE' });
}

export async function clearAllNotifications() {
  return apiRequest<{ success: boolean }>('/notifications/user-all', { method: 'DELETE' });
}

export async function getNotificationPreferences() {
  return apiRequest<{ success: boolean; data: any }>('/notifications/preferences');
}

export async function saveNotificationPreferences(prefs: Record<string, any>) {
  return apiRequest<{ success: boolean }>('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

// ============ SETTINGS & DOCUMENT SERVICES API ============

export async function getDocumentSubmissions(driverId?: string, status?: string) {
  const params = new URLSearchParams();
  if (driverId) params.set('driverId', driverId);
  if (status) params.set('status', status);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/settings/document-submissions${qs ? '?' + qs : ''}`);
}

export async function createDocumentSubmission(submission: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/settings/document-submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}

export async function approveDocumentSubmission(id: string, reviewerId: string, notes?: string) {
  return apiRequest<{ success: boolean; data: any }>(`/settings/document-submissions/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ reviewerId, notes }),
  });
}

export async function rejectDocumentSubmission(id: string, reviewerId: string, reason: string) {
  return apiRequest<{ success: boolean; data: any }>(`/settings/document-submissions/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reviewerId, reason }),
  });
}

export async function getSystemSettings(category?: string, key?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (key) params.set('key', key);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any }>(`/settings/system-settings${qs ? '?' + qs : ''}`);
}

export async function upsertSystemSetting(key: string, value: any, category: string, userId?: string) {
  return apiRequest<{ success: boolean; data: any }>('/settings/system-settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value, category, userId }),
  });
}

export async function deleteSystemSetting(key: string) {
  return apiRequest<{ success: boolean }>(`/settings/system-settings/${key}`, { method: 'DELETE' });
}

export async function getNotificationSettings(userId?: string, driverId?: string) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (driverId) params.set('driverId', driverId);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any }>(`/settings/notification-settings${qs ? '?' + qs : ''}`);
}

export async function upsertNotificationSettings(settings: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/settings/notification-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getReminderSchedules(enabledOnly?: boolean) {
  const qs = enabledOnly ? '?enabledOnly=true' : '';
  return apiRequest<{ success: boolean; data: any[] }>(`/settings/reminder-schedules${qs}`);
}

export async function createReminderSchedule(schedule: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/settings/reminder-schedules', {
    method: 'POST',
    body: JSON.stringify(schedule),
  });
}

export async function updateReminderSchedule(id: string, updates: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>(`/settings/reminder-schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteReminderSchedule(id: string) {
  return apiRequest<{ success: boolean }>(`/settings/reminder-schedules/${id}`, { method: 'DELETE' });
}

export async function getComplianceMetrics(options?: { latest?: boolean; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (options?.latest) params.set('latest', 'true');
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any }>(`/settings/compliance-metrics${qs ? '?' + qs : ''}`);
}

export async function createComplianceMetric(metric: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/settings/compliance-metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}

export async function getDocumentExpiryAlerts(driverId?: string, activeOnly?: boolean) {
  const params = new URLSearchParams();
  if (driverId) params.set('driverId', driverId);
  if (activeOnly) params.set('activeOnly', 'true');
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/settings/document-expiry-alerts${qs ? '?' + qs : ''}`);
}

export async function createDocumentExpiryAlert(alert: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/settings/document-expiry-alerts', {
    method: 'POST',
    body: JSON.stringify(alert),
  });
}

export async function updateDocumentExpiryAlert(id: string, updates: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>(`/settings/document-expiry-alerts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============ INVOICE API ============

export async function getInvoiceHistory(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/trips/invoice-history${qs ? '?' + qs : ''}`);
}

export async function getTripsBatch(tripIds: string[]) {
  return apiRequest<{ success: boolean; data: any[] }>('/trips/batch', {
    method: 'POST',
    body: JSON.stringify({ tripIds }),
  });
}

// ============ AUDIT LOG API ============

export async function insertAuditLogs(entries: any[]) {
  return apiRequest<{ success: boolean }>('/audit/logs', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  });
}

export async function insertActivityLog(entry: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/audit/activity', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function getActivityLogs(filters?: { userId?: string; clinicId?: string; entityType?: string; entityId?: string; action?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.userId) params.set('userId', filters.userId);
  if (filters?.clinicId) params.set('clinicId', filters.clinicId);
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.entityId) params.set('entityId', filters.entityId);
  if (filters?.action) params.set('action', filters.action);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/audit/activity${qs ? '?' + qs : ''}`);
}

export async function getAuditLogs(filters?: { userId?: string; eventType?: string; startDate?: string; endDate?: string; phiOnly?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.userId) params.set('userId', filters.userId);
  if (filters?.eventType) params.set('eventType', filters.eventType);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.phiOnly) params.set('phiOnly', 'true');
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/audit/logs${qs ? '?' + qs : ''}`);
}

// ============ EARNINGS API ============

export async function createDriverEarning(tripId: string, driverId: string, earnings?: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>('/earnings', {
    method: 'POST',
    body: JSON.stringify({ tripId, driverId, earnings }),
  });
}

export async function getDriverEarnings(driverId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/earnings/driver/${driverId}${qs ? '?' + qs : ''}`);
}

export async function markEarningsAsPaid(earningIds: string[], paymentMethod?: string) {
  return apiRequest<{ success: boolean }>('/earnings/mark-paid', {
    method: 'PUT',
    body: JSON.stringify({ earningIds, paymentMethod }),
  });
}

export async function getAllDriversEarnings(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any[] }>(`/earnings/all${qs ? '?' + qs : ''}`);
}

// ============ REMINDER API ============

export async function getRemindersForTrip(tripId: string) {
  return apiRequest<{ success: boolean; data: any[] }>(`/notifications/trip-reminders/${tripId}`);
}

export async function updateReminder(reminderId: string, updates: Record<string, any>) {
  return apiRequest<{ success: boolean; data: any }>(`/notifications/trip-reminders/${reminderId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function cancelRemindersForTrip(tripId: string) {
  return apiRequest<{ success: boolean }>(`/notifications/trip-reminders/cancel/${tripId}`, {
    method: 'PUT',
  });
}

export async function getPendingReminders() {
  return apiRequest<{ success: boolean; data: any[] }>('/notifications/pending-reminders');
}

export async function getReminderStats(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest<{ success: boolean; data: any }>(`/notifications/reminder-stats${qs ? '?' + qs : ''}`);
}

// ============ TRACKING API ============

export async function createTrackingLink(tripId: string, token: string, expiresAt?: string) {
  return apiRequest<{ success: boolean; data: any }>('/tracking/links', {
    method: 'POST',
    body: JSON.stringify({ tripId, token, expiresAt }),
  });
}

export async function getTrackingInfo(token: string) {
  return apiRequest<{ success: boolean; data: { trip: any; trackingLink: any } }>(`/tracking/links/${token}`);
}

export async function getExistingTrackingLink(tripId: string) {
  return apiRequest<{ success: boolean; data: { token: string } | null }>(`/tracking/trips/${tripId}/link`);
}

export async function deactivateTrackingLink(tripId: string) {
  return apiRequest<{ success: boolean }>(`/tracking/trips/${tripId}/deactivate`, {
    method: 'PUT',
  });
}

export async function getDriverLocationById(driverId: string) {
  return apiRequest<{ success: boolean; data: any }>(`/tracking/drivers/${driverId}/location`);
}

// ============ DOCUMENT EXPIRY API ============

export async function getDocumentExpirySummary() {
  return apiRequest<{ success: boolean; data: any }>('/drivers/document-expiry-summary');
}

// ============ DATA LOADING API ============

export async function loadAllData() {
  const [driversRes, vehiclesRes, patientsRes, tripsRes, clinicsRes, contractorsRes] = await Promise.all([
    getDrivers(),
    getVehicles(),
    getPatients(),
    getTrips(),
    getClinics(),
    getContractors(),
  ]);

  return {
    drivers: driversRes.data,
    vehicles: vehiclesRes.data,
    patients: patientsRes.data,
    trips: tripsRes.data,
    clinics: clinicsRes.data,
    contractors: contractorsRes.data,
  };
}
