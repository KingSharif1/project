import { supabase } from '../lib/supabase';
import { sendSMS, SMS_TEMPLATES } from './smsService';
import { Trip } from '../types';

export const calculateETA = (distanceInMiles: number, averageSpeedMph: number = 35): number => {
  return Math.round((distanceInMiles / averageSpeedMph) * 60);
};

export const formatETA = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`
    : `${hours} hour${hours > 1 ? 's' : ''}`;
};

export const sendETANotification = async (
  trip: Trip,
  driverLocation: { latitude: number; longitude: number },
  driverName: string,
  patientPhone: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!patientPhone) {
      return { success: false, error: 'No patient phone number' };
    }

    const pickupCoords = await getPickupCoordinates(trip);
    if (!pickupCoords) {
      return { success: false, error: 'Could not get pickup location' };
    }

    const distance = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      pickupCoords.lat,
      pickupCoords.lng
    );

    const etaMinutes = calculateETA(distance);
    const etaText = formatETA(etaMinutes);

    const trackingLink = `${window.location.origin}/track/${trip.id}`;

    const message = SMS_TEMPLATES.driverEnroute(driverName, etaText, trackingLink);

    const result = await sendSMS({
      to: patientPhone,
      message,
      tripId: trip.id,
      patientName: trip.customerName,
      messageType: 'driver_enroute',
    });

    if (result.success) {
      await supabase.from('sms_notifications').insert({
        trip_id: trip.id,
        phone_number: patientPhone,
        message,
        message_type: 'driver_enroute',
        patient_name: trip.customerName,
        status: 'sent',
      });
    }

    return result;
  } catch (error) {
    console.error('Error sending ETA notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendArrivedNotification = async (
  trip: Trip,
  driverName: string,
  vehicleInfo: string,
  patientPhone: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!patientPhone) {
      return { success: false, error: 'No patient phone number' };
    }

    const message = SMS_TEMPLATES.driverArrived(driverName, vehicleInfo);

    const result = await sendSMS({
      to: patientPhone,
      message,
      tripId: trip.id,
      patientName: trip.customerName,
      messageType: 'driver_arrived',
    });

    if (result.success) {
      await supabase.from('sms_notifications').insert({
        trip_id: trip.id,
        phone_number: patientPhone,
        message,
        message_type: 'driver_arrived',
        patient_name: trip.customerName,
        status: 'sent',
      });
    }

    return result;
  } catch (error) {
    console.error('Error sending arrived notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const getPickupCoordinates = async (trip: Trip): Promise<{ lat: number; lng: number } | null> => {
  try {
    const address = `${trip.pickupAddress}, ${trip.pickupCity}, ${trip.pickupState} ${trip.pickupZip}`;

    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ address });

    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding pickup address:', error);
    return null;
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const startETAMonitoring = async (tripId: string) => {
  const trip = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (!trip.data) return;

  const channel = supabase
    .channel(`trip-location-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_location_history',
        filter: `trip_id=eq.${tripId}`,
      },
      async (payload) => {
        const location = payload.new as any;

        const distance = await getDistanceToPickup(tripId, location.latitude, location.longitude);

        if (distance && distance <= 1.0 && distance > 0.5) {
          const { data: tripData } = await supabase
            .from('trips')
            .select('*, drivers(*), vehicles(*)')
            .eq('id', tripId)
            .single();

          if (tripData && tripData.customer_phone) {
            await sendETANotification(
              tripData as any,
              { latitude: location.latitude, longitude: location.longitude },
              tripData.drivers?.full_name || 'Your driver',
              tripData.customer_phone
            );
          }
        }

        if (distance && distance <= 0.1) {
          const { data: tripData } = await supabase
            .from('trips')
            .select('*, drivers(*), vehicles(*)')
            .eq('id', tripId)
            .single();

          if (tripData && tripData.customer_phone) {
            const vehicleInfo = tripData.vehicles
              ? `${tripData.vehicles.make} ${tripData.vehicles.model} - ${tripData.vehicles.license_plate}`
              : 'your vehicle';

            await sendArrivedNotification(
              tripData as any,
              tripData.drivers?.full_name || 'Your driver',
              vehicleInfo,
              tripData.customer_phone
            );
          }
        }
      }
    )
    .subscribe();

  return channel;
};

const getDistanceToPickup = async (
  tripId: string,
  driverLat: number,
  driverLng: number
): Promise<number | null> => {
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('pickup_address, pickup_city, pickup_state, pickup_zip')
      .eq('id', tripId)
      .single();

    if (!trip) return null;

    const address = `${trip.pickup_address}, ${trip.pickup_city}, ${trip.pickup_state} ${trip.pickup_zip}`;
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ address });

    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return calculateDistance(driverLat, driverLng, location.lat(), location.lng());
    }

    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
};
