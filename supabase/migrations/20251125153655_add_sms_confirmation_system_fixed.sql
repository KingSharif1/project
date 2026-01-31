/*
  # SMS Confirmation & Cancellation System

  1. New Tables
    - `trip_confirmations` - Tracks confirmation status for each trip
    - `sms_confirmation_log` - Audit trail of all SMS messages

  2. Schema Changes
    - Add `passenger_confirmation_status` to trips table
    - Add `last_confirmation_update` to trips table

  3. Features
    - Automatic sync of confirmation status to trips table via trigger
    - SMS reply processing function
    - Auto-expiry function for unconfirmed trips
    - Complete audit trail

  4. Security
    - RLS enabled on all new tables
    - Policies for authenticated users
*/

-- Create confirmation status enum
DO $$ BEGIN
  CREATE TYPE confirmation_status_type AS ENUM (
    'awaiting_response',
    'confirmed',
    'canceled',
    'unconfirmed',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trip confirmations table
CREATE TABLE IF NOT EXISTS trip_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  confirmation_status confirmation_status_type DEFAULT 'awaiting_response',
  reply_received_at timestamptz,
  reply_message text,
  reply_phone text,
  reminder_sent_at timestamptz,
  expiry_time timestamptz,
  confirmed_by text DEFAULT 'sms',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id)
);

-- Add columns to trips table if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_confirmation_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_confirmation_status confirmation_status_type;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'last_confirmation_update'
  ) THEN
    ALTER TABLE trips ADD COLUMN last_confirmation_update timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_trip_id ON trip_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_status ON trip_confirmations(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_expiry ON trip_confirmations(expiry_time);
CREATE INDEX IF NOT EXISTS idx_trips_confirmation_status ON trips(passenger_confirmation_status);

-- Enable RLS
ALTER TABLE trip_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_confirmations
CREATE POLICY "Authenticated users can view confirmations"
  ON trip_confirmations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert confirmations"
  ON trip_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update confirmations"
  ON trip_confirmations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update trip status when confirmation changes
CREATE OR REPLACE FUNCTION update_trip_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trips
  SET
    passenger_confirmation_status = NEW.confirmation_status,
    last_confirmation_update = NEW.updated_at
  WHERE id = NEW.trip_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync confirmation status to trips table
DROP TRIGGER IF EXISTS sync_trip_confirmation_status ON trip_confirmations;
CREATE TRIGGER sync_trip_confirmation_status
  AFTER INSERT OR UPDATE ON trip_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_on_confirmation();

-- Function to auto-expire unconfirmed trips
CREATE OR REPLACE FUNCTION expire_unconfirmed_trips()
RETURNS void AS $$
BEGIN
  UPDATE trip_confirmations
  SET
    confirmation_status = 'expired',
    updated_at = now(),
    notes = COALESCE(notes || ' | ', '') || 'Auto-expired at ' || now()::text
  WHERE
    confirmation_status = 'awaiting_response'
    AND expiry_time < now();
END;
$$ LANGUAGE plpgsql;

-- Function to process SMS reply
CREATE OR REPLACE FUNCTION process_sms_reply(
  p_phone text,
  p_message text,
  p_trip_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_trip_id uuid;
  v_confirmation_id uuid;
  v_status confirmation_status_type;
  v_message_lower text;
  v_result jsonb;
BEGIN
  v_message_lower := lower(trim(p_message));

  -- Determine status from message
  IF v_message_lower IN ('yes', 'y', 'confirm', 'confirmed', 'ok', '1') THEN
    v_status := 'confirmed';
  ELSIF v_message_lower IN ('no', 'n', 'cancel', 'cancelled', 'canceled', '0') THEN
    v_status := 'canceled';
  ELSE
    v_status := 'unconfirmed';
  END IF;

  -- Find trip if not provided
  IF p_trip_id IS NULL THEN
    SELECT t.id INTO v_trip_id
    FROM trips t
    LEFT JOIN patients p ON t.patient_id = p.id
    WHERE (p.phone = p_phone OR t.passenger_phone = p_phone)
      AND (t.passenger_confirmation_status IS NULL OR t.passenger_confirmation_status = 'awaiting_response')
      AND t.scheduled_pickup_time > now()
    ORDER BY t.scheduled_pickup_time ASC
    LIMIT 1;

    IF v_trip_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No pending trip found for this phone number'
      );
    END IF;
  ELSE
    v_trip_id := p_trip_id;
  END IF;

  -- Update or create confirmation record
  INSERT INTO trip_confirmations (
    trip_id,
    confirmation_status,
    reply_received_at,
    reply_message,
    reply_phone,
    confirmed_by,
    updated_at
  )
  VALUES (
    v_trip_id,
    v_status,
    now(),
    p_message,
    p_phone,
    'sms',
    now()
  )
  ON CONFLICT (trip_id)
  DO UPDATE SET
    confirmation_status = v_status,
    reply_received_at = now(),
    reply_message = p_message,
    reply_phone = p_phone,
    confirmed_by = 'sms',
    updated_at = now()
  RETURNING id INTO v_confirmation_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'confirmation_id', v_confirmation_id,
    'status', v_status,
    'message', CASE
      WHEN v_status = 'confirmed' THEN 'Trip confirmed successfully'
      WHEN v_status = 'canceled' THEN 'Trip canceled successfully'
      ELSE 'Reply received but unclear. Please contact dispatch.'
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create SMS notification log for audit trail
CREATE TABLE IF NOT EXISTS sms_confirmation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  message_type text NOT NULL,
  message_content text NOT NULL,
  direction text NOT NULL,
  status text,
  reply_to_id uuid REFERENCES sms_confirmation_log(id),
  created_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_log_trip_id ON sms_confirmation_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_created_at ON sms_confirmation_log(created_at);

-- Enable RLS
ALTER TABLE sms_confirmation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view SMS logs"
  ON sms_confirmation_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert SMS logs"
  ON sms_confirmation_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log SMS
CREATE OR REPLACE FUNCTION log_sms(
  p_trip_id uuid,
  p_phone text,
  p_message_type text,
  p_message_content text,
  p_direction text,
  p_status text DEFAULT 'sent',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO sms_confirmation_log (
    trip_id,
    phone_number,
    message_type,
    message_content,
    direction,
    status,
    metadata
  )
  VALUES (
    p_trip_id,
    p_phone,
    p_message_type,
    p_message_content,
    p_direction,
    p_status,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;