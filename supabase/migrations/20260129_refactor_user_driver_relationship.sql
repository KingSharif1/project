-- Migration to refactor user/driver relationship
-- Drivers extend users table - user info stored in users, driver-specific info in drivers

-- =============================================================================
-- 1. Add missing fields to users table (shared by all user types)
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'TX';
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Update role constraint to include driver and superadmin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'dispatcher', 'driver'));

-- Create indexes
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_first_name_idx ON users(first_name);
CREATE INDEX IF NOT EXISTS users_last_name_idx ON users(last_name);

-- =============================================================================
-- 2. Add user_id to drivers table to link to users
-- =============================================================================
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON drivers(user_id);

-- =============================================================================
-- 3. Add vehicle assignment to drivers
-- =============================================================================
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS drivers_assigned_vehicle_idx ON drivers(assigned_vehicle_id);

-- =============================================================================
-- 4. Add driver_id to vehicles for ownership tracking
-- =============================================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS vehicles_assigned_driver_idx ON vehicles(assigned_driver_id);

-- =============================================================================
-- 5. Update RLS policies
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR role = 'superadmin'
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin')
    OR clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin'))
  WITH CHECK (id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin'));

-- =============================================================================
-- 6. Add comments for documentation
-- =============================================================================
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.username IS 'Unique username for login';
COMMENT ON COLUMN users.must_change_password IS 'Flag to force password change on next login';
COMMENT ON COLUMN drivers.user_id IS 'Reference to users table for shared user info';
COMMENT ON COLUMN drivers.assigned_vehicle_id IS 'Currently assigned vehicle';
COMMENT ON COLUMN vehicles.assigned_driver_id IS 'Driver this vehicle is assigned to';
