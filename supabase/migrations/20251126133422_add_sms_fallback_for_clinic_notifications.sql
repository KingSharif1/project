/*
  # Add SMS Fallback for Clinic Notifications

  1. Purpose
    - When RESEND_API_KEY is not configured, send SMS instead of email
    - Use existing Twilio integration
    - Send clinic notifications via SMS to clinic contact phone

  2. Changes
    - Add function to queue clinic SMS notification
    - Update trigger to send SMS when email not available
    - Use existing SMS infrastructure
*/

-- Function to send clinic notification via SMS (fallback)
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

  -- Build SMS message
  v_message := format(
    E'🚨 URGENT: Trip Alert\n\n' ||
    '%s\n' ||
    'Trip #%s\n' ||
    'Passenger: %s %s\n' ||
    'Pickup: %s\n' ||
    '%s\n' ||
    'Please contact dispatch or check dashboard immediately.\n\n' ||
    '- Fort Worth Transportation',
    CASE p_notification_type
      WHEN 'cancellation' THEN 'PASSENGER CANCELED'
      WHEN 'no-show' THEN 'PASSENGER NO-SHOW'
      ELSE 'TRIP STATUS CHANGE'
    END,
    v_trip.trip_number,
    v_trip.passenger_first_name,
    COALESCE(v_trip.passenger_last_name, ''),
    to_char(v_trip.scheduled_pickup_time, 'Mon DD at HH12:MI AM'),
    CASE WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN format('Reason: %s', v_trip.cancellation_reason)
      ELSE ''
    END
  );

  -- Queue in automated_notification_log
  INSERT INTO automated_notification_log (
    trip_id,
    notification_type,
    recipient_contact,
    message_body,
    status,
    metadata
  )
  VALUES (
    v_trip.id,
    'clinic_sms',
    v_clinic_phone,
    v_message,
    'pending',
    jsonb_build_object(
      'facility_id', v_trip.facility_id,
      'facility_name', v_trip.facility_name,
      'notification_reason', p_notification_type,
      'fallback_method', 'sms'
    )
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'recipient_phone', v_clinic_phone,
    'method', 'sms'
  );
END;
$$;

-- Update trigger to send both email AND SMS
CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_email_result jsonb;
  v_sms_result jsonb;
BEGIN
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    
    -- Try to queue email first
    v_email_result := queue_clinic_email(
      NEW.id, 
      CASE WHEN NEW.status = 'cancelled' THEN 'cancellation'
           WHEN NEW.status = 'no-show' THEN 'no-show'
           ELSE 'general' END
    );

    -- Also send SMS as backup/immediate notification
    v_sms_result := queue_clinic_sms_notification(
      NEW.id,
      CASE WHEN NEW.status = 'cancelled' THEN 'cancellation'
           WHEN NEW.status = 'no-show' THEN 'no-show'
           ELSE 'general' END
    );

    RAISE NOTICE 'Clinic notifications queued - Email: %, SMS: %', v_email_result, v_sms_result;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION queue_clinic_sms_notification TO authenticated;