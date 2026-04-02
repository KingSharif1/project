-- Migration: Rename account_number to member_id in patients table
-- Date: 2026-03-27
-- Description: Rename account_number column to member_id for better clarity

ALTER TABLE patients 
RENAME COLUMN account_number TO member_id;

-- Update any indexes or constraints if they reference the old column name
-- (None exist for this column based on current schema)

COMMENT ON COLUMN patients.member_id IS 'Unique member identifier for the patient';
