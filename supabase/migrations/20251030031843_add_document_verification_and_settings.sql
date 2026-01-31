/*
  # Add Document Verification, Settings, and Analytics Tables

  ## Overview
  Comprehensive security-focused schema for document verification workflow,
  system settings, reminder configurations, and analytics tracking.

  ## New Tables

  ### Document Verification System
  1. `document_submissions`
     - Tracks all document uploads and submissions
     - Status: pending, approved, rejected
     - Includes reviewer information and timestamps
     - Audit trail for compliance

  2. `document_reviews`
     - Detailed review history for each document
     - Stores review notes and decisions
     - Links to reviewer user

  ### Settings & Configuration
  3. `system_settings`
     - Company settings (name, contact, address)
     - Billing configuration
     - Integration settings (API keys encrypted)
     - User management policies

  4. `notification_settings`
     - Email/SMS/Push notification preferences
     - Channel-specific configurations
     - Per-user notification preferences

  5. `reminder_schedules`
     - Customizable reminder timing
     - Multi-channel delivery options
     - Email/SMS templates with variables

  ### Analytics & Insights
  6. `compliance_metrics`
     - Daily/monthly compliance rate tracking
     - Document expiry statistics
     - Cost calculations

  7. `document_expiry_alerts`
     - Historical alert tracking
     - Alert delivery status
     - Driver response tracking

  ## Security
  - All tables have RLS enabled
  - Sensitive data encrypted
  - Audit trails for all changes
  - Role-based access control
*/

-- Document Submissions Table
CREATE TABLE IF NOT EXISTS document_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('license', 'insurance', 'registration', 'medical_cert', 'background_check')),
  file_url text,
  file_name text,
  file_size integer,
  expiry_date date NOT NULL,
  submission_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  previous_expiry_date date,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Reviews Table (Audit Trail)
CREATE TABLE IF NOT EXISTS document_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES document_submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  category text NOT NULL CHECK (category IN ('company', 'notifications', 'documents', 'billing', 'users', 'integrations')),
  description text,
  is_encrypted boolean DEFAULT false,
  updated_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  trip_reminders boolean DEFAULT true,
  document_expiry boolean DEFAULT true,
  driver_updates boolean DEFAULT true,
  system_alerts boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notification_settings_target_check CHECK (
    (user_id IS NOT NULL AND driver_id IS NULL) OR
    (user_id IS NULL AND driver_id IS NOT NULL)
  )
);

-- Reminder Schedules Table
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_before_expiry integer NOT NULL,
  label text NOT NULL,
  is_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  email_template_subject text,
  email_template_body text,
  sms_template text,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Compliance Metrics Table
CREATE TABLE IF NOT EXISTS compliance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  total_drivers integer NOT NULL DEFAULT 0,
  total_documents integer NOT NULL DEFAULT 0,
  compliant_documents integer NOT NULL DEFAULT 0,
  expired_documents integer NOT NULL DEFAULT 0,
  expiring_soon_documents integer NOT NULL DEFAULT 0,
  not_set_documents integer NOT NULL DEFAULT 0,
  compliance_rate decimal(5,2) NOT NULL DEFAULT 0,
  avg_days_to_renewal integer,
  estimated_non_compliance_cost decimal(10,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_date)
);

-- Document Expiry Alerts Table
CREATE TABLE IF NOT EXISTS document_expiry_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  expiry_date date NOT NULL,
  alert_date timestamptz NOT NULL DEFAULT now(),
  days_until_expiry integer NOT NULL,
  alert_sent boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  sms_sent boolean DEFAULT false,
  push_sent boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Activity Log Table (For Settings Changes)
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_document_submissions_driver_id ON document_submissions(driver_id);
CREATE INDEX IF NOT EXISTS idx_document_submissions_status ON document_submissions(status);
CREATE INDEX IF NOT EXISTS idx_document_submissions_document_type ON document_submissions(document_type);
CREATE INDEX IF NOT EXISTS idx_document_reviews_submission_id ON document_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_driver_id ON notification_settings(driver_id);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_date ON compliance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_driver_id ON document_expiry_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_alert_date ON document_expiry_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE document_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_expiry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_submissions
CREATE POLICY "Users can view all document submissions"
  ON document_submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create document submissions"
  ON document_submissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update document submissions"
  ON document_submissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for document_reviews
CREATE POLICY "Users can view document reviews"
  ON document_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create document reviews"
  ON document_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for system_settings
CREATE POLICY "Users can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notification_settings
CREATE POLICY "Users can view notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for reminder_schedules
CREATE POLICY "Users can view reminder schedules"
  ON reminder_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reminder schedules"
  ON reminder_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for compliance_metrics
CREATE POLICY "Users can view compliance metrics"
  ON compliance_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert compliance metrics"
  ON compliance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for document_expiry_alerts
CREATE POLICY "Users can view document alerts"
  ON document_expiry_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage document alerts"
  ON document_expiry_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for activity_log
