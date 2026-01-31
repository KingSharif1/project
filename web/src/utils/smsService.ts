import { supabase } from '../lib/supabase';

export interface SMSNotification {
  to: string;
  message: string;
  tripId?: string;
  driverId?: string;
  patientName?: string;
  messageType: 'trip_assigned' | 'driver_enroute' | 'driver_arrived' | 'trip_completed' | 'reminder' | 'custom';
}

export const sendSMS = async (notification: SMSNotification): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/sms-notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send SMS' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Pre-defined message templates
export const SMS_TEMPLATES = {
  tripAssigned: (driverName: string, pickupDate: string, pickupTime: string, driverPhone?: string) =>
    `Hello, this is Fort Worth Non-Emergency Transportation. Your driver will be ${driverName}, and will be picking you up on ${pickupDate} at ${pickupTime}. If you would like to cancel the trip, please call the clinic${driverPhone ? ` or ${driverPhone}` : ''}.`,

  driverEnroute: (driverName: string, eta: string, trackingLink?: string) =>
    `Fort Worth Non-Emergency Transportation: ${driverName} is on the way! ETA: ${eta}. ${trackingLink ? `Track in real-time: ${trackingLink}` : ''}`,

  driverArrived: (driverName: string, vehicleInfo: string) =>
    `Fort Worth Non-Emergency Transportation: ${driverName} has arrived in a ${vehicleInfo}. Please come out when ready.`,

  tripCompleted: (fare: string) =>
    `Fort Worth Non-Emergency Transportation: Your trip is complete. Total fare: $${fare}. Thank you for choosing us!`,

  appointmentReminder: (driverName: string, date: string, time: string, clinicName: string, driverPhone?: string) =>
    `Hello, this is Fort Worth Non-Emergency Transportation. Your driver will be ${driverName}, and will be picking you up on ${date} at ${time}. If you would like to cancel the trip, please call your ${clinicName}${driverPhone ? ` or your driver at ${driverPhone}` : ''}.`,

  tripCancelled: (reason?: string) =>
    `Fort Worth Non-Emergency Transportation: Your trip has been cancelled${reason ? `: ${reason}` : ''}. For questions, please contact your healthcare provider.`,

  driverAssignedToDriver: (pickupTime: string, pickupAddress: string, dropoffAddress: string, passengerName: string) =>
    `Fort Worth Non-Emergency Transportation - New trip assigned! Pickup: ${pickupTime} at ${pickupAddress}. Passenger: ${passengerName}. Dropoff: ${dropoffAddress}`,
};

// Send notification to patient
export const notifyPatient = async (
  phone: string,
  messageType: SMSNotification['messageType'],
  message: string,
  tripId?: string,
  patientName?: string
): Promise<void> => {
  if (!phone) return;

  await sendSMS({
    to: phone,
    message,
    tripId,
    patientName,
    messageType,
  });
};

// Send notification to driver
export const notifyDriver = async (
  phone: string,
  messageType: SMSNotification['messageType'],
  message: string,
  tripId?: string,
  driverId?: string
): Promise<void> => {
  if (!phone) return;

  await sendSMS({
    to: phone,
    message,
    tripId,
    driverId,
    messageType,
  });
};

// Get SMS history for a trip
export const getSMSHistory = async (tripId: string) => {
  const { data, error } = await supabase
    .from('sms_notifications')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching SMS history:', error);
    return [];
  }

  return data || [];
};

// Get SMS statistics
export const getSMSStats = async (startDate?: string, endDate?: string) => {
  let query = supabase
    .from('sms_notifications')
    .select('status, created_at');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching SMS stats:', error);
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };
  }

  const stats = {
    total: data?.length || 0,
    sent: data?.filter(s => s.status === 'sent' || s.status === 'delivered').length || 0,
    delivered: data?.filter(s => s.status === 'delivered').length || 0,
    failed: data?.filter(s => s.status === 'failed').length || 0,
  };

  return stats;
};
