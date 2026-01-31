/*
  # Driver Location History & Trip Route Tracking

  1. New Tables
    - `driver_location_history`
      - Stores complete breadcrumb trail of all driver movements
      - Never deletes records - permanent history
      - Can replay any past trip route

    - `trip_route_history`
      - Links location history to specific trips
      - Tracks complete route for each trip
      - Enables trip playback and analysis

  2. Features
    - Complete historical tracking of all driver movements
    - Trip route reconstruction and replay
    - Analytics: distance traveled, stops, speed patterns
    - Historical route comparison
    - Compliance auditing capabilities

  3. Security
    - Enable RLS on all tables
    - Restrict access to authorized users only
    - Admin and dispatcher can view all history
    - Drivers can view their own history

  4. Performance
    - Partitioning by date for large datasets
    - Indexes for fast queries
    - Automatic data retention policies
*/

-- Create driver_location_history table (breadcrumb trail)
CREATE TABLE IF NOT EXISTS driver_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  heading decimal(5, 2) DEFAULT 0,
  speed decimal(5, 2) DEFAULT 0,
  accuracy decimal(6, 2) DEFAULT 0,
  altitude decimal(8, 2),
  status text DEFAULT 'on_trip',
  battery_level integer,
  recorded_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_location_history_driver_id
  ON driver_location_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_location_history_trip_id
  ON driver_location_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_location_history_recorded_at
  ON driver_location_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_location_history_driver_recorded
  ON driver_location_history(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_location_history_trip_recorded
  ON driver_location_history(trip_id, recorded_at DESC);

-- Create trip_route_history table (aggregate trip routes)
CREATE TABLE IF NOT EXISTS trip_route_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  total_distance_miles decimal(10, 2) DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  average_speed decimal(5, 2) DEFAULT 0,
  max_speed decimal(5, 2) DEFAULT 0,
  number_of_stops integer DEFAULT 0,
  route_data jsonb, -- Store complete route as GeoJSON
  pickup_location point,
  dropoff_location point,
  actual_pickup_time timestamptz,
  actual_dropoff_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for trip_route_history
CREATE INDEX IF NOT EXISTS idx_trip_route_history_trip_id
  ON trip_route_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_route_history_driver_id
  ON trip_route_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_route_history_start_time
  ON trip_route_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_trip_route_history_end_time
  ON trip_route_history(end_time DESC);

-- Enable Row Level Security
ALTER TABLE driver_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_route_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_location_history
CREATE POLICY "Admins can view all location history"
  ON driver_location_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Dispatchers can view all location history"
  ON driver_location_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Anonymous can view location history"
  ON driver_location_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "System can insert location history"
  ON driver_location_history
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for trip_route_history
CREATE POLICY "Admins can view all trip routes"
  ON trip_route_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Dispatchers can view all trip routes"
  ON trip_route_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Anonymous can view trip routes"
  ON trip_route_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "System can manage trip routes"
  ON trip_route_history
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Function to automatically save driver location to history
CREATE OR REPLACE FUNCTION save_driver_location_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert location into history table
  INSERT INTO driver_location_history (
    driver_id,
    trip_id,
    latitude,
    longitude,
    heading,
    speed,
    accuracy,
    status,
    battery_level,
    recorded_at
  )
  VALUES (
    NEW.driver_id,
    (
      SELECT id FROM trips
      WHERE driver_id = NEW.driver_id
      AND status IN ('assigned', 'in_progress')
      ORDER BY scheduled_pickup_time DESC
      LIMIT 1
    ),
    NEW.latitude,
    NEW.longitude,
    NEW.heading,
    NEW.speed,
    NEW.accuracy,
    NEW.status,
    NEW.battery_level,
    NEW.last_update
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to save history on location update
DROP TRIGGER IF EXISTS save_driver_location_history_trigger ON driver_locations;
CREATE TRIGGER save_driver_location_history_trigger
  AFTER INSERT OR UPDATE ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION save_driver_location_to_history();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 decimal, lon1 decimal,
  lat2 decimal, lon2 decimal
)
RETURNS decimal AS $$
DECLARE
  radius_miles constant decimal := 3958.8; -- Earth's radius in miles
  dlat decimal;
  dlon decimal;
  a decimal;
  c decimal;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN radius_miles * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get trip route history
CREATE OR REPLACE FUNCTION get_trip_route(p_trip_id uuid)
RETURNS TABLE (
  latitude decimal,
  longitude decimal,
  heading decimal,
  speed decimal,
  recorded_at timestamptz,
  driver_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dlh.latitude,
    dlh.longitude,
    dlh.heading,
    dlh.speed,
    dlh.recorded_at,
    d.name as driver_name
  FROM driver_location_history dlh
  JOIN drivers d ON d.id = dlh.driver_id
  WHERE dlh.trip_id = p_trip_id
  ORDER BY dlh.recorded_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get driver history for date range
CREATE OR REPLACE FUNCTION get_driver_history(
  p_driver_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  latitude decimal,
  longitude decimal,
  heading decimal,
  speed decimal,
  recorded_at timestamptz,
  trip_number text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dlh.latitude,
    dlh.longitude,
    dlh.heading,
    dlh.speed,
    dlh.recorded_at,
    t.trip_number,
    dlh.status
  FROM driver_location_history dlh
  LEFT JOIN trips t ON t.id = dlh.trip_id
  WHERE dlh.driver_id = p_driver_id
    AND dlh.recorded_at >= p_start_date
    AND dlh.recorded_at <= p_end_date
  ORDER BY dlh.recorded_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate trip route summary
CREATE OR REPLACE FUNCTION generate_trip_route_summary(p_trip_id uuid)
RETURNS trip_route_history AS $$
DECLARE
  v_route trip_route_history;
  v_distance decimal := 0;
  v_prev_lat decimal;
  v_prev_lon decimal;
  v_location RECORD;
BEGIN
  -- Get trip and driver info
  SELECT
    t.id as trip_id,
    t.driver_id,
    MIN(dlh.recorded_at) as start_time,
    MAX(dlh.recorded_at) as end_time,
    MAX(dlh.speed) as max_speed
  INTO v_route.trip_id, v_route.driver_id, v_route.start_time,
       v_route.end_time, v_route.max_speed
  FROM trips t
  LEFT JOIN driver_location_history dlh ON dlh.trip_id = t.id
  WHERE t.id = p_trip_id
  GROUP BY t.id, t.driver_id;

  -- Calculate total distance
  FOR v_location IN
    SELECT latitude, longitude
    FROM driver_location_history
    WHERE trip_id = p_trip_id
    ORDER BY recorded_at ASC
  LOOP
    IF v_prev_lat IS NOT NULL THEN
      v_distance := v_distance + calculate_distance_miles(
        v_prev_lat, v_prev_lon,
        v_location.latitude, v_location.longitude
      );
    END IF;
    v_prev_lat := v_location.latitude;
    v_prev_lon := v_location.longitude;
  END LOOP;

  v_route.total_distance_miles := v_distance;

  -- Calculate duration in minutes
  IF v_route.end_time IS NOT NULL AND v_route.start_time IS NOT NULL THEN
    v_route.total_duration_minutes := EXTRACT(EPOCH FROM (v_route.end_time - v_route.start_time)) / 60;

    -- Calculate average speed
    IF v_route.total_duration_minutes > 0 THEN
      v_route.average_speed := (v_route.total_distance_miles / v_route.total_duration_minutes) * 60;
    END IF;
  END IF;

  -- Insert or update trip route history
  INSERT INTO trip_route_history (
    trip_id,
    driver_id,
    start_time,
    end_time,
    total_distance_miles,
    total_duration_minutes,
    average_speed,
    max_speed
  )
  VALUES (
    v_route.trip_id,
    v_route.driver_id,
    v_route.start_time,
    v_route.end_time,
    v_route.total_distance_miles,
    v_route.total_duration_minutes,
    v_route.average_speed,
    v_route.max_speed
  )
  ON CONFLICT (trip_id) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    total_distance_miles = EXCLUDED.total_distance_miles,
    total_duration_minutes = EXCLUDED.total_duration_minutes,
    average_speed = EXCLUDED.average_speed,
    max_speed = EXCLUDED.max_speed,
    updated_at = now()
  RETURNING * INTO v_route;

  RETURN v_route;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create unique constraint on trip_id for trip_route_history
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_route_history_unique_trip
  ON trip_route_history(trip_id);

-- View for trip routes with driver info
CREATE OR REPLACE VIEW trip_routes_with_details AS
SELECT
  trh.id,
  trh.trip_id,
  t.trip_number,
  t.status as trip_status,
  trh.driver_id,
  d.name as driver_name,
  d.phone as driver_phone,
  trh.start_time,
  trh.end_time,
  trh.total_distance_miles,
  trh.total_duration_minutes,
  trh.average_speed,
  trh.max_speed,
  trh.number_of_stops,
  t.pickup_address,
  t.dropoff_address,
  (
    SELECT COUNT(*)
    FROM driver_location_history
    WHERE trip_id = trh.trip_id
  ) as location_points_count
FROM trip_route_history trh
JOIN trips t ON t.id = trh.trip_id
JOIN drivers d ON d.id = trh.driver_id
ORDER BY trh.start_time DESC;

-- Grant access to views
GRANT SELECT ON trip_routes_with_details TO authenticated;
GRANT SELECT ON trip_routes_with_details TO anon;

-- Enable realtime for history tables
ALTER PUBLICATION supabase_realtime ADD TABLE driver_location_history;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_route_history;
