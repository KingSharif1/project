/*
  # Remove SMS Notifications for Clinics - Email Only

  1. Changes
    - Remove SMS notification from clinic trigger
    - Clinics receive ONLY email notifications
    - Keep email queuing on trip cancellation/no-show
    
  2. Rationale
    - Clinics prefer email notifications only
    - SMS reserved for drivers and passengers
    - Cleaner separation of notification channels
*/

-- Drop the SMS function for clinics
DROP FUNCTION IF EXISTS send_clinic_sms_notification(uuid, text);

-- Update trigger to ONLY send email (remove SMS call)
CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_type text;
BEGIN
  -- Only trigger for cancellation or no-show
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    
    v_notification_type := CASE 
      WHEN NEW.status = 'cancelled' THEN 'cancellation'
      WHEN NEW.status = 'no-show' THEN 'no-show'
    END;
    
    -- Queue the email notification ONLY
    PERFORM queue_clinic_email(NEW.id, v_notification_type);
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS send_clinic_email_on_status_change ON trips;

CREATE TRIGGER send_clinic_email_on_status_change
  AFTER UPDATE OF status ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clinic_email_on_status_change();

-- Add helpful comment
COMMENT ON FUNCTION trigger_clinic_email_on_status_change IS 
'Sends email notification to clinic when trip is cancelled or marked no-show. Emails use facility contact_email from Facility Management.';