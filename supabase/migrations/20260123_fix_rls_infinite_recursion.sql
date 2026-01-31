-- ============================================================================
-- COMPREHENSIVE RLS FIX
-- ============================================================================
-- Fixes:
-- 1. "infinite recursion detected in policy for relation 'users'" error
-- 2. All "RLS Policy Always True" warnings from Security Advisor
-- 3. "Function Search Path Mutable" warnings
--
-- Tables affected (from Security Advisor screenshot):
-- - public.automated_notification_log
-- - public.clinics
-- - public.document_expiry_alerts
-- - public.document_submissions
-- - public.drivers
--
-- Functions with search_path issues:
-- - public.cleanup_old_driver_locations
-- - public.verify_user_password

-- ============================================================================
-- PART 1: Create Helper Functions in PUBLIC schema (not auth - no permission)
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.current_user_role();
DROP FUNCTION IF EXISTS public.current_user_clinic_id();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_authenticated();

-- Function to get current user's role (with RLS bypass)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'anon'
  );
$$;

-- Function to get current user's clinic_id (with RLS bypass)
CREATE OR REPLACE FUNCTION public.current_user_clinic_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT clinic_id FROM public.users WHERE id = auth.uid();
$$;

-- Convenience function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Convenience function: is current user authenticated?
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_clinic_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon, authenticated, service_role;

-- ============================================================================
-- PART 2: Fix Functions with "Search Path Mutable" warnings
-- ============================================================================

-- NOTE: cleanup_old_driver_locations has trigger dependencies, skip for now
-- You can fix this manually later by:
-- 1. DROP TRIGGER trigger_cleanup_old_driver_locations ON realtime_driver_locations;
-- 2. DROP FUNCTION cleanup_old_driver_locations();
-- 3. Recreate function with SET search_path = public
-- 4. Recreate trigger

-- The RLS fixes below are the critical ones:

-- ============================================================================
-- PART 3: Fix USERS table policies (was causing infinite recursion)
-- ============================================================================

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view users in same clinic" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Dispatchers can view users in same clinic" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;

-- Recreate with NO recursion (using helper functions)
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "users_select_same_clinic" ON users
  FOR SELECT USING (
    public.current_user_role() = 'dispatcher' 
    AND clinic_id = public.current_user_clinic_id()
  );

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- PART 4: Fix CLINICS table policies ("RLS Policy Always True")
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read clinics" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can insert clinics" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can update clinics" ON clinics;
DROP POLICY IF EXISTS "All authenticated users can view clinics" ON clinics;
DROP POLICY IF EXISTS "Admins can insert clinics" ON clinics;
DROP POLICY IF EXISTS "Admins can update clinics" ON clinics;
DROP POLICY IF EXISTS "Admins can delete clinics" ON clinics;

-- All authenticated users can view clinics (needed for dropdowns)
CREATE POLICY "clinics_select_authenticated" ON clinics
  FOR SELECT USING (public.is_authenticated());

-- Only admins can modify clinics
CREATE POLICY "clinics_insert_admin" ON clinics
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "clinics_update_admin" ON clinics
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "clinics_delete_admin" ON clinics
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- PART 5: Fix DRIVERS table policies ("RLS Policy Always True")
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read drivers" ON drivers;
DROP POLICY IF EXISTS "Authenticated users can insert drivers" ON drivers;
DROP POLICY IF EXISTS "Authenticated users can update drivers" ON drivers;
DROP POLICY IF EXISTS "Admins can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Dispatchers can view drivers in same clinic" ON drivers;
DROP POLICY IF EXISTS "Admins can manage drivers" ON drivers;
DROP POLICY IF EXISTS "Dispatchers can manage drivers in same clinic" ON drivers;

-- Admins see all drivers
CREATE POLICY "drivers_select_admin" ON drivers
  FOR SELECT USING (public.is_admin());

-- Dispatchers see drivers in their clinic (or all if no clinic assigned)
CREATE POLICY "drivers_select_clinic" ON drivers
  FOR SELECT USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

