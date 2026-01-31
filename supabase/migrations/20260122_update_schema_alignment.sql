-- Migration to add missing columns for multi-tenancy and rider demographics
-- Aligns the database schema with the updated UI forms

-- =============================================================================
-- 1. Add clinic_id to users table (for multi-tenancy / dispatcher assignment)
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
CREATE INDEX IF NOT EXISTS users_clinic_id_idx ON users(clinic_id);

-- =============================================================================
-- 2. Add clinic_id to patients table (for facility-based rider management)
-- =============================================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
CREATE INDEX IF NOT EXISTS patients_clinic_id_idx ON patients(clinic_id);

-- =============================================================================
-- 3. Add new demographic fields to patients table
-- =============================================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE patients ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ride_alone BOOLEAN DEFAULT false;

-- =============================================================================
-- 4. Add new address fields to patients table
-- =============================================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_label TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_line_2 TEXT;

-- =============================================================================
-- 5. Update RLS policies for users table to use clinic_id
-- =============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view users in same clinic" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Recreate policies
CREATE POLICY "Users can view users in same clinic" ON users
  FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- =============================================================================
-- 6. Update RLS policies for patients table to use clinic_id
-- =============================================================================
DROP POLICY IF EXISTS "Users can view patients in same clinic" ON patients;
DROP POLICY IF EXISTS "Admins can manage all patients" ON patients;
DROP POLICY IF EXISTS "Dispatchers can view assigned patients" ON patients;

CREATE POLICY "Dispatchers can view assigned patients" ON patients
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all patients" ON patients
  FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
