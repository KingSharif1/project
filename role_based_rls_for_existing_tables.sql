-- Role-Based RLS Policies for EXISTING CareFlow-Transit tables
-- Run this AFTER adding clinic_id columns
-- Project: ocjqsnocuqyumoltighi
-- https://supabase.com/dashboard/project/ocjqsnocuqyumoltighi/sql

-- ============================================
-- HELPER FUNCTIONS: Get current user's role and clinic
-- ============================================
CREATE OR REPLACE FUNCTION auth.user_role() 
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_clinic_id() 
RETURNS UUID AS $$
  SELECT clinic_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users in their clinic" ON public.users;
DROP POLICY IF EXISTS "Admins can create users in their clinic" ON public.users;
DROP POLICY IF EXISTS "Admins can update users in their clinic" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all users in their clinic"
ON public.users FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'admin' 
  AND clinic_id = auth.user_clinic_id()
);

CREATE POLICY "Admins can create users in their clinic"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

CREATE POLICY "Admins can update users in their clinic"
ON public.users FOR UPDATE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- ============================================
-- CLINICS TABLE
-- ============================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Admins can update their own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clinics;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.clinics;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.clinics;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.clinics;

CREATE POLICY "Users can view their own clinic"
ON public.clinics FOR SELECT
TO authenticated
USING (id = auth.user_clinic_id());

CREATE POLICY "Admins can update their own clinic"
ON public.clinics FOR UPDATE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND id = auth.user_clinic_id()
);

-- ============================================
-- DRIVERS TABLE
-- ============================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drivers in their clinic" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage drivers in their clinic" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view their own profile" ON public.drivers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.drivers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.drivers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.drivers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.drivers;

CREATE POLICY "Users can view drivers in their clinic"
ON public.drivers FOR SELECT
TO authenticated
USING (clinic_id = auth.user_clinic_id());

CREATE POLICY "Drivers can view their own profile"
ON public.drivers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage drivers in their clinic"
ON public.drivers FOR ALL
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- ============================================
-- PATIENTS TABLE
-- ============================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Admins and dispatchers can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.patients;

CREATE POLICY "Users can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and dispatchers can manage patients"
ON public.patients FOR ALL
TO authenticated
USING (auth.user_role() IN ('admin', 'dispatcher'));

-- ============================================
-- VEHICLES TABLE
-- ============================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vehicles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.vehicles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.vehicles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.vehicles;

CREATE POLICY "Users can view vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (auth.user_role() = 'admin');

-- ============================================
-- TRIPS TABLE - MOST IMPORTANT
-- ============================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all trips in their clinic" ON public.trips;
DROP POLICY IF EXISTS "Dispatchers can view trips in their clinic" ON public.trips;
DROP POLICY IF EXISTS "Drivers can view their assigned trips" ON public.trips;
DROP POLICY IF EXISTS "Admins and dispatchers can create trips" ON public.trips;
DROP POLICY IF EXISTS "Admins and dispatchers can update trips" ON public.trips;
DROP POLICY IF EXISTS "Admins can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.trips;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.trips;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.trips;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.trips;

-- Admins see ALL trips for their clinic
CREATE POLICY "Admins can view all trips in their clinic"
ON public.trips FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- Dispatchers see trips in their clinic
CREATE POLICY "Dispatchers can view trips in their clinic"
ON public.trips FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'dispatcher'
  AND clinic_id = auth.user_clinic_id()
);

-- Drivers see ONLY their assigned trips
CREATE POLICY "Drivers can view their assigned trips"
ON public.trips FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);

-- Admins and dispatchers can create trips in their clinic
CREATE POLICY "Admins and dispatchers can create trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_role() IN ('admin', 'dispatcher')
  AND clinic_id = auth.user_clinic_id()
);

-- Admins and dispatchers can update trips in their clinic
CREATE POLICY "Admins and dispatchers can update trips"
ON public.trips FOR UPDATE
TO authenticated
USING (
  auth.user_role() IN ('admin', 'dispatcher')
  AND clinic_id = auth.user_clinic_id()
);

-- Only admins can delete trips
CREATE POLICY "Admins can delete trips"
ON public.trips FOR DELETE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'clinics', 'drivers', 'patients', 'vehicles', 'trips')
ORDER BY tablename;

-- Check policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as "Command"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'clinics', 'drivers', 'patients', 'vehicles', 'trips')
ORDER BY tablename, cmd, policyname;
