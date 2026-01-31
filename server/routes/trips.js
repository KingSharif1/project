import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Helper to generate trip number
 */
const generateTripNumber = (isReturn = false) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const suffix = isReturn ? 'B' : 'A';
  return `TRP-${year}${month}${day}-${random}${suffix}`;
};

/**
 * GET /api/trips
 * Get all trips (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    const { status, date, driverId } = req.query;
    
    let query = supabase
      .from('trips')
      .select(`
        *,
        patient:patients(id, first_name, last_name, phone, mobility_requirements),
        driver:drivers(id, name, first_name, last_name),
        vehicle:vehicles(id, make, model, license_plate),
        facility:facilities(id, name, clinic_id)
      `)
      .order('scheduled_pickup_time', { ascending: true, nullsFirst: false });

    // Optional filters
    if (status) {
      query = query.eq('status', status);
    }
    if (date) {
      // Filter by date portion of scheduled_pickup_time
      query = query.gte('scheduled_pickup_time', `${date}T00:00:00`)
                   .lt('scheduled_pickup_time', `${date}T23:59:59`);
    }
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trips:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    // Filter by clinic for non-superadmin users (through facility relationship)
    let filteredData = data || [];
    if (role !== 'superadmin' && clinicId) {
      filteredData = filteredData.filter(t => t.facility?.clinic_id === clinicId);
    }

    // Transform to frontend format
    const trips = filteredData.map(t => {
      // Extract date and time from scheduled_pickup_time
      const scheduledPickup = t.scheduled_pickup_time ? new Date(t.scheduled_pickup_time) : null;
      const scheduledDate = scheduledPickup ? scheduledPickup.toISOString().split('T')[0] : null;
      const scheduledTime = scheduledPickup ? scheduledPickup.toTimeString().slice(0, 5) : null;

      return {
        id: t.id,
        tripNumber: t.trip_number,
        patientId: t.patient_id,
        patientName: t.patient ? `${t.patient.first_name || ''} ${t.patient.last_name || ''}`.trim() : null,
        patientPhone: t.patient?.phone || null,
        mobilityType: t.patient?.mobility_requirements || t.trip_type,
        driverId: t.driver_id,
        driverName: t.driver ? (t.driver.name || `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim()) : null,
        vehicleId: t.vehicle_id,
        vehicleInfo: t.vehicle ? `${t.vehicle.make} ${t.vehicle.model}` : null,
        pickupLocation: t.pickup_address,
        pickupAddress: t.pickup_address,
        pickupCity: t.pickup_city,
        pickupState: t.pickup_state,
        pickupZip: t.pickup_zip,
        dropoffLocation: t.dropoff_address,
        dropoffAddress: t.dropoff_address,
        dropoffCity: t.dropoff_city,
        dropoffState: t.dropoff_state,
        dropoffZip: t.dropoff_zip,
        scheduledPickupTime: t.scheduled_pickup_time,
        scheduledDropoffTime: t.scheduled_dropoff_time,
        actualPickupTime: t.actual_pickup_time,
        actualDropoffTime: t.actual_dropoff_time,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        status: t.status,
        tripType: t.trip_type,
        isReturnTrip: t.is_return_trip,
        distanceMiles: t.distance_miles,
        waitTimeMinutes: t.wait_time_minutes,
        rate: t.rate,
        waitTimeCharge: t.wait_time_charge,
        totalCharge: t.total_charge,
        driverPayout: t.driver_payout,
        notes: t.notes,
        cancellationReason: t.cancellation_reason,
        facilityId: t.facility_id,
        linkedTripId: t.linked_trip_id,
        recurringTripId: t.recurring_trip_id,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });

    res.json({ success: true, data: trips });
  } catch (error) {
    console.error('Error in GET /trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        patient:patients(id, first_name, last_name, phone, mobility_requirements),
        driver:drivers(id, user_id, users:user_id(first_name, last_name)),
        vehicle:vehicles(id, make, model, license_plate)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching trip:', error);
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /trips/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips
 * Create a new trip
 */
