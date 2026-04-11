import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

// Initialize Supabase client
export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// API Service for mobile apps
class APIService {
  constructor() {
    this.baseURL = CONFIG.API_BASE;
  }

  async getToken() {
    return await AsyncStorage.getItem('authToken');
  }

  async setToken(token) {
    await AsyncStorage.setItem('authToken', token);
  }

  async clearToken() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userProfile');
  }

  async request(endpoint, options = {}) {
    try {
      const token = await this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to Anon Key for unauthenticated requests (like login)
        headers['Authorization'] = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
      }

      const url = `${this.baseURL}${endpoint}`;
      console.log('API Request:', url);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Single-device enforcement: another device logged in
        if (data.code === 'SESSION_REPLACED') {
          await this.clearToken();
          const err = new Error(data.error || 'Session expired — logged in on another device.');
          err.code = 'SESSION_REPLACED';
          throw err;
        }
        
        // Auto-logout on invalid or expired token
        const errorMsg = data.error || data.message || '';
        if (errorMsg.includes('Invalid or expired token') || 
            errorMsg.includes('invalid token') || 
            errorMsg.includes('expired token') ||
            errorMsg.includes('jwt expired') ||
            response.status === 401) {
          console.log('[API] Token invalid/expired - clearing auth and forcing logout');
          await this.clearToken();
          const err = new Error('Invalid or expired token');
          err.code = 'TOKEN_EXPIRED';
          throw err;
        }
        
        throw new Error(data.error || data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication
  async login(email, password, userType) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, userType }),
    });

    if (data.success) {
      await this.setToken(data.token);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      // Handle both profile and driver response formats
      const profileData = data.profile || data.driver || data.user;
      if (profileData) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
        console.log('Profile saved:', profileData);
      } else {
        console.warn('No profile data in login response:', data);
      }
      await AsyncStorage.setItem('userType', userType);
    }

    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearToken();
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userProfile');
      await AsyncStorage.removeItem('userType');
    }
  }

  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const data = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (data.success) {
      await this.setToken(data.token);
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
  }
}

