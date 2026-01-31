/*
  # Add Cancellation and No-Show Rates to Driver Rate Tiers

  1. Changes
    - Add `cancellation_rate` column to driver_rate_tiers table for driver payment on cancelled trips
    - Add `no_show_rate` column to driver_rate_tiers table for driver payment on no-show trips
    - Both columns are numeric and nullable (optional)
    
  2. Purpose
    - Allow custom driver payout rates for cancelled trips
    - Allow custom driver payout rates for no-show trips
    - If not set, drivers get $0 for cancelled/no-show trips
    - Rates will calculate dynamically based on current configuration
*/

-- Add cancellation_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_rate_tiers' AND column_name = 'cancellation_rate'
  ) THEN
    ALTER TABLE driver_rate_tiers ADD COLUMN cancellation_rate NUMERIC(10,2);
  END IF;
END $$;

-- Add no_show_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_rate_tiers' AND column_name = 'no_show_rate'
  ) THEN
    ALTER TABLE driver_rate_tiers ADD COLUMN no_show_rate NUMERIC(10,2);
  END IF;
END $$;