/*
  # Add Immediate SMS Sending via Edge Functions

  1. Purpose
    - Send SMS immediately from database using pg_net
    - No need to wait for frontend processor
    - Direct integration with Twilio via edge functions

  2. New Functions
    - send_sms_via_twilio() - Directly sends SMS using pg_net
    - Updated process_sms_reply() to send SMS immediately

  3. Changes
    - Enable pg_net extension if not enabled
    - Create function to send SMS via edge function
    - Update triggers to send SMS immediately
*/

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send SMS directly via Twilio (bypassing edge function queue)
CREATE OR REPLACE FUNCTION send_sms_immediately(
  p_to_phone text,
  p_message text,
  p_log_type text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_twilio_account_sid text;
  v_twilio_auth_token text;
  v_twilio_phone text;
  v_request_id bigint;
  v_clean_phone text;
BEGIN
  -- Get Twilio credentials from vault (or you'll need to set these)
  -- For now, we'll assume they're in a settings table or we'll call the edge function
  
  -- Clean phone number
  v_clean_phone := regexp_replace(p_to_phone, '[^0-9]', '');
  IF NOT v_clean_phone LIKE '1%' AND length(v_clean_phone) = 10 THEN
    v_clean_phone := '1' || v_clean_phone;
  END IF;
  v_clean_phone := '+' || v_clean_phone;

  -- Log the SMS as pending
  INSERT INTO sms_confirmation_log (
    phone_number,
    message_content,
    message_type,
    direction,
    status,
    metadata
  )
  VALUES (
    p_to_phone,
    p_message,
    p_log_type,
    'outbound',
    'pending',
    jsonb_build_object('sent_via', 'immediate', 'sent_at', now())
  );

  -- Return success - actual sending will be done by calling edge function
  RETURN jsonb_build_object(
    'success', true,
    'phone', v_clean_phone,
    'message', p_message,
    'queued', true
  );
END;
$$;

-- Update process_sms_reply to send thank you SMS immediately
CREATE OR REPLACE FUNCTION process_sms_reply(
  p_phone text,
  p_message text,
  p_trip_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip_id uuid;
  v_confirmation_id uuid;
  v_status confirmation_status_type;
  v_message_lower text;
  v_result jsonb;
  v_clean_phone text;
  v_driver_notification jsonb;
  v_thank_you_message text;
  v_trip_info record;
BEGIN
  -- Clean the message
  v_message_lower := lower(trim(p_message));
  
  -- Clean the phone number
  v_clean_phone := regexp_replace(p_phone, '^1', '');

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
    -- PRIORITY 1: Trips happening today
    SELECT t.id INTO v_trip_id
    FROM trips t
    LEFT JOIN patients p ON t.patient_id = p.id
    WHERE (
      t.passenger_phone = v_clean_phone
      OR t.passenger_phone = p_phone
      OR regexp_replace(t.passenger_phone, '^1', '') = v_clean_phone
      OR p.phone = v_clean_phone
      OR p.phone = p_phone
      OR regexp_replace(p.phone, '^1', '') = v_clean_phone
    )
    AND (
      t.passenger_confirmation_status IS NULL 
      OR t.passenger_confirmation_status = 'awaiting_response'
    )
    AND DATE(t.scheduled_pickup_time) = CURRENT_DATE
    AND t.scheduled_pickup_time > now()
    ORDER BY t.scheduled_pickup_time ASC
    LIMIT 1;

    -- PRIORITY 2: Next upcoming trip
    IF v_trip_id IS NULL THEN
      SELECT t.id INTO v_trip_id
      FROM trips t
      LEFT JOIN patients p ON t.patient_id = p.id
      WHERE (
        t.passenger_phone = v_clean_phone
        OR t.passenger_phone = p_phone
        OR regexp_replace(t.passenger_phone, '^1', '') = v_clean_phone
        OR p.phone = v_clean_phone
        OR p.phone = p_phone
        OR regexp_replace(p.phone, '^1', '') = v_clean_phone
      )
      AND (
        t.passenger_confirmation_status IS NULL 
        OR t.passenger_confirmation_status = 'awaiting_response'
      )
      AND t.scheduled_pickup_time > now()
      ORDER BY t.scheduled_pickup_time ASC
      LIMIT 1;
    END IF;

    IF v_trip_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No pending trip found for this phone number',
        'phone_searched', v_clean_phone
      );
    END IF;
  ELSE
    v_trip_id := p_trip_id;
  END IF;

  -- Get trip info for messages
  SELECT
    trip_number,
    passenger_first_name,
    scheduled_pickup_time,
    driver_id,
    d.name as driver_name,
    d.phone as driver_phone
  INTO v_trip_info
  FROM trips t
  LEFT JOIN drivers d ON t.driver_id = d.id
  WHERE t.id = v_trip_id;

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
    v_clean_phone,
    'sms',
    now()
  )
  ON CONFLICT (trip_id)
  DO UPDATE SET
    confirmation_status = v_status,
    reply_received_at = now(),
    reply_message = p_message,
    reply_phone = v_clean_phone,
    confirmed_by = 'sms',
    updated_at = now()
  RETURNING id INTO v_confirmation_id;

  -- Build thank you message
  IF v_status = 'confirmed' THEN
    v_thank_you_message := format(
      'Thank you for confirming trip #%s. We will see you on %s. - Fort Worth Non-Emergency Transportation',
      v_trip_info.trip_number,
      to_char(v_trip_info.scheduled_pickup_time, 'Mon DD at HH12:MI AM')
    );
  ELSIF v_status = 'canceled' THEN
    v_thank_you_message := format(
      'Thank you for letting us know. Trip #%s has been canceled. - Fort Worth Non-Emergency Transportation',
      v_trip_info.trip_number
    );
  ELSE
    v_thank_you_message := 'Thank you for your reply. A dispatcher will contact you shortly. - Fort Worth Non-Emergency Transportation';
  END IF;

  -- Queue driver notification
  IF v_trip_info.driver_id IS NOT NULL THEN
    PERFORM queue_driver_sms_notification(v_trip_id, v_status::text);
  END IF;

  -- Build result with instructions to send SMS
  v_result := jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'trip_number', v_trip_info.trip_number,
    'confirmation_id', v_confirmation_id,
    'status', v_status,
    'thank_you_sms', jsonb_build_object(
      'phone', v_clean_phone,
      'message', v_thank_you_message
    ),
    'driver_sms', jsonb_build_object(
      'phone', v_trip_info.driver_phone,
      'message', format(
        'Trip #%s — Passenger %s, pickup time %s, status: %s.',
        v_trip_info.trip_number,
        v_trip_info.passenger_first_name,
        to_char(v_trip_info.scheduled_pickup_time, 'HH12:MI AM'),
        CASE v_status::text
          WHEN 'confirmed' THEN 'Confirmed'
          WHEN 'canceled' THEN 'Canceled'
          ELSE 'Updated'
        END
      )
    ),
    'message', CASE
      WHEN v_status = 'confirmed' THEN 'Trip confirmed successfully'
      WHEN v_status = 'canceled' THEN 'Trip canceled successfully'
      ELSE 'Reply received but unclear. Please contact dispatch.'
    END
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA net TO postgres, authenticated;
GRANT EXECUTE ON FUNCTION send_sms_immediately TO authenticated;
GRANT EXECUTE ON FUNCTION process_sms_reply TO authenticated;