# Database Schema Reference (Supabase)
# Generated from actual DB on 2026-02-11
# ALWAYS check this before writing any DB query

## users
- id (uuid, PK)
- email (text, required)
- first_name (text, required)
- last_name (text, required)
- phone (text, nullable)
- role (text, required) — CHECK: superadmin | admin | dispatcher | driver
- status (text, default 'active')
- clinic_id (uuid, nullable, FK → clinics.id)
- facility_id (uuid, nullable, FK → contractors.id)
- username (text, nullable, unique)
- date_of_birth (date, nullable)
- address (text, nullable)
- city (text, nullable)
- state (text, nullable, default 'TX')
- zip_code (text, nullable)
- profile_image_url (text, nullable)
- must_change_password (boolean, nullable, default false)
- created_at (timestamptz, default CURRENT_TIMESTAMP)
- updated_at (timestamptz, default CURRENT_TIMESTAMP)

## drivers
- id (uuid, PK)
- user_id (uuid, required, FK → users.id)
- first_name (text, nullable)
- last_name (text, nullable)
- date_of_birth (date, nullable)
- license_number (text, required)
- temporary_password (text, nullable)
- assigned_vehicle_id (uuid, nullable, FK → vehicles.id)
- current_location_lat (numeric, nullable)
- current_location_lng (numeric, nullable)
- last_location_update (timestamp, nullable)
- availability_status (DriverStatus enum, default 'available') — VALUES: available | on_trip | off_duty | break
- clinic_id (uuid, nullable, FK → clinics.id)
- rates (jsonb, nullable, default '{}') — Compact format: { ambulatory: [...[from,to,rate], additionalRate], wheelchair: [...], stretcher: [...], deductions: [rental, insurance, %] }
- created_at (timestamp, default CURRENT_TIMESTAMP)
- updated_at (timestamp, default CURRENT_TIMESTAMP)
NOTE: NO is_active, NO rating, NO total_trips, NO status (use availability_status), NO notes, NO payout_rate, NO payout_type
DROPPED COLUMNS: license_class, license_expiry, medical_cert_expiry, background_check_expiry, drug_test_expiry, hourly_rate, ambulatory_base_miles, ambulatory_additional_mile_rate, wheelchair_base_miles, wheelchair_additional_mile_rate, stretcher_base_miles, stretcher_additional_mile_rate, cancellation_rate, no_show_rate, rate_tiers, deductions
Document expiry dates are now tracked in the document_submissions table, not on the driver record.

## vehicles
- id (uuid, PK)
- vehicle_name (text, nullable) — optional nickname/identifier
- license_plate (text, required)
- make (text, required)
- model (text, required)
- year (integer, required)
- vin (text, nullable)
- color (text, nullable)
- vehicle_type (text, required)
- ownership_type (text, default 'company') — CHECK: company | private
- capacity (integer, default 1)
- wheelchair_accessible (boolean, nullable, default false)
- stretcher_capable (boolean, nullable, default false)
- status (text, default 'available')
- last_maintenance_date (date, nullable)
- insurance_expiry (date, nullable)
- registration_expiry (date, nullable)
- inspection_expiry (date, nullable)
- clinic_id (uuid, nullable, FK → clinics.id)
- assigned_driver_id (uuid, nullable, FK → drivers.id)
- created_at (timestamptz, default CURRENT_TIMESTAMP)
- updated_at (timestamptz, default CURRENT_TIMESTAMP)

## document_submissions
- id (uuid, PK)
- driver_id (uuid, nullable, FK → drivers.id ON DELETE CASCADE)
- vehicle_id (uuid, nullable, FK → vehicles.id ON DELETE CASCADE)
- document_type (text, required)
- file_url (text, nullable)
- file_name (text, nullable)
- file_size (bigint, nullable)
- expiry_date (timestamptz, nullable)
- submission_date (timestamptz, default now())
- status (text, default 'pending')
- reviewed_by (uuid, nullable, FK → users.id)
- reviewed_at (timestamptz, nullable)
- review_notes (text, nullable)
- rejection_reason (text, nullable)
- version (integer, default 1)
CHECK: driver_id IS NOT NULL OR vehicle_id IS NOT NULL
Storage buckets: driver-documents, vehicle-documents

## patients
- id (uuid, PK)
- first_name (text, required)
- last_name (text, required)
- date_of_birth (date, nullable)
- phone (text, nullable)
- account_number (text, nullable)
- service_level (text, nullable) — ambulatory | wheelchair | stretcher
- notes (text, nullable)
- clinic_id (uuid, nullable, FK → clinics.id)
- created_at (timestamp, default CURRENT_TIMESTAMP)
- updated_at (timestamp, default CURRENT_TIMESTAMP)

