/*
  # Patient Consent Tracking System

  1. New Tables
    - `patient_consents`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `consent_type` (text) - Type of consent (hipaa, treatment, transport, photo, data_sharing)
      - `consent_status` (text) - Status (granted, denied, revoked)
      - `consent_date` (timestamptz) - When consent was given/denied
      - `expiry_date` (timestamptz, nullable) - When consent expires
      - `signature` (text, nullable) - Base64 signature image
      - `witness_name` (text, nullable)
      - `witness_signature` (text, nullable)
      - `notes` (text, nullable)
      - `revoked_date` (timestamptz, nullable)
      - `revoked_reason` (text, nullable)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `patient_consents` table
    - Add policies for authenticated users to manage consents
    - Restrict access based on user role
*/

-- Create patient consents table
CREATE TABLE IF NOT EXISTS patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('hipaa', 'treatment', 'transport', 'photo', 'data_sharing', 'emergency_contact', 'billing')),
  consent_status text NOT NULL DEFAULT 'granted' CHECK (consent_status IN ('granted', 'denied', 'revoked', 'expired')),
  consent_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz,
  signature text,
  witness_name text,
  witness_signature text,
  notes text,
  revoked_date timestamptz,
  revoked_reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_consent_type ON patient_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_patient_consents_status ON patient_consents(consent_status);
CREATE INDEX IF NOT EXISTS idx_patient_consents_expiry ON patient_consents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view patient consents
CREATE POLICY "Authenticated users can view patient consents"
  ON patient_consents
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create patient consents
CREATE POLICY "Authenticated users can create patient consents"
  ON patient_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update patient consents
CREATE POLICY "Authenticated users can update patient consents"
  ON patient_consents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only admins can delete patient consents
CREATE POLICY "Only admins can delete patient consents"
  ON patient_consents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to automatically check and mark expired consents
CREATE OR REPLACE FUNCTION check_expired_consents()
RETURNS void AS $$
BEGIN
  UPDATE patient_consents
  SET consent_status = 'expired',
      updated_at = now()
  WHERE expiry_date IS NOT NULL
    AND expiry_date < now()
    AND consent_status = 'granted';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_consents_updated_at
  BEFORE UPDATE ON patient_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_consents_updated_at();
