/*
  # Add patient_name column to sms_notifications table

  1. Changes
    - Add `patient_name` column to `sms_notifications` table to store the patient's name for display in SMS history
    
  2. Security
    - No RLS changes needed as existing policies remain intact
*/

-- Add patient_name column to sms_notifications table
ALTER TABLE sms_notifications 
ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Add index for better query performance when filtering by patient name
CREATE INDEX IF NOT EXISTS idx_sms_notifications_patient_name 
ON sms_notifications(patient_name);
