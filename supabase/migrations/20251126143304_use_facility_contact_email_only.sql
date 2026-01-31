/*
  # Use Facility Contact Email for Notifications

  1. Changes
    - Update get_clinic_admin_email to ONLY use facilities.contact_email
    - Remove dependency on clinic_notification_settings.notification_email
    - Email notifications will use the email configured in Facility Management
    
  2. Reason
    - Simplifies email management - one place to configure (Facility Management)
    - Admins update facility contact email and notifications automatically use it
    - No need to maintain separate notification settings
*/

-- Drop and recreate to only use facility contact_email
DROP FUNCTION IF EXISTS get_clinic_admin_email(uuid);

CREATE OR REPLACE FUNCTION get_clinic_admin_email(p_facility_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- ONLY use the contact_email from facilities table
  -- This is the email shown in Facility Management page
  SELECT contact_email INTO v_email
  FROM facilities
  WHERE id = p_facility_id;

  RETURN v_email;
END;
$$;

-- Update clinic_notification_settings to sync with facility emails
-- This ensures any existing records are updated
UPDATE clinic_notification_settings cns
SET notification_email = f.contact_email
FROM facilities f
WHERE cns.facility_id = f.id
  AND f.contact_email IS NOT NULL
  AND f.contact_email != '';