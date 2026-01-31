-- Add clinic_id columns to enable role-based access control
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ocjqsnocuqyumoltighi/sql

-- NOTE: The actual table is called 'facilities' not 'clinics'
-- We'll add clinic_id columns that reference the facilities table

-- Add clinic_id to users table (if not exists)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.facilities(id);

-- Add clinic_id to drivers table (if not exists)
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.facilities(id);

-- Add facility_id to trips table (if not exists)
-- This should already exist from migration, but adding just in case
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id);

-- Add clinic_id to trips table (if not exists)
-- This will be used for easier querying
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.facilities(id);

-- Add dispatcher_id to trips table (if not exists)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS dispatcher_id UUID REFERENCES public.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_drivers_clinic_id ON public.drivers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_trips_facility_id ON public.trips(facility_id);
CREATE INDEX IF NOT EXISTS idx_trips_clinic_id ON public.trips(clinic_id);
CREATE INDEX IF NOT EXISTS idx_trips_dispatcher_id ON public.trips(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON public.trips(created_by);

-- Verify columns were added
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('users', 'drivers', 'trips')
AND column_name IN ('clinic_id', 'facility_id', 'dispatcher_id', 'created_by')
ORDER BY table_name, column_name;
