/*
  # Create Real-Time Notifications System

  1. New Tables
    - `notifications` - Store all notifications for users
    - `notification_preferences` - User notification preferences
    
  2. Purpose
    - Track notifications for trip assignments, status changes, messages
    - Enable real-time updates via Supabase Realtime
    - Allow users to customize notification preferences
    
  3. Security
    - Enable RLS on all tables
    - Users can access their notifications
*/

-- Notifications Table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  trip_id uuid,
  driver_id uuid,
  related_user_id text,
  action_url text,
  is_read boolean DEFAULT false,
  priority text DEFAULT 'normal',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifications_type_check CHECK (type IN ('trip_assigned', 'trip_status_changed', 'trip_cancelled', 'trip_completed', 'message', 'payment', 'alert', 'system')),
  CONSTRAINT notifications_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all notifications"
  ON notifications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete notifications"
  ON notifications FOR DELETE TO authenticated
  USING (true);

-- Notification Preferences Table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  trip_assigned boolean DEFAULT true,
  trip_status_changed boolean DEFAULT true,
  trip_cancelled boolean DEFAULT true,
  trip_completed boolean DEFAULT true,
  new_message boolean DEFAULT true,
  payment_received boolean DEFAULT true,
  system_alerts boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read preferences"
  ON notification_preferences FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert preferences"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update preferences"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_trip_id ON notifications(trip_id);

-- Trigger to set read timestamp
CREATE OR REPLACE FUNCTION set_notification_read_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_read_timestamp
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_timestamp();