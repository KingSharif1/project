/*
  # Add Automated Notifications System

  1. Purpose
    - Send SMS to drivers when passengers confirm/cancel trips
    - Send emails to clinic dispatchers when trips are canceled or marked no-show
    - Track all notifications sent

  2. New Tables
    - `automated_notification_log`
      - Tracks all automated notifications sent
      - Records recipient, type, status, and delivery info

  3. New Functions
    - `send_driver_sms_notification(trip_id, confirmation_status)`
      - Sends SMS to driver when passenger confirms/cancels
    - `send_clinic_email_notification(trip_id, reason)`
      - Sends email to clinic dispatcher for cancellations/no-shows

  4. New Triggers
    - Trigger on trip_confirmations to send driver SMS
    - Trigger on trips status changes to send clinic emails

  5. Security
    - Enable RLS on automated_notification_log
    - Only authenticated users can view notification logs
*/

-- Create automated notification log table
CREATE TABLE IF NOT EXISTS automated_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('driver_sms', 'clinic_email')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('driver', 'clinic_dispatcher')),
  recipient_id uuid,
  recipient_contact text NOT NULL,
  subject text,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE automated_notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view notification logs"
  ON automated_notification_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert notification logs"
  ON automated_notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update notification logs"
  ON automated_notification_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_notification_log_trip_id 
  ON automated_notification_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_automated_notification_log_created_at 
  ON automated_notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automated_notification_log_status 
  ON automated_notification_log(status);

-- Function to queue driver SMS notification
CREATE OR REPLACE FUNCTION queue_driver_sms_notification(
  p_trip_id uuid,
  p_confirmation_status text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip record;
  v_driver record;
  v_message text;
  v_log_id uuid;
BEGIN
  -- Get trip details with driver info
  SELECT
    t.trip_number,
    t.passenger_first_name,
    t.passenger_last_name,
    t.scheduled_pickup_time,
    t.driver_id,
    d.id as driver_id,
    d.name as driver_name,
    d.phone as driver_phone
  INTO v_trip
  FROM trips t
  LEFT JOIN drivers d ON t.driver_id = d.id
  WHERE t.id = p_trip_id;

  -- If no driver assigned, return early
  IF v_trip.driver_id IS NULL OR v_trip.driver_phone IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No driver assigned to this trip'
    );
  END IF;

  -- Build SMS message
  v_message := format(
    'Trip #%s — Passenger %s %s, pickup time %s, status: %s.',
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(v_trip.passenger_last_name, ''),
    to_char(v_trip.scheduled_pickup_time, 'HH12:MI AM'),
    CASE p_confirmation_status
      WHEN 'confirmed' THEN 'Confirmed'
      WHEN 'canceled' THEN 'Canceled'
      ELSE 'Updated'
    END
  );

  -- Log the notification
  INSERT INTO automated_notification_log (
    trip_id,
    notification_type,
    recipient_type,
    recipient_id,
    recipient_contact,
    message_body,
    status,
    metadata
  )
  VALUES (
    p_trip_id,
    'driver_sms',
    'driver',
    v_trip.driver_id,
    v_trip.driver_phone,
    v_message,
    'pending',
    jsonb_build_object(
      'driver_name', v_trip.driver_name,
      'trip_number', v_trip.trip_number,
      'confirmation_status', p_confirmation_status
    )
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'driver_phone', v_trip.driver_phone,
    'message', v_message
  );
END;
$$;

-- Function to queue clinic email notification
CREATE OR REPLACE FUNCTION queue_clinic_email_notification(
  p_trip_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip record;
  v_facility record;
  v_subject text;
  v_message text;
  v_log_id uuid;
BEGIN
  -- Get trip details with facility info
  SELECT
    t.trip_number,
    t.passenger_first_name,
    t.passenger_last_name,
    t.scheduled_pickup_time,
    t.pickup_address,
    t.dropoff_address,
    t.status,
    t.cancellation_reason,
    t.facility_id,
    f.id as facility_id,
    f.name as facility_name,
    f.contact_email as facility_email,
    f.dispatcher_email
  INTO v_trip
  FROM trips t
  LEFT JOIN facilities f ON t.facility_id = f.id
  WHERE t.id = p_trip_id;

  -- Determine which email to use (dispatcher email or general contact)
  v_facility.email := COALESCE(v_trip.dispatcher_email, v_trip.facility_email);

  -- If no email available, return early
  IF v_facility.email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No clinic email configured for this trip'
    );
  END IF;

  -- Build email subject
  v_subject := format(
    'Trip Alert: %s - Trip #%s',
    CASE p_reason
      WHEN 'canceled' THEN 'Passenger Canceled'
      WHEN 'no-show' THEN 'Passenger No-Show'
      ELSE 'Trip Status Change'
    END,
    v_trip.trip_number
  );

  -- Build email message
  v_message := format(
    E'Trip Status Alert\n\n' ||
    'Trip Number: %s\n' ||
    'Passenger: %s %s\n' ||
    'Scheduled Pickup: %s\n' ||
    'Pickup Address: %s\n' ||
    'Dropoff Address: %s\n' ||
    'Status: %s\n' ||
    '%s\n\n' ||
    'Please review this trip and take appropriate action.\n\n' ||
    'Fort Worth Non-Emergency Transportation',
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(v_trip.passenger_last_name, ''),
    to_char(v_trip.scheduled_pickup_time, 'Mon DD, YYYY at HH12:MI AM'),
    v_trip.pickup_address,
    v_trip.dropoff_address,
    UPPER(p_reason),
    CASE 
      WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN 'Reason: ' || v_trip.cancellation_reason
      ELSE ''
    END
  );

  -- Log the notification
  INSERT INTO automated_notification_log (
    trip_id,
    notification_type,
    recipient_type,
    recipient_id,
    recipient_contact,
    subject,
    message_body,
    status,
    metadata
  )
  VALUES (
    p_trip_id,
    'clinic_email',
    'clinic_dispatcher',
    v_trip.facility_id,
    v_facility.email,
    v_subject,
    v_message,
    'pending',
    jsonb_build_object(
      'facility_name', v_trip.facility_name,
      'trip_number', v_trip.trip_number,
      'reason', p_reason
    )
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'clinic_email', v_facility.email,
    'subject', v_subject
  );
END;
$$;

-- Trigger to send driver SMS when passenger confirms/cancels
CREATE OR REPLACE FUNCTION trigger_driver_sms_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only send SMS for confirmed or canceled status
  IF NEW.confirmation_status IN ('confirmed', 'canceled') THEN
    PERFORM queue_driver_sms_notification(NEW.trip_id, NEW.confirmation_status);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on trip_confirmations
DROP TRIGGER IF EXISTS send_driver_sms_on_confirmation ON trip_confirmations;
CREATE TRIGGER send_driver_sms_on_confirmation
  AFTER INSERT OR UPDATE OF confirmation_status
  ON trip_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_driver_sms_on_confirmation();

-- Trigger to send clinic email when trip is canceled or no-show
CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Send email when trip becomes canceled or no-show
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    PERFORM queue_clinic_email_notification(NEW.id, NEW.status);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on trips
DROP TRIGGER IF EXISTS send_clinic_email_on_status_change ON trips;
CREATE TRIGGER send_clinic_email_on_status_change
  AFTER UPDATE OF status
  ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clinic_email_on_status_change();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON automated_notification_log TO authenticated;
GRANT EXECUTE ON FUNCTION queue_driver_sms_notification TO authenticated;
GRANT EXECUTE ON FUNCTION queue_clinic_email_notification TO authenticated;