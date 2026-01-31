import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/drivers
 * Get all drivers (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    
    let query = supabase
      .from('drivers')
      .select(`
        *,
        user:users(id, email, first_name, last_name, phone),
        vehicle:vehicles(id, make, model, license_plate)
      `)
      .order('created_at', { ascending: false });

    // Filter by clinic for non-superadmin users
    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching drivers:', error);
      return res.status(500).json({ error: 'Failed to fetch drivers' });
    }

    // Transform to frontend format
    const drivers = data.map(d => ({
      id: d.id,
      userId: d.user_id,
      name: d.user ? `${d.user.first_name || ''} ${d.user.last_name || ''}`.trim() : 'Unknown',
      firstName: d.user?.first_name,
      lastName: d.user?.last_name,
      email: d.user?.email,
      phone: d.user?.phone,
      licenseNumber: d.license_number,
      licenseClass: d.license_class,
      licenseExpiry: d.license_expiry,
      medicalCertExpiry: d.medical_cert_expiry,
      backgroundCheckExpiry: d.background_check_expiry,
      drugTestExpiry: d.drug_test_expiry,
      assignedVehicleId: d.assigned_vehicle_id,
      assignedVehicle: d.vehicle ? `${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.license_plate})` : null,
      currentLocationLat: d.current_location_lat,
      currentLocationLng: d.current_location_lng,
      lastLocationUpdate: d.last_location_update,
      hourlyRate: d.hourly_rate,
      availabilityStatus: d.availability_status,
      clinicId: d.clinic_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error in GET /drivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/drivers/:id
 * Get a single driver by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        user:users(id, email, first_name, last_name, phone),
        vehicle:vehicles(id, make, model, license_plate)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching driver:', error);
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /drivers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/drivers
 * Create a new driver
 */
router.post('/', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      email,
      firstName,
      lastName,
      phone,
      password,
      licenseNumber,
      licenseClass,
      licenseExpiry,
      medicalCertExpiry,
      backgroundCheckExpiry,
      drugTestExpiry,
      hourlyRate,
      clinicId,
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    // Use the clinic from request or from the authenticated user
    const driverClinicId = clinicId || req.user.clinicId;

    // Step 1: Create user in auth.users via RPC
    const tempPassword = password || `Driver${Math.random().toString(36).slice(-6)}!`;
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'driver',
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(500).json({ error: 'Failed to create driver account: ' + authError.message });
    }

    // Step 2: Create user in public.users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: 'driver',
        clinic_id: driverClinicId,
        status: 'active',
        is_active: true,
      });

    if (userError) {
      console.error('Error creating public user:', userError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({ error: 'Failed to create driver profile' });
    }

    // Step 3: Create driver record
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert({
        user_id: authUser.user.id,
        license_number: licenseNumber,
        license_class: licenseClass,
        license_expiry: licenseExpiry,
        medical_cert_expiry: medicalCertExpiry,
        background_check_expiry: backgroundCheckExpiry,
        drug_test_expiry: drugTestExpiry,
        hourly_rate: hourlyRate || 0,
        availability_status: 'available',
        clinic_id: driverClinicId,
      })
      .select()
      .single();

    if (driverError) {
      console.error('Error creating driver:', driverError);
      return res.status(500).json({ error: 'Failed to create driver record' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_driver',
      entity_type: 'driver',
      entity_id: driver.id,
      details: { email, name: `${firstName} ${lastName}` },
    });

    res.status(201).json({ 
      success: true, 
      data: driver,
      temporaryPassword: tempPassword,
      message: 'Driver created successfully'
    });
  } catch (error) {
    console.error('Error in POST /drivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/drivers/:id
 * Update a driver
 */
router.put('/:id', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object for drivers table
    const driverUpdates = {};
    if (updates.licenseNumber !== undefined) driverUpdates.license_number = updates.licenseNumber;
    if (updates.licenseClass !== undefined) driverUpdates.license_class = updates.licenseClass;
    if (updates.licenseExpiry !== undefined) driverUpdates.license_expiry = updates.licenseExpiry;
    if (updates.medicalCertExpiry !== undefined) driverUpdates.medical_cert_expiry = updates.medicalCertExpiry;
    if (updates.backgroundCheckExpiry !== undefined) driverUpdates.background_check_expiry = updates.backgroundCheckExpiry;
    if (updates.drugTestExpiry !== undefined) driverUpdates.drug_test_expiry = updates.drugTestExpiry;
    if (updates.assignedVehicleId !== undefined) driverUpdates.assigned_vehicle_id = updates.assignedVehicleId;
    if (updates.hourlyRate !== undefined) driverUpdates.hourly_rate = updates.hourlyRate;
    if (updates.availabilityStatus !== undefined) driverUpdates.availability_status = updates.availabilityStatus;
    driverUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('drivers')
      .update(driverUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver:', error);
      return res.status(500).json({ error: 'Failed to update driver' });
    }

    // If user info is being updated, update the users table too
    if (updates.firstName || updates.lastName || updates.phone || updates.email) {
      const userUpdates = {};
      if (updates.firstName) userUpdates.first_name = updates.firstName;
      if (updates.lastName) userUpdates.last_name = updates.lastName;
      if (updates.phone) userUpdates.phone = updates.phone;
      if (updates.email) userUpdates.email = updates.email;
      userUpdates.updated_at = new Date().toISOString();

      await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', data.user_id);
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_driver',
      entity_type: 'driver',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Driver updated successfully' });
  } catch (error) {
    console.error('Error in PUT /drivers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/drivers/:id
 * Delete a driver
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Get driver to find user_id
    const { data: driver, error: fetchError } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Delete driver record
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting driver:', error);
      return res.status(500).json({ error: 'Failed to delete driver' });
    }

    // Optionally deactivate the user account (don't delete to preserve history)
    await supabase
      .from('users')
      .update({ is_active: false, status: 'inactive' })
      .eq('id', driver.user_id);

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_driver',
      entity_type: 'driver',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /drivers/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/drivers/:id/location
 * Update driver location (for mobile app)
 */
router.put('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const { error } = await supabase
      .from('drivers')
      .update({
        current_location_lat: latitude,
        current_location_lng: longitude,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating driver location:', error);
      return res.status(500).json({ error: 'Failed to update location' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /drivers/:id/location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/drivers/:id/status
 * Update driver availability status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: available, busy, or offline' });
    }

    const { data, error } = await supabase
      .from('drivers')
      .update({ availability_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /drivers/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
