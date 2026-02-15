import * as api from '../services/api';

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
    const result = await api.sendSms(notification.to, notification.message, notification.tripId);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: (result as any).error || 'Failed to send SMS' };
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
  try {
    const result = await api.getTripSmsHistory(tripId);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    return [];
  }
};

// Get SMS statistics
export const getSMSStats = async (startDate?: string, endDate?: string) => {
  try {
    const result = await api.getSmsHistory(startDate, endDate);
    const data = result.data || [];

    return {
      total: data.length,
      sent: data.filter((s: any) => s.status === 'sent' || s.status === 'delivered').length,
      delivered: data.filter((s: any) => s.status === 'delivered').length,
      failed: data.filter((s: any) => s.status === 'failed').length,
    };
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };
  }
};
