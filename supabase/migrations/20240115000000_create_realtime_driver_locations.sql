-- Create table for real-time driver location tracking
CREATE TABLE IF NOT EXISTS public.realtime_driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2), -- Direction in degrees (0-360)
  speed DECIMAL(5, 2), -- Speed in mph
  accuracy DECIMAL(6, 2), -- GPS accuracy in meters
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_realtime_driver_locations_driver_id 
  ON public.realtime_driver_locations(driver_id);

CREATE INDEX IF NOT EXISTS idx_realtime_driver_locations_last_updated 
  ON public.realtime_driver_locations(last_updated DESC);

-- Enable RLS
ALTER TABLE public.realtime_driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all driver locations
CREATE POLICY "Allow authenticated users to read driver locations"
  ON public.realtime_driver_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow drivers to insert/update their own location
CREATE POLICY "Allow drivers to update their own location"
  ON public.realtime_driver_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow drivers to update their location"
  ON public.realtime_driver_locations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to automatically clean up old location records (keep last 100 per driver)
CREATE OR REPLACE FUNCTION cleanup_old_driver_locations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.realtime_driver_locations
  WHERE driver_id = NEW.driver_id
  AND id NOT IN (
    SELECT id FROM public.realtime_driver_locations
    WHERE driver_id = NEW.driver_id
    ORDER BY last_updated DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up old records after insert
CREATE TRIGGER trigger_cleanup_old_driver_locations
  AFTER INSERT ON public.realtime_driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_driver_locations();

-- Add comment
COMMENT ON TABLE public.realtime_driver_locations IS 'Stores real-time GPS location data for drivers';