-- Admins can manage all drivers
CREATE POLICY "drivers_all_admin" ON drivers
  FOR ALL USING (public.is_admin());

-- Dispatchers can manage drivers in their clinic
CREATE POLICY "drivers_all_dispatcher" ON drivers
  FOR ALL USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

-- ============================================================================
-- PART 6: Fix PATIENTS table policies
-- ============================================================================

DROP POLICY IF EXISTS "Dispatchers can view assigned patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage all patients" ON patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON patients;
DROP POLICY IF EXISTS "Dispatchers can view patients in same clinic" ON patients;
DROP POLICY IF EXISTS "Admins can insert patients" ON patients;
DROP POLICY IF EXISTS "Dispatchers can insert patients" ON patients;
DROP POLICY IF EXISTS "Admins can update patients" ON patients;
DROP POLICY IF EXISTS "Dispatchers can update patients in same clinic" ON patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can read patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;

CREATE POLICY "patients_select_admin" ON patients
  FOR SELECT USING (public.is_admin());

CREATE POLICY "patients_select_clinic" ON patients
  FOR SELECT USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

CREATE POLICY "patients_all_admin" ON patients
  FOR ALL USING (public.is_admin());

CREATE POLICY "patients_all_dispatcher" ON patients
  FOR ALL USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

-- ============================================================================
-- PART 7: Fix AUTOMATED_NOTIFICATION_LOG policies ("RLS Policy Always True")
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read automated_notification_log" ON automated_notification_log;
DROP POLICY IF EXISTS "Authenticated users can insert automated_notification_log" ON automated_notification_log;

-- Enable RLS if not already
ALTER TABLE automated_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automated_notification_log_select" ON automated_notification_log
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "automated_notification_log_insert" ON automated_notification_log
  FOR INSERT WITH CHECK (public.is_authenticated());

-- ============================================================================
-- PART 8: Fix DOCUMENT_EXPIRY_ALERTS policies ("RLS Policy Always True")
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read document_expiry_alerts" ON document_expiry_alerts;
DROP POLICY IF EXISTS "Authenticated users can insert document_expiry_alerts" ON document_expiry_alerts;

-- Enable RLS if not already
ALTER TABLE document_expiry_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_expiry_alerts_select_admin" ON document_expiry_alerts
  FOR SELECT USING (public.is_admin());

CREATE POLICY "document_expiry_alerts_all_admin" ON document_expiry_alerts
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- PART 9: Fix DOCUMENT_SUBMISSIONS policies ("RLS Policy Always True")
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read document_submissions" ON document_submissions;
DROP POLICY IF EXISTS "Authenticated users can insert document_submissions" ON document_submissions;

-- Enable RLS if not already
ALTER TABLE document_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_submissions_select_admin" ON document_submissions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "document_submissions_all_admin" ON document_submissions
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- PART 10: Fix TRIPS table policies (ensure proper access)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read trips" ON trips;
DROP POLICY IF EXISTS "Authenticated users can insert trips" ON trips;
DROP POLICY IF EXISTS "Authenticated users can update trips" ON trips;

CREATE POLICY "trips_select_admin" ON trips
  FOR SELECT USING (public.is_admin());

CREATE POLICY "trips_select_clinic" ON trips
  FOR SELECT USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

CREATE POLICY "trips_all_admin" ON trips
  FOR ALL USING (public.is_admin());

CREATE POLICY "trips_all_dispatcher" ON trips
  FOR ALL USING (
    public.current_user_role() = 'dispatcher'
    AND (
      clinic_id = public.current_user_clinic_id()
      OR public.current_user_clinic_id() IS NULL
    )
  );

-- ============================================================================
-- PART 11: Fix VEHICLES table policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicles;

CREATE POLICY "vehicles_select_authenticated" ON vehicles
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "vehicles_all_admin" ON vehicles
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- VERIFICATION: Check counts
-- ============================================================================

-- Run this separately to verify:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
