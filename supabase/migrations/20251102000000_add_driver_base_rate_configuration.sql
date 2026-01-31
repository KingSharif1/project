/*
  # Add Driver Base Rate Configuration

  ## Summary
  Adds comprehensive base rate configuration fields to the drivers table for all service levels.
  Each service level (ambulatory, wheelchair, stretcher) now has:
  - Base rate (flat fee)
  - Base miles (included in base rate)
  - Additional mile rate (charge per mile over base)

  ## Changes
  1. Add 9 new columns to drivers table:
     - ambulatory_rate, ambulatory_base_miles, ambulatory_additional_mile_rate
     - wheelchair_rate, wheelchair_base_miles, wheelchair_additional_mile_rate
     - stretcher_rate, stretcher_base_miles, stretcher_additional_mile_rate

  ## Rate Calculation Logic
  For a trip:
  1. Round miles to nearest whole number
  2. Use base rate if miles <= base miles
  3. If miles > base miles:
     - Total = base_rate + ((miles - base_miles) × additional_mile_rate)

  ## Example
  Ambulatory: $25 base for 10 miles, $1.50 per additional mile
  - 8 miles: $25 (within base)
  - 15 miles: $25 + (5 × $1.50) = $32.50

  ## Security
  - No RLS changes (inherits from drivers table)
  - Fields are nullable (use existing rate tiers if null)
*/

-- Add ambulatory rate configuration
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS ambulatory_rate DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ambulatory_base_miles INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ambulatory_additional_mile_rate DECIMAL(10, 2) DEFAULT NULL;

-- Add wheelchair rate configuration
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS wheelchair_rate DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wheelchair_base_miles INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wheelchair_additional_mile_rate DECIMAL(10, 2) DEFAULT NULL;

-- Add stretcher rate configuration
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS stretcher_rate DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stretcher_base_miles INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stretcher_additional_mile_rate DECIMAL(10, 2) DEFAULT NULL;

-- Add helpful comments
COMMENT ON COLUMN drivers.ambulatory_rate IS 'Base rate for ambulatory trips (flat fee)';
COMMENT ON COLUMN drivers.ambulatory_base_miles IS 'Miles included in ambulatory base rate';
COMMENT ON COLUMN drivers.ambulatory_additional_mile_rate IS 'Rate per mile over base miles for ambulatory';

COMMENT ON COLUMN drivers.wheelchair_rate IS 'Base rate for wheelchair trips (flat fee)';
COMMENT ON COLUMN drivers.wheelchair_base_miles IS 'Miles included in wheelchair base rate';
COMMENT ON COLUMN drivers.wheelchair_additional_mile_rate IS 'Rate per mile over base miles for wheelchair';

COMMENT ON COLUMN drivers.stretcher_rate IS 'Base rate for stretcher trips (flat fee)';
COMMENT ON COLUMN drivers.stretcher_base_miles IS 'Miles included in stretcher base rate';
COMMENT ON COLUMN drivers.stretcher_additional_mile_rate IS 'Rate per mile over base miles for stretcher';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_drivers_ambulatory_rate ON drivers(ambulatory_rate) WHERE ambulatory_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_wheelchair_rate ON drivers(wheelchair_rate) WHERE wheelchair_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_stretcher_rate ON drivers(stretcher_rate) WHERE stretcher_rate IS NOT NULL;

-- Example: Set default rates for existing drivers (optional - comment out if not needed)
/*
UPDATE drivers SET
  ambulatory_rate = 25.00,
  ambulatory_base_miles = 10,
  ambulatory_additional_mile_rate = 1.50,
  wheelchair_rate = 35.00,
  wheelchair_base_miles = 10,
  wheelchair_additional_mile_rate = 2.00,
  stretcher_rate = 50.00,
  stretcher_base_miles = 10,
  stretcher_additional_mile_rate = 2.50
WHERE ambulatory_rate IS NULL;
*/
