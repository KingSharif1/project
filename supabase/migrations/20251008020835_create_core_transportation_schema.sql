/*
  # Fort Worth NEMT Transportation Hub - Core Schema

  ## Overview
  Complete database schema for Non-Emergency Medical Transportation management system
  with advanced features including recurring trips, insurance tracking, and driver preferences.

  ## New Tables

  ### Users & Authentication
  - `users` - System users (admins, dispatchers)
    - `id` (uuid, primary key)
    - `email` (text, unique)
    - `full_name` (text)
    - `role` (text) - admin/dispatcher
    - `is_active` (boolean)
    - `phone` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Facilities & Clinics
  - `facilities` - Healthcare facilities/clinics
    - `id` (uuid, primary key)
    - `name` (text)
    - `address` (text)
    - `city` (text)
    - `state` (text)
    - `zip_code` (text)
    - `phone` (text)
    - `contact_person` (text)
    - `contact_email` (text)
    - `ambulatory_rate` (decimal)
    - `wheelchair_rate` (decimal)
    - `stretcher_rate` (decimal)
    - `payment_terms` (text)
    - `is_active` (boolean)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Drivers
  - `drivers` - Driver profiles
    - `id` (uuid, primary key)
    - `name` (text)
    - `email` (text)
    - `phone` (text)
    - `license_number` (text)
    - `license_expiry` (date)
    - `certification_expiry` (date)
    - `status` (text) - available/on_trip/off_duty
    - `rating` (decimal)
    - `total_trips` (integer)
    - `ambulatory_rate` (decimal) - payout per trip
    - `wheelchair_rate` (decimal)
    - `stretcher_rate` (decimal)
    - `is_active` (boolean)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Vehicles
  - `vehicles` - Fleet vehicles
    - `id` (uuid, primary key)
    - `vehicle_number` (text)
    - `make` (text)
    - `model` (text)
    - `year` (integer)
    - `license_plate` (text)
    - `vin` (text)
    - `capacity` (integer)
    - `type` (text) - ambulatory/wheelchair/stretcher
    - `status` (text) - available/in_use/maintenance
    - `mileage` (integer)
    - `last_maintenance_date` (date)
    - `next_maintenance_due` (date)
    - `is_active` (boolean)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Patients
  - `patients` - Patient profiles
    - `id` (uuid, primary key)
    - `first_name` (text)
    - `last_name` (text)
    - `date_of_birth` (date)
    - `phone` (text)
    - `email` (text)
    - `address` (text)
    - `city` (text)
    - `state` (text)
    - `zip_code` (text)
    - `insurance_provider` (text)
    - `insurance_policy_number` (text)
    - `insurance_expiry` (date)
    - `mobility_type` (text) - ambulatory/wheelchair/stretcher
    - `special_needs` (text)
    - `preferred_driver_id` (uuid, foreign key)
    - `emergency_contact_name` (text)
    - `emergency_contact_phone` (text)
    - `is_active` (boolean)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Trips
  - `trips` - Individual trip records
    - `id` (uuid, primary key)
    - `trip_number` (text, unique)
    - `patient_id` (uuid, foreign key)
    - `driver_id` (uuid, foreign key)
    - `vehicle_id` (uuid, foreign key)
    - `facility_id` (uuid, foreign key)
    - `pickup_address` (text)
    - `pickup_city` (text)
    - `pickup_state` (text)
    - `pickup_zip` (text)
    - `dropoff_address` (text)
    - `dropoff_city` (text)
    - `dropoff_state` (text)
    - `dropoff_zip` (text)
    - `scheduled_pickup_time` (timestamptz)
    - `scheduled_dropoff_time` (timestamptz)
    - `actual_pickup_time` (timestamptz)
    - `actual_dropoff_time` (timestamptz)
    - `trip_type` (text) - ambulatory/wheelchair/stretcher
    - `status` (text) - scheduled/in_progress/completed/cancelled
    - `distance_miles` (decimal)
    - `wait_time_minutes` (integer)
    - `rate` (decimal)
    - `wait_time_charge` (decimal)
    - `total_charge` (decimal)
    - `driver_payout` (decimal)
    - `is_return_trip` (boolean)
    - `linked_trip_id` (uuid, foreign key) - links to outbound/return trip
    - `recurring_trip_id` (uuid, foreign key)
    - `notes` (text)
    - `cancellation_reason` (text)
    - `created_by` (uuid, foreign key)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Recurring Trip Templates
  - `recurring_trips` - Templates for repeating trips
    - `id` (uuid, primary key)
    - `template_name` (text)
    - `patient_id` (uuid, foreign key)
    - `facility_id` (uuid, foreign key)
    - `pickup_address` (text)
    - `dropoff_address` (text)
    - `trip_type` (text)
    - `preferred_driver_id` (uuid, foreign key)
    - `frequency` (text) - daily/weekly/biweekly/monthly
    - `days_of_week` (text[]) - array of days
    - `time_of_day` (time)
    - `start_date` (date)
    - `end_date` (date)
    - `is_active` (boolean)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Trip Notes Templates
  - `trip_note_templates` - Pre-written note templates
    - `id` (uuid, primary key)
    - `title` (text)
    - `content` (text)
    - `category` (text) - general/medical/behavioral/equipment
    - `is_active` (boolean)
    - `created_at` (timestamptz)

  ### Invoices
  - `invoices` - Billing records
    - `id` (uuid, primary key)
    - `invoice_number` (text, unique)
    - `facility_id` (uuid, foreign key)
    - `invoice_date` (date)
    - `due_date` (date)
    - `period_start` (date)
    - `period_end` (date)
    - `subtotal` (decimal)
    - `tax` (decimal)
    - `total_amount` (decimal)
    - `payment_status` (text) - pending/paid/overdue/cancelled
    - `payment_date` (date)
    - `payment_method` (text)
    - `notes` (text)
    - `created_by` (uuid, foreign key)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Invoice Line Items
  - `invoice_line_items` - Individual trips on invoices
    - `id` (uuid, primary key)
    - `invoice_id` (uuid, foreign key)
    - `trip_id` (uuid, foreign key)
    - `description` (text)
    - `amount` (decimal)
    - `created_at` (timestamptz)

  ### Driver Payouts
  - `driver_payouts` - Payout records
    - `id` (uuid, primary key)
    - `payout_number` (text, unique)
    - `driver_id` (uuid, foreign key)
    - `period_start` (date)
    - `period_end` (date)
    - `total_trips` (integer)
    - `total_amount` (decimal)
    - `payment_status` (text) - pending/paid/cancelled
    - `payment_date` (date)
    - `payment_method` (text)
    - `notes` (text)
    - `created_by` (uuid, foreign key)
    - `created_at` (timestamptz)

  ### Activity Log
  - `activity_log` - System activity tracking
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key)
    - `action` (text)
    - `entity_type` (text) - trip/driver/vehicle/facility/etc
    - `entity_id` (uuid)
    - `details` (jsonb)
    - `ip_address` (text)
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users based on role
  - Add indexes for performance
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'dispatcher')),
  is_active boolean DEFAULT true,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text DEFAULT 'TX',
  zip_code text NOT NULL,
  phone text NOT NULL,
  contact_person text,
  contact_email text,
  ambulatory_rate decimal(10,2) DEFAULT 0,
  wheelchair_rate decimal(10,2) DEFAULT 0,
  stretcher_rate decimal(10,2) DEFAULT 0,
  payment_terms text DEFAULT 'Net 30',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read facilities"
  ON facilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage facilities"
  ON facilities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  license_number text,
  license_expiry date,
  certification_expiry date,
  status text DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'off_duty')),
  rating decimal(3,2) DEFAULT 5.0,
  total_trips integer DEFAULT 0,
  ambulatory_rate decimal(10,2) DEFAULT 0,
  wheelchair_rate decimal(10,2) DEFAULT 0,
  stretcher_rate decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage drivers"
  ON drivers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text UNIQUE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text,
  vin text,
  capacity integer DEFAULT 4,
  type text NOT NULL CHECK (type IN ('ambulatory', 'wheelchair', 'stretcher')),
  status text DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  mileage integer DEFAULT 0,
  last_maintenance_date date,
  next_maintenance_due date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  state text DEFAULT 'TX',
  zip_code text NOT NULL,
  insurance_provider text,
  insurance_policy_number text,
  insurance_expiry date,
  mobility_type text NOT NULL CHECK (mobility_type IN ('ambulatory', 'wheelchair', 'stretcher')),
  special_needs text,
  preferred_driver_id uuid REFERENCES drivers(id),
  emergency_contact_name text,
  emergency_contact_phone text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage patients"
  ON patients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Recurring trips table
CREATE TABLE IF NOT EXISTS recurring_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facilities(id),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  trip_type text NOT NULL CHECK (trip_type IN ('ambulatory', 'wheelchair', 'stretcher')),
  preferred_driver_id uuid REFERENCES drivers(id),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  days_of_week text[],
  time_of_day time NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recurring trips"
  ON recurring_trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage recurring trips"
  ON recurring_trips FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES patients(id),
  driver_id uuid REFERENCES drivers(id),
  vehicle_id uuid REFERENCES vehicles(id),
  facility_id uuid REFERENCES facilities(id),
  pickup_address text NOT NULL,
  pickup_city text NOT NULL,
  pickup_state text DEFAULT 'TX',
  pickup_zip text NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_city text NOT NULL,
  dropoff_state text DEFAULT 'TX',
  dropoff_zip text NOT NULL,
  scheduled_pickup_time timestamptz NOT NULL,
  scheduled_dropoff_time timestamptz,
  actual_pickup_time timestamptz,
  actual_dropoff_time timestamptz,
  trip_type text NOT NULL CHECK (trip_type IN ('ambulatory', 'wheelchair', 'stretcher')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  distance_miles decimal(10,2) DEFAULT 0,
  wait_time_minutes integer DEFAULT 0,
  rate decimal(10,2) DEFAULT 0,
  wait_time_charge decimal(10,2) DEFAULT 0,
  total_charge decimal(10,2) DEFAULT 0,
  driver_payout decimal(10,2) DEFAULT 0,
  is_return_trip boolean DEFAULT false,
  linked_trip_id uuid REFERENCES trips(id),
  recurring_trip_id uuid REFERENCES recurring_trips(id),
  notes text,
  cancellation_reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trips"
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage trips"
  ON trips FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trip note templates table
CREATE TABLE IF NOT EXISTS trip_note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('general', 'medical', 'behavioral', 'equipment')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read note templates"
  ON trip_note_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage note templates"
  ON trip_note_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  facility_id uuid REFERENCES facilities(id) NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  subtotal decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date date,
  payment_method text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage invoice items"
  ON invoice_line_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Driver payouts table
CREATE TABLE IF NOT EXISTS driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_number text UNIQUE NOT NULL,
  driver_id uuid REFERENCES drivers(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_trips integer DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date date,
  payment_method text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payouts"
  ON driver_payouts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage payouts"
  ON driver_payouts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete activity log"
  ON activity_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_patient_id ON trips(patient_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_facility_id ON trips(facility_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_pickup ON trips(scheduled_pickup_time);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_invoices_facility_id ON invoices(facility_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Insert default trip note templates
INSERT INTO trip_note_templates (title, content, category) VALUES
  ('Patient No-Show', 'Patient was not at pickup location at scheduled time. Multiple attempts to contact made.', 'general'),
  ('Wheelchair Assistance Required', 'Patient required additional assistance with wheelchair transfer.', 'equipment'),
  ('Oxygen Equipment', 'Patient traveling with portable oxygen equipment.', 'medical'),
  ('Behavioral Note', 'Patient was cooperative and pleasant during transport.', 'behavioral'),
  ('Traffic Delay', 'Delayed due to heavy traffic on route.', 'general'),
  ('Wait Time Extended', 'Extended wait time at facility for patient appointment.', 'general'),
  ('Multiple Stops', 'Trip included multiple pickup/dropoff locations as requested.', 'general'),
  ('Ambulatory Assist', 'Patient required arm assistance but was able to walk.', 'medical')
ON CONFLICT DO NOTHING;