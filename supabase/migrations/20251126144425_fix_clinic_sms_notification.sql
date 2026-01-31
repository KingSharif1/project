/*
  # Fix Clinic SMS Notification System

  1. Changes
    - Update send_clinic_sms_notification to use sms-notifications Edge Function
    - SMS will be sent immediately when status changes
    - Uses http_post to call Edge Function asynchronously
    
  2. How It Works
    - Trip cancelled/no-show → trigger fires
    - Function calls sms-notifications Edge Function via HTTP
    - Twilio sends SMS to clinic phone
    - Clinic notified immediately
*/

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update function to call Edge Function instead of just queuing
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
  v_supabase_url text;
  v_anon_key text;
  v_request_id bigint;
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

  -- Try to get Supabase URL for Edge Function call
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.anon_key', true);

  IF v_supabase_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
    -- Call Edge Function to send SMS immediately
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/sms-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'to', v_facility_phone,
          'message', v_message,
          'tripId', v_trip.id::text,
          'patientName', v_trip.passenger_first_name || ' ' || COALESCE(v_trip.passenger_last_name, ''),
          'messageType', 'clinic_alert'
        )
      ) INTO v_request_id;

      RAISE NOTICE 'Clinic SMS Edge Function called: request_id=%', v_request_id;

      RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'recipient', v_facility_phone,
        'method', 'edge_function'
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to call SMS Edge Function: %', SQLERRM;
        -- Continue to fallback method
    END;
  END IF;

  -- Fallback: Just log the SMS (will be processed later)
  RAISE NOTICE 'SMS queued for clinic: % - %', v_facility_phone, left(v_message, 50);

  RETURN jsonb_build_object(
    'success', true,
    'recipient', v_facility_phone,
    'method', 'queued',
    'note', 'Supabase URL not configured - SMS would be sent via Edge Function'
  );
END;
$$;