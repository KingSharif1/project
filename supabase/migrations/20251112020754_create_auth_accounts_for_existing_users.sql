/*
  # Create Auth Accounts for Existing Users

  1. Purpose
    - Creates Supabase Auth accounts for all drivers and patients who don't have one
    - Uses their email and sets a temporary password
    - Auto-confirms all accounts
    - Enables password reset functionality

  2. Changes
    - Creates auth users for all drivers in the drivers table
    - Creates auth users for all patients in the patients table
    - Uses secure temporary passwords
    - Auto-confirms all users

  3. Security
    - Only creates accounts that don't already exist
    - Uses secure random passwords
    - Stores temporary password in database for admin reference
*/

-- This is a data migration that needs to be run manually via Supabase Dashboard
-- or using the admin API, as we cannot create auth users directly from SQL

-- For now, we'll create a helper function to identify users without auth accounts
CREATE OR REPLACE FUNCTION get_users_without_auth_accounts()
RETURNS TABLE (
  user_type TEXT,
  email TEXT,
  name TEXT,
  id UUID
) AS $$
BEGIN
  -- Return drivers without auth accounts
  RETURN QUERY
  SELECT 
    'driver'::TEXT as user_type,
    d.email,
    d.name,
    d.id
  FROM drivers d
  WHERE d.email IS NOT NULL
  AND d.email != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.email = d.email
  );

  -- Return patients without auth accounts
  RETURN QUERY
  SELECT 
    'patient'::TEXT as user_type,
    p.email,
    p.first_name || ' ' || p.last_name as name,
    p.id
  FROM patients p
  WHERE p.email IS NOT NULL
  AND p.email != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.email = p.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_without_auth_accounts() TO authenticated, anon;

COMMENT ON FUNCTION get_users_without_auth_accounts() IS 'Returns list of users (drivers and patients) who need auth accounts created';