## trips
- id (uuid, PK)
- trip_number (text, required)
- patient_id (uuid, required, FK → patients.id)
- driver_id (uuid, nullable, FK → drivers.id)
- vehicle_id (uuid, nullable, FK → vehicles.id)
- facility_id (uuid, nullable, FK → contractors.id)
- trip_source_id (uuid, nullable, FK → trip_sources.id)
- clinic_id (uuid, nullable, FK → clinics.id)
- dispatcher_id (uuid, nullable)
- assigned_by (text, nullable)
- created_by_name (text, nullable)
- last_modified_by_name (text, nullable)
- status (TripStatus enum, required) — VALUES: scheduled | assigned | en_route_pickup | arrived_pickup | patient_loaded | en_route_dropoff | arrived_dropoff | completed | cancelled | no_show
- trip_type (TripType enum, required) — VALUES: pickup | dropoff | round_trip | multi_stop
- priority (TripPriority enum, required) — VALUES: emergency | urgent | standard | scheduled
- level_of_service (text, nullable)
- level_of_assistance (text, nullable)
- trip_classification (text, nullable)
- is_return (boolean, nullable)
- is_will_call (boolean, nullable)
- rider (text, nullable)
- phone (text, nullable)
- date (text, nullable)
- scheduled_pickup_time (timestamptz, required)
- scheduled_dropoff_time (timestamptz, nullable)
- appointment_time (timestamptz, nullable)
- actual_pickup_time (timestamptz, nullable)
- actual_dropoff_time (timestamptz, nullable)
- pu_address (text, nullable)
- pu_schedule (text, nullable)
- do_address (text, nullable)
- pickup_address (text, required)
- pickup_city (text, required)
- pickup_state (text, required)
- pickup_zip (text, required)
- pickup_lat (numeric, nullable)
- pickup_lng (numeric, nullable)
- pickup_instructions (text, nullable)
- dropoff_address (text, required)
- dropoff_city (text, required)
- dropoff_state (text, required)
- dropoff_zip (text, required)
- dropoff_lat (numeric, nullable)
- dropoff_lng (numeric, nullable)
- dropoff_instructions (text, nullable)
- mileage (numeric, nullable)
- revenue (numeric, nullable)
- estimated_cost (numeric, nullable)
- actual_cost (numeric, nullable)
- insurance_covered (boolean, nullable)
- notes (text, nullable)
- clinic_note (text, nullable)
- special_instructions (text, nullable)
- medical_equipment_needed (text, nullable)
- passenger_signature (text, nullable)
- cancellation_reason (text, nullable)
- stops (jsonb, nullable)
- round_trip_id (uuid, nullable)
- created_at (timestamptz, required)
- updated_at (timestamptz, required)
NOTE: NO created_by_id, NO created_by, NO fare, NO rate, NO total_charge, NO distance, NO distance_miles, NO driver_payout, NO wait_time_charge, NO wait_time_minutes, NO mobility_type, NO is_return_trip, NO will_call, NO service_level, NO classification, NO journey_type, NO leg1_miles, NO leg2_miles, NO dispatcher_name, NO cancelled_at, NO linked_trip_id, NO recurring_trip_id, NO scheduled_date, NO scheduled_time, NO patient_name, NO patient_phone

## contractors
- id (uuid, PK)
- clinic_id (uuid, nullable, FK → clinics.id)
- name (text, required)
- contractor_code (text, nullable) — short code for display in trip table (e.g., "RVMC")
- address (text, nullable)
- city (text, nullable)
- state (text, nullable)
- zip_code (text, nullable)
- phone (text, nullable)
- email (text, nullable)
- contact_person (text, nullable)
- notes (text, nullable)
- rate_tiers (jsonb, nullable, default '{}') — all rates stored here: { ambulatory: [{fromMiles, toMiles, rate}], wheelchair: [...], stretcher: [...], ambulatoryAdditionalRate, wheelchairAdditionalRate, stretcherAdditionalRate, cancellationRate, noShowRate }
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## clinics
- id (uuid, PK)
- name (text, required)
- company_code (text, nullable)
- email (text, nullable)
- contact_email (text, nullable)
- phone (text, nullable)
- address (text, nullable)
- city (text, nullable)
- state (text, nullable)
- zip_code (text, nullable)
- is_active (boolean, nullable)
- ambulatory_rate (numeric, nullable)
- wheelchair_rate (numeric, nullable)
- stretcher_rate (numeric, nullable)
- cancellation_rate (numeric, nullable)
- no_show_rate (numeric, nullable)
- payment_terms (text, nullable)
- created_at (timestamptz, required)
- updated_at (timestamptz, required)

## activity_log
- id (uuid, PK)
- user_id (uuid, nullable, FK → users.id)
- clinic_id (uuid, nullable, FK → clinics.id)
- action (text, required)
- entity_type (text, required)
- entity_id (text, nullable)
- details (jsonb, nullable)
- ip_address (text, nullable)
- user_agent (text, nullable)
- created_at (timestamptz, default CURRENT_TIMESTAMP)

## notifications
- id (uuid, PK)
- user_id (uuid, required, FK → users.id)
- type (text, required)
- title (text, required)
- message (text, required)
- trip_id (uuid, nullable, FK → trips.id)
- driver_id (uuid, nullable, FK → drivers.id)
- related_user_id (uuid, nullable, FK → users.id)
- action_url (text, nullable)
- is_read (boolean, default false)
- priority (text, nullable, default 'normal') — CHECK: low | normal | high | urgent
- metadata (jsonb, nullable, default '{}')
- created_at (timestamptz, default now())
- read_at (timestamptz, nullable)

## automated_notification_log
- id (uuid, PK)
- notification_type (text, nullable)
- recipient_contact (text, nullable)
- message_body (text, nullable)
- subject (text, nullable)
- trip_id (uuid, nullable, FK → trips.id)
- status (text, nullable, default 'pending')
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## notification_preferences
- user_id (uuid, PK, FK → users.id)
- email_notifications (boolean, default true)
- sms_notifications (boolean, default true)
- push_notifications (boolean, default true)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## RPC Functions Available
- verify_user_password(user_email text, user_password text) → boolean
- admin_update_user_password(target_email text, new_password text) → boolean
- current_user_role() → text
- current_user_clinic_id() → text
- is_admin() → boolean
- is_authenticated() → boolean
- can_manage_users() → boolean
- user_role() → text
- user_clinic_id() → text
NOTE: NO update_user_password function exists!