// Driver API
export class DriverAPI extends APIService {
  async getTrips(timeframe = null) {
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/driver/trips${query}`);
  }

  async updateTripStatus(tripId, status, latitude, longitude, notes) {
    return await this.request(`/driver/trips/${tripId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, latitude, longitude, notes }),
    });
  }

  async updateLocation({ latitude, longitude, heading, speed, accuracy, status }) {
    return await this.request('/driver/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, heading, speed, accuracy, status }),
    });
  }

  async setOffline() {
    return await this.request('/driver/location/offline', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async checkIn(action, latitude, longitude) {
    return await this.request('/driver/check-in', {
      method: 'POST',
      body: JSON.stringify({ action, latitude, longitude }),
    });
  }

  async getProfile() {
    return await this.request('/driver/profile');
  }

  async updateProfile(updates) {
    return await this.request('/driver/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getVehicle() {
    return await this.request('/driver/vehicle');
  }

  async changePassword(currentPassword, newPassword) {
    return await this.request('/driver/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getTripActivity(tripId) {
    return await this.request(`/driver/trips/${tripId}/activity`);
  }

  async saveSignature(tripId, signatureData) {
    return await this.request(`/driver/trips/${tripId}/signature`, {
      method: 'POST',
      body: JSON.stringify(signatureData),
    });
  }

  async getDriverId() {
    try {
      const profile = await this.getProfile();
      return profile.profile?.id || profile.id;
    } catch (error) {
      console.error('Error getting driver ID:', error);
      throw new Error('Could not retrieve driver ID');
    }
  }

  async saveDriverSignature(signatureData, latitude, longitude) {
    const driverId = await this.getDriverId();
    return await this.request(`/drivers/${driverId}/signature`, {
      method: 'POST',
      body: JSON.stringify({ signatureData, latitude, longitude }),
    });
  }

  async getDriverSignature() {
    const driverId = await this.getDriverId();
    return await this.request(`/drivers/${driverId}/signature`);
  }

  async updateStatus(status) {
    return await this.request('/driver/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getDocuments() {
    return await this.request('/driver/documents');
  }

  async submitVehicle(vehicleData) {
    return await this.request('/driver/vehicle', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  async unassignVehicle() {
    return await this.request('/driver/vehicle/unassign', {
      method: 'PUT',
    });
  }

  async deleteVehicle() {
    return await this.request('/driver/vehicle', {
      method: 'DELETE',
    });
  }

  async submitDocument(documentType, fileName, fileUrl, fileSize, expiryDate) {
    return await this.request('/driver/documents', {
      method: 'POST',
      body: JSON.stringify({ documentType, fileName, fileUrl, fileSize, expiryDate }),
    });
  }

  // Upload a file to driver-documents storage bucket, then create DB record
  async uploadDriverDocument(documentType, fileUri, fileName, mimeType) {
    const token = await this.getToken();
    const storagePath = `${Date.now()}_${fileName}`;

    // Derive server root from mobile base URL (strip /api/mobile)
    const serverRoot = this.baseURL.replace(/\/api\/mobile$/, '');

    // Step 1: Upload file to storage via multipart
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType || 'application/octet-stream' });
    formData.append('path', storagePath);

    const uploadRes = await fetch(`${serverRoot}/api/uploads/driver-documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(uploadData.error || 'File upload failed');
    }

    // Step 2: Create document_submissions DB record with the storage path
    return await this.request('/driver/documents', {
      method: 'POST',
      body: JSON.stringify({
        documentType,
        fileName,
        fileUrl: uploadData.filePath,
        fileSize: null,
        expiryDate: null,
      }),
    });
  }

  // Get a signed URL to view a document via the server endpoint
  async getDocumentViewUrl(fileUrl, bucket = 'driver-documents') {
    if (!fileUrl || fileUrl.startsWith('pending://')) return null;
    const serverRoot = this.baseURL.replace(/\/api\/mobile$/, '');
    const path = fileUrl.includes(`/${bucket}/`) ? fileUrl.split(`/${bucket}/`)[1] : fileUrl;
    const res = await fetch(`${serverRoot}/api/uploads/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`, {
      headers: { 'Authorization': `Bearer ${await this.getToken()}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.signedUrl) throw new Error('Failed to get document URL');
    return data.signedUrl;
  }

  // Upload a vehicle document (file → storage → DB record)
  async uploadVehicleDocument(documentType, fileUri, fileName, mimeType) {
    const token = await this.getToken();
    const storagePath = `${Date.now()}_${fileName}`;
    const serverRoot = this.baseURL.replace(/\/api\/mobile$/, '');

    // Step 1: Upload file to vehicle-documents storage bucket
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType || 'application/octet-stream' });
    formData.append('path', storagePath);

    const uploadRes = await fetch(`${serverRoot}/api/uploads/vehicle-documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(uploadData.error || 'File upload failed');
    }

    // Step 2: Create document_submissions DB record linked to vehicle
    return await this.request('/driver/vehicle/documents', {
      method: 'POST',
      body: JSON.stringify({
        documentType,
        fileName,
        fileUrl: uploadData.filePath,
        fileSize: null,
        expiryDate: null,
      }),
    });
  }

  // ── Messages ──

  async getConversations() {
    return await this.request('/driver/messages/conversations');
  }

  async getContacts() {
    return await this.request('/driver/messages/contacts');
  }

  async getMessages(otherUserId) {
    return await this.request(`/driver/messages/${otherUserId}`);
  }

  async sendMessage(receiverId, content) {
    return await this.request('/driver/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async markMessagesRead(otherUserId) {
    return await this.request(`/driver/messages/${otherUserId}/read`, {
      method: 'POST',
    });
  }

  async getUnreadCount() {
    return await this.request('/driver/messages/unread-count');
  }
}

// Patient API
export class PatientAPI extends APIService {
  async getTrips(upcoming = false) {
    const query = upcoming ? '?upcoming=true' : '';
    return await this.request(`/patient/trips${query}`);
  }

  async getTrip(tripId) {
    return await this.request(`/patient/trips/${tripId}`);
  }

  async requestTrip(tripData) {
    return await this.request('/patient/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  async cancelTrip(tripId, reason) {
    return await this.request(`/patient/trips/${tripId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getProfile() {
    return await this.request('/patient/profile');
  }

  async updateProfile(updates) {
    return await this.request('/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
}

export const driverAPI = new DriverAPI();
export const patientAPI = new PatientAPI();
