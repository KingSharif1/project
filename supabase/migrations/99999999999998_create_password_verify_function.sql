-- Create function to verify user password
-- This allows the backend to authenticate users without using Supabase Auth SDK

CREATE OR REPLACE FUNCTION verify_user_password(user_email TEXT, user_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_password TEXT;
BEGIN
  -- Get encrypted password from auth.users
  SELECT encrypted_password INTO stored_password
  FROM auth.users
  WHERE email = user_email;
  
  -- Return false if user not found
  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password using crypt
  RETURN stored_password = crypt(user_password, stored_password);
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO service_role;
