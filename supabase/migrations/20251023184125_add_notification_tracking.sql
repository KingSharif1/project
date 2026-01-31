/*
  # Add Notification Tracking System

  1. New Tables
    - `notifications` - Track all sent notifications
    - `notification_preferences` - User/patient notification settings
    - `feedback_surveys` - Post-trip feedback
    - `trip_templates` - Recurring trip templates
    
  2. Changes
    - Add notification tracking for compliance
    - Enable patient feedback collection
    - Support recurring trip scheduling
    
  3. Security
    - Enable RLS on all new tables
    - Facility-based access control
*/

-- Notifications log table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('patient', 'driver', 'facility', 'dispatcher')),
  recipient_id UUID,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email', 'both', 'push')),
  template_name TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  patient_id UUID,
  enable_sms BOOLEAN DEFAULT true,
  enable_email BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT true,
  reminder_24h BOOLEAN DEFAULT true,
  reminder_2h BOOLEAN DEFAULT true,
  reminder_30min BOOLEAN DEFAULT false,
  driver_assigned_alert BOOLEAN DEFAULT true,
  driver_arriving_alert BOOLEAN DEFAULT true,
  trip_completed_alert BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'en',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback surveys
CREATE TABLE IF NOT EXISTS feedback_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  patient_id UUID,
  patient_name TEXT,
  driver_id UUID REFERENCES drivers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  vehicle_rating INTEGER CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  comfort_rating INTEGER CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
  comments TEXT,
  would_recommend BOOLEAN,
  issues_reported TEXT[],
  survey_sent_at TIMESTAMPTZ DEFAULT now(),
  survey_completed_at TIMESTAMPTZ,
  response_time_minutes INTEGER,
  facility_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip templates for recurring trips
CREATE TABLE IF NOT EXISTS trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  patient_id UUID,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  pickup_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  pickup_state TEXT NOT NULL,
  pickup_zip TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_city TEXT NOT NULL,
  dropoff_state TEXT NOT NULL,
  dropoff_zip TEXT NOT NULL,
  trip_type TEXT NOT NULL DEFAULT 'ambulatory',
  service_level TEXT NOT NULL DEFAULT 'ambulatory',
  facility_id UUID,
  preferred_driver_id UUID REFERENCES drivers(id),
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'weekdays', 'custom')),
  recurrence_days INTEGER[], -- Day of week: 0=Sunday, 1=Monday, etc.
  preferred_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  notes TEXT,
  special_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated trips from templates
CREATE TABLE IF NOT EXISTS template_generated_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES trip_templates(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  generation_date TIMESTAMPTZ DEFAULT now(),
  scheduled_for DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generated_trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view notifications for their facility"
  ON notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN auth.users u ON u.id = auth.uid()
      WHERE t.id = notifications.trip_id
      AND (
        u.raw_user_meta_data->>'role' = 'admin'
        OR t.facility_id = (u.raw_user_meta_data->>'clinicId')::UUID
      )
    )
  );

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update notification status"
  ON notifications FOR UPDATE TO authenticated
  USING (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for feedback_surveys
CREATE POLICY "Admins can view all feedback"
  ON feedback_surveys FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Dispatchers can view facility feedback"
  ON feedback_surveys FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND feedback_surveys.facility_id = (auth.users.raw_user_meta_data->>'clinicId')::UUID
    )
  );

CREATE POLICY "Anyone can insert feedback"
  ON feedback_surveys FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS Policies for trip_templates
CREATE POLICY "Admins can view all templates"
  ON trip_templates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Dispatchers can view facility templates"
  ON trip_templates FOR SELECT TO authenticated
  USING (
    facility_id = (
      SELECT (raw_user_meta_data->>'clinicId')::UUID 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Dispatchers can manage facility templates"
  ON trip_templates FOR ALL TO authenticated
  USING (
    facility_id = (
      SELECT (raw_user_meta_data->>'clinicId')::UUID 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id = (
      SELECT (raw_user_meta_data->>'clinicId')::UUID 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for template_generated_trips
CREATE POLICY "Users can view generated trips"
  ON template_generated_trips FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert generated trips"
  ON template_generated_trips FOR INSERT TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id ON notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type ON notifications(recipient_type);

CREATE INDEX IF NOT EXISTS idx_feedback_surveys_trip_id ON feedback_surveys(trip_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_driver_id ON feedback_surveys(driver_id);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_rating ON feedback_surveys(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_surveys_facility_id ON feedback_surveys(facility_id);

CREATE INDEX IF NOT EXISTS idx_trip_templates_patient_id ON trip_templates(patient_id);
CREATE INDEX IF NOT EXISTS idx_trip_templates_facility_id ON trip_templates(facility_id);
CREATE INDEX IF NOT EXISTS idx_trip_templates_is_active ON trip_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_trip_templates_recurrence_pattern ON trip_templates(recurrence_pattern);

CREATE INDEX IF NOT EXISTS idx_template_generated_trips_template_id ON template_generated_trips(template_id);
CREATE INDEX IF NOT EXISTS idx_template_generated_trips_trip_id ON template_generated_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_template_generated_trips_scheduled_for ON template_generated_trips(scheduled_for);

-- Add comments
COMMENT ON TABLE notifications IS 'Track all notifications sent to patients, drivers, and staff';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE feedback_surveys IS 'Post-trip feedback and satisfaction surveys';
COMMENT ON TABLE trip_templates IS 'Templates for recurring trips (dialysis, therapy, etc)';
COMMENT ON TABLE template_generated_trips IS 'Links between templates and generated trips';
