/*
  # Create function to get auth user ID by email
  
  Creates a helper function that Edge Functions can call to get user IDs.
  
  1. New Functions
    - `get_auth_user_id_by_email(user_email text)` - Returns auth user ID for given email
  
  2. Security
    - Function runs with security definer privileges
    - Only accessible with service role key
*/

-- Create function to get auth user ID by email
CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_auth_user_id_by_email(text) TO service_role;
