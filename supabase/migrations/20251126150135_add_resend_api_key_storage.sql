/*
  # Store Resend API Key for Email Sending

  1. Changes
    - Create secrets table to store API keys securely
    - Insert Resend API key
    - Update send_email_via_resend to use secrets table
    
  2. Security
    - Only service role can access secrets
    - Keys are stored encrypted at rest by Supabase
    - RLS prevents unauthorized access
*/

-- Create secrets table
CREATE TABLE IF NOT EXISTS system_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access
CREATE POLICY "Only service role can access secrets"
  ON system_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert Resend API key
INSERT INTO system_secrets (key_name, key_value, description)
VALUES (
  'RESEND_API_KEY',
  're_DM63SVaj_5nJnddWw2Vi4fZ4ajubLXG8N',
  'Resend API key for sending clinic email notifications'
)
ON CONFLICT (key_name) 
DO UPDATE SET 
  key_value = EXCLUDED.key_value,
  updated_at = now();

-- Update function to use secrets table
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
BEGIN
  -- Get email log entry
  SELECT * INTO v_email_log
  FROM email_notification_log
  WHERE id = p_log_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email log not found or already sent');
  END IF;

  -- Get Resend API key from secrets table
  SELECT key_value INTO v_resend_key
  FROM system_secrets
  WHERE key_name = 'RESEND_API_KEY';

  -- If no API key, mark as pending with note
  IF v_resend_key IS NULL OR v_resend_key = '' THEN
    UPDATE email_notification_log
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'note', 'Resend API key not found in system_secrets',
      'checked_at', now()
    )
    WHERE id = p_log_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Resend API key not configured'
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
        'sent_via', 'pg_net_resend',
        'sent_at_timestamp', now()
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