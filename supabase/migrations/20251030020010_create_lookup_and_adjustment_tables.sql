/*
  # Create Lookup Tables and Driver Adjustment System

  1. New Tables
    - `service_level_codes` - Store service level codes (ambulatory, wheelchair, stretcher)
    - `trip_status_codes` - Store trip status codes and descriptions
    - `journey_type_codes` - Store journey types (one-way, round-trip, will-call)
    - `driver_payout_adjustments` - Store bonuses, deductions, loans, etc. for drivers
    
  2. Purpose
    - Centralize all code values in database instead of hardcoding
    - Track driver payout adjustments for accurate billing
    - Enable flexible adjustment types (bonus, deduction, loan, advance, etc.)
    
  3. Security
    - Enable RLS on all tables
    - Only authenticated users can read codes
    - Only authenticated users can manage adjustments
*/

-- Service Level Codes Table
CREATE TABLE IF NOT EXISTS service_level_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_level_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read service level codes"
  ON service_level_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Trip Status Codes Table
CREATE TABLE IF NOT EXISTS trip_status_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#gray',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trip_status_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read trip status codes"
  ON trip_status_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Journey Type Codes Table
CREATE TABLE IF NOT EXISTS journey_type_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journey_type_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read journey type codes"
  ON journey_type_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Driver Payout Adjustments Table
CREATE TABLE IF NOT EXISTS driver_payout_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'loan', 'loan_payment', 'advance', 'reimbursement', 'penalty', 'tip', 'other')),
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  reference_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  reference_number text,
  applied_date date DEFAULT CURRENT_DATE,
  period_start date,
  period_end date,
  is_recurring boolean DEFAULT false,
  recurring_frequency text CHECK (recurring_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly') OR recurring_frequency IS NULL),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_payout_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read driver adjustments"
  ON driver_payout_adjustments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert driver adjustments"
  ON driver_payout_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update driver adjustments"
  ON driver_payout_adjustments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete driver adjustments"
  ON driver_payout_adjustments
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default service level codes
INSERT INTO service_level_codes (code, name, description, display_order) VALUES
  ('ambulatory', 'Ambulatory', 'Patient can walk and needs minimal assistance', 1),
  ('wheelchair', 'Wheelchair', 'Patient requires wheelchair transportation', 2),
  ('stretcher', 'Stretcher', 'Patient requires stretcher/gurney transportation', 3)
ON CONFLICT (code) DO NOTHING;

-- Insert default trip status codes
INSERT INTO trip_status_codes (code, name, description, color, display_order) VALUES
  ('pending', 'Pending', 'Trip created but not yet scheduled', '#gray', 1),
  ('scheduled', 'Scheduled', 'Trip scheduled with date/time', '#blue', 2),
  ('assigned', 'Assigned', 'Driver assigned to trip', '#cyan', 3),
  ('arrived', 'Arrived', 'Driver arrived at pickup location', '#indigo', 4),
  ('on-way', 'On Way', 'Patient picked up, en route to destination', '#purple', 5),
  ('in_progress', 'In Progress', 'Trip in progress', '#yellow', 6),
  ('completed', 'Completed', 'Trip completed successfully', '#green', 7),
  ('cancelled', 'Cancelled', 'Trip cancelled', '#red', 8),
  ('no-show', 'No Show', 'Patient did not show up', '#orange', 9)
ON CONFLICT (code) DO NOTHING;

-- Insert default journey type codes
INSERT INTO journey_type_codes (code, name, description, display_order) VALUES
  ('one-way', 'One Way', 'Single trip from pickup to dropoff', 1),
  ('round-trip', 'Round Trip', 'Trip with return journey', 2),
  ('will-call', 'Will Call', 'Wait and return trip', 3)
ON CONFLICT (code) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_driver_adjustments_driver_id ON driver_payout_adjustments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_adjustments_applied_date ON driver_payout_adjustments(applied_date);
CREATE INDEX IF NOT EXISTS idx_driver_adjustments_status ON driver_payout_adjustments(status);