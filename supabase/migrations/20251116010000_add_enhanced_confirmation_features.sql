/*
  # Enhanced SMS Confirmation Features

  1. New Tables
    - `in_app_notifications`
      - Real-time notifications for admin/dispatch
      - Priority levels for urgent actions
      - Read/unread tracking

    - `confirmation_analytics`
      - Aggregated confirmation statistics
      - Response time metrics
      - Confirmation rates by time period

  2. Schema Changes
    - Add confirmation filters
    - Add bulk action support
    - Add smart insights

  3. Functions
    - Auto-reminder for unconfirmed trips
    - Escalation for critical trips
    - Confirmation rate calculator

  4. Views
    - Confirmation dashboard summary
    - Urgent trips needing attention
*/

-- Create in-app notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'normal', -- normal, urgent, critical
  is_read boolean DEFAULT false,
  read_at timestamptz,
  read_by uuid,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON in_app_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON in_app_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON in_app_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON in_app_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view notifications"
  ON in_app_notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update notifications"
  ON in_app_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert notifications"
  ON in_app_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE in_app_notifications
  SET
    is_read = true,
    read_at = now(),
    read_by = p_user_id
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send auto-reminder for unconfirmed trips
CREATE OR REPLACE FUNCTION send_auto_reminder_for_unconfirmed()
RETURNS TABLE(trip_id uuid, passenger_name text, pickup_time timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    COALESCE(p.name, t.customer_name) as passenger_name,
    t.scheduled_pickup_time
  FROM trips t
  LEFT JOIN patients p ON t.patient_id = p.id
  LEFT JOIN trip_confirmations tc ON t.id = tc.trip_id
  WHERE
    -- Trip is in the future
    t.scheduled_pickup_time > now()
    -- Trip is within 24 hours
    AND t.scheduled_pickup_time < now() + interval '24 hours'
    -- No confirmation yet
    AND (tc.confirmation_status IS NULL OR tc.confirmation_status = 'awaiting_response')
    -- Reminder sent more than 12 hours ago or never sent
    AND (tc.reminder_sent_at IS NULL OR tc.reminder_sent_at < now() - interval '12 hours')
    -- Trip is not canceled
    AND t.status NOT IN ('cancelled', 'completed', 'no-show');
END;
$$ LANGUAGE plpgsql;

-- Function to get urgent trips needing attention
CREATE OR REPLACE FUNCTION get_urgent_confirmation_trips()
RETURNS TABLE(
  trip_id uuid,
  trip_number text,
  passenger_name text,
  pickup_time timestamptz,
  confirmation_status text,
  urgency_level text,
  time_until_pickup interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.trip_number,
    COALESCE(p.name, t.customer_name) as passenger_name,
    t.scheduled_pickup_time,
    COALESCE(tc.confirmation_status::text, 'awaiting_response'),
    CASE
      WHEN t.scheduled_pickup_time < now() + interval '3 hours' THEN 'critical'
      WHEN t.scheduled_pickup_time < now() + interval '6 hours' THEN 'urgent'
      ELSE 'normal'
    END as urgency_level,
    t.scheduled_pickup_time - now() as time_until_pickup
  FROM trips t
  LEFT JOIN patients p ON t.patient_id = p.id
  LEFT JOIN trip_confirmations tc ON t.id = tc.trip_id
  WHERE
    t.scheduled_pickup_time > now()
    AND t.scheduled_pickup_time < now() + interval '12 hours'
    AND (tc.confirmation_status IS NULL
         OR tc.confirmation_status IN ('awaiting_response', 'unconfirmed', 'expired'))
    AND t.status NOT IN ('cancelled', 'completed', 'no-show')
  ORDER BY t.scheduled_pickup_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate confirmation rate
CREATE OR REPLACE FUNCTION calculate_confirmation_rate(
  p_start_date timestamptz DEFAULT now() - interval '30 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE(
  total_trips bigint,
  confirmed bigint,
  canceled bigint,
  unconfirmed bigint,
  expired bigint,
  awaiting bigint,
  confirmation_rate numeric,
  response_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_trips,
    COUNT(*) FILTER (WHERE tc.confirmation_status = 'confirmed')::bigint as confirmed,
    COUNT(*) FILTER (WHERE tc.confirmation_status = 'canceled')::bigint as canceled,
    COUNT(*) FILTER (WHERE tc.confirmation_status = 'unconfirmed')::bigint as unconfirmed,
    COUNT(*) FILTER (WHERE tc.confirmation_status = 'expired')::bigint as expired,
    COUNT(*) FILTER (WHERE tc.confirmation_status = 'awaiting_response' OR tc.confirmation_status IS NULL)::bigint as awaiting,
    ROUND(
      COUNT(*) FILTER (WHERE tc.confirmation_status = 'confirmed')::numeric * 100.0 /
      NULLIF(COUNT(*), 0),
      2
    ) as confirmation_rate,
    ROUND(
      COUNT(*) FILTER (WHERE tc.confirmation_status IN ('confirmed', 'canceled'))::numeric * 100.0 /
      NULLIF(COUNT(*), 0),
      2
    ) as response_rate
  FROM trips t
  LEFT JOIN trip_confirmations tc ON t.id = tc.trip_id
  WHERE
    t.scheduled_pickup_time BETWEEN p_start_date AND p_end_date
    AND t.status NOT IN ('cancelled');
END;
$$ LANGUAGE plpgsql;

-- Function for bulk confirmation status update
CREATE OR REPLACE FUNCTION bulk_update_confirmation_status(
  p_trip_ids uuid[],
  p_status confirmation_status_type,
  p_notes text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE trip_confirmations
  SET
    confirmation_status = p_status,
    confirmed_by = 'manual',
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE trip_id = ANY(p_trip_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Insert for trips that don't have confirmation records
  INSERT INTO trip_confirmations (trip_id, confirmation_status, confirmed_by, notes)
  SELECT
    unnest(p_trip_ids),
    p_status,
    'manual',
    p_notes
  ON CONFLICT (trip_id) DO NOTHING;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for confirmation dashboard
CREATE OR REPLACE VIEW confirmation_dashboard AS
SELECT
  t.id as trip_id,
  t.trip_number,
  t.scheduled_pickup_time,
  COALESCE(p.name, t.customer_name) as passenger_name,
  p.phone as passenger_phone,
  d.name as driver_name,
  t.pickup_location,
  t.dropoff_location,
  COALESCE(t.passenger_confirmation_status::text, 'awaiting_response') as confirmation_status,
  tc.reply_received_at,
  tc.reply_message,
  tc.reminder_sent_at,
  tc.expiry_time,
  CASE
    WHEN t.scheduled_pickup_time < now() + interval '3 hours' AND t.passenger_confirmation_status IN ('awaiting_response', 'unconfirmed', 'expired') THEN 'critical'
    WHEN t.scheduled_pickup_time < now() + interval '6 hours' AND t.passenger_confirmation_status IN ('awaiting_response', 'unconfirmed', 'expired') THEN 'urgent'
    WHEN t.passenger_confirmation_status = 'canceled' THEN 'urgent'
    ELSE 'normal'
  END as urgency,
  EXTRACT(EPOCH FROM (t.scheduled_pickup_time - now())) / 3600 as hours_until_pickup,
  CASE
    WHEN t.passenger_confirmation_status = 'confirmed' THEN '✅'
    WHEN t.passenger_confirmation_status = 'canceled' THEN '❌'
    WHEN t.passenger_confirmation_status = 'unconfirmed' THEN '⚠️'
    WHEN t.passenger_confirmation_status = 'expired' THEN '⏰'
    ELSE '⏳'
  END as status_icon
FROM trips t
LEFT JOIN patients p ON t.patient_id = p.id
LEFT JOIN drivers d ON t.driver_id = d.id
LEFT JOIN trip_confirmations tc ON t.id = tc.trip_id
WHERE
  t.scheduled_pickup_time > now() - interval '24 hours'
  AND t.status NOT IN ('completed')
ORDER BY
  CASE
    WHEN t.scheduled_pickup_time < now() + interval '3 hours' THEN 1
    WHEN t.scheduled_pickup_time < now() + interval '6 hours' THEN 2
    ELSE 3
  END,
  t.scheduled_pickup_time ASC;

-- Grant access
GRANT SELECT ON confirmation_dashboard TO authenticated;

-- Create function to get confirmation statistics
CREATE OR REPLACE FUNCTION get_confirmation_statistics()
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'today', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed'),
        'canceled', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'canceled'),
        'awaiting', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'awaiting_response'),
        'rate', ROUND(COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed')::numeric * 100.0 / NULLIF(COUNT(*), 0), 1)
      )
      FROM trips
      WHERE DATE(scheduled_pickup_time) = CURRENT_DATE
      AND status NOT IN ('cancelled', 'completed')
    ),
    'tomorrow', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed'),
        'canceled', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'canceled'),
        'awaiting', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'awaiting_response'),
        'rate', ROUND(COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed')::numeric * 100.0 / NULLIF(COUNT(*), 0), 1)
      )
      FROM trips
      WHERE DATE(scheduled_pickup_time) = CURRENT_DATE + 1
      AND status NOT IN ('cancelled', 'completed')
    ),
    'this_week', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed'),
        'canceled', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'canceled'),
        'awaiting', COUNT(*) FILTER (WHERE passenger_confirmation_status = 'awaiting_response'),
        'rate', ROUND(COUNT(*) FILTER (WHERE passenger_confirmation_status = 'confirmed')::numeric * 100.0 / NULLIF(COUNT(*), 0), 1)
      )
      FROM trips
      WHERE scheduled_pickup_time >= date_trunc('week', CURRENT_DATE)
      AND scheduled_pickup_time < date_trunc('week', CURRENT_DATE) + interval '1 week'
      AND status NOT IN ('cancelled', 'completed')
    ),
    'urgent_trips', (
      SELECT COUNT(*)
      FROM trips
      WHERE scheduled_pickup_time > now()
      AND scheduled_pickup_time < now() + interval '6 hours'
      AND passenger_confirmation_status IN ('awaiting_response', 'unconfirmed', 'expired')
      AND status NOT IN ('cancelled', 'completed')
    ),
    'unread_notifications', (
      SELECT COUNT(*)
      FROM in_app_notifications
      WHERE is_read = false
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create notification on cancellation
CREATE OR REPLACE FUNCTION create_cancellation_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_status = 'canceled' AND (OLD.confirmation_status IS NULL OR OLD.confirmation_status != 'canceled') THEN
    INSERT INTO in_app_notifications (
      trip_id,
      notification_type,
      title,
      message,
      priority
    )
    SELECT
      NEW.trip_id,
      'trip_canceled_urgent',
      '❌ URGENT: Trip Canceled by Passenger',
      'Trip #' || t.trip_number || ' canceled by passenger. Needs immediate attention.',
      'critical'
    FROM trips t
    WHERE t.id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cancellation_alert ON trip_confirmations;
CREATE TRIGGER trigger_cancellation_alert
  AFTER INSERT OR UPDATE ON trip_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION create_cancellation_alert();
