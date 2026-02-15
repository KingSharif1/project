import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Status mapping: frontend ↔ DB
 * DB enum: scheduled | assigned | en_route_pickup | arrived_pickup | patient_loaded | en_route_dropoff | arrived_dropoff | completed | cancelled | no_show
 * Frontend: pending | assigned | in-progress | completed | cancelled | no-show
 */
const frontendToDbStatus = (status) => {
  const map = {
    'pending': 'scheduled',
    'in-progress': 'en_route_pickup',
    'no-show': 'no_show',
    // These are the same in both:
    'assigned': 'assigned',
    'completed': 'completed',
    'cancelled': 'cancelled',
    // Pass through any DB-native values unchanged
    'scheduled': 'scheduled',
    'en_route_pickup': 'en_route_pickup',
    'arrived_pickup': 'arrived_pickup',
    'patient_loaded': 'patient_loaded',
    'en_route_dropoff': 'en_route_dropoff',
    'arrived_dropoff': 'arrived_dropoff',
    'no_show': 'no_show',
  };
  return map[status] || status;
};

const dbToFrontendStatus = (status) => {
  const map = {
    'scheduled': 'pending',
    'en_route_pickup': 'in-progress',
    'arrived_pickup': 'in-progress',
    'patient_loaded': 'in-progress',
    'en_route_dropoff': 'in-progress',
    'arrived_dropoff': 'in-progress',
    'no_show': 'no-show',
    // These are the same in both:
    'assigned': 'assigned',
    'completed': 'completed',
    'cancelled': 'cancelled',
  };
  return map[status] || status;
};

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
        patient:patients(id, first_name, last_name, phone, service_level),
        driver:drivers(id, first_name, last_name),
        vehicle:vehicles(id, make, model, license_plate),
        facility:contractors(id, name, clinic_id)
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

    // Filter by clinic for non-superadmin users (check direct clinic_id or facility's clinic_id)
    let filteredData = data || [];
    if (role !== 'superadmin' && clinicId) {
      filteredData = filteredData.filter(t => t.clinic_id === clinicId || t.facility?.clinic_id === clinicId);
    }

    // Transform to frontend format
    const trips = filteredData.map(t => {
      // Extract date and time from scheduled_pickup_time
      const scheduledPickup = t.scheduled_pickup_time ? new Date(t.scheduled_pickup_time) : null;
      const scheduledDate = scheduledPickup ? scheduledPickup.toISOString().split('T')[0] : null;

      // Build passenger name: prefer patient join, then rider column
      const patientFirstName = t.patient?.first_name || '';
      const patientLastName = t.patient?.last_name || '';
      const patientFullName = `${patientFirstName} ${patientLastName}`.trim();
      const riderName = t.rider || '';
      // Parse rider column into first/last if no patient join
      const riderParts = riderName.split(' ');
      const firstName = patientFirstName || riderParts[0] || '';
      const lastName = patientLastName || riderParts.slice(1).join(' ') || '';
      const customerName = patientFullName || riderName || '';
      const customerPhone = t.patient?.phone || t.phone || '';

      // Map DB status to frontend status using centralized helper
      const frontendStatus = dbToFrontendStatus(t.status);

      // All fields verified against DB_SCHEMA_REFERENCE.md
      return {
        id: t.id,
        tripNumber: t.trip_number,
        // Patient info — frontend-expected field names
        patientId: t.patient_id,
        patientName: customerName,
        patientPhone: customerPhone,
        firstName: firstName,
        lastName: lastName,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: '',
        mobilityType: t.patient?.service_level || t.level_of_service,
        rider: t.rider,
        phone: t.phone,
        // Assignments
        driverId: t.driver_id,
        driverName: t.driver ? `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim() : null,
        vehicleId: t.vehicle_id,
        vehicleInfo: t.vehicle ? `${t.vehicle.make} ${t.vehicle.model}` : null,
        facilityId: t.facility_id,
        contractorId: t.facility_id,
        contractorName: t.facility?.name || null,
        clinicId: t.clinic_id || t.facility?.clinic_id || '',
        tripSourceId: t.trip_source_id,
        dispatcherId: t.dispatcher_id,
        dispatcherName: t.created_by_name || null,
        assignedBy: t.assigned_by,
        // Locations
        pickupAddress: t.pickup_address,
        pickupLocation: t.pickup_address,
        pickupCity: t.pickup_city,
        pickupState: t.pickup_state,
        pickupZip: t.pickup_zip,
        pickupLat: t.pickup_lat,
        pickupLng: t.pickup_lng,
        pickupInstructions: t.pickup_instructions,
        dropoffAddress: t.dropoff_address,
        dropoffLocation: t.dropoff_address,
        dropoffCity: t.dropoff_city,
        dropoffState: t.dropoff_state,
        dropoffZip: t.dropoff_zip,
        dropoffLat: t.dropoff_lat,
        dropoffLng: t.dropoff_lng,
        dropoffInstructions: t.dropoff_instructions,
        // Time fields — return both DB names and frontend aliases
        scheduledPickupTime: t.scheduled_pickup_time,
        scheduledTime: t.scheduled_pickup_time,
        scheduledDropoffTime: t.scheduled_dropoff_time,
        appointmentTime: t.appointment_time,
        actualPickupTime: t.actual_pickup_time,
        actualDropoffTime: t.actual_dropoff_time,
        scheduledDate: scheduledDate,
        date: t.date || scheduledDate,
        // Status & type — with bidirectional mapping
        status: frontendStatus,
        tripType: t.trip_type,
        priority: t.priority,
        serviceLevel: t.level_of_service || t.patient?.service_level || 'ambulatory',
        levelOfService: t.level_of_service,
        levelOfAssistance: t.level_of_assistance,
        classification: t.trip_classification,
        tripClassification: t.trip_classification,
        journeyType: t.is_return ? 'roundtrip' : 'one-way',
        isReturn: t.is_return || false,
        isReturnTrip: t.is_return || false,
        isWillCall: t.is_will_call || false,
        willCall: t.is_will_call || false,
        // Financial — return both DB names and frontend aliases
        revenue: Number(t.revenue) || 0,
        fare: Number(t.revenue) || 0,
        estimatedCost: Number(t.estimated_cost) || 0,
        actualCost: Number(t.actual_cost) || 0,
        driverPayout: Number(t.estimated_cost) || 0,
        insuranceCovered: t.insurance_covered,
        // Distance — return both DB name and frontend alias
        mileage: Number(t.mileage) || 0,
        distance: Number(t.mileage) || 0,
        // Other
        notes: t.notes,
        clinicNote: t.clinic_note,
        specialInstructions: t.special_instructions,
        medicalEquipmentNeeded: t.medical_equipment_needed,
        cancellationReason: t.cancellation_reason,
        passengerSignature: t.passenger_signature,
        stops: t.stops,
        roundTripId: t.round_trip_id,
        // Metadata
        createdByName: t.created_by_name,
        lastModifiedByName: t.last_modified_by_name,
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
        patient:patients(id, first_name, last_name, phone, service_level),
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

    // Build scheduled_pickup_time from whatever the frontend sends
    // Frontend may send: scheduledPickupTime (ISO), scheduledTime (ISO or HH:MM), scheduledDate (YYYY-MM-DD)
    let scheduledPickupTime = tripData.scheduledPickupTime;
    if (!scheduledPickupTime && tripData.scheduledTime) {
      // scheduledTime could be a full ISO string or just HH:MM
      if (tripData.scheduledTime.includes('T') || tripData.scheduledTime.includes('Z')) {
        scheduledPickupTime = tripData.scheduledTime; // Already ISO
      } else if (tripData.scheduledDate) {
        scheduledPickupTime = `${tripData.scheduledDate}T${tripData.scheduledTime}:00`;
      }
    }
    if (!scheduledPickupTime && tripData.scheduledDate) {
      scheduledPickupTime = `${tripData.scheduledDate}T00:00:00`;
    }

    // Validate trip_type against DB enum: pickup | dropoff | round_trip | multi_stop
    const validTripTypes = ['pickup', 'dropoff', 'round_trip', 'multi_stop'];
    let tripType = tripData.tripType || 'pickup';
    if (tripType === 'one-way') tripType = 'pickup';
    if (tripType === 'roundtrip' || tripType === 'round-trip') tripType = 'round_trip';
    if (tripType === 'multi-stop' || tripType === 'multiStop') tripType = 'multi_stop';
    if (!validTripTypes.includes(tripType)) tripType = 'pickup'; // fallback for invalid values like 'ambulatory'

    // All columns verified against DB_SCHEMA_REFERENCE.md
    const { data, error } = await supabase
      .from('trips')
      .insert({
        trip_number: tripNumber,
        patient_id: tripData.patientId,
        driver_id: tripData.driverId || null,
        vehicle_id: tripData.vehicleId || null,
        facility_id: tripData.facilityId || tripData.contractorId || null,
        trip_source_id: tripData.tripSourceId || null,
        clinic_id: tripClinicId,
        dispatcher_id: tripData.dispatcherId || userId,
        assigned_by: tripData.assignedBy || null,
        created_by_name: req.user.fullName || null,
        status: frontendToDbStatus(tripData.status || 'pending'),
        trip_type: tripType,
        priority: tripData.priority || 'standard',
        level_of_service: tripData.levelOfService || tripData.serviceLevel || tripData.mobilityType || null,
        level_of_assistance: tripData.levelOfAssistance || null,
        trip_classification: tripData.tripClassification || tripData.classification || null,
        is_return: tripData.isReturn || tripData.isReturnTrip || false,
        is_will_call: tripData.isWillCall || tripData.willCall || false,
        rider: tripData.rider || tripData.patientName || tripData.customerName || null,
        phone: tripData.phone || tripData.patientPhone || tripData.customerPhone || null,
        date: tripData.scheduledDate || tripData.date || null,
        scheduled_pickup_time: scheduledPickupTime,
        scheduled_dropoff_time: tripData.scheduledDropoffTime || null,
        appointment_time: tripData.appointmentTime || null,
        pickup_address: tripData.pickupAddress || tripData.pickupLocation || '',
        pickup_city: tripData.pickupCity || '',
        pickup_state: tripData.pickupState || '',
        pickup_zip: tripData.pickupZip || '',
        pickup_lat: tripData.pickupLat || null,
        pickup_lng: tripData.pickupLng || null,
        pickup_instructions: tripData.pickupInstructions || null,
        dropoff_address: tripData.dropoffAddress || tripData.dropoffLocation || '',
        dropoff_city: tripData.dropoffCity || '',
        dropoff_state: tripData.dropoffState || '',
        dropoff_zip: tripData.dropoffZip || '',
        dropoff_lat: tripData.dropoffLat || null,
        dropoff_lng: tripData.dropoffLng || null,
        dropoff_instructions: tripData.dropoffInstructions || null,
        mileage: tripData.mileage || tripData.distance || tripData.distanceMiles || null,
        revenue: tripData.revenue || tripData.fare || tripData.rate || null,
        estimated_cost: tripData.estimatedCost || tripData.driverPayout || null,
        notes: tripData.notes || null,
        clinic_note: tripData.clinicNote || null,
        special_instructions: tripData.specialInstructions || null,
        medical_equipment_needed: tripData.medicalEquipmentNeeded || null,
        round_trip_id: tripData.roundTripId || tripData.linkedTripId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip:', error);
      return res.status(500).json({ error: 'Failed to create trip: ' + error.message });
    }

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'create_trip',
        entity_type: 'trip',
        entity_id: data.id,
        details: { tripNumber, patientName: tripData.patientName },
      });
    } catch (_) { /* table may not exist yet */ }

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

    // Build update object - ALL columns verified against DB_SCHEMA_REFERENCE.md
    const tripUpdates = {};

    // Patient / rider info
    if (updates.patientId !== undefined) tripUpdates.patient_id = updates.patientId;
    if (updates.rider !== undefined) tripUpdates.rider = updates.rider;
    if (updates.phone !== undefined) tripUpdates.phone = updates.phone;
    // Accept frontend aliases
    if (updates.patientName !== undefined) tripUpdates.rider = updates.patientName;
    if (updates.patientPhone !== undefined) tripUpdates.phone = updates.patientPhone;
    if (updates.customerName !== undefined) tripUpdates.rider = updates.customerName;
    if (updates.customerPhone !== undefined) tripUpdates.phone = updates.customerPhone;

    // Assignments
    if (updates.driverId !== undefined) tripUpdates.driver_id = updates.driverId;
    if (updates.vehicleId !== undefined) tripUpdates.vehicle_id = updates.vehicleId;
    if (updates.facilityId !== undefined) tripUpdates.facility_id = updates.facilityId;
    if (updates.contractorId !== undefined) tripUpdates.facility_id = updates.contractorId;
    if (updates.clinicId !== undefined) tripUpdates.clinic_id = updates.clinicId;
    if (updates.tripSourceId !== undefined) tripUpdates.trip_source_id = updates.tripSourceId;
    if (updates.dispatcherId !== undefined) tripUpdates.dispatcher_id = updates.dispatcherId;
    if (updates.assignedBy !== undefined) tripUpdates.assigned_by = updates.assignedBy;

    // Pickup location
    if (updates.pickupAddress !== undefined) tripUpdates.pickup_address = updates.pickupAddress;
    if (updates.pickupLocation !== undefined) tripUpdates.pickup_address = updates.pickupLocation;
    if (updates.pickupCity !== undefined) tripUpdates.pickup_city = updates.pickupCity;
    if (updates.pickupState !== undefined) tripUpdates.pickup_state = updates.pickupState;
    if (updates.pickupZip !== undefined) tripUpdates.pickup_zip = updates.pickupZip;
    if (updates.pickupLat !== undefined) tripUpdates.pickup_lat = updates.pickupLat;
    if (updates.pickupLng !== undefined) tripUpdates.pickup_lng = updates.pickupLng;
    if (updates.pickupInstructions !== undefined) tripUpdates.pickup_instructions = updates.pickupInstructions;

    // Dropoff location
    if (updates.dropoffAddress !== undefined) tripUpdates.dropoff_address = updates.dropoffAddress;
    if (updates.dropoffLocation !== undefined) tripUpdates.dropoff_address = updates.dropoffLocation;
    if (updates.dropoffCity !== undefined) tripUpdates.dropoff_city = updates.dropoffCity;
    if (updates.dropoffState !== undefined) tripUpdates.dropoff_state = updates.dropoffState;
    if (updates.dropoffZip !== undefined) tripUpdates.dropoff_zip = updates.dropoffZip;
    if (updates.dropoffLat !== undefined) tripUpdates.dropoff_lat = updates.dropoffLat;
    if (updates.dropoffLng !== undefined) tripUpdates.dropoff_lng = updates.dropoffLng;
    if (updates.dropoffInstructions !== undefined) tripUpdates.dropoff_instructions = updates.dropoffInstructions;

    // Time fields
    if (updates.scheduledPickupTime !== undefined) tripUpdates.scheduled_pickup_time = updates.scheduledPickupTime;
    if (updates.scheduledDropoffTime !== undefined) tripUpdates.scheduled_dropoff_time = updates.scheduledDropoffTime;
    if (updates.appointmentTime !== undefined) tripUpdates.appointment_time = updates.appointmentTime;
    if (updates.actualPickupTime !== undefined) tripUpdates.actual_pickup_time = updates.actualPickupTime;
    if (updates.actualDropoffTime !== undefined) tripUpdates.actual_dropoff_time = updates.actualDropoffTime;
    if (updates.date !== undefined) tripUpdates.date = updates.date;
    if (updates.scheduledDate !== undefined) tripUpdates.date = updates.scheduledDate;

    // Status & type (map frontend values to valid DB enum values)
    if (updates.status !== undefined) tripUpdates.status = frontendToDbStatus(updates.status);
    if (updates.tripType !== undefined) {
      let tt = updates.tripType;
      if (tt === 'one-way') tt = 'pickup';
      if (tt === 'roundtrip' || tt === 'round-trip') tt = 'round_trip';
      if (tt === 'multi-stop' || tt === 'multiStop') tt = 'multi_stop';
      const validTypes = ['pickup', 'dropoff', 'round_trip', 'multi_stop'];
      tripUpdates.trip_type = validTypes.includes(tt) ? tt : 'pickup';
    }
    if (updates.priority !== undefined) tripUpdates.priority = updates.priority;
    if (updates.levelOfService !== undefined) tripUpdates.level_of_service = updates.levelOfService;
    if (updates.serviceLevel !== undefined) tripUpdates.level_of_service = updates.serviceLevel;
    if (updates.mobilityType !== undefined) tripUpdates.level_of_service = updates.mobilityType;
    if (updates.levelOfAssistance !== undefined) tripUpdates.level_of_assistance = updates.levelOfAssistance;
    if (updates.tripClassification !== undefined) tripUpdates.trip_classification = updates.tripClassification;
    if (updates.classification !== undefined) tripUpdates.trip_classification = updates.classification;
    if (updates.isReturn !== undefined) tripUpdates.is_return = updates.isReturn;
    if (updates.isReturnTrip !== undefined) tripUpdates.is_return = updates.isReturnTrip;
    if (updates.isWillCall !== undefined) tripUpdates.is_will_call = updates.isWillCall;
    if (updates.willCall !== undefined) tripUpdates.is_will_call = updates.willCall;

    // Financial fields
    if (updates.revenue !== undefined) tripUpdates.revenue = updates.revenue;
    if (updates.fare !== undefined) tripUpdates.revenue = updates.fare;
    if (updates.estimatedCost !== undefined) tripUpdates.estimated_cost = updates.estimatedCost;
    if (updates.driverPayout !== undefined) tripUpdates.estimated_cost = updates.driverPayout;
    if (updates.actualCost !== undefined) tripUpdates.actual_cost = updates.actualCost;
    if (updates.insuranceCovered !== undefined) tripUpdates.insurance_covered = updates.insuranceCovered;

    // Distance
    if (updates.mileage !== undefined) tripUpdates.mileage = updates.mileage;
    if (updates.distance !== undefined) tripUpdates.mileage = updates.distance;
    if (updates.distanceMiles !== undefined) tripUpdates.mileage = updates.distanceMiles;

    // Other fields
    if (updates.notes !== undefined) tripUpdates.notes = updates.notes;
    if (updates.clinicNote !== undefined) tripUpdates.clinic_note = updates.clinicNote;
    if (updates.specialInstructions !== undefined) tripUpdates.special_instructions = updates.specialInstructions;
    if (updates.medicalEquipmentNeeded !== undefined) tripUpdates.medical_equipment_needed = updates.medicalEquipmentNeeded;
    if (updates.cancellationReason !== undefined) tripUpdates.cancellation_reason = updates.cancellationReason;
    if (updates.passengerSignature !== undefined) tripUpdates.passenger_signature = updates.passengerSignature;
    if (updates.stops !== undefined) tripUpdates.stops = updates.stops;
    if (updates.roundTripId !== undefined) tripUpdates.round_trip_id = updates.roundTripId;
    if (updates.linkedTripId !== undefined) tripUpdates.round_trip_id = updates.linkedTripId;
    if (updates.lastModifiedByName !== undefined) tripUpdates.last_modified_by_name = updates.lastModifiedByName;

    tripUpdates.last_modified_by_name = req.user.fullName || null;
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

    // Log status change if status was updated (non-critical — don't fail the update)
    if (updates.status && currentTrip && updates.status !== currentTrip.status) {
      try {
        await supabase.from('trip_status_history').insert({
          trip_id: id,
          old_status: currentTrip.status,
          new_status: tripUpdates.status || updates.status,
          changed_by_id: userId,
          reason: updates.statusChangeReason || null,
        });
      } catch (_) { /* table may not exist yet */ }
    }

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'update_trip',
        entity_type: 'trip',
        entity_id: id,
        details: { updates: Object.keys(updates) },
      });
    } catch (_) { /* table may not exist yet */ }

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

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'delete_trip',
        entity_type: 'trip',
        entity_id: id,
        details: {},
      });
    } catch (_) { /* table may not exist yet */ }

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

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'assign_driver',
        entity_type: 'trip',
        entity_id: id,
        details: { driverId, vehicleId },
      });
    } catch (_) { /* table may not exist yet */ }

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

    // Map frontend status to DB enum
    const dbStatus = frontendToDbStatus(status);
    const validDbStatuses = ['scheduled', 'assigned', 'en_route_pickup', 'arrived_pickup', 
                             'patient_loaded', 'en_route_dropoff', 'arrived_dropoff', 'completed', 'cancelled', 'no_show'];
    
    if (!validDbStatuses.includes(dbStatus)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Get current trip
    const { data: currentTrip } = await supabase
      .from('trips')
      .select('status')
      .eq('id', id)
      .single();

    const updateData = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    // Add timestamps for specific statuses (using columns that exist in DB)
    if (dbStatus === 'en_route_pickup') updateData.actual_pickup_time = new Date().toISOString();
    if (dbStatus === 'completed') updateData.actual_dropoff_time = new Date().toISOString();

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

/**
 * GET /api/trips/:id/history
 * Get trip change history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('trip_change_history')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet — return empty gracefully
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return res.json({ success: true, data: [] });
      }
      console.error('Error fetching trip history:', error);
      return res.status(500).json({ error: 'Failed to fetch trip history' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /trips/:id/history:', error);
    res.json({ success: true, data: [] });
  }
});

/**
 * GET /api/trips/:id/creator
 * Get trip creator info (dispatcher_name, created_by user)
 */
router.get('/:id/creator', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tripData } = await supabase
      .from('trips')
      .select('dispatcher_name, created_by')
      .eq('id', id)
      .maybeSingle();

    let creatorName = tripData?.dispatcher_name || null;

    if (!creatorName && tripData?.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', tripData.created_by)
        .maybeSingle();
      creatorName = userData?.full_name || null;
    }

    // Get last modifier
    const { data: lastChange } = await supabase
      .from('trip_change_history')
      .select('changed_by_name')
      .eq('trip_id', id)
      .not('changed_by_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        creatorName,
        lastModifierName: lastChange?.changed_by_name || null,
      },
    });
  } catch (error) {
    console.error('Error in GET /trips/:id/creator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/:id/assignment-history
 * Get trip assignment history
 */
router.get('/:id/assignment-history', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('trip_assignment_history')
      .select('*')
      .eq('trip_id', id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignment history:', error);
      return res.status(500).json({ error: 'Failed to fetch assignment history' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /trips/:id/assignment-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/:id/sms-history
 * Get SMS notifications for a specific trip
 */
router.get('/:id/sms-history', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trip SMS history:', error);
      return res.status(500).json({ error: 'Failed to fetch SMS history' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /trips/:id/sms-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/signatures
 * Get signatures for multiple trips
 */
router.post('/signatures', async (req, res) => {
  try {
    const { tripIds } = req.body;

    if (!tripIds || !Array.isArray(tripIds)) {
      return res.status(400).json({ error: 'tripIds array is required' });
    }

    const { data, error } = await supabase
      .from('trip_signatures')
      .select('*')
      .in('trip_id', tripIds)
      .in('signature_type', ['pickup', 'dropoff'])
      .order('signed_at', { ascending: false });

    if (error) {
      console.error('Error fetching signatures:', error);
      return res.status(500).json({ error: 'Failed to fetch signatures' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in POST /trips/signatures:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/invoice-history
 * Get trips that have been invoiced
 */
router.get('/invoice-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('trips')
      .select('id, trip_number, invoice_number, invoice_date, invoice_sent_at, total_charge, payment_status, passenger_name, contractors:facility_id(name)')
      .not('invoice_sent_at', 'is', null);

    if (startDate) query = query.gte('invoice_date', startDate);
    if (endDate) query = query.lte('invoice_date', endDate);

    const { data, error } = await query.order('invoice_sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoice history:', error);
      return res.status(500).json({ error: 'Failed to fetch invoice history' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /trips/invoice-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/batch
 * Get multiple trips by IDs (with joins for invoicing)
 */
router.post('/batch', async (req, res) => {
  try {
    const { tripIds } = req.body;

    if (!tripIds || !Array.isArray(tripIds)) {
      return res.status(400).json({ error: 'tripIds array is required' });
    }

    const { data, error } = await supabase
      .from('trips')
      .select(`*, patients (name, phone, email), contractors:facility_id (name, billing_address)`)
      .in('id', tripIds);

    if (error) {
      console.error('Error fetching batch trips:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in POST /trips/batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/:id/route
 * Get trip route data (route summary + location history)
 */
router.get('/:id/route', async (req, res) => {
  try {
    const { id } = req.params;

    let routeData = null;
    let locationData = [];

    // Get route summary from view (may not exist yet)
    try {
      const { data, error } = await supabase
        .from('trip_routes_with_details')
        .select('*')
        .eq('trip_id', id)
        .single();
      if (!error) routeData = data;
    } catch (_) { /* view may not exist */ }

    // Get location history via RPC (may not exist yet)
    try {
      const { data, error } = await supabase
        .rpc('get_trip_route', { p_trip_id: id });
      if (!error && data) locationData = data;
    } catch (_) { /* RPC may not exist */ }

    res.json({
      success: true,
      data: {
        route: routeData,
        locations: locationData,
      },
    });
  } catch (error) {
    console.error('Error in GET /trips/:id/route:', error);
    res.json({ success: true, data: { route: null, locations: [] } });
  }
});

export default router;
