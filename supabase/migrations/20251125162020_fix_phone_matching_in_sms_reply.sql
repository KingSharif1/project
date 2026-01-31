/*
  # Fix Phone Number Matching in SMS Reply Processing

  1. Problem
    - SMS replies come with country code: 16822218746
    - Database stores without country code: 6822218746
    - process_sms_reply() can't find matching trips

  2. Solution
    - Update process_sms_reply() to strip country code prefix
    - Match phone numbers with or without +1/1 prefix
    - Support multiple phone formats

  3. Changes
    - Recreate process_sms_reply() function with better phone matching
    - Strip leading 1 from phone numbers for comparison
    - Match against both passenger_phone and patient phone
*/

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
BEGIN
  -- Clean the message
  v_message_lower := lower(trim(p_message));
  
  -- Clean the phone number - remove leading 1 if present (US country code)
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
    SELECT t.id INTO v_trip_id
    FROM trips t
    LEFT JOIN patients p ON t.patient_id = p.id
    WHERE (
      -- Match passenger_phone with or without country code
      t.passenger_phone = v_clean_phone
      OR t.passenger_phone = p_phone
      OR regexp_replace(t.passenger_phone, '^1', '') = v_clean_phone
      -- Match patient phone with or without country code
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
    v_clean_phone,  -- Store cleaned phone
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
$$;