/*
  # Add SMS Fallback for Clinic Notifications

  1. Changes
    - Add function to send SMS to clinic when trip is cancelled/no-show
    - Immediately notifies clinic via SMS while email is queued
    - Uses facility phone number from Facility Management
    
  2. How It Works
    - When trip status changes to cancelled/no-show
    - Email is queued in email_notification_log
    - SMS is immediately sent to clinic phone number
    - Clinic gets instant notification via both channels
    
  3. Message Format
    - Professional SMS format similar to driver notifications
    - Includes trip number, patient name, reason, contact info
*/

-- Function to send SMS notification to clinic
CREATE OR REPLACE FUNCTION send_clinic_sms_notification(p_trip_id uuid, p_notification_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_facility_phone text;
  v_message text;
  v_sms_id uuid;
BEGIN
  -- Get trip and facility details
  SELECT
    t.id, t.trip_number, t.passenger_first_name, t.passenger_last_name,
    t.passenger_phone, t.scheduled_pickup_time, t.pickup_address,
    t.dropoff_address, t.status, t.cancellation_reason,
    t.facility_id, f.name as facility_name, f.phone as facility_phone,
    d.name as driver_name, d.phone as driver_phone
  INTO v_trip
  FROM trips t
  LEFT JOIN facilities f ON t.facility_id = f.id
  LEFT JOIN drivers d ON t.driver_id = d.id
  WHERE t.id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Get facility phone
  v_facility_phone := v_trip.facility_phone;

  IF v_facility_phone IS NULL OR v_facility_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No clinic phone configured');
  END IF;

  -- Build SMS message
  v_message := format(
    E'TRIP ALERT - %s\n\n' ||
    'Trip #%s\n' ||
    'Patient: %s\n' ||
    'Scheduled: %s\n' ||
    'From: %s\n' ||
    'To: %s\n' ||
    '%s' ||
    '\nContact: %s\n\n' ||
    'Fort Worth Transportation',
    CASE p_notification_type
      WHEN 'cancellation' THEN 'PASSENGER CANCELED'
      WHEN 'no-show' THEN 'PASSENGER NO-SHOW'
      ELSE 'STATUS CHANGE'
    END,
    v_trip.trip_number,
    v_trip.passenger_first_name || ' ' || COALESCE(v_trip.passenger_last_name, ''),
    to_char(v_trip.scheduled_pickup_time, 'Mon DD at HH12:MI AM'),
    v_trip.pickup_address,
    v_trip.dropoff_address,
    CASE WHEN v_trip.cancellation_reason IS NOT NULL 
      THEN format('Reason: %s', v_trip.cancellation_reason)
      ELSE '' END,
    COALESCE(v_trip.passenger_phone, 'Not provided')
  );

  -- Insert SMS notification
  INSERT INTO sms_notifications (
    trip_id, recipient_phone, message_type, message_content,
    status, patient_name, metadata
  )
  VALUES (
    v_trip.id,
    v_facility_phone,
    'clinic_alert',
    v_message,
    'pending',
    v_trip.passenger_first_name || ' ' || COALESCE(v_trip.passenger_last_name, ''),
    jsonb_build_object(
      'notification_type', p_notification_type,
      'facility_name', v_trip.facility_name,
      'trip_number', v_trip.trip_number,
      'is_clinic_notification', true
    )
  )
  RETURNING id INTO v_sms_id;

  RETURN jsonb_build_object(
    'success', true,
    'sms_id', v_sms_id,
    'recipient', v_facility_phone,
    'message_preview', left(v_message, 50) || '...'
  );
END;
$$;

-- Update the trigger to also send SMS
DROP TRIGGER IF EXISTS clinic_email_on_status_change ON trips;
DROP FUNCTION IF EXISTS trigger_clinic_email_on_status_change() CASCADE;

CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_type text;
BEGIN
  -- Only trigger for cancellation or no-show
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    
    v_notification_type := CASE 
      WHEN NEW.status = 'cancelled' THEN 'cancellation'
      WHEN NEW.status = 'no-show' THEN 'no-show'
    END;
    
    -- Queue the email notification
    PERFORM queue_clinic_email(NEW.id, v_notification_type);
    
    -- ALSO send SMS notification immediately
    PERFORM send_clinic_sms_notification(NEW.id, v_notification_type);
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER send_clinic_email_on_status_change
  AFTER UPDATE OF status ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clinic_email_on_status_change();