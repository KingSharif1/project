/*
  # Add Immediate Email Processing

  1. Changes
    - Create function to process pending emails via Resend API
    - Emails are sent directly from database function
    - No need for Edge Function calls or configuration
    
  2. How It Works
    - When email is queued, function attempts to send immediately
    - Uses pg_net extension to call Resend API directly
    - Falls back gracefully if Resend not configured
    
  3. Security
    - Requires RESEND_API_KEY in database settings
    - Uses secure HTTPS calls to Resend API
*/

-- Function to send email directly via Resend API
CREATE OR REPLACE FUNCTION send_email_via_resend(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_log record;
  v_resend_key text;
  v_request_id bigint;
  v_response jsonb;
BEGIN
  -- Get email log entry
  SELECT * INTO v_email_log
  FROM email_notification_log
  WHERE id = p_log_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email log not found or already sent');
  END IF;

  -- Try to get Resend API key from settings
  v_resend_key := current_setting('app.settings.resend_api_key', true);

  -- If no API key, mark as pending with note
  IF v_resend_key IS NULL OR v_resend_key = '' THEN
    UPDATE email_notification_log
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'note', 'Resend API key not configured',
      'checked_at', now()
    )
    WHERE id = p_log_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Resend API key not configured',
      'instructions', 'Add RESEND_API_KEY to Supabase Edge Function secrets'
    );
  END IF;

  -- Send email via Resend API using pg_net
  BEGIN
    SELECT net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_resend_key
      ),
      body := jsonb_build_object(
        'from', 'Fort Worth Transportation <onboarding@resend.dev>',
        'to', ARRAY[v_email_log.recipient_email],
        'subject', v_email_log.subject,
        'html', v_email_log.body_html,
        'text', v_email_log.body_text
      )
    ) INTO v_request_id;

    -- Update email status to sent
    UPDATE email_notification_log
    SET 
      status = 'sent',
      sent_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'request_id', v_request_id,
        'sent_via', 'pg_net_resend'
      )
    WHERE id = p_log_id;

    RETURN jsonb_build_object(
      'success', true,
      'log_id', p_log_id,
      'request_id', v_request_id,
      'recipient', v_email_log.recipient_email
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Update with failure
      UPDATE email_notification_log
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = p_log_id;

      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Update trigger to call send function immediately
DROP TRIGGER IF EXISTS trigger_send_email_on_insert ON email_notification_log;
DROP FUNCTION IF EXISTS http_post_email_notification() CASCADE;

CREATE OR REPLACE FUNCTION trigger_send_email_immediately()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to send email immediately (async, won't block)
  PERFORM send_email_via_resend(NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if sending fails
    RAISE NOTICE 'Failed to send email: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_send_email_on_insert
  AFTER INSERT ON email_notification_log
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_send_email_immediately();

-- Function to manually process all pending emails
CREATE OR REPLACE FUNCTION process_pending_emails()
RETURNS TABLE(log_id uuid, recipient text, status text, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email record;
  v_result jsonb;
BEGIN
  FOR v_email IN 
    SELECT id, recipient_email
    FROM email_notification_log
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    v_result := send_email_via_resend(v_email.id);
    
    RETURN QUERY SELECT 
      v_email.id,
      v_email.recipient_email,
      CASE 
        WHEN v_result->>'success' = 'true' THEN 'sent'
        ELSE 'failed'
      END,
      COALESCE(v_result->>'error', 'Success');
  END LOOP;
END;
$$;

COMMENT ON FUNCTION send_email_via_resend IS 
'Sends email via Resend API. Requires app.settings.resend_api_key to be configured.';

COMMENT ON FUNCTION process_pending_emails IS 
'Manually processes up to 10 pending emails. Run this to send any queued emails.';