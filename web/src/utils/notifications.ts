export type NotificationType = 'sms' | 'email' | 'both';
export type NotificationTemplate =
  | 'trip_scheduled'
  | 'trip_reminder_24h'
  | 'trip_reminder_2h'
  | 'trip_reminder_30min'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'trip_rescheduled';

interface NotificationParams {
  to: string;
  type: NotificationType;
  template: NotificationTemplate;
  data: Record<string, any>;
}

interface NotificationLog {
  id: string;
  recipientEmail: string;
  recipientPhone: string;
  type: NotificationType;
  template: NotificationTemplate;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string;
  errorMessage?: string;
}

const notificationLogs: NotificationLog[] = [];

const EMAIL_TEMPLATES = {
  trip_scheduled: {
    subject: 'Trip Scheduled - {tripNumber}',
    body: `
      <h2>Your trip has been scheduled</h2>
      <p>Hello {patientName},</p>
      <p>Your transportation has been scheduled for:</p>
      <ul>
        <li><strong>Date & Time:</strong> {scheduledTime}</li>
        <li><strong>Pickup Location:</strong> {pickupLocation}</li>
        <li><strong>Dropoff Location:</strong> {dropoffLocation}</li>
        <li><strong>Trip Number:</strong> {tripNumber}</li>
      </ul>
      <p>We will send you reminders before your scheduled pickup time.</p>
      <p>If you need to make changes, please contact us at least 24 hours in advance.</p>
    `
  },
  trip_reminder_24h: {
    subject: 'Trip Reminder - Tomorrow at {time}',
    body: `
      <h2>Trip Reminder - 24 Hours</h2>
      <p>Hello {patientName},</p>
      <p>This is a reminder that your transportation is scheduled for tomorrow:</p>
      <ul>
        <li><strong>Date & Time:</strong> {scheduledTime}</li>
        <li><strong>Pickup Location:</strong> {pickupLocation}</li>
        <li><strong>Trip Number:</strong> {tripNumber}</li>
      </ul>
      <p>Please be ready 10 minutes before your scheduled pickup time.</p>
    `
  },
  trip_reminder_2h: {
    subject: 'Trip Reminder - In 2 Hours',
    body: `
      <h2>Trip Reminder - 2 Hours</h2>
      <p>Hello {patientName},</p>
      <p>Your ride will arrive in approximately 2 hours:</p>
      <ul>
        <li><strong>Pickup Time:</strong> {scheduledTime}</li>
        <li><strong>Pickup Location:</strong> {pickupLocation}</li>
      </ul>
      <p>Please be ready and waiting at your pickup location.</p>
    `
  },
  trip_reminder_30min: {
    subject: 'Driver Approaching - 30 Minutes',
    body: `
      <h2>Your Driver is on the Way!</h2>
      <p>Hello {patientName},</p>
      <p>Your driver will arrive in approximately 30 minutes.</p>
      <ul>
        <li><strong>Driver:</strong> {driverName}</li>
        <li><strong>Vehicle:</strong> {vehicleInfo}</li>
        <li><strong>Pickup Location:</strong> {pickupLocation}</li>
      </ul>
      <p>Please be ready and watch for your vehicle.</p>
    `
  },
  driver_assigned: {
    subject: 'Driver Assigned - {tripNumber}',
    body: `
      <h2>Driver Assigned to Your Trip</h2>
      <p>Hello {patientName},</p>
      <p>A driver has been assigned to your trip:</p>
      <ul>
        <li><strong>Driver:</strong> {driverName}</li>
        <li><strong>Vehicle:</strong> {vehicleInfo}</li>
        <li><strong>Phone:</strong> {driverPhone}</li>
        <li><strong>Pickup Time:</strong> {scheduledTime}</li>
      </ul>
    `
  },
  driver_arriving: {
    subject: 'Driver Arriving Now',
    body: `
      <h2>Your Driver Has Arrived</h2>
      <p>Hello {patientName},</p>
      <p>Your driver {driverName} has arrived at {pickupLocation}.</p>
      <p>Vehicle: {vehicleInfo}</p>
    `
  },
  trip_started: {
    subject: 'Trip Started - {tripNumber}',
    body: `
      <h2>Trip in Progress</h2>
      <p>Hello {patientName},</p>
      <p>Your trip has started. You are on your way to {dropoffLocation}.</p>
      <p>Estimated arrival time: {estimatedArrival}</p>
    `
  },
  trip_completed: {
    subject: 'Trip Completed - {tripNumber}',
    body: `
      <h2>Trip Completed Successfully</h2>
      <p>Hello {patientName},</p>
      <p>Your trip has been completed successfully.</p>
      <p>Thank you for using our transportation service!</p>
      <p>We hope your appointment went well.</p>
    `
  },
  trip_cancelled: {
    subject: 'Trip Cancelled - {tripNumber}',
    body: `
      <h2>Trip Cancellation Notice</h2>
      <p>Hello {patientName},</p>
      <p>Your trip scheduled for {scheduledTime} has been cancelled.</p>
      <p>If this was not requested by you, please contact us immediately.</p>
      <p>To reschedule, please call our office.</p>
    `
  },
  trip_rescheduled: {
    subject: 'Trip Rescheduled - {tripNumber}',
    body: `
      <h2>Trip Rescheduled</h2>
      <p>Hello {patientName},</p>
      <p>Your trip has been rescheduled:</p>
      <ul>
        <li><strong>New Date & Time:</strong> {scheduledTime}</li>
        <li><strong>Pickup Location:</strong> {pickupLocation}</li>
        <li><strong>Dropoff Location:</strong> {dropoffLocation}</li>
      </ul>
    `
  }
};

