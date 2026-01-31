-- Query drivers table columns
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'drivers' ORDER BY ordinal_position;

-- Query trips table columns
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' ORDER BY ordinal_position;
