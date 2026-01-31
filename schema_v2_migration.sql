-- Schema V2: Multi-Tenancy & Trip Sources Migration

-- 1. Create Trip Sources Table (Payers)
CREATE TABLE IF NOT EXISTS public.trip_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('broker', 'facility', 'private', 'other')),
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  billing_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for trip_sources
ALTER TABLE public.trip_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Dispatchers view clinic trip_sources" ON public.trip_sources
FOR SELECT TO authenticated
USING (
  clinic_id = public.user_clinic_id()
  AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher')
);

CREATE POLICY "Admins/Dispatchers manage clinic trip_sources" ON public.trip_sources
FOR ALL TO authenticated
USING (
  clinic_id = public.user_clinic_id()
  AND (public.user_role() = 'admin' OR public.user_role() = 'dispatcher')
);

-- 2. Create User_Clinics Junction Table (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS public.user_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'driver')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, clinic_id) -- Prevent duplicate assignments
);

-- Enable RLS for user_clinics
ALTER TABLE public.user_clinics ENABLE ROW LEVEL SECURITY;

-- Users can see their own associations
CREATE POLICY "Users view own clinic associations" ON public.user_clinics
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. Update Trips Table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS trip_source_id UUID REFERENCES public.trip_sources(id),
ADD COLUMN IF NOT EXISTS level_of_assistance TEXT; 
-- Note: 'level_of_assistance' fits 'door_to_door', 'curb_to_curb'

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_trips_trip_source_id ON public.trips(trip_source_id);
CREATE INDEX IF NOT EXISTS idx_user_clinics_user_id ON public.user_clinics(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_sources_clinic_id ON public.trip_sources(clinic_id);

-- 5. Data Migration (Optional - Populate Trip Sources from existing Facilities if needed)
-- For now, we leave this manual or run a separate migration to convert.

-- 6. Grant Permissions
GRANT ALL ON TABLE public.trip_sources TO authenticated;
GRANT ALL ON TABLE public.user_clinics TO authenticated;
