import * as api from '../services/api';

// Generate a secure random token
const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Create a tracking link for a trip
export const createTrackingLink = async (tripId: string): Promise<{ link: string; token: string } | null> => {
  try {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const result = await api.createTrackingLink(tripId, token, expiresAt);

    if (!result.success) {
      return null;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/track/${token}`;

    return { link, token };
  } catch (_) {
    // Tracking endpoint/table may not exist yet — silently return null
    return null;
  }
};

// Get tracking info by token
export const getTrackingInfo = async (token: string) => {
  try {
    const result = await api.getTrackingInfo(token);

    if (!result.success || !result.data) {
      return { error: (result as any).error || 'Invalid or expired tracking link' };
    }

    return { trip: result.data.trip, trackingLink: result.data.trackingLink };
  } catch (error) {
    console.error('Error in getTrackingInfo:', error);
    return { error: 'Failed to load tracking information' };
  }
};

// Get driver's current location for a trip
export const getDriverLocation = async (driverId: string) => {
  try {
    const result = await api.getDriverLocationById(driverId);
    return result.data || null;
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
};

// Deactivate tracking link
export const deactivateTrackingLink = async (tripId: string): Promise<void> => {
  try {
    await api.deactivateTrackingLink(tripId);
  } catch (error) {
    console.error('Error deactivating tracking link:', error);
  }
};

// Get tracking link for a trip (if exists)
export const getExistingTrackingLink = async (tripId: string): Promise<string | null> => {
  try {
    const result = await api.getExistingTrackingLink(tripId);

    if (!result.data?.token) {
      return null;
    }

    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${result.data.token}`;
  } catch (error) {
    return null;
  }
};
