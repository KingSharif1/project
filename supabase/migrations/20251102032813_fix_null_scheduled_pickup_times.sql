/*
  # Fix Null Scheduled Pickup Times

  1. Problem
    - 28 trips in database have null scheduled_pickup_time
    - These trips display as 01/01/1970 in the UI
    - They pass through date filters incorrectly
  
  2. Solution
    - For will_call trips, null scheduled_pickup_time is acceptable
    - For non will_call trips, set scheduled_pickup_time to created_at if null
    
  3. Changes
    - Update trips with null scheduled_pickup_time (excluding will_call)
    - Set to created_at as fallback
*/

-- Update non-will-call trips with null scheduled_pickup_time
UPDATE trips 
SET scheduled_pickup_time = created_at
WHERE scheduled_pickup_time IS NULL 
  AND (will_call IS NULL OR will_call = false);

-- Log how many were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM trips
  WHERE scheduled_pickup_time IS NOT NULL 
    AND (will_call IS NULL OR will_call = false);
  
  RAISE NOTICE 'Updated % trips with null scheduled_pickup_time', updated_count;
END $$;
