/*
  # Fix Driver Status Constraint and Keep Drivers Always Available

  1. Changes
    - Update drivers status check constraint to include 'offline'
    - Set all drivers to 'available' status
    
  2. Purpose
    - Drivers should always be available unless deactivated (is_active = false)
    - Fix constraint violation errors
*/

-- Drop the old constraint
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;

-- Add updated constraint that includes 'offline'
ALTER TABLE drivers ADD CONSTRAINT drivers_status_check 
  CHECK (status IN ('available', 'on_trip', 'offline', 'off_duty'));

-- Set all active drivers to 'available' status
UPDATE drivers SET status = 'available' WHERE is_active = true;