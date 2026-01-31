/*
  # Create Trip Reminders System

  1. New Tables
    - `trip_reminders`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `patient_id` (uuid, foreign key to patients)
      - `reminder_type` (text: 'sms', 'email', 'both')
      - `scheduled_for` (timestamptz) - When to send the reminder
      - `hours_before_trip` (numeric) - Hours before trip (for reference)
      - `status` (text: 'pending', 'sent', 'failed', 'cancelled')
      - `message` (text) - The sent message
      - `sent_at` (timestamptz) - When it was sent
      - `error` (text) - Error message if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `patient_reminder_preferences`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients, unique)
      - `enabled` (boolean) - Master switch for reminders
      - `sms_enabled` (boolean)
      - `email_enabled` (boolean)
      - `reminder_times` (jsonb) - Array of hours before trip
      - `include_driver_info` (boolean)
      - `include_tracking_link` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create trip_reminders table
CREATE TABLE IF NOT EXISTS trip_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('sms', 'email', 'both')),
  scheduled_for timestamptz NOT NULL,
  hours_before_trip numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  message text,
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create patient_reminder_preferences table
CREATE TABLE IF NOT EXISTS patient_reminder_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  reminder_times jsonb DEFAULT '[24, 2, 0.5]'::jsonb,
  include_driver_info boolean DEFAULT true,
  include_tracking_link boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_reminders_trip_id ON trip_reminders(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_reminders_patient_id ON trip_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_trip_reminders_status ON trip_reminders(status);
CREATE INDEX IF NOT EXISTS idx_trip_reminders_scheduled_for ON trip_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_patient_reminder_preferences_patient_id ON patient_reminder_preferences(patient_id);

-- Enable RLS
ALTER TABLE trip_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_reminder_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for trip_reminders
CREATE POLICY "Allow authenticated users to view trip reminders"
  ON trip_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create trip reminders"
  ON trip_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update trip reminders"
  ON trip_reminders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete trip reminders"
  ON trip_reminders FOR DELETE
  TO authenticated
  USING (true);

-- Policies for patient_reminder_preferences
CREATE POLICY "Allow authenticated users to view reminder preferences"
  ON patient_reminder_preferences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create reminder preferences"
  ON patient_reminder_preferences FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update reminder preferences"
  ON patient_reminder_preferences FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete reminder preferences"
  ON patient_reminder_preferences FOR DELETE
  TO authenticated
  USING (true);

-- Allow anonymous access for reminder processing (edge functions)
CREATE POLICY "Allow anon to view pending reminders"
  ON trip_reminders FOR SELECT
  TO anon
  USING (status = 'pending');

CREATE POLICY "Allow anon to update reminder status"
  ON trip_reminders FOR UPDATE
  TO anon
  USING (status = 'pending')
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_trip_reminders_updated_at
  BEFORE UPDATE ON trip_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_reminder_preferences_updated_at
  BEFORE UPDATE ON patient_reminder_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
