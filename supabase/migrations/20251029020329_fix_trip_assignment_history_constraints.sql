/*
  # Fix Trip Assignment History Constraints

  1. Changes
    - Make dispatcher_name nullable in trip_assignment_history table
    - Allow trip creation without requiring a dispatcher
    
  2. Security
    - No changes to RLS policies
*/

-- Make dispatcher_name nullable to allow trip creation without dispatcher
ALTER TABLE trip_assignment_history 
ALTER COLUMN dispatcher_name DROP NOT NULL;
