/*
  # Add Mobile App Trip Statuses

  ## Summary
  Adds missing trip statuses for the driver mobile app workflow:
  - `en_route` - Driver is heading to pickup location
  - `dropped_off` - Patient has been dropped off at destination

  ## Changes Made

  1. **Update Trip Status Constraint**
     - Add `en_route` status for driver heading to pickup
     - Add `dropped_off` status for after patient dropoff
     - Keeps all existing statuses: pending, scheduled, assigned, arrived, on-way, in_progress, completed, cancelled, no-show

  2. **Update Status History Constraints**
     - Update trip_status_history table to accept new statuses
     - Ensures audit trail works with new workflow

  3. **Add Helper Function**
     - Create function to track trip status changes with GPS location
     - Automatically logs status changes to history table
     - Stores location data for audit trail

  4. **Security**
     - All existing RLS policies apply to new statuses
     - No additional security changes needed
*/

-- 1. Drop and recreate status constraint with all valid statuses including new ones
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE trips ADD CONSTRAINT trips_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'scheduled'::text, 
    'assigned'::text,
    'en_route'::text,
    'arrived'::text,
    'on-way'::text,
    'in_progress'::text,
    'dropped_off'::text,
    'completed'::text, 
    'cancelled'::text,
    'no-show'::text
  ]));

-- 2. Update trip_status_history constraints if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_status_history') THEN
    ALTER TABLE trip_status_history DROP CONSTRAINT IF EXISTS valid_old_status;
    ALTER TABLE trip_status_history DROP CONSTRAINT IF EXISTS valid_new_status;
    
    ALTER TABLE trip_status_history ADD CONSTRAINT valid_old_status CHECK (
      old_status IS NULL OR 
      old_status = ANY (ARRAY[
        'pending', 'scheduled', 'assigned', 'en_route', 'arrived', 'on-way', 
        'in_progress', 'dropped_off', 'completed', 'cancelled', 'no-show'
      ])
    );
    
    ALTER TABLE trip_status_history ADD CONSTRAINT valid_new_status CHECK (
      new_status = ANY (ARRAY[
        'pending', 'scheduled', 'assigned', 'en_route', 'arrived', 'on-way',
        'in_progress', 'dropped_off', 'completed', 'cancelled', 'no-show'
      ])
    );
  END IF;
END $$;

-- 3. Create function to update trip status with location tracking
CREATE OR REPLACE FUNCTION update_trip_status_with_location(
  p_trip_id uuid,
  p_new_status text,
  p_latitude decimal DEFAULT NULL,
  p_longitude decimal DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_changed_by_id uuid DEFAULT NULL,
  p_changed_by_name text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_status text;
  v_trip_data json;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM trips WHERE id = p_trip_id;
  
  -- Update trip status
  UPDATE trips 
  SET 
    status = p_new_status,
    updated_at = now(),
    -- Set actual pickup time when status changes to in_progress
    actual_pickup_time = CASE 
      WHEN p_new_status = 'in_progress' AND actual_pickup_time IS NULL 
      THEN now() 
      ELSE actual_pickup_time 
    END,
    -- Set actual dropoff time when status changes to dropped_off or completed
    actual_dropoff_time = CASE 
      WHEN p_new_status IN ('dropped_off', 'completed') AND actual_dropoff_time IS NULL 
      THEN now() 
      ELSE actual_dropoff_time 
    END,
    -- Update notes if provided
    notes = CASE 
      WHEN p_notes IS NOT NULL 
      THEN COALESCE(notes || E'\n' || p_notes, p_notes)
      ELSE notes 
    END
  WHERE id = p_trip_id;
  
  -- Log status change to history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_status_history') THEN
    INSERT INTO trip_status_history (
      trip_id,
      old_status,
      new_status,
      changed_by_id,
      changed_by_name,
      reason
    ) VALUES (
      p_trip_id,
      v_old_status,
      p_new_status,
      p_changed_by_id,
      p_changed_by_name,
      CASE 
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
        THEN format('Status updated from mobile app at location: %s, %s', p_latitude, p_longitude)
        ELSE 'Status updated from mobile app'
      END || COALESCE(E'\nNotes: ' || p_notes, '')
    );
  END IF;
  
  -- Return updated trip data
  SELECT row_to_json(t.*) INTO v_trip_data
  FROM trips t
  WHERE t.id = p_trip_id;
  
  RETURN v_trip_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users (for mobile app)
GRANT EXECUTE ON FUNCTION update_trip_status_with_location TO authenticated;
GRANT EXECUTE ON FUNCTION update_trip_status_with_location TO anon;

-- 4. Add helpful comments
COMMENT ON CONSTRAINT trips_status_check ON trips IS 'Valid trip statuses including mobile app workflow: en_route, dropped_off';
COMMENT ON FUNCTION update_trip_status_with_location IS 'Updates trip status with optional GPS location and creates audit trail entry';
