/*
  # Fix Get Clinic Admin Email Function Security

  1. Changes
    - Recreate get_clinic_admin_email with SECURITY DEFINER
    - Allows function to read clinic settings without RLS restrictions
    - Ensures email routing works for automated triggers

  2. Security
    - Function runs with elevated privileges
    - Read-only function (no data modifications)
    - Only returns email addresses for valid facilities
*/

-- Drop and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_clinic_admin_email(uuid);

CREATE OR REPLACE FUNCTION get_clinic_admin_email(p_facility_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypass RLS to read clinic settings
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Try notification settings first
  SELECT notification_email INTO v_email
  FROM clinic_notification_settings
  WHERE facility_id = p_facility_id AND enabled = true;

  -- Fall back to facility contact_email
  IF v_email IS NULL THEN
    SELECT contact_email INTO v_email
    FROM facilities
    WHERE id = p_facility_id;
  END IF;

  RETURN v_email;
END;
$$;