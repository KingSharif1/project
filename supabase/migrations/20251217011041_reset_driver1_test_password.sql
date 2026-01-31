/*
  # Reset password for driver1@test.com
  
  Updates the password for the test driver account to ensure login works.
  
  1. Changes
    - Updates encrypted_password for driver1@test.com
    - Sets password to 'Driver123!'
  
  2. Security
    - Uses bcrypt encryption
    - Updates existing auth.users record
*/

-- Update password for driver1@test.com
UPDATE auth.users
SET 
  encrypted_password = crypt('Driver123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'driver1@test.com';
