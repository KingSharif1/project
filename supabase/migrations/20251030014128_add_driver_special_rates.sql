/*
  # Add Cancellation and No-Show Rates to Drivers Table

  1. Changes
    - Add `cancellation_rate` column to drivers table for driver payout on cancelled trips
    - Add `no_show_rate` column to drivers table for driver payout on no-show trips
    - Both columns are numeric and nullable (default $0)
    
  2. Purpose
    - Allow custom driver payout rates for cancelled trips
    - Allow custom driver payout rates for no-show trips
    - These rates will calculate dynamically when rates change
*/

-- Add cancellation_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'cancellation_rate'
  ) THEN
    ALTER TABLE drivers ADD COLUMN cancellation_rate NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add no_show_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'no_show_rate'
  ) THEN
    ALTER TABLE drivers ADD COLUMN no_show_rate NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;