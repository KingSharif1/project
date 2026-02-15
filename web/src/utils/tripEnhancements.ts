import { createTrackingLink } from './trackingLinks';
import { sendSMS, SMS_TEMPLATES, notifyPatient, notifyDriver } from './smsService';
import { generateTripInvoice, autoSendInvoice } from './automatedInvoicing';
import { createDriverEarning } from './earningsCalculator';
import * as api from '../services/api';

// Enhance trip with tracking link and notifications when assigned
export const enhanceTripOnAssignment = async (
  tripId: string,
  driverId: string,
  trip: any,
  driver: any
) => {
  try {
    // Create tracking link
    const trackingResult = await createTrackingLink(tripId);
    const trackingLink = trackingResult?.link;

    // Get driver name
    const driverName = driver.first_name && driver.last_name
      ? `${driver.first_name} ${driver.last_name}`
      : driver.name || 'Your driver';

    // Get driver phone
    const driverPhone = driver.notification_phone || driver.phone || driver.phoneNumber;

    // Format pickup date and time
    const scheduledDateTime = new Date(trip.scheduled_pickup_time || trip.scheduledTime);

    const pickupDate = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const pickupTime = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const pickupAddress = trip.pickup_address || trip.pickupLocation;

    // DO NOT send SMS to patient on trip assignment
    // Patients only receive reminder SMS (24hr, 2hr, 30min before pickup)
    console.log('Trip assignment - SMS not sent to patient (reminders only)');

    // DO NOT send SMS to driver on trip assignment
    // Drivers do not receive SMS notifications
    console.log('Trip assignment - SMS not sent to driver (no driver SMS)');

    console.log('Trip enhanced with tracking link:', trackingLink);

    return { trackingLink };
  } catch (error) {
    console.error('Error enhancing trip:', error);
    return { trackingLink: null };
  }
};

// Send status update notifications
export const sendTripStatusNotification = async (
  trip: any,
  driver: any,
  status: 'driver_enroute' | 'driver_arrived' | 'trip_completed'
) => {
  try {
    // DO NOT send SMS to patient for status updates
    // Patients only receive reminder SMS (24hr, 2hr, 30min before pickup)
    console.log(`Trip status: ${status} - SMS not sent to patient (reminders only)`);

    // Status notifications disabled per requirements:
    // - No SMS on trip assignment
    // - No SMS on trip completion
    // - No SMS on trip cancellation
    // - Only send reminder SMS before pickup

    return;
  } catch (error) {
    console.error('Error sending status notification:', error);
  }
};

// Complete trip with all enhancements
export const completeTripWithEnhancements = async (
  tripId: string,
  driverId: string,
  trip: any,
  driver: any
) => {
  try {
    // Send completion notification
    await sendTripStatusNotification(trip, driver, 'trip_completed');

    // Create driver earnings
    if (driverId) {
      await createDriverEarning(tripId, driverId);
    }

    // Auto-send invoice if enabled
    if (trip.auto_invoice) {
      await autoSendInvoice(tripId);
    }

    console.log('Trip completed with all enhancements');
  } catch (error) {
    console.error('Error completing trip with enhancements:', error);
  }
};

// Share tracking link via SMS
export const shareTrackingLink = async (tripId: string, phoneNumber: string) => {
  try {
    const { createTrackingLink, getExistingTrackingLink } = await import('./trackingLinks');

    // Check if tracking link already exists
    let trackingLink = await getExistingTrackingLink(tripId);

    // Create new one if doesn't exist
    if (!trackingLink) {
      const result = await createTrackingLink(tripId);
      trackingLink = result?.link || null;
    }

    if (!trackingLink) {
      throw new Error('Failed to create tracking link');
    }

    // Send SMS with tracking link
    await sendSMS({
      to: phoneNumber,
      message: `Track your ride in real-time: ${trackingLink}`,
      tripId,
      messageType: 'custom',
    });

    return { success: true, link: trackingLink };
  } catch (error) {
    console.error('Error sharing tracking link:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Send appointment reminder
export const sendAppointmentReminder = async (trip: any, clinicName?: string) => {
  try {
    // Check if this is an outbound trip (ends with "A")
    // Only send reminders for outbound trips
    const tripNumber = trip.trip_number || trip.tripNumber || '';
    const isOutboundTrip = tripNumber.toUpperCase().endsWith('A');

    if (!isOutboundTrip) {
      console.log('Skipping reminder for return trip:', tripNumber);
      return;
    }

    const patientPhone = trip.passenger_phone || trip.customerPhone;
    if (!patientPhone) {
      console.log('No patient phone number for trip:', tripNumber);
      return;
    }

    // Get driver information
    let driverName = 'your driver';
    let driverPhone = '';

    if (trip.driver_id || trip.driverId) {
      try {
        const driverResult = await api.getDriver(trip.driver_id || trip.driverId);
        const driver = driverResult.data;
        if (driver) {
          driverName = driver.first_name && driver.last_name
            ? `${driver.first_name} ${driver.last_name}`
            : 'your driver';
          driverPhone = driver.notification_phone || driver.phone || '';
        }
      } catch (e) {
        // Driver fetch failed, use defaults
      }
    }

    const scheduledDateTime = new Date(trip.scheduled_pickup_time || trip.scheduledTime);

    const date = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const time = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const clinic = clinicName || trip.clinic_name || 'clinic';

    // Get patient full name
    const firstName = trip.first_name || trip.firstName || '';
    const lastName = trip.last_name || trip.lastName || '';
    const patientFullName = `${firstName} ${lastName}`.trim() || trip.passenger_name || trip.customerName || 'Patient';

    const message = SMS_TEMPLATES.appointmentReminder(driverName, date, time, clinic, driverPhone);

    await notifyPatient(patientPhone, 'reminder', message, trip.id, patientFullName);

    console.log('Appointment reminder sent for outbound trip:', tripNumber);
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
  }
};
