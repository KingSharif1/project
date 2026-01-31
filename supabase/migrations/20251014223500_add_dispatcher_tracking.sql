/*
  # Add Dispatcher Assignment Tracking

  1. Changes to trips table
    - Add `dispatcher_id` (UUID) - References auth.users
    - Add `dispatcher_name` (TEXT) - Full name of dispatcher who assigned/created trip
    - Add `dispatcher_assigned_at` (TIMESTAMPTZ) - When dispatcher made the assignment
    - Add `last_modified_by_id` (UUID) - Track who last modified the trip
    - Add `last_modified_by_name` (TEXT) - Name of last modifier
    
  2. New table: trip_assignment_history
    - Track complete history of dispatcher assignments
    - Includes dispatcher info, timestamp, and action taken
    
  3. Security
    - Enable RLS on trip_assignment_history
    - Add policies for authenticated users to read their own facility's data
    
  4. Indexes
    - Add index on dispatcher_id for faster lookups
    - Add index on dispatcher_assigned_at for reporting
*/

-- Add dispatcher tracking columns to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'dispatcher_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'dispatcher_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'dispatcher_assigned_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN dispatcher_assigned_at TIMESTAMPTZ DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'last_modified_by_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN last_modified_by_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'last_modified_by_name'
  ) THEN
    ALTER TABLE trips ADD COLUMN last_modified_by_name TEXT;
  END IF;
END $$;

-- Create trip assignment history table
CREATE TABLE IF NOT EXISTS trip_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id),
  dispatcher_id UUID REFERENCES auth.users(id),
  dispatcher_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'assigned', 'reassigned', 'updated', 'cancelled')),
  previous_driver_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_assignment_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_dispatcher_id ON trips(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_trips_dispatcher_assigned_at ON trips(dispatcher_assigned_at);
CREATE INDEX IF NOT EXISTS idx_trip_assignment_history_trip_id ON trip_assignment_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignment_history_dispatcher_id ON trip_assignment_history(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignment_history_created_at ON trip_assignment_history(created_at);

-- RLS Policies for trip_assignment_history

-- Admin can view all assignment history
CREATE POLICY "Admins can view all assignment history"
  ON trip_assignment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Dispatchers can view assignment history for their facility
CREATE POLICY "Dispatchers can view facility assignment history"
  ON trip_assignment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      JOIN auth.users ON auth.users.id = auth.uid()
      WHERE trips.id = trip_assignment_history.trip_id
      AND trips.facility_id = (auth.users.raw_user_meta_data->>'clinicId')::UUID
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'dispatcher')
    )
  );

-- Authenticated users can insert assignment history
CREATE POLICY "Authenticated users can insert assignment history"
  ON trip_assignment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = dispatcher_id);

-- Add comments for documentation
COMMENT ON COLUMN trips.dispatcher_id IS 'User ID of dispatcher who assigned/created the trip';
COMMENT ON COLUMN trips.dispatcher_name IS 'Full name of dispatcher who assigned/created the trip';
COMMENT ON COLUMN trips.dispatcher_assigned_at IS 'Timestamp when dispatcher made the assignment';
COMMENT ON COLUMN trips.last_modified_by_id IS 'User ID of person who last modified the trip';
COMMENT ON COLUMN trips.last_modified_by_name IS 'Full name of person who last modified the trip';
COMMENT ON TABLE trip_assignment_history IS 'Complete audit trail of all trip assignments and modifications';

-- Create function to automatically log assignment history
CREATE OR REPLACE FUNCTION log_trip_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT, log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO trip_assignment_history (
      trip_id,
      driver_id,
      dispatcher_id,
      dispatcher_name,
      action,
      notes
    ) VALUES (
      NEW.id,
      NEW.driver_id,
      NEW.dispatcher_id,
      NEW.dispatcher_name,
      'created',
      'Trip created'
    );
    RETURN NEW;
  END IF;
  
  -- On UPDATE, check if driver assignment changed
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.driver_id IS DISTINCT FROM NEW.driver_id) THEN
      INSERT INTO trip_assignment_history (
        trip_id,
        driver_id,
        dispatcher_id,
        dispatcher_name,
        action,
        previous_driver_id,
        notes
      ) VALUES (
        NEW.id,
        NEW.driver_id,
        NEW.last_modified_by_id,
        NEW.last_modified_by_name,
        CASE 
          WHEN OLD.driver_id IS NULL THEN 'assigned'
          ELSE 'reassigned'
        END,
        OLD.driver_id,
        CASE 
          WHEN OLD.driver_id IS NULL THEN 'Driver assigned to trip'
          ELSE 'Driver reassigned'
        END
      );
    ELSIF (NEW.last_modified_by_id IS NOT NULL AND NEW.last_modified_by_id != OLD.last_modified_by_id) THEN
      INSERT INTO trip_assignment_history (
        trip_id,
        driver_id,
        dispatcher_id,
        dispatcher_name,
        action,
        notes
      ) VALUES (
        NEW.id,
        NEW.driver_id,
        NEW.last_modified_by_id,
        NEW.last_modified_by_name,
        'updated',
        'Trip details updated'
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log assignments
DROP TRIGGER IF EXISTS trip_assignment_logger ON trips;
CREATE TRIGGER trip_assignment_logger
  AFTER INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION log_trip_assignment();
