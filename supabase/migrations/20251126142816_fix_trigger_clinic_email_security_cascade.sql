/*
  # Fix Trigger Function Security for Email Notifications

  1. Changes
    - Recreate trigger_clinic_email_on_status_change with SECURITY DEFINER
    - Allows trigger to bypass RLS when queuing emails
    - Ensures automated notifications work without permission errors

  2. Security
    - Function runs with elevated privileges
    - Only called by database triggers (not directly by users)
    - Safe because it only queues emails for status changes
*/

-- Drop existing function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS trigger_clinic_email_on_status_change() CASCADE;

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION trigger_clinic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypass RLS for automated triggers
SET search_path = public
AS $$
BEGIN
  -- Only trigger for cancellation or no-show
  IF NEW.status IN ('cancelled', 'no-show') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'no-show')) THEN
    
    -- Queue the email notification
    PERFORM queue_clinic_email(
      NEW.id,
      CASE 
        WHEN NEW.status = 'cancelled' THEN 'cancellation'
        WHEN NEW.status = 'no-show' THEN 'no-show'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER send_clinic_email_on_status_change
  AFTER UPDATE OF status ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clinic_email_on_status_change();