import { Platform } from 'react-native';
import { driverAPI } from './api';

let Location;

// Only import native modules on native platforms
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (e) {
    console.warn('expo-location not available');
  }
}

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.isTracking = false;
    this.driverId = null;
    this.activeTripId = null; // Track which trip is active for breadcrumbs
  }

  async requestPermissions() {
    if (Platform.OS === 'web' || !Location) {
      return { foreground: true, background: false };
    }

    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background permissions for continuous tracking
      let backgroundStatus = 'denied';
      try {
        const bg = await Location.requestBackgroundPermissionsAsync();
        backgroundStatus = bg.status;
      } catch (_) {}

      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

  async startTracking(driverId, options = {}) {
    if (Platform.OS === 'web' || !Location) {
      return;
    }

    if (this.isTracking) {
      console.log('[Location] Already tracking');
      return;
    }

    try {
      this.driverId = driverId;
      this.isTracking = true;
      console.log('[Location] Driver ID set:', driverId);

      // Get initial location
      console.log('[Location] Getting initial position...');
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('[Location] Initial position:', initialLocation.coords.latitude, initialLocation.coords.longitude, 'accuracy:', initialLocation.coords.accuracy);

      await this.updateLocation(initialLocation);

      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options.interval || 15000, // 15 seconds
          distanceInterval: options.distance || 30, // 30 meters
        },
        async (location) => {
          await this.updateLocation(location);
        }
      );

      console.log('[Location] Tracking started for driver:', driverId);
    } catch (error) {
      console.error('[Location] Error starting tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  // Set the active trip ID for breadcrumb tracking
  setActiveTripId(tripId) {
    this.activeTripId = tripId;
    console.log('[Location] Active trip set:', tripId || 'none');
  }

  async updateLocation(location) {
    if (!this.driverId) return;

    try {
      const { coords } = location;
      const speedMph = coords.speed ? Math.max(0, coords.speed * 2.237) : 0;

      // Send location to backend which uses service_role key (bypasses RLS)
      console.log('[Location] Sending to backend:', coords.latitude.toFixed(6), coords.longitude.toFixed(6), 'accuracy:', (coords.accuracy || 0).toFixed(1), 'trip_id:', this.activeTripId || 'none');
      const result = await driverAPI.updateLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading || 0,
        speed: speedMph,
        accuracy: coords.accuracy || 0,
        status: this.activeTripId ? 'on_trip' : 'available',
        trip_id: this.activeTripId || null,
      });
      console.log('[Location] Backend response:', JSON.stringify(result));
    } catch (error) {
      console.error('[Location] updateLocation error:', error.message || error, error.code || '');
    }
  }

  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Mark driver as offline via backend (don't delete — keep last known location)
    if (this.driverId) {
      try {
        await driverAPI.setOffline();
      } catch (error) {
        console.error('[Location] Error setting offline:', error.message || error);
      }
    }

    this.isTracking = false;
    this.activeTripId = null;
    this.driverId = null;
    console.log('[Location] Tracking stopped');
  }

  async getCurrentLocation() {
    if (Platform.OS === 'web' || !Location) {
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('[Location] Error getting current location:', error);
      throw error;
    }
  }

  isActive() {
    return this.isTracking;
  }
}

export const locationService = new LocationService();
