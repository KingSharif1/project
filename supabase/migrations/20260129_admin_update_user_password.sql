-- Create a function to update user password directly in auth.users
-- This is a workaround for when the Supabase Auth Admin API has issues

CREATE OR REPLACE FUNCTION admin_update_user_password(
  target_email TEXT,
  new_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email in auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', target_email;
  END IF;
  
  -- Update the encrypted_password
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password_hash, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION admin_update_user_password(TEXT, TEXT) TO service_role;
