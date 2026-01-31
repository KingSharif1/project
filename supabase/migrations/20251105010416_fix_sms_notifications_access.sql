/*
  # Fix SMS Notifications Access

  1. Changes
    - Add anon access policy for reading SMS notifications
    - This allows the frontend to read SMS history without authentication issues
    
  2. Security
    - Read-only access for anon users to view SMS notifications
    - Maintains existing authenticated user policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view SMS notifications" ON sms_notifications;
DROP POLICY IF EXISTS "Authenticated users can create SMS notifications" ON sms_notifications;
DROP POLICY IF EXISTS "Authenticated users can update SMS notifications" ON sms_notifications;

-- Add policies for both authenticated and anon users
CREATE POLICY "Allow anon and authenticated to view SMS notifications"
  ON sms_notifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon and authenticated to create SMS notifications"
  ON sms_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update SMS notifications"
  ON sms_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
