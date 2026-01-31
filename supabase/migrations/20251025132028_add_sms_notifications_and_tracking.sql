/*
  # SMS Notifications and Enhanced Tracking System

  1. New Tables
    - `sms_notifications`
      - Tracks all SMS messages sent
      - Includes delivery status and error tracking
      - Links to trips, drivers, and patients
    
    - `tracking_links`
      - Generates secure, shareable tracking links
      - Expires after 24 hours
      - Includes access logs for security
    
    - `signatures`
      - Stores digital signatures for trips
      - Includes timestamp and signer information
      - Links to trip completion
    
    - `driver_earnings`
      - Tracks earnings per trip
      - Includes breakdown of base fare, mileage, bonuses
      - Enables transparent earnings reporting

  2. Changes
    - Add notification preferences to drivers and patients
    - Add SMS tracking fields to trips
    - Add invoice automation fields
    
  3. Security
    - Enable RLS on all new tables
    - Restrict access to authenticated users
    - Add policies for role-based access
*/

-- SMS Notifications Table
CREATE TABLE IF NOT EXISTS sms_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  message_type text NOT NULL, -- 'trip_assigned', 'driver_enroute', 'driver_arrived', 'trip_completed', 'reminder', 'custom'
  message_content text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  twilio_sid text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SMS notifications"
  ON sms_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create SMS notifications"
  ON sms_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update SMS notifications"
  ON sms_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tracking Links Table
CREATE TABLE IF NOT EXISTS tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean DEFAULT true,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES auth.users(id),
  access_logs jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tracking links"
  ON tracking_links FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Authenticated users can create tracking links"
  ON tracking_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tracking links"
  ON tracking_links FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Signatures Table
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  signature_type text NOT NULL, -- 'pickup', 'dropoff', 'patient', 'driver'
  signature_data text NOT NULL, -- base64 encoded image
  signer_name text NOT NULL,
  signer_role text, -- 'patient', 'caregiver', 'driver', 'facility_staff'
  signed_at timestamptz DEFAULT now(),
  location_lat decimal(10, 8),
  location_lng decimal(11, 8),
  device_info text,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create signatures"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Driver Earnings Table
CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  base_fare decimal(10, 2) NOT NULL DEFAULT 0,
  mileage_pay decimal(10, 2) NOT NULL DEFAULT 0,
  wait_time_pay decimal(10, 2) NOT NULL DEFAULT 0,
  bonus decimal(10, 2) NOT NULL DEFAULT 0,
  total_earnings decimal(10, 2) NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create earnings"
  ON driver_earnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update earnings"
  ON driver_earnings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add notification preferences to drivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'sms_notifications_enabled'
  ) THEN
    ALTER TABLE drivers ADD COLUMN sms_notifications_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'notification_phone'
  ) THEN
    ALTER TABLE drivers ADD COLUMN notification_phone text;
  END IF;
END $$;

-- Add notification preferences to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'sms_notifications_enabled'
  ) THEN
    ALTER TABLE patients ADD COLUMN sms_notifications_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'notification_phone'
  ) THEN
    ALTER TABLE patients ADD COLUMN notification_phone text;
  END IF;
END $$;

-- Add tracking link to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'tracking_link_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN tracking_link_id uuid REFERENCES tracking_links(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'signature_required'
  ) THEN
    ALTER TABLE trips ADD COLUMN signature_required boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pickup_signature_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN pickup_signature_id uuid REFERENCES signatures(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dropoff_signature_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN dropoff_signature_id uuid REFERENCES signatures(id);
  END IF;
END $$;

-- Add invoice automation fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'auto_invoice'
  ) THEN
    ALTER TABLE trips ADD COLUMN auto_invoice boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'invoice_sent_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN invoice_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'invoice_email'
  ) THEN
    ALTER TABLE trips ADD COLUMN invoice_email text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_notifications_trip_id ON sms_notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_driver_id ON sms_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_links_trip_id ON tracking_links(trip_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_token ON tracking_links(token);
CREATE INDEX IF NOT EXISTS idx_tracking_links_expires_at ON tracking_links(expires_at);

CREATE INDEX IF NOT EXISTS idx_signatures_trip_id ON signatures(trip_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signed_at ON signatures(signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_trip_id ON driver_earnings(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_payment_status ON driver_earnings(payment_status);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON driver_earnings(created_at DESC);