/*
  # Add Additional Mile Rate Column

  1. Changes
    - Add additional_mile_rate column to driver_rate_tiers table
    - This column stores the per-mile rate charged for miles beyond the tier's base range
    - Default value of 1.0 per additional mile
    
  2. Updates
    - Update existing tiers with appropriate additional mile rates based on service level
    - Ambulatory: $1.20/mile
    - Wheelchair: $2.00/mile
    - Stretcher: $2.50/mile
*/

-- Add additional_mile_rate column
ALTER TABLE driver_rate_tiers 
ADD COLUMN IF NOT EXISTS additional_mile_rate numeric DEFAULT 1.0;

-- Update existing tiers with default additional mile rates based on service level
UPDATE driver_rate_tiers 
SET additional_mile_rate = CASE 
  WHEN service_level = 'ambulatory' THEN 1.20
  WHEN service_level = 'wheelchair' THEN 2.00
  WHEN service_level = 'stretcher' THEN 2.50
  ELSE 1.0
END
WHERE additional_mile_rate IS NULL OR additional_mile_rate = 1.0;
