/*
  # Add Patient Name to SMS Notifications

  1. Changes
    - Add `patient_name` column to sms_notifications table
    - Stores the full name of the patient receiving the SMS
    - Helps track which patient received each notification
    - Makes SMS history more readable and searchable

  2. Notes
    - Column is nullable for backward compatibility
    - Existing records will have NULL values
    - New SMS notifications should populate this field
*/

-- Add patient_name column to sms_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_notifications' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE sms_notifications ADD COLUMN patient_name text;
  END IF;
END $$;

-- Add index for faster searches by patient name
CREATE INDEX IF NOT EXISTS idx_sms_notifications_patient_name
  ON sms_notifications(patient_name);

-- Add index for faster searches by created_at
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at
  ON sms_notifications(created_at DESC);
