/*
  # Create Test Driver Accounts for Mobile App

  ## Summary
  Creates test driver accounts that can be used to login to the mobile app

  ## Test Accounts Created
  1. John Doe (Driver 1)
     - Email: driver1@test.com
     - Phone: (555) 123-4567
     - Status: Available
  
  2. Sarah Smith (Driver 2)
     - Email: driver2@test.com
     - Phone: (555) 234-5678
     - Status: Available

  ## Security
  - These are test accounts for development
  - Uses simple password: "driver123"
  - Should be removed or changed in production
*/

-- Insert test driver 1
INSERT INTO drivers (
  id,
  name,
  email,
  phone,
  license_number,
  license_expiry,
  status,
  is_active,
  rating,
  total_trips,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'John Doe',
  'driver1@test.com',
  '(555) 123-4567',
  'DL-12345678',
  (now() + interval '2 years')::date,
  'off_duty',
  true,
  4.8,
  145,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  is_active = true;

-- Insert test driver 2
INSERT INTO drivers (
  id,
  name,
  email,
  phone,
  license_number,
  license_expiry,
  status,
  is_active,
  rating,
  total_trips,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'Sarah Smith',
  'driver2@test.com',
  '(555) 234-5678',
  'DL-87654321',
  (now() + interval '2 years')::date,
  'off_duty',
  true,
  4.9,
  218,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  is_active = true;

-- Create test patient accounts
INSERT INTO patients (
  id,
  first_name,
  last_name,
  email,
  phone,
  date_of_birth,
  address,
  city,
  state,
  zip_code,
  mobility_type,
  special_needs,
  created_at,
  updated_at
)
VALUES 
(
  gen_random_uuid(),
  'Test',
  'Patient',
  'patient1@test.com',
  '(555) 345-6789',
  '1980-01-15',
  '123 Main Street',
  'Fort Worth',
  'TX',
  '76102',
  'ambulatory',
  NULL,
  now(),
  now()
),
(
  gen_random_uuid(),
  'Jane',
  'Williams',
  'patient2@test.com',
  '(555) 456-7890',
  '1975-06-20',
  '456 Oak Avenue',
  'Fort Worth',
  'TX',
  '76105',
  'wheelchair',
  'Requires wheelchair assistance',
  now(),
  now()
)
ON CONFLICT (phone) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE drivers IS 'Test accounts: driver1@test.com and driver2@test.com (password: driver123)';
COMMENT ON TABLE patients IS 'Test accounts: patient1@test.com and patient2@test.com (password: patient123)';
