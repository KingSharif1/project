/*
  # Fix Null Created At Dates in Trips Table

  1. Problem
    - Some trips in the database have null created_at timestamps
    - This causes dates to display as 01/01/1970
  
  2. Solution
    - Update all trips with null created_at to use their scheduled_pickup_time
    - If scheduled_pickup_time is also null, use current timestamp
    
  3. Changes
    - Update trips table to set created_at for all null values
    - Ensure future trips always have created_at set (already has DEFAULT now())
*/

-- Update trips with null created_at
UPDATE trips 
SET created_at = COALESCE(scheduled_pickup_time, now())
WHERE created_at IS NULL;

-- Update trips with null updated_at
UPDATE trips 
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL;

-- Ensure created_at and updated_at are never null going forward
-- (Already has DEFAULT now() but this ensures it's NOT NULL)
DO $$
BEGIN
  -- Make created_at NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' 
    AND column_name = 'created_at' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE trips ALTER COLUMN created_at SET NOT NULL;
  END IF;

  -- Make updated_at NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' 
    AND column_name = 'updated_at' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE trips ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;