router.post('/', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { userId } = req.user;
    const tripData = req.body;

    // Generate trip number
    const tripNumber = tripData.tripNumber || generateTripNumber(tripData.isReturnTrip);

    // Use the clinic from request or from the authenticated user
    const tripClinicId = tripData.clinicId || req.user.clinicId;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        trip_number: tripNumber,
        patient_id: tripData.patientId || null,
        patient_name: tripData.patientName || null,
        patient_phone: tripData.patientPhone || null,
        driver_id: tripData.driverId || null,
        vehicle_id: tripData.vehicleId || null,
        pickup_address: tripData.pickupAddress || tripData.pickupLocation,
        pickup_city: tripData.pickupCity || null,
        pickup_state: tripData.pickupState || null,
        pickup_zip: tripData.pickupZip || null,
        pickup_lat: tripData.pickupLat || null,
        pickup_lng: tripData.pickupLng || null,
        dropoff_address: tripData.dropoffAddress || tripData.dropoffLocation,
        dropoff_city: tripData.dropoffCity || null,
        dropoff_state: tripData.dropoffState || null,
        dropoff_zip: tripData.dropoffZip || null,
        dropoff_lat: tripData.dropoffLat || null,
        dropoff_lng: tripData.dropoffLng || null,
        scheduled_date: tripData.scheduledDate,
        scheduled_time: tripData.scheduledTime,
        appointment_time: tripData.appointmentTime || null,
        status: tripData.status || 'pending',
        trip_type: tripData.tripType || 'one-way',
        is_return_trip: tripData.isReturnTrip || false,
        mobility_type: tripData.mobilityType || 'ambulatory',
        fare: tripData.fare || 0,
        distance: tripData.distance || null,
        notes: tripData.notes || null,
        special_instructions: tripData.specialInstructions || null,
        clinic_id: tripClinicId,
        facility_id: tripData.facilityId || null,
        trip_source_id: tripData.tripSourceId || null,
        created_by_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip:', error);
      return res.status(500).json({ error: 'Failed to create trip: ' + error.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_trip',
      entity_type: 'trip',
      entity_id: data.id,
      details: { tripNumber, patientName: tripData.patientName },
    });

    res.status(201).json({ success: true, data, message: 'Trip created successfully' });
  } catch (error) {
    console.error('Error in POST /trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id
 * Update a trip
 */
router.put('/:id', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Get current trip for comparison
    const { data: currentTrip } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();

    // Build update object
    const tripUpdates = {};
    if (updates.patientId !== undefined) tripUpdates.patient_id = updates.patientId;
    if (updates.patientName !== undefined) tripUpdates.patient_name = updates.patientName;
    if (updates.patientPhone !== undefined) tripUpdates.patient_phone = updates.patientPhone;
    if (updates.driverId !== undefined) tripUpdates.driver_id = updates.driverId;
    if (updates.vehicleId !== undefined) tripUpdates.vehicle_id = updates.vehicleId;
    if (updates.pickupAddress !== undefined) tripUpdates.pickup_address = updates.pickupAddress;
    if (updates.pickupCity !== undefined) tripUpdates.pickup_city = updates.pickupCity;
    if (updates.pickupState !== undefined) tripUpdates.pickup_state = updates.pickupState;
    if (updates.pickupZip !== undefined) tripUpdates.pickup_zip = updates.pickupZip;
    if (updates.pickupLat !== undefined) tripUpdates.pickup_lat = updates.pickupLat;
    if (updates.pickupLng !== undefined) tripUpdates.pickup_lng = updates.pickupLng;
    if (updates.dropoffAddress !== undefined) tripUpdates.dropoff_address = updates.dropoffAddress;
    if (updates.dropoffCity !== undefined) tripUpdates.dropoff_city = updates.dropoffCity;
    if (updates.dropoffState !== undefined) tripUpdates.dropoff_state = updates.dropoffState;
    if (updates.dropoffZip !== undefined) tripUpdates.dropoff_zip = updates.dropoffZip;
    if (updates.dropoffLat !== undefined) tripUpdates.dropoff_lat = updates.dropoffLat;
    if (updates.dropoffLng !== undefined) tripUpdates.dropoff_lng = updates.dropoffLng;
    if (updates.scheduledDate !== undefined) tripUpdates.scheduled_date = updates.scheduledDate;
    if (updates.scheduledTime !== undefined) tripUpdates.scheduled_time = updates.scheduledTime;
    if (updates.appointmentTime !== undefined) tripUpdates.appointment_time = updates.appointmentTime;
    if (updates.status !== undefined) tripUpdates.status = updates.status;
    if (updates.tripType !== undefined) tripUpdates.trip_type = updates.tripType;
    if (updates.mobilityType !== undefined) tripUpdates.mobility_type = updates.mobilityType;
    if (updates.fare !== undefined) tripUpdates.fare = updates.fare;
    if (updates.distance !== undefined) tripUpdates.distance = updates.distance;
    if (updates.notes !== undefined) tripUpdates.notes = updates.notes;
    if (updates.specialInstructions !== undefined) tripUpdates.special_instructions = updates.specialInstructions;
    tripUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('trips')
      .update(tripUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip:', error);
      return res.status(500).json({ error: 'Failed to update trip' });
    }

    // Log status change if status was updated
    if (updates.status && currentTrip && updates.status !== currentTrip.status) {
      await supabase.from('trip_status_history').insert({
        trip_id: id,
        old_status: currentTrip.status,
        new_status: updates.status,
        changed_by_id: userId,
        reason: updates.statusChangeReason || null,
      });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_trip',
      entity_type: 'trip',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error in PUT /trips/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trip:', error);
      return res.status(500).json({ error: 'Failed to delete trip' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_trip',
      entity_type: 'trip',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /trips/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/assign
 * Assign a driver to a trip
 */
router.put('/:id/assign', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { driverId, vehicleId } = req.body;

    if (!driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }

    const { data, error } = await supabase
      .from('trips')
      .update({
        driver_id: driverId,
        vehicle_id: vehicleId || null,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error assigning driver:', error);
      return res.status(500).json({ error: 'Failed to assign driver' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'assign_driver',
      entity_type: 'trip',
      entity_id: id,
      details: { driverId, vehicleId },
    });

    res.json({ success: true, data, message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Error in PUT /trips/:id/assign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/status
 * Update trip status (for driver app)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { status, latitude, longitude } = req.body;

    const validStatuses = ['pending', 'assigned', 'en_route_to_pickup', 'arrived_at_pickup', 
                           'in_progress', 'arrived_at_dropoff', 'completed', 'cancelled', 'no-show'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current trip
    const { data: currentTrip } = await supabase
      .from('trips')
      .select('status')
      .eq('id', id)
      .single();

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add timestamp for specific statuses
    if (status === 'en_route_to_pickup') updateData.pickup_started_at = new Date().toISOString();
    if (status === 'arrived_at_pickup') updateData.arrived_at_pickup_at = new Date().toISOString();
    if (status === 'in_progress') updateData.passenger_picked_up_at = new Date().toISOString();
    if (status === 'arrived_at_dropoff') updateData.arrived_at_dropoff_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    // Log status change
    if (currentTrip) {
      await supabase.from('trip_status_history').insert({
        trip_id: id,
        old_status: currentTrip.status,
        new_status: status,
        changed_by_id: userId,
        location_lat: latitude,
        location_lng: longitude,
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /trips/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/today
 * Get today's trips (for dashboard)
 */
router.get('/dashboard/today', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('trips')
      .select('*')
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true });

    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching today trips:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /trips/dashboard/today:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
