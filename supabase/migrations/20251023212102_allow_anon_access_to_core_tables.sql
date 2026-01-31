/*
  # Allow Anonymous Access to Core Tables

  1. Security Changes
    - Drop existing restrictive policies on trips, drivers, and driver_rate_tiers
    - Add new policies that allow anonymous (anon) role access
    - This enables the app to work without requiring authentication

  2. Tables Affected
    - trips
    - drivers
    - driver_rate_tiers
    - facilities
    - patients
    - vehicles

  3. Important Notes
    - In production, you should implement proper authentication
    - These policies are for development/testing purposes
    - All users (authenticated and anonymous) can perform all operations
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read trips" ON trips;
DROP POLICY IF EXISTS "Authenticated users can manage trips" ON trips;
DROP POLICY IF EXISTS "Authenticated users can read drivers" ON drivers;
DROP POLICY IF EXISTS "Authenticated users can manage drivers" ON drivers;
DROP POLICY IF EXISTS "Authenticated users can read driver rate tiers" ON driver_rate_tiers;
DROP POLICY IF EXISTS "Authenticated users can manage driver rate tiers" ON driver_rate_tiers;

-- Trips policies (allow anon and authenticated)
CREATE POLICY "Anyone can read trips"
  ON trips FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert trips"
  ON trips FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update trips"
  ON trips FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete trips"
  ON trips FOR DELETE
  USING (true);

-- Drivers policies (allow anon and authenticated)
CREATE POLICY "Anyone can read drivers"
  ON drivers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert drivers"
  ON drivers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update drivers"
  ON drivers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete drivers"
  ON drivers FOR DELETE
  USING (true);

-- Driver rate tiers policies (allow anon and authenticated)
CREATE POLICY "Anyone can read driver rate tiers"
  ON driver_rate_tiers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert driver rate tiers"
  ON driver_rate_tiers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update driver rate tiers"
  ON driver_rate_tiers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete driver rate tiers"
  ON driver_rate_tiers FOR DELETE
  USING (true);

-- Facilities policies (if RLS is enabled)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'facilities'
    AND rowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can read facilities" ON facilities;
    DROP POLICY IF EXISTS "Authenticated users can manage facilities" ON facilities;
    
    CREATE POLICY "Anyone can read facilities"
      ON facilities FOR SELECT
      USING (true);
    
    CREATE POLICY "Anyone can manage facilities"
      ON facilities FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Patients policies (if RLS is enabled)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'patients'
    AND rowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can read patients" ON patients;
    DROP POLICY IF EXISTS "Authenticated users can manage patients" ON patients;
    
    CREATE POLICY "Anyone can read patients"
      ON patients FOR SELECT
      USING (true);
    
    CREATE POLICY "Anyone can manage patients"
      ON patients FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Vehicles policies (if RLS is enabled)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'vehicles'
    AND rowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON vehicles;
    DROP POLICY IF EXISTS "Authenticated users can manage vehicles" ON vehicles;
    
    CREATE POLICY "Anyone can read vehicles"
      ON vehicles FOR SELECT
      USING (true);
    
    CREATE POLICY "Anyone can manage vehicles"
      ON vehicles FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add comment explaining the security model
COMMENT ON TABLE trips IS 'RLS enabled with open policies for development. Implement proper authentication in production.';
COMMENT ON TABLE drivers IS 'RLS enabled with open policies for development. Implement proper authentication in production.';
COMMENT ON TABLE driver_rate_tiers IS 'RLS enabled with open policies for development. Implement proper authentication in production.';
