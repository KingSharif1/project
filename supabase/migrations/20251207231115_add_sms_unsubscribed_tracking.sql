/*
  # Add SMS Unsubscribed Tracking

  1. New Tables
    - `sms_unsubscribed`
      - `id` (uuid, primary key)
      - `phone_number` (text, unique) - Formatted phone number with country code
      - `is_unsubscribed` (boolean) - Current subscription status
      - `unsubscribed_at` (timestamptz) - When they opted out
      - `resubscribed_at` (timestamptz) - When they opted back in
      - `notes` (text) - Optional notes about the unsubscribe
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sms_unsubscribed` table
    - Add policy for authenticated users to read unsubscribed list
    - Add policy for service role to manage unsubscribe list

  3. Changes
    - Prevents sending SMS to phone numbers that have opted out
    - Tracks opt-in/opt-out history
    - Improves user privacy and Twilio compliance
*/

-- Create sms_unsubscribed table
CREATE TABLE IF NOT EXISTS sms_unsubscribed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  is_unsubscribed boolean DEFAULT true,
  unsubscribed_at timestamptz DEFAULT now(),
  resubscribed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sms_unsubscribed ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view unsubscribed numbers"
  ON sms_unsubscribed
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert unsubscribed numbers"
  ON sms_unsubscribed
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update unsubscribed numbers"
  ON sms_unsubscribed
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sms_unsubscribed_phone ON sms_unsubscribed(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_unsubscribed_status ON sms_unsubscribed(is_unsubscribed);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sms_unsubscribed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_unsubscribed_updated_at
  BEFORE UPDATE ON sms_unsubscribed
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_unsubscribed_updated_at();

-- Insert the currently failing number as unsubscribed
INSERT INTO sms_unsubscribed (phone_number, is_unsubscribed, unsubscribed_at, notes)
VALUES ('+16822218746', true, now(), 'Auto-added from Twilio error 21610')
ON CONFLICT (phone_number) DO NOTHING;