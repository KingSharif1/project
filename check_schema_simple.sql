-- Check exact columns in users table
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position;

-- Check exact columns in drivers table  
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'drivers' ORDER BY ordinal_position;

-- Check exact columns in trips table
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' ORDER BY ordinal_position;
