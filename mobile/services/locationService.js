import { Platform } from 'react-native';
import { supabase } from './api';

let Location;

// Only import native modules on native platforms
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.isTracking = false;
    this.driverId = null;
  }

  async requestPermissions() {
    if (Platform.OS === 'web') {
      console.log('Location permissions not required on web');
      return { foreground: true, background: false };
    }

    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background permissions for continuous tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

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
    if (Platform.OS === 'web') {
      console.log('Location tracking not supported on web');
      return;
    }

    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    try {
      this.driverId = driverId;
      this.isTracking = true;

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await this.updateLocation(initialLocation);

      // Start watching location with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options.interval || 30000, // 30 seconds default
          distanceInterval: options.distance || 50, // 50 meters default
        },
        async (location) => {
          await this.updateLocation(location);
        }
      );

      console.log('Location tracking started for driver:', driverId);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  async updateLocation(location) {
    if (!this.driverId) {
      console.warn('No driver ID set for location update');
      return;
    }

    try {
      const { coords } = location;

      const { data, error } = await supabase.rpc('upsert_driver_location', {
        p_driver_id: this.driverId,
        p_latitude: coords.latitude,
        p_longitude: coords.longitude,
        p_heading: coords.heading || 0,
        p_speed: coords.speed ? coords.speed * 2.237 : 0, // Convert m/s to mph
        p_accuracy: coords.accuracy || 0,
        p_status: 'available',
        p_battery_level: 100, // Would get from device battery API
      });

      if (error) {
        console.error('Error updating location:', error);
        return;
      }

      console.log('Location updated:', {
        lat: coords.latitude.toFixed(6),
        lng: coords.longitude.toFixed(6),
        speed: (coords.speed * 2.237).toFixed(1) + ' mph',
      });

      return data;
    } catch (error) {
      console.error('Error in updateLocation:', error);
    }
  }

  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Mark driver as offline
    if (this.driverId) {
      try {
        await supabase
          .from('driver_locations')
          .update({ is_online: false })
          .eq('driver_id', this.driverId);
      } catch (error) {
        console.error('Error marking driver offline:', error);
      }
    }

    this.isTracking = false;
    this.driverId = null;
    console.log('Location tracking stopped');
  }

  async getCurrentLocation() {
    if (Platform.OS === 'web') {
      console.log('Current location not available on web');
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  isActive() {
    return this.isTracking;
  }
}

export const locationService = new LocationService();
