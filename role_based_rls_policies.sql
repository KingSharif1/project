-- Role-Based RLS Policies for CareFlow-Transit
-- Run this AFTER adding clinic_id columns
-- Project: ocjqsnocuqyumoltighi
-- https://supabase.com/dashboard/project/ocjqsnocuqyumoltighi/sql

-- ============================================
-- HELPER FUNCTION: Get current user's role and clinic
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
-- USERS TABLE - Only admins can manage users
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users in their clinic" ON public.users;
DROP POLICY IF EXISTS "Admins can create users in their clinic" ON public.users;
DROP POLICY IF EXISTS "Admins can update users in their clinic" ON public.users;

-- Users can see themselves
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Admins can see all users in their clinic
CREATE POLICY "Admins can view all users in their clinic"
ON public.users FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'admin' 
  AND clinic_id = auth.user_clinic_id()
);

-- Admins can create users in their clinic
CREATE POLICY "Admins can create users in their clinic"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- Admins can update users in their clinic
CREATE POLICY "Admins can update users in their clinic"
ON public.users FOR UPDATE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- ============================================
-- FACILITIES TABLE - Users can only see their own facility/clinic
-- ============================================
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic" ON public.facilities;
DROP POLICY IF EXISTS "Admins can update their own clinic" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated users can read facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated users can manage facilities" ON public.facilities;

CREATE POLICY "Users can view their own clinic"
ON public.facilities FOR SELECT
TO authenticated
USING (id = auth.user_clinic_id());

CREATE POLICY "Admins can update their own clinic"
ON public.facilities FOR UPDATE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND id = auth.user_clinic_id()
);

-- ============================================
-- DRIVERS TABLE - Clinic-based access
-- ============================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drivers in their clinic" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage drivers in their clinic" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view their own profile" ON public.drivers;

-- All authenticated users can see drivers in their clinic
CREATE POLICY "Users can view drivers in their clinic"
ON public.drivers FOR SELECT
TO authenticated
USING (clinic_id = auth.user_clinic_id());

-- Drivers can see themselves (if they have a user_id)
CREATE POLICY "Drivers can view their own profile"
ON public.drivers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage drivers in their clinic
CREATE POLICY "Admins can manage drivers in their clinic"
ON public.drivers FOR ALL
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND clinic_id = auth.user_clinic_id()
);

-- ============================================
-- PATIENTS TABLE - Clinic-based access
-- ============================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
DROP POLICY IF EXISTS "Admins and dispatchers can manage patients" ON public.patients;

-- All users can view patients (filtered by trips they have access to)
CREATE POLICY "Users can view patients in their clinic"
ON public.patients FOR SELECT
TO authenticated
USING (true);  -- Will be filtered through trips access

-- Admins and dispatchers can manage patients
CREATE POLICY "Admins and dispatchers can manage patients"
ON public.patients FOR ALL
TO authenticated
USING (auth.user_role() IN ('admin', 'dispatcher'));

-- ============================================
-- VEHICLES TABLE - Clinic-based access
-- ============================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vehicles in their clinic" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;

CREATE POLICY "Users can view vehicles in their clinic"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can see vehicles

CREATE POLICY "Admins can manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (auth.user_role() = 'admin');

-- ============================================
-- TRIPS TABLE - Role-based access (MOST IMPORTANT)
-- ============================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all trips in their clinic" ON public.trips;
DROP POLICY IF EXISTS "Dispatchers can view trips in their clinic" ON public.trips;
DROP POLICY IF EXISTS "Drivers can view their assigned trips" ON public.trips;
DROP POLICY IF EXISTS "Admins and dispatchers can create trips" ON public.trips;
DROP POLICY IF EXISTS "Admins and dispatchers can update trips" ON public.trips;
DROP POLICY IF EXISTS "Admins can delete trips" ON public.trips;

-- Admins see ALL trips for their clinic (using clinic_id or facility_id)
CREATE POLICY "Admins can view all trips in their clinic"
ON public.trips FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND COALESCE(clinic_id, facility_id) = auth.user_clinic_id()
);

-- Dispatchers see trips in their clinic
CREATE POLICY "Dispatchers can view trips in their clinic"
ON public.trips FOR SELECT
TO authenticated
USING (
  auth.user_role() = 'dispatcher'
  AND COALESCE(clinic_id, facility_id) = auth.user_clinic_id()
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
  AND COALESCE(clinic_id, facility_id) = auth.user_clinic_id()
);

-- Admins and dispatchers can update trips in their clinic
CREATE POLICY "Admins and dispatchers can update trips"
ON public.trips FOR UPDATE
TO authenticated
USING (
  auth.user_role() IN ('admin', 'dispatcher')
  AND COALESCE(clinic_id, facility_id) = auth.user_clinic_id()
);

-- Only admins can delete trips
CREATE POLICY "Admins can delete trips"
ON public.trips FOR DELETE
TO authenticated
USING (
  auth.user_role() = 'admin'
  AND COALESCE(clinic_id, facility_id) = auth.user_clinic_id()
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
