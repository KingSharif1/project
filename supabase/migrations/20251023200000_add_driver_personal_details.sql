/*
  # Add Driver Personal Details and Authentication Fields

  1. Changes to drivers table
    - Add `first_name` (TEXT) - Driver's first name (separate from full name)
    - Add `last_name` (TEXT) - Driver's last name (separate from full name)
    - Add `date_of_birth` (DATE) - Driver's date of birth
    - Add `temporary_password` (TEXT) - Temporary password for initial app login
    - Keep existing `name` field for backward compatibility

  2. Indexes
    - Add index on first_name and last_name for faster searches

  3. Notes
    - The `temporary_password` field should be hashed in production
    - After first login, password should be stored in auth.users table
    - Date of birth is stored for age verification and compliance
*/

-- Add new columns to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE drivers ADD COLUMN first_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE drivers ADD COLUMN last_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE drivers ADD COLUMN date_of_birth DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'temporary_password'
  ) THEN
    ALTER TABLE drivers ADD COLUMN temporary_password TEXT;
  END IF;
END $$;

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_drivers_first_name ON drivers(first_name);
CREATE INDEX IF NOT EXISTS idx_drivers_last_name ON drivers(last_name);
CREATE INDEX IF NOT EXISTS idx_drivers_date_of_birth ON drivers(date_of_birth);

-- Add comments for documentation
COMMENT ON COLUMN drivers.first_name IS 'Driver first name (separate field for clarity)';
COMMENT ON COLUMN drivers.last_name IS 'Driver last name (separate field for clarity)';
COMMENT ON COLUMN drivers.date_of_birth IS 'Driver date of birth for age verification and compliance';
COMMENT ON COLUMN drivers.temporary_password IS 'Temporary password for initial app login (should be changed on first login)';
