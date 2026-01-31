/*
  # HIPAA Compliance Tables

  1. New Tables
    - `audit_logs`
      - Comprehensive audit logging for all PHI access and system events
      - Tracks user actions, timestamps, IP addresses, and success/failure
      - Enables forensic analysis and compliance reporting

    - `patient_consents`
      - HIPAA-compliant consent tracking
      - Records patient authorization for data use and disclosure
      - Tracks consent versions and expiration dates

    - `data_breach_log`
      - Security incident tracking
      - Documents potential or actual data breaches
      - Required for HIPAA breach notification

    - `access_permissions`
      - Granular role-based access control
      - Defines what actions each role can perform
      - Supports principle of least privilege

  2. Security
    - Enable RLS on all tables
    - Admin-only access for audit logs and breach records
    - Appropriate policies for consent tracking
    - Immutable audit log entries (no updates/deletes)

  3. Indexes
    - Optimized for common query patterns
    - Fast lookups by user, date, event type
    - Efficient PHI access reporting
*/

-- Audit Logs Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id text NOT NULL,
  user_email text NOT NULL,
  user_role text NOT NULL,
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  details jsonb,
  phi_accessed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Patient Consent Tracking
CREATE TABLE IF NOT EXISTS patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_date timestamptz,
  expiration_date timestamptz,
  scope text NOT NULL,
  purpose text,
  authorized_parties text[],
  consent_form_url text,
  signature_data text,
  revoked boolean DEFAULT false,
  revoked_date timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Data Breach Log
CREATE TABLE IF NOT EXISTS data_breach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_date timestamptz NOT NULL,
  discovered_date timestamptz NOT NULL DEFAULT now(),
  breach_type text NOT NULL,
  severity text NOT NULL,
  affected_records integer,
  affected_patients text[],
  description text NOT NULL,
  root_cause text,
  containment_actions text,
  notification_required boolean DEFAULT false,
  notification_date timestamptz,
  reported_to_authorities boolean DEFAULT false,
  reported_date timestamptz,
  resolution_status text DEFAULT 'open',
  resolution_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Access Permissions (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS access_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  conditions jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_phi_accessed ON audit_logs(phi_accessed) WHERE phi_accessed = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_patient_consents_active ON patient_consents(granted, revoked, expiration_date);

CREATE INDEX IF NOT EXISTS idx_breach_log_date ON data_breach_log(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_breach_log_severity ON data_breach_log(severity);
CREATE INDEX IF NOT EXISTS idx_breach_log_status ON data_breach_log(resolution_status);

CREATE INDEX IF NOT EXISTS idx_access_permissions_role ON access_permissions(role);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert audit logs (no user restriction)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NO UPDATE OR DELETE policies (immutable audit trail)

-- RLS Policies for patient_consents
CREATE POLICY "Authorized users can view consents"
  ON patient_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'dispatcher', 'clinic_admin')
    )
  );

CREATE POLICY "Authorized users can create consents"
  ON patient_consents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'dispatcher', 'clinic_admin')
    )
  );

CREATE POLICY "Authorized users can update consents"
  ON patient_consents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'dispatcher', 'clinic_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'dispatcher', 'clinic_admin')
    )
  );

-- RLS Policies for data_breach_log
CREATE POLICY "Admins can view breach logs"
  ON data_breach_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can create breach logs"
  ON data_breach_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update breach logs"
  ON data_breach_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for access_permissions
CREATE POLICY "Admins can manage permissions"
  ON access_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default access permissions
INSERT INTO access_permissions (role, resource, action, allowed) VALUES
  -- Admin permissions (full access)
  ('admin', 'patient', 'view', true),
  ('admin', 'patient', 'create', true),
  ('admin', 'patient', 'update', true),
  ('admin', 'patient', 'delete', true),
  ('admin', 'trip', 'view', true),
  ('admin', 'trip', 'create', true),
  ('admin', 'trip', 'update', true),
  ('admin', 'trip', 'cancel', true),
  ('admin', 'report', 'view', true),
  ('admin', 'report', 'export', true),
  ('admin', 'user', 'manage', true),
  ('admin', 'audit', 'view', true),

  -- Dispatcher permissions
  ('dispatcher', 'patient', 'view', true),
  ('dispatcher', 'patient', 'create', true),
  ('dispatcher', 'patient', 'update', true),
  ('dispatcher', 'trip', 'view', true),
  ('dispatcher', 'trip', 'create', true),
  ('dispatcher', 'trip', 'update', true),
  ('dispatcher', 'trip', 'cancel', true),
  ('dispatcher', 'report', 'view', true),

  -- Driver permissions
  ('driver', 'trip', 'view', true),
  ('driver', 'trip', 'update', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_patient_consents_updated_at
  BEFORE UPDATE ON patient_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breach_log_updated_at
  BEFORE UPDATE ON data_breach_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_permissions_updated_at
  BEFORE UPDATE ON access_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
