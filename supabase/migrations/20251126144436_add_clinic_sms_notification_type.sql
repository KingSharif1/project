/*
  # Add Clinic SMS Notification Type

  1. Changes
    - Ensure 'clinic_alert' is a valid message_type in sms_notifications
    - Document that clinic SMSs use this type for filtering/reporting
    
  2. Message Types
    - trip_reminder: Patient reminders
    - trip_assigned: Driver assignments  
    - trip_status: Status updates
    - clinic_alert: Clinic notifications (NEW)
*/

-- Add comment documenting the clinic_alert type
COMMENT ON COLUMN sms_notifications.message_type IS 
'Type of SMS: trip_reminder (patient), trip_assigned (driver), trip_status (updates), clinic_alert (clinic notifications for cancellations/no-shows)';