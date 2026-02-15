import * as api from '../services/api';
import { sendSMS } from './smsService';

export interface ReminderSettings {
  enabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderTimes: number[]; // Hours before trip (e.g., [24, 2, 0.5])
  includeDriverInfo: boolean;
  includeTrackingLink: boolean;
}

export interface ScheduledReminder {
  id?: string;
  tripId: string;
  patientId: string;
  reminderType: 'sms' | 'email' | 'both';
  scheduledFor: string;
  hoursBeforeTrip: number;
  status: 'pending' | 'sent' | 'failed';
  message?: string;
  sentAt?: string;
  error?: string;
}

// Default reminder settings
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  smsEnabled: true,
  emailEnabled: false,
  reminderTimes: [24, 2, 0.5], // 24 hours, 2 hours, 30 minutes before
  includeDriverInfo: true,
  includeTrackingLink: true,
};

// Schedule reminders for a trip
export const scheduleRemindersForTrip = async (trip: any, settings?: ReminderSettings) => {
  const reminderSettings = settings || DEFAULT_REMINDER_SETTINGS;

  if (!reminderSettings.enabled) return;

  const tripTime = new Date(trip.scheduledTime);
  const now = new Date();

  // Create reminder records for each time interval
  for (const hours of reminderSettings.reminderTimes) {
    const reminderTime = new Date(tripTime.getTime() - hours * 60 * 60 * 1000);

    // Only schedule future reminders
    if (reminderTime > now) {
      const reminderType = reminderSettings.smsEnabled && reminderSettings.emailEnabled
        ? 'both'
        : reminderSettings.smsEnabled
        ? 'sms'
        : 'email';

      const reminder: ScheduledReminder = {
        tripId: trip.id,
        patientId: trip.patientId,
        reminderType,
        scheduledFor: reminderTime.toISOString(),
        hoursBeforeTrip: hours,
        status: 'pending',
      };

      // Store in database via backend API
      try {
        await api.logTripReminder({
          tripId: trip.id,
          reminderType: reminderType,
          status: 'pending',
        });
      } catch (err) {
        console.error('Error scheduling reminder:', err);
      }
    }
  }
};

// Generate reminder message
export const generateReminderMessage = (trip: any, hoursBeforeTrip: number, driver?: any, contractor?: any, trackingLink?: string): string => {
  const scheduledDateTime = new Date(trip.scheduledTime || trip.scheduled_pickup_time);

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

  const clinicName = contractor?.name || trip.clinic_name || trip.clinicName || 'your healthcare provider';

  let message = '';

  // Get driver information
  const driverName = driver
    ? (driver.name || `${driver.first_name} ${driver.last_name}`.trim())
    : 'your driver';
  const driverPhone = driver
    ? (driver.notification_phone || driver.phone || '')
    : '';

  // Main reminder format (24 hours or more before trip)
  if (hoursBeforeTrip >= 24) {
    message = `Hello, this is Fort Worth Non-Emergency Transportation. Your driver will be ${driverName}, and will be picking you up on ${date} at ${time}. If you would like to cancel the trip, please call your ${clinicName}${driverPhone ? ` or your driver at ${driverPhone}` : ''}.`;
  }
  // 2 hour reminder - use same format as 24 hour
  else if (hoursBeforeTrip >= 2) {
    message = `Hello, this is Fort Worth Non-Emergency Transportation. Your driver will be ${driverName}, and will be picking you up on ${date} at ${time}. If you would like to cancel the trip, please call your ${clinicName}${driverPhone ? ` or your driver at ${driverPhone}` : ''}.`;
  }
  // 30 minute reminder - use same format
  else {
    message = `Hello, this is Fort Worth Non-Emergency Transportation. Your driver will be ${driverName}, and will be picking you up on ${date} at ${time}. If you would like to cancel the trip, please call your ${clinicName}${driverPhone ? ` or your driver at ${driverPhone}` : ''}.`;
  }

  if (trackingLink) {
    message += ` Track your ride: ${trackingLink}`;
  }

  return message;
};

// Send a scheduled reminder
export const sendScheduledReminder = async (reminder: ScheduledReminder, trip: any, patient: any, driver?: any, contractor?: any, trackingLink?: string) => {
  try {
    const message = generateReminderMessage(trip, reminder.hoursBeforeTrip, driver, contractor, trackingLink);

    let success = false;
    let error = null;

    // Send SMS
    if (reminder.reminderType === 'sms' || reminder.reminderType === 'both') {
      if (patient.phone) {
        const result = await sendSMS({
          to: patient.phone,
          message,
          tripId: trip.id,
          messageType: 'reminder',
        });
        success = result.success;
        error = result.error;
      }
    }

    // Send Email (placeholder - implement with your email service)
    if (reminder.reminderType === 'email' || reminder.reminderType === 'both') {
      // TODO: Implement email sending — patient email not currently stored
      console.log('Email reminder skipped — no email on patient record');
    }

    // Update reminder status via backend API
    if (reminder.id) {
      await api.updateReminder(reminder.id, {
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        message,
        error,
      });
    }

    return { success, error };
  } catch (err) {
    console.error('Error sending reminder:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Process pending reminders (call this periodically - every minute)
export const processPendingReminders = async () => {
  const now = new Date().toISOString();

  // Get pending reminders that are due via backend API
  let pendingReminders: any[] = [];
  try {
    const result = await api.getPendingReminders();
    pendingReminders = result.data || [];
  } catch (err) {
    console.error('Error fetching pending reminders:', err);
    return;
  }

  if (!pendingReminders || pendingReminders.length === 0) {
    return;
  }

  console.log(`Processing ${pendingReminders.length} pending reminders...`);

  // Process each reminder
  for (const reminder of pendingReminders) {
    const trip = reminder.trips;
    const patient = trip?.patients;
    const driver = trip?.drivers;
    const contractor = trip?.contractors;

    if (trip && patient) {
      // Check if this is an outbound trip (ends with "A")
      // Only send reminders for outbound trips
      const tripNumber = trip.trip_number || trip.tripNumber || '';
      const isOutboundTrip = tripNumber.toUpperCase().endsWith('A');

      if (isOutboundTrip) {
        // Generate tracking link if needed
        const trackingLink = trip.trackingToken
          ? `${window.location.origin}/track/${trip.trackingToken}`
          : undefined;

        await sendScheduledReminder(reminder, trip, patient, driver, contractor, trackingLink);
        console.log('Reminder sent for outbound trip:', tripNumber);
      } else {
        // Mark reminder as cancelled for return trips (B trips)
        await api.updateReminder(reminder.id, {
          status: 'cancelled',
          error: 'Skipped - Return trip (B trip)',
        });
        console.log('Reminder skipped for return trip:', tripNumber);
      }
    }
  }
};

// Cancel reminders for a trip
export const cancelRemindersForTrip = async (tripId: string) => {
  try {
    await api.cancelRemindersForTrip(tripId);
  } catch (error) {
    console.error('Error cancelling reminders:', error);
  }
};

// Get reminders for a trip
export const getRemindersForTrip = async (tripId: string) => {
  try {
    const result = await api.getRemindersForTrip(tripId);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }
};

// Get reminder statistics
export const getReminderStats = async (startDate?: string, endDate?: string) => {
  try {
    const result = await api.getReminderStats(startDate, endDate);
    return result.data || {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    return {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };
  }
};
