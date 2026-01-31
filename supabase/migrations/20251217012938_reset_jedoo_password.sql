/*
  # Reset password for jedoo Adam
  
  Updates the password for jedoohassan@gmail.com
  
  1. Changes
    - Updates encrypted_password for jedoohassan@gmail.com
    - Sets password to the temporary password from the UI
  
  2. Security
    - Uses bcrypt encryption
    - Updates existing auth.users record
*/

-- Update password for jedoohassan@gmail.com
UPDATE auth.users
SET 
  encrypted_password = crypt('R@j556bA2kWO', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'jedoohassan@gmail.com';

-- Also update in drivers table
UPDATE drivers
SET temporary_password = 'R@j556bA2kWO'
WHERE email = 'jedoohassan@gmail.com';
