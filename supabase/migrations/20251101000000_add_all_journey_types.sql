/*
  # Add All Journey Types

  ## Summary
  Adds multi-stop and recurring journey types to the journey_type_codes lookup table
  to support all four trip types: one-way, round-trip, multi-stop, and recurring.

  ## Changes
  1. Inserts multi-stop and recurring journey types into journey_type_codes table
  2. Updates any existing records if needed

  ## Journey Types
  - one-way: Single trip from pickup to dropoff
  - round-trip: Trip with return journey
  - multi-stop: Trip with multiple intermediate stops
  - recurring: Recurring scheduled trips (daily, weekly, etc.)
  - will-call: Wait and return trip (legacy)

  ## Security
  - No RLS changes needed (inherits from existing table)
*/

-- Add multi-stop and recurring journey types
INSERT INTO journey_type_codes (code, name, description, display_order) VALUES
  ('multi-stop', 'Multi-Stop', 'Trip with multiple intermediate stops', 4),
  ('recurring', 'Recurring', 'Recurring scheduled trips', 5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Update existing journey_type_codes if needed
UPDATE journey_type_codes SET
  name = 'One-Way',
  description = 'Single trip from pickup to dropoff location'
WHERE code = 'one-way';

UPDATE journey_type_codes SET
  name = 'Round-Trip',
  description = 'Trip with scheduled return journey'
WHERE code = 'round-trip';

UPDATE journey_type_codes SET
  name = 'Will Call',
  description = 'Wait at location and return (unscheduled return)'
WHERE code = 'will-call';
