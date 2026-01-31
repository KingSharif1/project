/*
  # Add cancelled_at timestamp to trips table

  1. Changes
    - Add `cancelled_at` column to trips table to track when trips were cancelled
    - This allows proper auditing of trip cancellations
  
  2. Notes
    - Column is nullable since only cancelled trips will have this value
    - Uses timestamptz for timezone awareness
*/

-- Add cancelled_at column to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;