const SMS_TEMPLATES = {
  trip_scheduled: '{patientName}, your trip {tripNumber} is scheduled for {scheduledTime}. Pickup: {pickupLocation}',
  trip_reminder_24h: 'Reminder: Your trip is tomorrow at {scheduledTime}. Pickup: {pickupLocation}. Trip #{tripNumber}',
  trip_reminder_2h: 'Your ride arrives in 2 hours at {scheduledTime}. Be ready at {pickupLocation}',
  trip_reminder_30min: 'Your driver {driverName} will arrive in 30 min. Vehicle: {vehicleInfo}',
  driver_assigned: 'Driver {driverName} assigned to trip {tripNumber}. Vehicle: {vehicleInfo}. Pickup: {scheduledTime}',
  driver_arriving: 'Your driver {driverName} has arrived at {pickupLocation}. Vehicle: {vehicleInfo}',
  trip_started: 'Trip started. On the way to {dropoffLocation}. ETA: {estimatedArrival}',
  trip_completed: 'Trip {tripNumber} completed. Thank you for using our service!',
  trip_cancelled: 'Your trip scheduled for {scheduledTime} has been cancelled. Call us if you did not request this.',
  trip_rescheduled: 'Trip rescheduled to {scheduledTime}. Pickup: {pickupLocation}'
};

function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  let result = template;
  Object.keys(data).forEach(key => {
    const value = data[key] || '';
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  return result;
}

export async function sendNotification({
  to,
  type,
  template,
  data
}: NotificationParams): Promise<boolean> {
  console.log(`[NOTIFICATION] Sending ${type} notification (${template}) to ${to}`);

  try {
    if (type === 'email' || type === 'both') {
      await sendEmail(to, template, data);
    }

    if (type === 'sms' || type === 'both') {
      await sendSMS(to, template, data);
    }

    logNotification({
      recipientEmail: type === 'email' || type === 'both' ? to : '',
      recipientPhone: type === 'sms' ? to : '',
      type,
      template,
      status: 'sent',
    });

    return true;
  } catch (error) {
    console.error('[NOTIFICATION] Error sending notification:', error);
    logNotification({
      recipientEmail: type === 'email' || type === 'both' ? to : '',
      recipientPhone: type === 'sms' ? to : '',
      type,
      template,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

async function sendEmail(
  to: string,
  template: NotificationTemplate,
  data: Record<string, any>
): Promise<void> {
  const emailTemplate = EMAIL_TEMPLATES[template];
  if (!emailTemplate) {
    throw new Error(`Email template not found: ${template}`);
  }

  const subject = replaceTemplateVariables(emailTemplate.subject, data);
  const body = replaceTemplateVariables(emailTemplate.body, data);

  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${body.substring(0, 100)}...`);

  await new Promise(resolve => setTimeout(resolve, 100));
}

async function sendSMS(
  to: string,
  template: NotificationTemplate,
  data: Record<string, any>
): Promise<void> {
  const smsTemplate = SMS_TEMPLATES[template];
  if (!smsTemplate) {
    throw new Error(`SMS template not found: ${template}`);
  }

  const message = replaceTemplateVariables(smsTemplate, data);

  console.log(`[SMS] To: ${to}`);
  console.log(`[SMS] Message: ${message}`);

  await new Promise(resolve => setTimeout(resolve, 100));
}

function logNotification(log: Omit<NotificationLog, 'id' | 'sentAt'>) {
  const entry: NotificationLog = {
    ...log,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sentAt: new Date().toISOString()
  };

  notificationLogs.push(entry);

  if (notificationLogs.length > 1000) {
    notificationLogs.splice(0, 100);
  }
}

export function getNotificationLogs(): NotificationLog[] {
  return [...notificationLogs].reverse();
}

export function scheduleReminders(
  tripData: {
    tripNumber: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    scheduledTime: string;
    pickupLocation: string;
    dropoffLocation: string;
  }
): void {
  const scheduledDate = new Date(tripData.scheduledTime);
  const now = new Date();

  const reminder24h = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
  const reminder30min = new Date(scheduledDate.getTime() - 30 * 60 * 1000);

  if (reminder24h > now) {
    const delay = reminder24h.getTime() - now.getTime();
    setTimeout(() => {
      sendNotification({
        to: tripData.patientEmail,
        type: 'both',
        template: 'trip_reminder_24h',
        data: tripData
      });
    }, delay);
  }

  if (reminder2h > now) {
    const delay = reminder2h.getTime() - now.getTime();
    setTimeout(() => {
      sendNotification({
        to: tripData.patientEmail,
        type: 'both',
        template: 'trip_reminder_2h',
        data: tripData
      });
    }, delay);
  }

  if (reminder30min > now) {
    const delay = reminder30min.getTime() - now.getTime();
    setTimeout(() => {
      sendNotification({
        to: tripData.patientEmail,
        type: 'both',
        template: 'trip_reminder_30min',
        data: tripData
      });
    }, delay);
  }

  console.log(`[REMINDERS] Scheduled 3 reminders for trip ${tripData.tripNumber}`);
}
