/*
  # Add Passenger Contact Details to Trips Table

  ## Changes
  
  1. New Columns Added to `trips` table:
     - `passenger_first_name` (text) - Passenger's first name for quick reference
     - `passenger_last_name` (text) - Passenger's last name for quick reference
     - `passenger_phone` (text) - Passenger's contact phone number
     - `passenger_email` (text) - Passenger's email address (optional)
  
  2. Purpose:
     - Allow storing passenger information directly on trip records
     - Enable quick phone search for previous bookings
     - Reduce dependency on patient_id for ad-hoc trips
     - Support both registered patients and one-time bookings
  
  3. Notes:
     - These fields supplement patient_id, not replace it
     - Useful for dispatchers to quickly see passenger details
     - Phone field enables auto-fill functionality based on booking history
*/

-- Add passenger contact details columns to trips table
DO $$
BEGIN
  -- Add passenger first name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_first_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_first_name text;
  END IF;

  -- Add passenger last name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_last_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_last_name text;
  END IF;

  -- Add passenger phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_phone'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_phone text;
  END IF;

  -- Add passenger email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_email'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_email text;
  END IF;
END $$;

-- Create an index on passenger_phone for fast lookup
CREATE INDEX IF NOT EXISTS idx_trips_passenger_phone ON trips(passenger_phone);

-- Add comment for documentation
COMMENT ON COLUMN trips.passenger_first_name IS 'Passenger first name for quick reference and display';
COMMENT ON COLUMN trips.passenger_last_name IS 'Passenger last name for quick reference and display';
COMMENT ON COLUMN trips.passenger_phone IS 'Passenger contact phone - used for search and auto-fill';
COMMENT ON COLUMN trips.passenger_email IS 'Passenger email address (optional)';