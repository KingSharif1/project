-- Backfill trip_status_history for existing trips
-- This creates an initial "created" entry for all trips that don't have status history

INSERT INTO trip_status_history (trip_id, status, changed_by, notes, changed_at)
SELECT 
  t.id as trip_id,
  t.status as status,
  NULL as changed_by,  -- trips table only has created_by_name (text), not user ID
  CONCAT('Trip created by ', COALESCE(t.created_by_name, 'System')) as notes,
  t.created_at as changed_at
FROM trips t
WHERE NOT EXISTS (
  SELECT 1 FROM trip_status_history tsh 
  WHERE tsh.trip_id = t.id
);

-- Add comment
COMMENT ON TABLE trip_status_history IS 'Tracks all status changes for trips. Each row represents a status transition with timestamp and user who made the change.';
