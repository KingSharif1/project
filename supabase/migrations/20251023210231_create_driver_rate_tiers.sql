/*
  # Create Driver Rate Tiers Tables

  1. New Tables
    - `driver_rate_tiers` - Stores multiple rate tiers per driver per service level
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key to drivers)
      - `service_level` (text) - 'ambulatory', 'wheelchair', or 'stretcher'
      - `from_miles` (decimal) - Start of mile range (e.g., 1)
      - `to_miles` (decimal) - End of mile range (e.g., 5)
      - `rate` (decimal) - Rate for this tier (e.g., 14.00)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Additional Rate Field
    - `additional_mile_rate` (decimal) - Rate per mile beyond highest tier

  3. Security
    - Enable RLS on driver_rate_tiers
    - Add policies for authenticated users

  4. Purpose
    - Support multiple distance-based rate tiers
    - Example: 1-5 mi @ $14, 6-10 mi @ $18, etc.
    - Plus additional rate for miles beyond all tiers
*/

-- Create driver_rate_tiers table
CREATE TABLE IF NOT EXISTS driver_rate_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  service_level text NOT NULL CHECK (service_level IN ('ambulatory', 'wheelchair', 'stretcher')),
  from_miles decimal(10,2) NOT NULL,
  to_miles decimal(10,2) NOT NULL,
  rate decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_mile_range CHECK (to_miles >= from_miles)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_rate_tiers_driver_id ON driver_rate_tiers(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_rate_tiers_service_level ON driver_rate_tiers(service_level);

-- Enable RLS
ALTER TABLE driver_rate_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read driver rate tiers"
  ON driver_rate_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage driver rate tiers"
  ON driver_rate_tiers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE driver_rate_tiers IS 'Stores multiple rate tiers per driver for each service level';
COMMENT ON COLUMN driver_rate_tiers.service_level IS 'Service level: ambulatory, wheelchair, or stretcher';
COMMENT ON COLUMN driver_rate_tiers.from_miles IS 'Start of mile range (inclusive)';
COMMENT ON COLUMN driver_rate_tiers.to_miles IS 'End of mile range (inclusive)';
COMMENT ON COLUMN driver_rate_tiers.rate IS 'Rate charged for this mile range';
