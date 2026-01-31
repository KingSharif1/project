/*
  # Separate Trip Cancellation from SMS Opt-Out

  1. Purpose
    - Ensure "CANCEL" responses cancel the TRIP, not the SMS subscription
    - Handle Twilio's automatic opt-out keywords separately (STOP, UNSUBSCRIBE, QUIT)
    - Make confirmation messages crystal clear about what "cancel" means

  2. Changes
    - Update process_sms_reply() to distinguish between trip cancellation and SMS opt-out
    - Log opt-out keywords separately
    - Add helpful messages explaining the difference

  3. Important
    - Twilio automatically handles STOP/UNSUBSCRIBE/QUIT before our webhook sees them
    - But we need to be prepared for edge cases and provide clear messaging
*/

-- Update the process_sms_reply function with clearer distinction
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
  v_is_optout_keyword boolean := false;
BEGIN
  -- Clean the message
  v_message_lower := lower(trim(p_message));
  
  -- Clean the phone number
  v_clean_phone := regexp_replace(p_phone, '^1', '');

  -- Check if this is a Twilio opt-out keyword (STOP, UNSUBSCRIBE, QUIT, etc.)
  -- These should NOT cancel trips - they opt out of SMS
  IF v_message_lower IN ('stop', 'stopall', 'unsubscribe', 'cancel all', 'end', 'quit') THEN
    v_is_optout_keyword := true;
    
    -- Mark phone as unsubscribed
    INSERT INTO sms_unsubscribed (
      phone_number,
      is_unsubscribed,
      unsubscribed_at,
      notes
    )
    VALUES (
      CASE 
        WHEN v_clean_phone LIKE '+%' THEN v_clean_phone
        WHEN length(v_clean_phone) = 10 THEN '+1' || v_clean_phone
        ELSE '+' || v_clean_phone
      END,
      true,
      now(),
      'User replied with opt-out keyword: ' || p_message
    )
    ON CONFLICT (phone_number) 
    DO UPDATE SET 
      is_unsubscribed = true,
      unsubscribed_at = now(),
      notes = 'User replied with opt-out keyword: ' || p_message;
    
    -- Return message explaining what happened
    RETURN jsonb_build_object(
      'success', true,
      'action', 'optout',
      'message', 'Phone number has been unsubscribed from SMS. No trips were canceled. To resubscribe, text START.',
      'phone', v_clean_phone,
      'thank_you_sms', jsonb_build_object(
        'phone', v_clean_phone,
        'message', 'You have been unsubscribed from SMS notifications. Your scheduled trips are still active. To receive SMS again, reply START. To cancel a trip, please call us.'
      )
    );
  END IF;

  -- Determine status from message (TRIP CONFIRMATION/CANCELLATION ONLY)
  IF v_message_lower IN ('yes', 'y', 'confirm', 'confirmed', 'ok', '1', 'accept') THEN
    v_status := 'confirmed';
  ELSIF v_message_lower IN ('no', 'n', 'cancel', 'cancelled', 'canceled', '0', 'decline') THEN
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

  -- Build thank you message with CLEAR explanation
  IF v_status = 'confirmed' THEN
    v_thank_you_message := format(
      'Thank you for confirming trip #%s. We will see you on %s. (Reply STOP to unsubscribe from SMS) - Fort Worth Transportation',
      v_trip_info.trip_number,
      to_char(v_trip_info.scheduled_pickup_time, 'Mon DD at HH12:MI AM')
    );
  ELSIF v_status = 'canceled' THEN
    v_thank_you_message := format(
      'Trip #%s has been CANCELED as requested. You will still receive SMS for future trips. (Reply STOP to unsubscribe from all SMS) - Fort Worth Transportation',
      v_trip_info.trip_number
    );
  ELSE
    v_thank_you_message := 'Thank you for your reply. A dispatcher will contact you shortly. Reply YES to confirm or CANCEL to cancel the trip. - Fort Worth Transportation';
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
    'action', CASE 
      WHEN v_status = 'confirmed' THEN 'trip_confirmed'
      WHEN v_status = 'canceled' THEN 'trip_canceled'
      ELSE 'unclear_response'
    END,
    'thank_you_sms', jsonb_build_object(
      'phone', v_clean_phone,
      'message', v_thank_you_message
    ),
    'driver_sms', jsonb_build_object(
      'phone', v_trip_info.driver_phone,
      'message', format(
        'Trip #%s — Passenger %s, pickup %s: %s',
        v_trip_info.trip_number,
        v_trip_info.passenger_first_name,
        to_char(v_trip_info.scheduled_pickup_time, 'HH12:MI AM'),
        CASE v_status::text
          WHEN 'confirmed' THEN '✓ CONFIRMED by passenger'
          WHEN 'canceled' THEN '✗ CANCELED by passenger'
          ELSE 'Status unclear - contact needed'
        END
      )
    ),
    'message', CASE
      WHEN v_status = 'confirmed' THEN 'Trip confirmed successfully'
      WHEN v_status = 'canceled' THEN 'Trip canceled successfully (SMS subscription still active)'
      ELSE 'Reply received but unclear. Please contact dispatch.'
    END
  );

  RETURN v_result;
END;
$$;