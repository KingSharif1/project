import { supabase } from '../lib/supabase';

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

    const { data, error } = await supabase
      .from('tracking_links')
      .insert({
        trip_id: tripId,
        token,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tracking link:', error);
      return null;
    }

    // Update trip with tracking link ID
    await supabase
      .from('trips')
      .update({ tracking_link_id: data.id })
      .eq('id', tripId);

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/track/${token}`;

    return { link, token };
  } catch (error) {
    console.error('Error in createTrackingLink:', error);
    return null;
  }
};

// Get tracking info by token
export const getTrackingInfo = async (token: string) => {
  try {
    // Get tracking link
    const { data: trackingLink, error: linkError } = await supabase
      .from('tracking_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !trackingLink) {
      return { error: 'Invalid or expired tracking link' };
    }

    // Check if expired
    if (new Date(trackingLink.expires_at) < new Date()) {
      return { error: 'This tracking link has expired' };
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        drivers (
          id,
          name,
          first_name,
          last_name,
          phone,
          vehicle_id
        ),
        vehicles (
          make,
          model,
          color,
          license_plate
        )
      `)
      .eq('id', trackingLink.trip_id)
      .single();

    if (tripError || !trip) {
      return { error: 'Trip not found' };
    }

    // Update access count and log
    const accessLog = {
      timestamp: new Date().toISOString(),
      ip: 'unknown', // Can be enhanced with IP detection
      userAgent: navigator.userAgent,
    };

    await supabase
      .from('tracking_links')
      .update({
        access_count: trackingLink.access_count + 1,
        last_accessed_at: new Date().toISOString(),
        access_logs: [...(trackingLink.access_logs || []), accessLog],
      })
      .eq('id', trackingLink.id);

    return { trip, trackingLink };
  } catch (error) {
    console.error('Error in getTrackingInfo:', error);
    return { error: 'Failed to load tracking information' };
  }
};

// Get driver's current location for a trip
export const getDriverLocation = async (driverId: string) => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      lat: data.latitude,
      lng: data.longitude,
      heading: data.heading,
      speed: data.speed,
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Error getting driver location:', error);
    return null;
  }
};

// Deactivate tracking link
export const deactivateTrackingLink = async (tripId: string): Promise<void> => {
  try {
    await supabase
      .from('tracking_links')
      .update({ is_active: false })
      .eq('trip_id', tripId);
  } catch (error) {
    console.error('Error deactivating tracking link:', error);
  }
};

// Get tracking link for a trip (if exists)
export const getExistingTrackingLink = async (tripId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('tracking_links')
      .select('token')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${data.token}`;
  } catch (error) {
    return null;
  }
};