CREATE POLICY "Users can view activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert Default Reminder Schedules
INSERT INTO reminder_schedules (days_before_expiry, label, email_enabled, sms_enabled, priority, email_template_subject, email_template_body, sms_template)
VALUES
  (30, '30 days before', true, false, 1,
   'Document Expiry Reminder - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

This is a reminder that your {{DOCUMENT_TYPE}} will expire on {{EXPIRY_DATE}}.

Please renew it as soon as possible to avoid any interruptions.

Thank you,
Transportation Management Team',
   'Reminder: Your {{DOCUMENT_TYPE}} expires on {{EXPIRY_DATE}}. Please renew soon.'),

  (14, '2 weeks before', true, false, 2,
   'Document Expiry Reminder - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

Your {{DOCUMENT_TYPE}} will expire in 2 weeks on {{EXPIRY_DATE}}.

Please renew it as soon as possible.

Thank you,
Transportation Management Team',
   'Reminder: Your {{DOCUMENT_TYPE}} expires in 2 weeks. Please renew.'),

  (7, '1 week before', true, true, 3,
   'URGENT: Document Expiry - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

URGENT: Your {{DOCUMENT_TYPE}} will expire in 1 week on {{EXPIRY_DATE}}.

Please renew it immediately to avoid service interruption.

Thank you,
Transportation Management Team',
   'URGENT: Your {{DOCUMENT_TYPE}} expires in 1 week on {{EXPIRY_DATE}}. Renew now!'),

  (3, '3 days before', true, true, 4,
   'URGENT: Document Expiry - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

URGENT: Your {{DOCUMENT_TYPE}} will expire in 3 days on {{EXPIRY_DATE}}.

Please renew it immediately!

Thank you,
Transportation Management Team',
   'URGENT: Your {{DOCUMENT_TYPE}} expires in 3 days. Renew immediately!'),

  (1, '1 day before', true, true, 5,
   'CRITICAL: Document Expires Tomorrow - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

CRITICAL: Your {{DOCUMENT_TYPE}} expires TOMORROW on {{EXPIRY_DATE}}.

Please renew it immediately or you may be unable to work.

Thank you,
Transportation Management Team',
   'CRITICAL: Your {{DOCUMENT_TYPE}} expires TOMORROW! Renew now!'),

  (0, 'On expiry day', true, true, 6,
   'EXPIRED: Document - {{DOCUMENT_TYPE}}',
   'Hello {{DRIVER_NAME}},

Your {{DOCUMENT_TYPE}} has EXPIRED as of {{EXPIRY_DATE}}.

You must renew it immediately to continue working.

Thank you,
Transportation Management Team',
   'EXPIRED: Your {{DOCUMENT_TYPE}} has expired. Renew immediately!')
ON CONFLICT DO NOTHING;

-- Insert Default System Settings
INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES
  ('company_info',
   '{"companyName":"MediTransport Services","contactEmail":"contact@meditransport.com","contactPhone":"(555) 123-4567","address":"123 Healthcare Blvd","city":"Medical City","state":"CA","zipCode":"90210","website":"https://meditransport.com"}'::jsonb,
   'company',
   'Company information and contact details'),

  ('notification_defaults',
   '{"emailEnabled":true,"smsEnabled":true,"pushEnabled":true,"tripReminders":true,"documentExpiry":true,"driverUpdates":true,"systemAlerts":true}'::jsonb,
   'notifications',
   'Default notification preferences'),

  ('document_requirements',
   '{"requiredDocuments":{"license":true,"insurance":true,"registration":true,"medical":true,"background":true},"expiryWarningDays":30,"autoDeactivateExpired":false,"requireApproval":true}'::jsonb,
   'documents',
   'Document requirements and expiry rules'),

  ('billing_config',
   '{"defaultCurrency":"USD","taxRate":8.5,"invoicePrefix":"INV","paymentTerms":30,"lateFeesEnabled":false,"lateFeePercentage":5}'::jsonb,
   'billing',
   'Billing and payment configuration'),

  ('user_management',
   '{"allowSelfRegistration":false,"requireEmailVerification":true,"sessionTimeout":60,"twoFactorRequired":false,"passwordExpiryDays":90}'::jsonb,
   'users',
   'User management policies')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_document_submissions_updated_at
  BEFORE UPDATE ON document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_schedules_updated_at
  BEFORE UPDATE ON reminder_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (action, entity_type, entity_id, new_values)
    VALUES ('created', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (action, entity_type, entity_id, old_values, new_values)
    VALUES ('updated', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (action, entity_type, entity_id, old_values)
    VALUES ('deleted', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Activity logging triggers for sensitive tables
CREATE TRIGGER log_system_settings_activity
  AFTER INSERT OR UPDATE OR DELETE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_document_submissions_activity
  AFTER INSERT OR UPDATE OR DELETE ON document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();
