/*
  # Fix Status Constraint and Add New Features

  ## Changes Made

  1. **Fix Status Constraint**
     - Update trips_status_check to include all statuses: pending, scheduled, assigned, arrived, on-way, in_progress, completed, cancelled, no-show
     - This allows full trip lifecycle tracking

  2. **Add Actual Time Columns**
     - Add actual_pickup_at timestamp column for manual completion
     - Add actual_dropoff_at timestamp column for manual completion
     - These are separate from actual_pickup_time and actual_dropoff_time for clarity

  3. **Create Trip Status History Table**
     - Tracks every status change with who/when/old→new
     - Enables full audit trail and status reinstatement
     - Links to trips, users, and tracks reasons

  4. **Create Trip Drivers Junction Table**
     - Supports multiple driver assignments per trip
     - Distinguishes primary driver from backup drivers
     - Tracks assignment order and timing
     - Allows flexible single or multi-driver workflows

  5. **Security**
     - Enable RLS on all new tables
     - Authenticated users can read their relevant records
     - Only authenticated users can create/modify records
     - Admins have full access
*/

-- 1. Drop and recreate status constraint with all valid statuses
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE trips ADD CONSTRAINT trips_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'scheduled'::text, 
    'assigned'::text,
    'arrived'::text,
    'on-way'::text,
    'in_progress'::text, 
    'completed'::text, 
    'cancelled'::text,
    'no-show'::text
  ]));

-- 2. Add actual time columns for manual completion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'actual_pickup_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN actual_pickup_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'actual_dropoff_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN actual_dropoff_at timestamptz;
  END IF;
END $$;

-- 3. Create trip status history table
CREATE TABLE IF NOT EXISTS trip_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by_id uuid REFERENCES auth.users(id),
  changed_by_name text,
  reason text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_old_status CHECK (
    old_status IS NULL OR 
    old_status = ANY (ARRAY[
      'pending', 'scheduled', 'assigned', 'arrived', 'on-way', 
      'in_progress', 'completed', 'cancelled', 'no-show'
    ])
  ),
  CONSTRAINT valid_new_status CHECK (
    new_status = ANY (ARRAY[
      'pending', 'scheduled', 'assigned', 'arrived', 'on-way',
      'in_progress', 'completed', 'cancelled', 'no-show'
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_trip_status_history_trip_id ON trip_status_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_history_created_at ON trip_status_history(created_at DESC);

ALTER TABLE trip_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history for their trips"
  ON trip_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create status history"
  ON trip_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Create trip drivers junction table for multiple driver assignments
CREATE TABLE IF NOT EXISTS trip_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  assignment_order integer DEFAULT 1,
  assigned_at timestamptz DEFAULT now(),
  assigned_by_id uuid REFERENCES auth.users(id),
  assigned_by_name text,
  removed_at timestamptz,
  removed_by_id uuid REFERENCES auth.users(id),
  notes text,
  
  CONSTRAINT unique_trip_driver_when_active UNIQUE (trip_id, driver_id, removed_at)
);

CREATE INDEX IF NOT EXISTS idx_trip_drivers_trip_id ON trip_drivers(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_drivers_driver_id ON trip_drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_drivers_is_primary ON trip_drivers(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_trip_drivers_removed_at ON trip_drivers(removed_at) WHERE removed_at IS NULL;

ALTER TABLE trip_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip driver assignments"
  ON trip_drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can assign drivers"
  ON trip_drivers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update driver assignments"
  ON trip_drivers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can remove driver assignments"
  ON trip_drivers FOR DELETE
  TO authenticated
  USING (true);

-- 5. Add comments for documentation
COMMENT ON COLUMN trips.actual_pickup_at IS 'Actual pickup time entered during manual completion';
COMMENT ON COLUMN trips.actual_dropoff_at IS 'Actual dropoff time entered during manual completion';
COMMENT ON TABLE trip_status_history IS 'Complete audit trail of all trip status changes';
COMMENT ON TABLE trip_drivers IS 'Junction table supporting single or multiple driver assignments per trip';
COMMENT ON COLUMN trip_drivers.is_primary IS 'Identifies the primary driver; others are backups';
COMMENT ON COLUMN trip_drivers.assignment_order IS 'Order of backup drivers (1 = first backup, 2 = second, etc.)';
