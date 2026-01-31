/*
  # Fix Clinic SMS Notification Function

  1. Changes
    - Add missing recipient_type field
    - Ensure all required fields are populated
*/

CREATE OR REPLACE FUNCTION queue_clinic_sms_notification(
  p_trip_id uuid,
  p_notification_type text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip record;
  v_clinic_phone text;
  v_message text;
  v_log_id uuid;
BEGIN
  -- Get trip details
  SELECT
    t.id, t.trip_number, t.passenger_first_name, t.passenger_last_name,
    t.scheduled_pickup_time, t.status, t.cancellation_reason,
    t.facility_id, f.name as facility_name, f.phone as facility_phone
  INTO v_trip
  FROM trips t
  LEFT JOIN facilities f ON t.facility_id = f.id
  WHERE t.id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Get clinic phone
  v_clinic_phone := v_trip.facility_phone;

  IF v_clinic_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No phone configured for clinic');
  END IF;

  -- Build SMS message (160 chars for single SMS)
  v_message := format(
    E'🚨 %s - Trip #%s\nPassenger: %s %s\nPickup: %s\n%sCheck dashboard or call dispatch.',
    CASE p_notification_type
      WHEN 'cancellation' THEN 'CANCELED'
      WHEN 'no-show' THEN 'NO-SHOW'
      ELSE 'ALERT'
    END,
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(SUBSTRING(v_trip.passenger_last_name, 1, 1) || '.', ''),
    to_char(v_trip.scheduled_pickup_time, 'Mon DD HH12:MI AM'),
    CASE WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN format('Reason: %s\n', LEFT(v_trip.cancellation_reason, 30))
      ELSE ''
    END
  );

  -- Queue in automated_notification_log
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
    v_trip.id,
    'clinic_sms',
    'clinic',
    v_trip.facility_id,
    v_clinic_phone,
    v_message,
    'pending',
    jsonb_build_object(
      'facility_id', v_trip.facility_id,
      'facility_name', v_trip.facility_name,
      'notification_reason', p_notification_type,
      'fallback_method', 'sms',
      'via', 'twilio'
    )
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'recipient_phone', v_clinic_phone,
    'method', 'sms',
    'facility_name', v_trip.facility_name
  );
END;
$$;