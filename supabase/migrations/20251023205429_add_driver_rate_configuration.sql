/*
  # Add Driver Rate Configuration Fields

  1. Changes to drivers table
    - Add `ambulatory_base_miles` (DECIMAL) - Base miles included in ambulatory rate (e.g., 0-5 miles)
    - Add `ambulatory_additional_mile_rate` (DECIMAL) - Rate per mile after base miles for ambulatory
    - Add `wheelchair_base_miles` (DECIMAL) - Base miles included in wheelchair rate
    - Add `wheelchair_additional_mile_rate` (DECIMAL) - Rate per mile after base miles for wheelchair
    - Add `stretcher_base_miles` (DECIMAL) - Base miles included in stretcher rate
    - Add `stretcher_additional_mile_rate` (DECIMAL) - Rate per mile after base miles for stretcher

  2. Purpose
    - Allows configuring tiered pricing for each service level
    - Example: $14 for 0-5 miles (base), then $1.20 per additional mile
    - Enables accurate trip cost calculations based on driver rates

  3. Notes
    - All fields are nullable to support existing records
    - Default values can be set per driver
    - Used for automatic trip fare calculation
*/

-- Add rate configuration columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'ambulatory_base_miles'
  ) THEN
    ALTER TABLE drivers ADD COLUMN ambulatory_base_miles DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'ambulatory_additional_mile_rate'
  ) THEN
    ALTER TABLE drivers ADD COLUMN ambulatory_additional_mile_rate DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'wheelchair_base_miles'
  ) THEN
    ALTER TABLE drivers ADD COLUMN wheelchair_base_miles DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'wheelchair_additional_mile_rate'
  ) THEN
    ALTER TABLE drivers ADD COLUMN wheelchair_additional_mile_rate DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'stretcher_base_miles'
  ) THEN
    ALTER TABLE drivers ADD COLUMN stretcher_base_miles DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'stretcher_additional_mile_rate'
  ) THEN
    ALTER TABLE drivers ADD COLUMN stretcher_additional_mile_rate DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN drivers.ambulatory_base_miles IS 'Base miles included in ambulatory base rate (e.g., 0-5 miles at $14)';
COMMENT ON COLUMN drivers.ambulatory_additional_mile_rate IS 'Rate per mile after base miles for ambulatory trips';
COMMENT ON COLUMN drivers.wheelchair_base_miles IS 'Base miles included in wheelchair base rate';
COMMENT ON COLUMN drivers.wheelchair_additional_mile_rate IS 'Rate per mile after base miles for wheelchair trips';
COMMENT ON COLUMN drivers.stretcher_base_miles IS 'Base miles included in stretcher base rate';
COMMENT ON COLUMN drivers.stretcher_additional_mile_rate IS 'Rate per mile after base miles for stretcher trips';
