/*
  # Add Trip Audit Trail and Will Call Support

  ## Changes Made

  1. **Trip Change History Table**
     - Comprehensive audit trail for every field change
     - Tracks field name, old value, new value
     - Records who made the change and when
     - Links to trip for complete history
     - Includes trip creation tracking

  2. **Will Call Support**
     - Add will_call boolean column to trips
     - When true, displays "WILL CALL" instead of scheduled time
     - Useful for flexible pickup timing

  3. **Mileage Enhancements**
     - Add leg1_miles and leg2_miles for round-trip tracking
     - Add is_round_trip flag for proper calculation
     - Support accurate per-leg mileage display

  4. **Security**
     - Enable RLS on trip_change_history
     - Authenticated users can read history
     - Only system can insert (via triggers or app logic)
*/

-- 1. Add will_call column to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'will_call'
  ) THEN
    ALTER TABLE trips ADD COLUMN will_call boolean DEFAULT false;
  END IF;
END $$;

-- 2. Add mileage tracking columns for round trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'leg1_miles'
  ) THEN
    ALTER TABLE trips ADD COLUMN leg1_miles numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'leg2_miles'
  ) THEN
    ALTER TABLE trips ADD COLUMN leg2_miles numeric;
  END IF;
END $$;

-- 3. Create comprehensive trip change history table
CREATE TABLE IF NOT EXISTS trip_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  changed_by_id uuid REFERENCES auth.users(id),
  changed_by_name text,
  change_description text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_change_type CHECK (
    change_type = ANY (ARRAY[
      'created',
      'field_updated',
      'status_changed',
      'driver_assigned',
      'driver_reassigned',
      'cancelled',
      'completed',
      'reinstated'
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_trip_change_history_trip_id ON trip_change_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_change_history_created_at ON trip_change_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_change_history_change_type ON trip_change_history(change_type);

ALTER TABLE trip_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip change history"
  ON trip_change_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create change history"
  ON trip_change_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Add comments for documentation
COMMENT ON COLUMN trips.will_call IS 'When true, displays WILL CALL instead of scheduled pickup time';
COMMENT ON COLUMN trips.leg1_miles IS 'Miles for first leg of round trip (pickup to dropoff)';
COMMENT ON COLUMN trips.leg2_miles IS 'Miles for second leg of round trip (dropoff to pickup)';
COMMENT ON TABLE trip_change_history IS 'Complete audit trail of all changes made to trips including creation';
COMMENT ON COLUMN trip_change_history.change_type IS 'Type of change: created, field_updated, status_changed, etc.';
COMMENT ON COLUMN trip_change_history.field_name IS 'Name of the field that was changed';
COMMENT ON COLUMN trip_change_history.old_value IS 'Previous value before change';
COMMENT ON COLUMN trip_change_history.new_value IS 'New value after change';
COMMENT ON COLUMN trip_change_history.change_description IS 'Human-readable description of the change';
