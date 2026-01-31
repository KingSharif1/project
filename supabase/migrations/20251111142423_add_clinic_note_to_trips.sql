/*
  # Add Clinic Note Field to Trips Table
  
  1. Changes
    - Add `clinic_note` column to `trips` table to store 4-digit clinic codes
    - This field is used by MHMR users to track clinic-specific codes for trips
  
  2. Notes
    - Field is optional (nullable) as not all facilities use clinic codes
    - Maximum length of 10 characters to accommodate various code formats
*/

-- Add clinic_note column to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'clinic_note'
  ) THEN
    ALTER TABLE trips ADD COLUMN clinic_note text;
  END IF;
END $$;

-- Add index for faster lookups by clinic note
CREATE INDEX IF NOT EXISTS idx_trips_clinic_note ON trips(clinic_note) WHERE clinic_note IS NOT NULL;
