/*
  # Add clinic_sms to notification types

  1. Changes
    - Add 'clinic_sms' to notification_type constraint
    - Add 'clinic' to recipient_type constraint
    - Allow SMS notifications to clinics via Twilio
*/

-- Drop and recreate constraints to add new types
ALTER TABLE automated_notification_log
DROP CONSTRAINT IF EXISTS automated_notification_log_notification_type_check;

ALTER TABLE automated_notification_log
ADD CONSTRAINT automated_notification_log_notification_type_check
CHECK (notification_type = ANY (ARRAY['driver_sms'::text, 'clinic_email'::text, 'clinic_sms'::text]));

ALTER TABLE automated_notification_log
DROP CONSTRAINT IF EXISTS automated_notification_log_recipient_type_check;

ALTER TABLE automated_notification_log
ADD CONSTRAINT automated_notification_log_recipient_type_check
CHECK (recipient_type = ANY (ARRAY['driver'::text, 'clinic_dispatcher'::text, 'clinic'::text]));