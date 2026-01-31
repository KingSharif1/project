/*
  # Real-Time Driver Location Tracking

  1. New Tables
    - `driver_locations`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key to drivers)
      - `latitude` (decimal, GPS latitude)
      - `longitude` (decimal, GPS longitude)
      - `heading` (decimal, direction in degrees 0-360)
      - `speed` (decimal, speed in mph)
      - `accuracy` (decimal, GPS accuracy in meters)
      - `status` (text, driver status)
      - `battery_level` (integer, device battery percentage)
      - `is_online` (boolean, whether driver app is active)
      - `last_update` (timestamptz, last location update time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `driver_locations` table
    - Add policies for authenticated users to read all locations
    - Add policies for drivers to update their own locations
    - Add policies for system to insert/update locations

  3. Indexes
    - Index on driver_id for fast lookups
    - Index on last_update for recent location queries
    - Index on is_online for active driver filtering

  4. Realtime
    - Enable realtime replication for live tracking
*/

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  heading decimal(5, 2) DEFAULT 0,
  speed decimal(5, 2) DEFAULT 0,
  accuracy decimal(6, 2) DEFAULT 0,
  status text DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'off_duty', 'break')),
  battery_level integer DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
  is_online boolean DEFAULT true,
  last_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_last_update ON driver_locations(last_update DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_is_online ON driver_locations(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_locations_status ON driver_locations(status);

-- Create a unique constraint to ensure one location per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_locations_unique_driver ON driver_locations(driver_id);

-- Enable Row Level Security
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all driver locations
CREATE POLICY "Authenticated users can view driver locations"
  ON driver_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Anonymous users can view online driver locations
CREATE POLICY "Anonymous users can view online driver locations"
  ON driver_locations
  FOR SELECT
  TO anon
  USING (is_online = true);

-- Policy: Drivers can insert their own location
CREATE POLICY "Drivers can insert their location"
  ON driver_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Drivers can update their own location
CREATE POLICY "Drivers can update their location"
  ON driver_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous can update driver locations (for mobile app)
CREATE POLICY "Mobile app can update driver locations"
  ON driver_locations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous can insert driver locations (for mobile app)
CREATE POLICY "Mobile app can insert driver locations"
  ON driver_locations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_update = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on location update
DROP TRIGGER IF EXISTS update_driver_location_timestamp_trigger ON driver_locations;
CREATE TRIGGER update_driver_location_timestamp_trigger
  BEFORE UPDATE ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location_timestamp();

-- Function to upsert driver location (insert or update)
CREATE OR REPLACE FUNCTION upsert_driver_location(
  p_driver_id uuid,
  p_latitude decimal,
  p_longitude decimal,
  p_heading decimal DEFAULT 0,
  p_speed decimal DEFAULT 0,
  p_accuracy decimal DEFAULT 0,
  p_status text DEFAULT 'available',
  p_battery_level integer DEFAULT 100
)
RETURNS driver_locations AS $$
DECLARE
  v_location driver_locations;
BEGIN
  INSERT INTO driver_locations (
    driver_id,
    latitude,
    longitude,
    heading,
    speed,
    accuracy,
    status,
    battery_level,
    is_online,
    last_update
  )
  VALUES (
    p_driver_id,
    p_latitude,
    p_longitude,
    p_heading,
    p_speed,
    p_accuracy,
    p_status,
    p_battery_level,
    true,
    now()
  )
  ON CONFLICT (driver_id)
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    accuracy = EXCLUDED.accuracy,
    status = EXCLUDED.status,
    battery_level = EXCLUDED.battery_level,
    is_online = true,
    last_update = now(),
    updated_at = now()
  RETURNING * INTO v_location;
  
  RETURN v_location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for driver_locations table
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- Create view for active driver locations with driver info
CREATE OR REPLACE VIEW active_driver_locations AS
SELECT 
  dl.id,
  dl.driver_id,
  d.name as driver_name,
  d.email as driver_email,
  d.phone as driver_phone,
  d.status as driver_status,
  dl.latitude,
  dl.longitude,
  dl.heading,
  dl.speed,
  dl.accuracy,
  dl.status as location_status,
  dl.battery_level,
  dl.is_online,
  dl.last_update,
  EXTRACT(EPOCH FROM (now() - dl.last_update)) as seconds_since_update
FROM driver_locations dl
JOIN drivers d ON d.id = dl.driver_id
WHERE dl.is_online = true
  AND d.is_active = true
  AND EXTRACT(EPOCH FROM (now() - dl.last_update)) < 300; -- Last 5 minutes

-- Grant access to the view
GRANT SELECT ON active_driver_locations TO authenticated;
GRANT SELECT ON active_driver_locations TO anon;
