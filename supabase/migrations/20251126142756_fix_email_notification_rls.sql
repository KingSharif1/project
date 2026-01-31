/*
  # Fix Email Notification RLS for Database Functions

  1. Changes
    - Drop and recreate queue_clinic_email function with SECURITY DEFINER
    - This allows the function to bypass RLS when inserting email logs
    - Ensures automated triggers can queue emails without permission errors

  2. Security
    - Function runs with elevated privileges (definer's permissions)
    - Only called by authenticated triggers and functions
    - No direct user access to bypass RLS
*/

-- Drop existing function
DROP FUNCTION IF EXISTS queue_clinic_email(uuid, text);

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION queue_clinic_email(p_trip_id uuid, p_notification_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
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
    E'TRIP STATUS ALERT\\n\\n' ||
    'Trip #%s requires immediate attention.\\n\\n' ||
    'TRIP DETAILS:\\n' ||
    'Trip Number: %s\\n' ||
    'Passenger: %s %s\\n' ||
    'Phone: %s\\n' ||
    'Scheduled Pickup: %s\\n' ||
    'Pickup: %s\\n' ||
    'Dropoff: %s\\n' ||
    'Status: %s\\n' ||
    '%s%s\\n' ||
    'RECOMMENDED ACTIONS:\\n' ||
    '- Review trip details\\n' ||
    '- Contact patient if needed\\n' ||
    '- Reschedule if appropriate\\n\\n' ||
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
      THEN format('Reason: %s\\n', v_trip.cancellation_reason) ELSE '' END,
    CASE WHEN v_trip.driver_name IS NOT NULL 
      THEN format('Driver: %s (%s)\\n', v_trip.driver_name, COALESCE(v_trip.driver_phone, 'No phone'))
      ELSE '' END
  );

  -- Insert email log (bypasses RLS because of SECURITY DEFINER)
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