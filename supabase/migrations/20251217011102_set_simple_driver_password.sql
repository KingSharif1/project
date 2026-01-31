/*
  # Set simple password for driver1@test.com
  
  Updates the password to a simpler one without special characters.
  
  1. Changes
    - Updates encrypted_password for driver1@test.com
    - Sets password to 'driver123'
  
  2. Security
    - Uses bcrypt encryption
    - Simpler password for testing
*/

-- Update password for driver1@test.com to simpler password
UPDATE auth.users
SET 
  encrypted_password = crypt('driver123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'driver1@test.com';
