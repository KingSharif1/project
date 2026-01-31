/*
  # Fix Trip Creation & Driver Rate Display

  1. Changes
    - Make passenger fields nullable to allow trip creation
    - Add contracted_rate column to driver_rate_tiers
    - Ensure all necessary columns exist
    - Fix any NOT NULL constraints preventing trip creation

  2. Security
    - Maintain RLS policies
    - No changes to existing security
*/

-- Make passenger fields nullable if they're causing issues
DO $$
BEGIN
  -- Add passenger fields if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_first_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_first_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_last_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_last_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_phone'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_email'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_email TEXT;
  END IF;

  -- Add service_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'service_level'
  ) THEN
    ALTER TABLE trips ADD COLUMN service_level TEXT;
  END IF;

  -- Add journey_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'journey_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN journey_type TEXT DEFAULT 'one-way';
  END IF;

  -- Add will_call if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'will_call'
  ) THEN
    ALTER TABLE trips ADD COLUMN will_call BOOLEAN DEFAULT false;
  END IF;

  -- Add leg miles fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'leg1_miles'
  ) THEN
    ALTER TABLE trips ADD COLUMN leg1_miles DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'leg2_miles'
  ) THEN
    ALTER TABLE trips ADD COLUMN leg2_miles DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Add dispatcher tracking fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dispatcher_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_id UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dispatcher_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dispatcher_assigned_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_assigned_at TIMESTAMPTZ;
  END IF;

  -- Add last modified tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'last_modified_by_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN last_modified_by_id UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'last_modified_by_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN last_modified_by_name TEXT;
  END IF;

  -- Add appointment_time if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'appointment_time'
  ) THEN
    ALTER TABLE trips ADD COLUMN appointment_time TIMESTAMPTZ;
  END IF;
END $$;

-- Fix driver_rate_tiers to include contracted_rate
DO $$
BEGIN
  -- Add contracted_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_rate_tiers' AND column_name = 'contracted_rate'
  ) THEN
    ALTER TABLE driver_rate_tiers ADD COLUMN contracted_rate DECIMAL(10,2);
    COMMENT ON COLUMN driver_rate_tiers.contracted_rate IS 'The contracted rate paid to the driver for this service level';
  END IF;

  -- Add facility_rate column if it doesn't exist (what we charge the facility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_rate_tiers' AND column_name = 'facility_rate'
  ) THEN
    ALTER TABLE driver_rate_tiers ADD COLUMN facility_rate DECIMAL(10,2);
    COMMENT ON COLUMN driver_rate_tiers.facility_rate IS 'The rate charged to the facility/clinic';
  END IF;
END $$;

-- Update existing driver_rate_tiers to have contracted_rate if base_rate exists
UPDATE driver_rate_tiers
SET contracted_rate = base_rate
WHERE contracted_rate IS NULL AND base_rate IS NOT NULL;

-- Create index for faster trip queries
CREATE INDEX IF NOT EXISTS idx_trips_facility_id ON trips(facility_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_time ON trips(scheduled_pickup_time);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

-- Create index for driver rate queries
CREATE INDEX IF NOT EXISTS idx_driver_rate_tiers_driver_id ON driver_rate_tiers(driver_id);

-- Update trips table to allow NULL in pickup/dropoff fields temporarily
ALTER TABLE trips ALTER COLUMN pickup_city DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN pickup_zip DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN dropoff_city DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN dropoff_zip DROP NOT NULL;

-- Set defaults for these fields
ALTER TABLE trips ALTER COLUMN pickup_city SET DEFAULT 'Unknown';
ALTER TABLE trips ALTER COLUMN pickup_zip SET DEFAULT '00000';
ALTER TABLE trips ALTER COLUMN dropoff_city SET DEFAULT 'Unknown';
ALTER TABLE trips ALTER COLUMN dropoff_zip SET DEFAULT '00000';

-- Create a function to auto-populate driver_payout based on contracted rate
CREATE OR REPLACE FUNCTION calculate_driver_payout()
RETURNS TRIGGER AS $$
DECLARE
  v_contracted_rate DECIMAL(10,2);
  v_additional_mile_rate DECIMAL(10,2);
  v_calculated_payout DECIMAL(10,2);
BEGIN
  -- Only calculate if driver_payout is 0 or NULL and driver is assigned
  IF (NEW.driver_payout IS NULL OR NEW.driver_payout = 0) AND NEW.driver_id IS NOT NULL THEN
    -- Get the driver's contracted rate for this service level
    SELECT contracted_rate, additional_mile_rate
    INTO v_contracted_rate, v_additional_mile_rate
    FROM driver_rate_tiers
    WHERE driver_id = NEW.driver_id
      AND service_level = COALESCE(NEW.service_level, NEW.trip_type)
      AND is_active = true
    LIMIT 1;

    -- Calculate payout: contracted_rate + (additional miles × additional_mile_rate)
    IF v_contracted_rate IS NOT NULL THEN
      v_calculated_payout := v_contracted_rate;

      -- Add mileage charge if applicable
      IF v_additional_mile_rate IS NOT NULL AND NEW.distance_miles > 0 THEN
        v_calculated_payout := v_calculated_payout + (NEW.distance_miles * v_additional_mile_rate);
      END IF;

      NEW.driver_payout := v_calculated_payout;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate driver payout
DROP TRIGGER IF EXISTS tr_calculate_driver_payout ON trips;
CREATE TRIGGER tr_calculate_driver_payout
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION calculate_driver_payout();

COMMENT ON FUNCTION calculate_driver_payout() IS 'Automatically calculates driver payout based on contracted rate and mileage';
