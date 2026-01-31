-- Get ACTUAL columns for users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Get ACTUAL columns for drivers table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drivers'
ORDER BY ordinal_position;

-- Get ACTUAL columns for trips table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trips'
ORDER BY ordinal_position;
