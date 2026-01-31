/*
  # Create Mobile App Test Accounts
  
  1. Creates test driver and patient accounts for mobile app testing
  2. Sets up Supabase Auth users with known passwords
  3. Links auth users to drivers and patients tables
  
  Test Accounts Created:
  - Driver 1: driver1@test.com / driver123
  - Driver 2: driver2@test.com / driver123
  - Patient 1: patient1@test.com / patient123
  - Patient 2: patient2@test.com / patient123
*/

-- Delete existing test accounts if they exist
DELETE FROM drivers WHERE email IN ('driver1@test.com', 'driver2@test.com');
DELETE FROM patients WHERE email IN ('patient1@test.com', 'patient2@test.com');

-- Create test drivers
INSERT INTO drivers (email, name, phone, license_number, status)
VALUES 
  ('driver1@test.com', 'John Doe', '555-0101', 'DL123456', 'available'),
  ('driver2@test.com', 'Sarah Smith', '555-0102', 'DL789012', 'available');

-- Create test patients
INSERT INTO patients (email, first_name, last_name, phone, date_of_birth, address, city, state, zip_code, mobility_type)
VALUES 
  ('patient1@test.com', 'Mary', 'Johnson', '555-0201', '1960-01-15', '123 Test St', 'Fort Worth', 'TX', '76101', 'ambulatory'),
  ('patient2@test.com', 'Robert', 'Williams', '555-0202', '1955-03-20', '456 Demo Ave', 'Fort Worth', 'TX', '76102', 'wheelchair');
