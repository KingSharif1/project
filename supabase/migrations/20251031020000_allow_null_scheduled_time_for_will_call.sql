/*
  # Allow NULL scheduled_pickup_time for Will Call trips

  1. Changes
    - Modify trips.scheduled_pickup_time to allow NULL values
    - This supports Will Call trips where pickup time is not scheduled in advance
    - Driver will set actual_pickup_time when they arrive

  2. Notes
    - Will Call trips have will_call = true and scheduled_pickup_time = NULL
    - Regular scheduled trips still require scheduled_pickup_time
    - Maintains data integrity while supporting flexible scheduling
*/

-- Allow NULL for scheduled_pickup_time to support Will Call trips
ALTER TABLE trips
ALTER COLUMN scheduled_pickup_time DROP NOT NULL;

-- Add a check constraint to ensure either scheduled_pickup_time exists OR will_call is true
ALTER TABLE trips
DROP CONSTRAINT IF EXISTS trips_scheduled_time_or_will_call_check;

ALTER TABLE trips
ADD CONSTRAINT trips_scheduled_time_or_will_call_check
CHECK (
  scheduled_pickup_time IS NOT NULL OR will_call = true
);

-- Add index for will_call trips to optimize queries
CREATE INDEX IF NOT EXISTS idx_trips_will_call ON trips(will_call) WHERE will_call = true;
