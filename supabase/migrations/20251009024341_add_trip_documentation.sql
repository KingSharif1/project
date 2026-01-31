/*
  # Trip Documentation System

  1. New Tables
    - `trip_photos`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `photo_url` (text) - Base64 or URL to photo
      - `photo_type` (text) - Type (pickup, dropoff, odometer, vehicle_condition, incident, other)
      - `caption` (text, nullable)
      - `taken_by` (uuid, foreign key to users)
      - `taken_at` (timestamptz)
      - `created_at` (timestamptz)

    - `trip_signatures`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `signature_type` (text) - Type (patient, driver, facility_staff, witness)
      - `signature_data` (text) - Base64 signature image
      - `signer_name` (text)
      - `signer_role` (text, nullable)
      - `signed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create trip photos table
CREATE TABLE IF NOT EXISTS trip_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('pickup', 'dropoff', 'odometer', 'vehicle_condition', 'incident', 'wheelchair_lift', 'patient', 'other')),
  caption text,
  taken_by uuid REFERENCES users(id),
  taken_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create trip signatures table
CREATE TABLE IF NOT EXISTS trip_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('patient', 'driver', 'facility_staff', 'guardian', 'witness')),
  signature_data text NOT NULL,
  signer_name text NOT NULL,
  signer_role text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_type ON trip_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_trip_signatures_trip_id ON trip_signatures(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_signatures_type ON trip_signatures(signature_type);

-- Enable Row Level Security
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_signatures ENABLE ROW LEVEL SECURITY;

-- Policies for trip_photos
CREATE POLICY "Authenticated users can view trip photos"
  ON trip_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add trip photos"
  ON trip_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their trip photos"
  ON trip_photos
  FOR UPDATE
  TO authenticated
  USING (taken_by = auth.uid())
  WITH CHECK (taken_by = auth.uid());

CREATE POLICY "Admins can delete trip photos"
  ON trip_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for trip_signatures
CREATE POLICY "Authenticated users can view trip signatures"
  ON trip_signatures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add trip signatures"
  ON trip_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Trip signatures are immutable"
  ON trip_signatures
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Only admins can delete trip signatures"
  ON trip_signatures
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
