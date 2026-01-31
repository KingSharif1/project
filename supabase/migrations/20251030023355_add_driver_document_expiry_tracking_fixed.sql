/*
  # Add Driver Document Expiry Tracking

  1. Changes to drivers table
    - Add document expiry date columns
    - Add document notification tracking
    
  2. Purpose
    - Track when driver documents expire
    - Enable automated alerts for expiring documents
    - Track when notifications were sent
*/

-- Add document expiry columns to drivers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'license_expiry_date') THEN
    ALTER TABLE drivers ADD COLUMN license_expiry_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'insurance_expiry_date') THEN
    ALTER TABLE drivers ADD COLUMN insurance_expiry_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'registration_expiry_date') THEN
    ALTER TABLE drivers ADD COLUMN registration_expiry_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'medical_cert_expiry_date') THEN
    ALTER TABLE drivers ADD COLUMN medical_cert_expiry_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'background_check_expiry_date') THEN
    ALTER TABLE drivers ADD COLUMN background_check_expiry_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'license_expiry_notified_at') THEN
    ALTER TABLE drivers ADD COLUMN license_expiry_notified_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'insurance_expiry_notified_at') THEN
    ALTER TABLE drivers ADD COLUMN insurance_expiry_notified_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'registration_expiry_notified_at') THEN
    ALTER TABLE drivers ADD COLUMN registration_expiry_notified_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'medical_cert_expiry_notified_at') THEN
    ALTER TABLE drivers ADD COLUMN medical_cert_expiry_notified_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'background_check_expiry_notified_at') THEN
    ALTER TABLE drivers ADD COLUMN background_check_expiry_notified_at timestamptz;
  END IF;
END $$;

-- Create indexes for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_drivers_license_expiry ON drivers(license_expiry_date) WHERE license_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_insurance_expiry ON drivers(insurance_expiry_date) WHERE insurance_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_registration_expiry ON drivers(registration_expiry_date) WHERE registration_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_medical_cert_expiry ON drivers(medical_cert_expiry_date) WHERE medical_cert_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_background_check_expiry ON drivers(background_check_expiry_date) WHERE background_check_expiry_date IS NOT NULL;