-- Security Hardening: Replace permissive RLS policies with strict RBAC

-- 1. driver_location_history
-- Policy: Drivers insert/view own. Admins/Dispatchers view clinic's drivers.
DROP POLICY IF EXISTS "Authenticated users access" ON driver_location_history;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON driver_location_history;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON driver_location_history;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON driver_location_history;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON driver_location_history;

ALTER TABLE driver_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own location" ON driver_location_history
FOR INSERT TO authenticated
WITH CHECK (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

CREATE POLICY "Drivers view own location" ON driver_location_history
FOR SELECT TO authenticated
USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins/Dispatchers view clinic driver locations" ON driver_location_history
FOR SELECT TO authenticated
USING (
  driver_id IN (
    SELECT id FROM drivers 
    WHERE clinic_id = public.user_clinic_id()
    AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher')
  )
);

-- 2. trip_signatures
-- Link via trip_id
DROP POLICY IF EXISTS "Authenticated users access" ON trip_signatures;

ALTER TABLE trip_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View signatures for accessible trips" ON trip_signatures
FOR SELECT TO authenticated
USING (
  trip_id IN (
    SELECT id FROM trips 
    WHERE 
      -- Drivers: assigned trips
      (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
      OR
      -- Admins/Dispatchers: clinic trips
      (clinic_id = public.user_clinic_id() AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher'))
  )
);

CREATE POLICY "Insert signatures for accessible trips" ON trip_signatures
FOR INSERT TO authenticated
WITH CHECK (
  trip_id IN (
    SELECT id FROM trips 
    WHERE 
      -- Drivers: assigned trips
      (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
      OR
      -- Admins/Dispatchers: clinic trips
      (clinic_id = public.user_clinic_id() AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher'))
  )
);

-- 3. trip_assignment_history
DROP POLICY IF EXISTS "Authenticated users access" ON trip_assignment_history;
ALTER TABLE trip_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View assignment history for accessible trips" ON trip_assignment_history
FOR SELECT TO authenticated
USING (
  trip_id IN (
     SELECT id FROM trips WHERE clinic_id = public.user_clinic_id()
  )
  -- Drivers maybe don't need to see history? Or maybe their own history?
  -- For now restricting to clinic staff (Admins/Dispatchers + Drivers if needed)
  -- Safest: Only Admins/Dispatchers for history usually
  AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher')
);

-- 4. trip_status_history
DROP POLICY IF EXISTS "Authenticated users access" ON trip_status_history;
ALTER TABLE trip_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View status history for accessible trips" ON trip_status_history
FOR SELECT TO authenticated
USING (
  trip_id IN (
    SELECT id FROM trips 
    WHERE 
      (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
      OR
      (clinic_id = public.user_clinic_id() AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher'))
  )
);

-- 5. clinic_rate_configurations
-- Admins/Dispatchers view only (manage via other means if needed, or specific update policy)
DROP POLICY IF EXISTS "Authenticated users access" ON clinic_rate_configurations;
ALTER TABLE clinic_rate_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View clinic rates" ON clinic_rate_configurations
FOR SELECT TO authenticated
USING (
  clinic_id = public.user_clinic_id()
);

-- 6. compliance_metrics
-- Admin/Dispatcher Only
DROP POLICY IF EXISTS "Authenticated users access" ON compliance_metrics;
ALTER TABLE compliance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View clinic compliance" ON compliance_metrics
FOR SELECT TO authenticated
USING (
  clinic_id = public.user_clinic_id()
  AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher')
);

-- 7. Grant access to Authenticated role (ensure no 401s after dropping permissive policies)
GRANT ALL ON TABLE driver_location_history TO authenticated;
GRANT ALL ON TABLE trip_signatures TO authenticated;
GRANT ALL ON TABLE trip_assignment_history TO authenticated;
GRANT ALL ON TABLE trip_status_history TO authenticated;
GRANT ALL ON TABLE clinic_rate_configurations TO authenticated;
GRANT ALL ON TABLE compliance_metrics TO authenticated;
