/*
  # Add missing columns to trips table

  1. New Columns
    - `appointment_time` (timestamptz) - Time of patient's medical appointment
    - `service_level` (text) - Duplicate of trip_type for backward compatibility
    - `journey_type` (text) - Type of journey (one-way, roundtrip, etc.)
  
  2. Notes
    - These columns support the frontend Trip interface
    - service_level mirrors trip_type for API compatibility
    - All columns are nullable since they may not apply to all trips
*/

-- Add appointment_time column
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS appointment_time timestamptz;

-- Add service_level column (for API compatibility, mirrors trip_type)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS service_level text;

-- Add journey_type column
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS journey_type text DEFAULT 'one-way';

-- Create index for faster queries on appointment_time
CREATE INDEX IF NOT EXISTS idx_trips_appointment_time ON trips(appointment_time);
