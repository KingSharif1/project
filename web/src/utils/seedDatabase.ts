import { supabase } from '../lib/supabase';
import { mockDrivers, mockTrips } from '../data/mockData';
import { mockClinics } from '../data/mockClinics';
import { mockUsers } from '../data/mockUsers';
import { mockVehicles } from '../data/mockVehicles';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    console.log('📍 Seeding clinics...');
    const clinicsData = mockClinics.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      city: clinic.city || 'New York',
      state: clinic.state || 'TX',
      zip_code: clinic.zip || '75001',
      phone: clinic.phone,
      contact_email: clinic.email || `${clinic.name.toLowerCase().replace(/\s/g, '')}@example.com`,
      contact_person: clinic.contactPerson || 'Contractor Manager',
      is_active: true,
      notes: clinic.notes,
      created_at: clinic.createdAt || new Date().toISOString(),
      updated_at: clinic.updatedAt || new Date().toISOString(),
    }));

    const { error: clinicsError } = await supabase
      .from('clinics')
      .upsert(clinicsData, { onConflict: 'id' });

    if (clinicsError) {
      console.error('❌ Error seeding clinics:', clinicsError);
    } else {
      console.log(`✅ Seeded ${clinicsData.length} clinics`);
    }

    console.log('🚗 Seeding vehicles...');
    const vehiclesData = mockVehicles.map(vehicle => ({
      id: vehicle.id,
      vehicle_name: vehicle.vehicleName || null,
      license_plate: vehicle.licensePlate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin || `VIN${vehicle.id.slice(0, 8).toUpperCase()}`,
      vehicle_type: vehicle.vehicleType,
      ownership_type: vehicle.ownershipType || 'company',
      capacity: vehicle.capacity || 1,
      wheelchair_accessible: vehicle.wheelchairAccessible || false,
      stretcher_capable: vehicle.stretcherCapable || false,
      status: vehicle.status || 'available',
      last_maintenance_date: vehicle.lastMaintenanceDate || null,
      insurance_expiry: vehicle.insuranceExpiry || null,
      registration_expiry: vehicle.registrationExpiry || null,
      inspection_expiry: vehicle.inspectionExpiry || null,
      created_at: vehicle.createdAt || new Date().toISOString(),
      updated_at: vehicle.updatedAt || new Date().toISOString(),
    }));

    const { error: vehiclesError } = await supabase
      .from('vehicles')
      .upsert(vehiclesData, { onConflict: 'id' });

    if (vehiclesError) {
      console.error('❌ Error seeding vehicles:', vehiclesError);
    } else {
      console.log(`✅ Seeded ${vehiclesData.length} vehicles`);
    }

    console.log('👥 Seeding users...');
    const usersData = mockUsers.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.fullName?.split(' ')[0] || 'User',
      last_name: user.fullName?.split(' ').slice(1).join(' ') || 'Name',
      role: user.role,
      phone: user.phone || '555-0000',
      status: user.isActive ? 'active' : 'inactive',
      clinic_id: user.clinicId || null,
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: user.updatedAt || new Date().toISOString(),
    }));

    const { error: usersError } = await supabase
      .from('users')
      .upsert(usersData, { onConflict: 'id' });

    if (usersError) {
      console.error('❌ Error seeding users:', usersError);
    } else {
      console.log(`✅ Seeded ${usersData.length} users`);
    }

    console.log('🚙 Seeding drivers...');
    const driversData = mockDrivers.map(driver => ({
      id: driver.id,
      user_id: null,
      license_number: driver.licenseNumber || 'DL123456',
      license_class: 'C',
      license_expiry: driver.licenseExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      medical_cert_expiry: driver.certificationExpiry || null,
      background_check_expiry: null,
      drug_test_expiry: null,
      assigned_vehicle_id: driver.vehicleId || null,
      current_location_lat: null,
      current_location_lng: null,
      last_location_update: null,
      hourly_rate: driver.ambulatoryRate || 25,
      availability_status: driver.status === 'available' ? 'available' : driver.status === 'on_trip' ? 'on_trip' : 'off_duty',
      created_at: driver.createdAt || new Date().toISOString(),
      updated_at: driver.updatedAt || new Date().toISOString(),
    }));

    const { error: driversError } = await supabase
      .from('drivers')
      .upsert(driversData, { onConflict: 'id' });

    if (driversError) {
      console.error('❌ Error seeding drivers:', driversError);
    } else {
      console.log(`✅ Seeded ${driversData.length} drivers`);
    }

    console.log('🚕 Seeding trips...');
    const tripsData = mockTrips.map(trip => ({
      id: trip.id,
      trip_number: trip.tripNumber,
      patient_id: null,
      driver_id: trip.driverId,
      vehicle_id: trip.vehicleId,
      clinic_id: trip.contractorId || clinicsData[0]?.id,
      pickup_address: trip.pickupAddress,
      pickup_city: trip.pickupCity || 'New York',
      pickup_state: trip.pickupState || 'NY',
      pickup_zip: trip.pickupZip || '10001',
      dropoff_address: trip.dropoffAddress,
      dropoff_city: trip.dropoffCity || 'New York',
      dropoff_state: trip.dropoffState || 'NY',
      dropoff_zip: trip.dropoffZip || '10001',
      scheduled_pickup_time: trip.scheduledTime,
      scheduled_dropoff_time: trip.scheduledDropoffTime,
      actual_pickup_time: trip.actualPickupTime,
      actual_dropoff_time: trip.actualDropoffTime,
      status: trip.status === 'pending' ? 'scheduled' : trip.status,
      trip_type: trip.serviceLevel,
      distance_miles: trip.distance || 0,
      rate: trip.rate || 25,
      total_charge: trip.totalCharge || trip.fare || 0,
      driver_payout: trip.driverPayout || 0,
      wait_time_minutes: trip.waitTimeMinutes || 0,
      wait_time_charge: trip.waitTimeCharge || 0,
      is_return_trip: trip.isReturnTrip || false,
      linked_trip_id: trip.linkedTripId,
      recurring_trip_id: trip.recurringTripId,
      notes: trip.notes,
      cancellation_reason: trip.cancellationReason,
      created_at: trip.createdAt || new Date().toISOString(),
      updated_at: trip.updatedAt || new Date().toISOString(),
    }));

    const { error: tripsError } = await supabase
      .from('trips')
      .upsert(tripsData, { onConflict: 'id' });

    if (tripsError) {
      console.error('❌ Error seeding trips:', tripsError);
    } else {
      console.log(`✅ Seeded ${tripsData.length} trips`);
    }

    console.log('✨ Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - ${clinicsData.length} Clinics`);
    console.log(`   - ${vehiclesData.length} Vehicles`);
    console.log(`   - ${usersData.length} Users`);
    console.log(`   - ${driversData.length} Drivers`);
    console.log(`   - ${tripsData.length} Trips`);
    console.log('');

    return {
      success: true,
      counts: {
        clinics: clinicsData.length,
        vehicles: vehiclesData.length,
        users: usersData.length,
        drivers: driversData.length,
        trips: tripsData.length,
      }
    };
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function clearDatabase() {
  console.log('🗑️  Clearing database...');

  try {
    await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clinics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Database cleared successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
