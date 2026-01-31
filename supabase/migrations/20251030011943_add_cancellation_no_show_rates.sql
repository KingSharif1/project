/*
  # Add Cancellation and No-Show Rates to Facilities

  1. Changes
    - Add `cancellation_rate` column to facilities table for clinic cancellation charges
    - Add `no_show_rate` column to facilities table for patient no-show charges
    - Both columns are numeric and nullable (optional)
    
  2. Purpose
    - Allow clinics to set custom rates for cancelled trips
    - Allow clinics to set custom rates for no-show trips
    - If not set, system will use regular service level rates
*/

-- Add cancellation_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'cancellation_rate'
  ) THEN
    ALTER TABLE facilities ADD COLUMN cancellation_rate NUMERIC(10,2);
  END IF;
END $$;

-- Add no_show_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'no_show_rate'
  ) THEN
    ALTER TABLE facilities ADD COLUMN no_show_rate NUMERIC(10,2);
  END IF;
END $$;