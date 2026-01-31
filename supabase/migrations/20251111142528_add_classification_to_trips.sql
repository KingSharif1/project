/*
  # Add Classification Field to Trips Table
  
  1. Changes
    - Add `classification` column to `trips` table to store trip classifications
    - Used by MHMR to categorize trips (e.g., "Child & Family", "RAPP", "BH", etc.)
  
  2. Notes
    - Field is optional (nullable) as not all facilities use classifications
*/

-- Add classification column to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'classification'
  ) THEN
    ALTER TABLE trips ADD COLUMN classification text;
  END IF;
END $$;

-- Add index for faster filtering by classification
CREATE INDEX IF NOT EXISTS idx_trips_classification ON trips(classification) WHERE classification IS NOT NULL;
