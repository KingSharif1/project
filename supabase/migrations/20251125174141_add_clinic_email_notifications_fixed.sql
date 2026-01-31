/*
  # Add Clinic Email Notifications for Cancellations and No-Shows

  1. Purpose
    - Send email to clinic admin when trip is canceled
    - Send email to clinic admin when trip is no-show
    - Use Resend API for email delivery

  2. New Tables
    - clinic_notification_settings - Configure email addresses per clinic
    - email_notification_log - Track all emails sent

  3. New Functions
    - queue_clinic_email() - Queue email for sending
    - get_clinic_admin_email() - Get clinic admin email address

  4. Security
    - RLS enabled on all tables
*/

-- Create clinic notification settings table
CREATE TABLE IF NOT EXISTS clinic_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  notification_email text NOT NULL,
  cc_emails text[],
  notification_types text[] DEFAULT ARRAY['cancellation', 'no-show', 'late-cancellation'],
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(facility_id)
);

-- Create email notification log table
CREATE TABLE IF NOT EXISTS email_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('cancellation', 'no-show', 'late-cancellation', 'general')),
  recipient_email text NOT NULL,
  cc_emails text[],
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view clinic notification settings"
  ON clinic_notification_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage clinic notification settings"
  ON clinic_notification_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view email logs"
  ON email_notification_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage email logs"
  ON email_notification_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinic_notification_settings_facility 
  ON clinic_notification_settings(facility_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_log_trip 
  ON email_notification_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_log_status 
  ON email_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_email_notification_log_created 
  ON email_notification_log(created_at DESC);

-- Function to get clinic admin email
CREATE OR REPLACE FUNCTION get_clinic_admin_email(p_facility_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
BEGIN
  -- Try notification settings first
  SELECT notification_email INTO v_email
  FROM clinic_notification_settings
  WHERE facility_id = p_facility_id AND enabled = true;

  -- Fall back to facility contact_email
  IF v_email IS NULL THEN
    SELECT contact_email INTO v_email
    FROM facilities
    WHERE id = p_facility_id;
  END IF;

  RETURN v_email;
END;
$$;

-- Function to queue clinic email notification
CREATE OR REPLACE FUNCTION queue_clinic_email(
  p_trip_id uuid,
  p_notification_type text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip record;
  v_facility_email text;
  v_cc_emails text[];
  v_subject text;
  v_body_html text;
  v_body_text text;
  v_log_id uuid;
BEGIN
  -- Get trip details
  SELECT
    t.id, t.trip_number, t.passenger_first_name, t.passenger_last_name,
    t.passenger_phone, t.scheduled_pickup_time, t.pickup_address,
    t.dropoff_address, t.status, t.cancellation_reason, t.cancelled_at,
    t.facility_id, f.name as facility_name, d.name as driver_name,
    d.phone as driver_phone
  INTO v_trip
  FROM trips t
  LEFT JOIN facilities f ON t.facility_id = f.id
  LEFT JOIN drivers d ON t.driver_id = d.id
  WHERE t.id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Get clinic admin email
  v_facility_email := get_clinic_admin_email(v_trip.facility_id);

  IF v_facility_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No email configured');
  END IF;

  -- Get CC emails
  SELECT cc_emails INTO v_cc_emails
  FROM clinic_notification_settings
  WHERE facility_id = v_trip.facility_id AND enabled = true;

  -- Build subject
  v_subject := format(
    '⚠️ Trip Alert: %s - Trip #%s - %s',
    CASE p_notification_type
      WHEN 'cancellation' THEN 'Passenger Canceled'
      WHEN 'no-show' THEN 'Passenger No-Show'
      ELSE 'Trip Status Change'
    END,
    v_trip.trip_number,
    v_trip.facility_name
  );

  -- Build HTML body
  v_body_html := format(
    E'<h2>🚨 Trip Status Alert</h2>' ||
    '<p><strong>Trip #%s</strong> requires immediate attention.</p>' ||
    '<h3>Trip Details:</h3>' ||
    '<ul>' ||
    '<li><strong>Trip Number:</strong> %s</li>' ||
    '<li><strong>Passenger:</strong> %s %s</li>' ||
    '<li><strong>Phone:</strong> %s</li>' ||
    '<li><strong>Scheduled Pickup:</strong> %s</li>' ||
    '<li><strong>Pickup:</strong> %s</li>' ||
    '<li><strong>Dropoff:</strong> %s</li>' ||
    '<li><strong>Status:</strong> %s</li>' ||
    '%s%s' ||
    '</ul>' ||
    '<h3>Recommended Actions:</h3>' ||
    '<ul>' ||
    '<li>Review trip details in your dashboard</li>' ||
    '<li>Contact the patient if needed</li>' ||
    '<li>Reschedule appointment if appropriate</li>' ||
    '</ul>' ||
    '<p><em>Fort Worth Non-Emergency Transportation</em></p>',
    v_trip.trip_number,
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(v_trip.passenger_last_name, ''),
    COALESCE(v_trip.passenger_phone, 'Not provided'),
    to_char(v_trip.scheduled_pickup_time, 'Day, Mon DD, YYYY at HH12:MI AM'),
    v_trip.pickup_address,
    v_trip.dropoff_address,
    UPPER(REPLACE(p_notification_type, '-', ' ')),
    CASE WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN format('<li><strong>Reason:</strong> %s</li>', v_trip.cancellation_reason)
      ELSE '' END,
    CASE WHEN v_trip.driver_name IS NOT NULL 
      THEN format('<li><strong>Driver:</strong> %s (%s)</li>', v_trip.driver_name, COALESCE(v_trip.driver_phone, 'No phone'))
      ELSE '' END
  );

  -- Build text body
  v_body_text := format(
    E'TRIP STATUS ALERT\n\n' ||
    'Trip #%s requires immediate attention.\n\n' ||
    'TRIP DETAILS:\n' ||
    'Trip Number: %s\n' ||
    'Passenger: %s %s\n' ||
    'Phone: %s\n' ||
    'Scheduled Pickup: %s\n' ||
    'Pickup: %s\n' ||
    'Dropoff: %s\n' ||
    'Status: %s\n' ||
    '%s%s\n' ||
    'RECOMMENDED ACTIONS:\n' ||
    '- Review trip details\n' ||
    '- Contact patient if needed\n' ||
    '- Reschedule if appropriate\n\n' ||
    'Fort Worth Non-Emergency Transportation',
    v_trip.trip_number,
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(v_trip.passenger_last_name, ''),
    COALESCE(v_trip.passenger_phone, 'Not provided'),
    to_char(v_trip.scheduled_pickup_time, 'Day, Mon DD, YYYY at HH12:MI AM'),
    v_trip.pickup_address,
    v_trip.dropoff_address,
    UPPER(REPLACE(p_notification_type, '-', ' ')),
    CASE WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN format('Reason: %s\n', v_trip.cancellation_reason) ELSE '' END,
    CASE WHEN v_trip.driver_name IS NOT NULL 
      THEN format('Driver: %s (%s)\n', v_trip.driver_name, COALESCE(v_trip.driver_phone, 'No phone'))
      ELSE '' END
  );

  -- Insert email log
  INSERT INTO email_notification_log (
    trip_id, facility_id, notification_type, recipient_email, cc_emails,
    subject, body_html, body_text, status, metadata
  )
  VALUES (
    v_trip.id, v_trip.facility_id, p_notification_type, v_facility_email,
    v_cc_emails, v_subject, v_body_html, v_body_text, 'pending',
    jsonb_build_object(
      'trip_number', v_trip.trip_number,
      'facility_name', v_trip.facility_name,
      'passenger_name', v_trip.passenger_first_name || ' ' || COALESCE(v_trip.passenger_last_name, '')
    )
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'recipient_email', v_facility_email,
    'subject', v_subject
  );
END;
$$;

-- Update trigger
CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    PERFORM queue_clinic_email(
      NEW.id, 
      CASE WHEN NEW.status = 'cancelled' THEN 'cancellation'
           WHEN NEW.status = 'no-show' THEN 'no-show'
           ELSE 'general' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS send_clinic_email_on_status_change ON trips;
CREATE TRIGGER send_clinic_email_on_status_change
  AFTER UPDATE OF status ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clinic_email_on_status_change();

-- Insert default settings
INSERT INTO clinic_notification_settings (facility_id, notification_email, enabled)
SELECT id, contact_email, true
FROM facilities
WHERE contact_email IS NOT NULL
ON CONFLICT (facility_id) DO NOTHING;

GRANT ALL ON clinic_notification_settings TO authenticated;
GRANT ALL ON email_notification_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_clinic_admin_email TO authenticated;
GRANT EXECUTE ON FUNCTION queue_clinic_email TO authenticated;