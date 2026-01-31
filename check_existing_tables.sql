-- Check what tables actually exist in the database
-- Run this in Supabase SQL Editor to see current state

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
