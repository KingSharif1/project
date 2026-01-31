-- ============================================================================
-- Test Accounts Creation Script
-- ============================================================================
-- Run this in Supabase SQL Editor to create test accounts with known passwords
-- This script creates accounts in BOTH auth.users and public.users tables

-- Prerequisites: Make sure you have at least one clinic created first
-- You can get clinic IDs by running: SELECT id, name FROM clinics;

-- ============================================================================
-- 1. Get existing clinic ID (or create one if needed)
-- ============================================================================

-- Create a test clinic if none exists
INSERT INTO clinics (name, address, city, state, zip_code, phone, contact_person, contact_email, is_active)
VALUES (
  'Test Medical Center',
  '123 Main St',
  'Fort Worth',
  'TX',
  '76102',
  '817-555-0100',
  'John Manager',
  'john.manager@testclinic.com',
  true
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Store the clinic ID for later use
DO $$
DECLARE
  test_clinic_id UUID;
BEGIN
  -- Get the first active clinic (or the one we just created)
  SELECT id INTO test_clinic_id FROM clinics WHERE is_active = true LIMIT 1;
  
  -- Store it in a temporary table for this session
  CREATE TEMP TABLE IF NOT EXISTS temp_ids (clinic_id UUID);
  DELETE FROM temp_ids;
  INSERT INTO temp_ids (clinic_id) VALUES (test_clinic_id);
END $$;

-- ============================================================================
-- 2. Create Test Dispatcher (Clinic-Level) - NO facility assignment
-- ============================================================================

DO $$
DECLARE
  test_clinic_id UUID;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  SELECT clinic_id INTO test_clinic_id FROM temp_ids LIMIT 1;
  
  -- Create auth user with email/password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'sarah@test.com',
    crypt('Dispatch123!', gen_salt('bf')),  -- Password: Dispatch123!
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Dispatcher"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE 
    SET encrypted_password = crypt('Dispatch123!', gen_salt('bf'))
  RETURNING id INTO new_user_id;

  -- Create public.users profile
  INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    clinic_id,  -- NO facility assignment for regular dispatcher
    status,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    'sarah@test.com',
    'Sarah',
    'Dispatcher',
    'dispatcher',
    NULL,  -- Regular dispatcher - no specific facility
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
    SET clinic_id = NULL, status = 'active';

  RAISE NOTICE 'Created Clinic Dispatcher: sarah@test.com / Dispatch123!';
END $$;

-- ============================================================================
-- 3. Create Test Dispatcher (Facility-Level) - WITH facility assignment
-- ============================================================================

DO $$
DECLARE
  test_clinic_id UUID;
  new_user_id UUID;
BEGIN
  SELECT clinic_id INTO test_clinic_id FROM temp_ids LIMIT 1;
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'mike@test.com',
    crypt('Facility123!', gen_salt('bf')),  -- Password: Facility123!
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mike FacilityUser"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE 
    SET encrypted_password = crypt('Facility123!', gen_salt('bf'))
  RETURNING id INTO new_user_id;

  -- Create public.users profile
  INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    clinic_id,  -- Assigned to specific facility
    status,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    'mike@test.com',
    'Mike',
    'FacilityUser',
    'dispatcher',
    test_clinic_id,  -- Facility dispatcher - restricted access
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
    SET clinic_id = test_clinic_id, status = 'active';

  RAISE NOTICE 'Created Facility Dispatcher: mike@test.com / Facility123! (assigned to clinic: %)', test_clinic_id;
END $$;

-- ============================================================================
-- 4. Reset existing admin password (if needed)
-- ============================================================================

-- Uncomment this if you want to reset the admin password to a known value
/*
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
WHERE email = 'admin@system.com';

RAISE NOTICE 'Reset Admin password: admin@system.com / Admin123!';
*/

-- ============================================================================
-- 5. Reset existing driver passwords
-- ============================================================================

-- Find existing drivers and update their passwords
DO $$
DECLARE
  driver_email TEXT;
BEGIN
  -- Update all auth.users with role='authenticated' that match drivers table
  FOR driver_email IN 
    SELECT DISTINCT email FROM drivers WHERE email IS NOT NULL
  LOOP
    UPDATE auth.users 
    SET encrypted_password = crypt('Driver123!', gen_salt('bf'))
    WHERE email = driver_email;
    
    RAISE NOTICE 'Reset driver password: % / Driver123!', driver_email;
  END LOOP;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 
  'Test accounts created/updated. Credentials:' as message
UNION ALL
SELECT '  - Clinic Dispatcher: sarah@test.com / Dispatch123!'
UNION ALL
SELECT '  - Facility Dispatcher: mike@test.com / Facility123!'
UNION ALL
SELECT '  - All Drivers: <email> / Driver123!'
UNION ALL
SELECT '  - Admin (if exists): admin@system.com / Admin123!';

-- List all test accounts
SELECT 
  u.email,
  u.role,
  u.status,
  CASE 
    WHEN u.clinic_id IS NULL THEN 'No Facility (All Access)'
    ELSE c.name
  END as assigned_facility
FROM users u
LEFT JOIN clinics c ON u.clinic_id = c.id
WHERE u.email IN ('sarah@test.com', 'mike@test.com', 'admin@system.com')
ORDER BY u.role, u.email;
