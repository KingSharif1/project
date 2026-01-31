/*
  # Add Immediate Email Processing via Edge Function

  1. Changes
    - Create function to call send-email-notification Edge Function
    - Add trigger to automatically process emails when queued
    - Emails are sent immediately when trips are cancelled/no-show
    
  2. How It Works
    - When email is inserted into email_notification_log
    - Trigger calls http_post_email_notification function
    - Function invokes Edge Function with log_id
    - Edge Function sends email via Resend (if configured)
    
  3. Security
    - Uses pg_net extension for HTTP requests
    - Service role key for Edge Function authentication
    - Async processing - doesn't block trip updates
*/

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call the send-email-notification Edge Function
CREATE OR REPLACE FUNCTION http_post_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_request_id bigint;
BEGIN
  -- Get Supabase URL and service role key
  -- These should be set as database settings or you can hardcode for testing
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not configured, skip (don't fail the insert)
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or service role key not configured - email queued but not sent';
    RETURN NEW;
  END IF;

  -- Make async HTTP POST to Edge Function
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('log_id', NEW.id::text)
  ) INTO v_request_id;

  RAISE NOTICE 'Email notification Edge Function called: request_id=%', v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if HTTP call fails
    RAISE NOTICE 'Failed to call email notification function: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on email_notification_log
DROP TRIGGER IF EXISTS trigger_send_email_on_insert ON email_notification_log;

CREATE TRIGGER trigger_send_email_on_insert
  AFTER INSERT ON email_notification_log
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION http_post_email_notification();

-- Add helpful comment
COMMENT ON FUNCTION http_post_email_notification IS 
'Automatically calls send-email-notification Edge Function when email is queued. Requires app.settings.supabase_url and app.settings.service_role_key to be configured.';