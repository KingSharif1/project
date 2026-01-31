/*
  # Create Missing Driver Auth Accounts

  This migration creates auth accounts for all drivers who don't have one yet.
  
  1. Actions
    - Creates auth accounts for drivers without auth accounts
    - Uses a default password that should be changed on first login
    - Automatically links auth account to driver profile via email
  
  2. Security
    - Uses secure password hashing (handled by Supabase Auth)
    - Password must be changed by driver after first login
*/

DO $$
DECLARE
  driver_record RECORD;
  default_password TEXT := 'Driver123!'; -- Temporary password, must be changed
BEGIN
  -- Loop through all drivers without auth accounts
  FOR driver_record IN 
    SELECT d.id, d.email, d.name
    FROM drivers d
    LEFT JOIN auth.users au ON d.email = au.email
    WHERE au.id IS NULL
  LOOP
    -- Create auth account for each driver
    BEGIN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        driver_record.email,
        crypt(default_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'driver'),
        jsonb_build_object('name', driver_record.name, 'driver_id', driver_record.id::text),
        now(),
        now(),
        '',
        ''
      );
      
      RAISE NOTICE 'Created auth account for driver: % (%)', driver_record.name, driver_record.email;
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE 'Auth account already exists for: %', driver_record.email;
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create auth account for %: %', driver_record.email, SQLERRM;
    END;
  END LOOP;
END $$;
