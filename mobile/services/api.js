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

  async updateLocation(latitude, longitude, status) {
    return await this.request('/driver/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, status }),
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

  async saveSignature(tripId, signatureData) {
    return await this.request(`/driver/trips/${tripId}/signature`, {
      method: 'POST',
      body: JSON.stringify(signatureData),
    });
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
