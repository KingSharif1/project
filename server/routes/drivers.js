import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/drivers/document-expiry-summary
 * Get document expiry summary using document_submissions table
 * NOTE: This route MUST be before /:id routes
 */
router.get('/document-expiry-summary', async (req, res) => {
  try {
    const { role, clinicId } = req.user;

    // Get drivers filtered by clinic
    let driverQuery = supabase.from('drivers').select('id, first_name, last_name, clinic_id').neq('availability_status', 'off_duty');
    if (role !== 'superadmin' && clinicId) {
      driverQuery = driverQuery.eq('clinic_id', clinicId);
    }
    const { data: drivers, error: dErr } = await driverQuery;
    if (dErr) return res.status(500).json({ error: 'Failed to fetch drivers' });

    const driverIds = (drivers || []).map(d => d.id);
    if (driverIds.length === 0) return res.json({ success: true, data: { totalDrivers: 0, expiredCount: 0, expiringSoonCount: 0, validCount: 0, details: [] } });

    // Get documents for those drivers
    const { data: docs } = await supabase.from('document_submissions').select('*').in('driver_id', driverIds);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const summary = { totalDrivers: drivers.length, expiredCount: 0, expiringSoonCount: 0, validCount: 0, details: [] };

    for (const doc of (docs || [])) {
      if (!doc.expiry_date) continue;
      const expiry = new Date(doc.expiry_date);
      const driver = drivers.find(d => d.id === doc.driver_id);
      const driverName = driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : 'Unknown';

      if (expiry < now) {
        summary.expiredCount++;
        summary.details.push({ driverId: doc.driver_id, driverName, documentType: doc.document_type, expiryDate: doc.expiry_date, status: 'expired' });
      } else if (expiry < thirtyDaysFromNow) {
        summary.expiringSoonCount++;
        summary.details.push({ driverId: doc.driver_id, driverName, documentType: doc.document_type, expiryDate: doc.expiry_date, status: 'expiring_soon' });
      } else {
        summary.validCount++;
      }
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in GET /drivers/document-expiry-summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/drivers/check-documents
 * Check document_submissions for expiring docs and create notifications
 */
router.post('/check-documents', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { clinicId } = req.user;

    let driverQuery = supabase.from('drivers').select('id, first_name, last_name, user_id, clinic_id');
    if (req.user.role !== 'superadmin' && clinicId) {
      driverQuery = driverQuery.eq('clinic_id', clinicId);
    }
    const { data: drivers, error } = await driverQuery;
    if (error) throw error;

    const driverIds = (drivers || []).map(d => d.id);
    if (driverIds.length === 0) return res.json({ success: true, notificationsSent: 0, driversChecked: 0 });

    const { data: docs } = await supabase.from('document_submissions').select('*').in('driver_id', driverIds);

    const notifications = [];
    const now = new Date();

    for (const doc of (docs || [])) {
      if (!doc.expiry_date) continue;
      const expiry = new Date(doc.expiry_date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(expiry); target.setHours(0, 0, 0, 0);
      const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 30) continue;

      const isExpired = days <= 0;
      const driver = drivers.find(d => d.id === doc.driver_id);
      const message = isExpired
        ? `${doc.document_type} expired ${Math.abs(days)} day(s) ago`
        : `${doc.document_type} expires in ${days} day(s)`;

      notifications.push({
        user_id: driver?.user_id || doc.driver_id,
        type: 'alert',
        title: isExpired ? 'Document Expired!' : 'Document Expiring Soon',
        message,
        driver_id: doc.driver_id,
        priority: days <= 7 ? 'urgent' : 'high',
        metadata: { document_type: doc.document_type, expiry_date: doc.expiry_date },
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ success: true, notificationsSent: notifications.length, driversChecked: drivers?.length || 0 });
  } catch (error) {
    console.error('Error in POST /drivers/check-documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
        vehicle:vehicles!drivers_assigned_vehicle_id_fkey(id, make, model, license_plate)
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

    // Transform to frontend format — only columns that exist in DB
    const drivers = data.map(d => ({
      id: d.id,
      userId: d.user_id,
      name: d.first_name && d.last_name
        ? `${d.first_name} ${d.last_name}`.trim()
        : d.user ? `${d.user.first_name || ''} ${d.user.last_name || ''}`.trim() : 'Unknown',
      firstName: d.first_name || d.user?.first_name,
      lastName: d.last_name || d.user?.last_name,
      email: d.user?.email,
      phone: d.user?.phone,
      dateOfBirth: d.date_of_birth,
      licenseNumber: d.license_number,
      temporaryPassword: d.temporary_password,
      assignedVehicleId: d.assigned_vehicle_id,
      assignedVehicle: d.vehicle ? `${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.license_plate})` : null,
      currentLatitude: d.current_location_lat,
      currentLongitude: d.current_location_lng,
      lastLocationUpdate: d.last_location_update,
      status: d.availability_status || 'available',
      isActive: d.user?.status !== 'inactive',
      rates: d.rates || {},
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
        vehicle:vehicles!drivers_assigned_vehicle_id_fkey(id, make, model, license_plate)
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
      dateOfBirth,
      phone,
      password,
      licenseNumber,
      clinicId,
      rates,
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    // Use the clinic from request or from the authenticated user
    const driverClinicId = clinicId || req.user.clinicId;

    // Step 1: Create user in auth.users
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
        date_of_birth: dateOfBirth || null,
      });

    if (userError) {
      console.error('Error creating public user:', userError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({ error: 'Failed to create driver profile' });
    }

    // Step 3: Create driver record
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert({
        user_id: authUser.user.id,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        license_number: licenseNumber || '',
        availability_status: 'available',
        clinic_id: driverClinicId,
        temporary_password: tempPassword,
        rates: rates || {},
      })
      .select()
      .single();

    if (driverError) {
      console.error('Error creating driver:', driverError);
      // Clean up: delete public user and auth user to prevent orphans
      await supabase.from('users').delete().eq('id', authUser.user.id);
      await supabase.auth.admin.deleteUser(authUser.user.id);
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

    // Build update object — only columns that exist in new schema
    const driverUpdates = {};
    if (updates.firstName !== undefined) driverUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) driverUpdates.last_name = updates.lastName;
    if (updates.dateOfBirth !== undefined) driverUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.licenseNumber !== undefined) driverUpdates.license_number = updates.licenseNumber;
    if (updates.assignedVehicleId !== undefined) driverUpdates.assigned_vehicle_id = updates.assignedVehicleId;
    if (updates.status !== undefined) driverUpdates.availability_status = updates.status;
    if (updates.availabilityStatus !== undefined) driverUpdates.availability_status = updates.availabilityStatus;
    if (updates.rates !== undefined) driverUpdates.rates = updates.rates;
    if (updates.temporaryPassword !== undefined) driverUpdates.temporary_password = updates.temporaryPassword;
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
    if (updates.firstName || updates.lastName || updates.phone || updates.email || updates.isActive !== undefined) {
      const userUpdates = {};
      if (updates.firstName) userUpdates.first_name = updates.firstName;
      if (updates.lastName) userUpdates.last_name = updates.lastName;
      if (updates.phone) userUpdates.phone = updates.phone;
      if (updates.email) userUpdates.email = updates.email;
      if (updates.isActive !== undefined) userUpdates.status = updates.isActive ? 'active' : 'inactive';
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

    // Deactivate the user record in users table
    await supabase
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', driver.user_id);

    // Also delete from Supabase Auth so the account is fully removed
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(driver.user_id);
    if (authDeleteError) {
      console.error('Warning: Failed to delete auth user (driver record already deleted):', authDeleteError.message);
    }

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

/**
 * GET /api/drivers/:id/rates
 * Get rates JSONB for a driver
 */
router.get('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('drivers')
      .select('rates')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching driver rates:', error);
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ success: true, data: data.rates || {} });
  } catch (error) {
    console.error('Error in GET /drivers/:id/rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/drivers/:id/rates
 * Update rates JSONB for a driver
 */
router.put('/:id/rates', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rates } = req.body;

    const { data, error } = await supabase
      .from('drivers')
      .update({ rates: rates || {}, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver rates:', error);
      return res.status(500).json({ error: 'Failed to update rates' });
    }

    res.json({ success: true, data, message: 'Rates updated successfully' });
  } catch (error) {
    console.error('Error in PUT /drivers/:id/rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/drivers/locations
 * Get realtime driver locations
 */
router.get('/locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('realtime_driver_locations')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      // Table may not exist yet — return empty array silently
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({ success: true, data: [] });
      }
      console.error('Error fetching driver locations:', error);
      return res.status(500).json({ error: 'Failed to fetch driver locations' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /drivers/locations:', error);
    res.json({ success: true, data: [] });
  }
});

/**
 * GET /api/drivers/payouts
 * Get driver payout report for completed trips in a date range
 */
router.get('/payouts', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { startDate, endDate, driverId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let query = supabase
      .from('trips')
      .select(`*, driver:drivers(id, name, email)`)
      .eq('status', 'completed')
      .gte('scheduled_pickup_time', `${startDate}T00:00:00`)
      .lte('scheduled_pickup_time', `${endDate}T23:59:59`);

    if (driverId && driverId !== 'all') {
      query = query.eq('driver_id', driverId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return res.status(500).json({ error: 'Failed to fetch payouts' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /drivers/payouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/drivers/:id/documents
 * Get all documents for a driver
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('driver_id', id)
      .order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching driver documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /drivers/:id/documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/drivers/:id/documents
 * Upload a document for a driver
 */
router.post('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, fileName, fileUrl, fileSize, expiryDate } = req.body;

    if (!documentType || !fileName) {
      return res.status(400).json({ error: 'Document type and file name are required' });
    }

    // Delete any existing document of the same type for this driver (replace, not duplicate)
    const { data: existing } = await supabase
      .from('document_submissions')
      .select('id, file_url')
      .eq('driver_id', id)
      .eq('document_type', documentType);

    if (existing && existing.length > 0) {
      for (const old of existing) {
        // Delete file from storage if it's a real path (not pending://)
        if (old.file_url && !old.file_url.startsWith('pending://')) {
          await supabase.storage.from('driver-documents').remove([old.file_url]);
        }
      }
      // Delete old DB records
      const oldIds = existing.map(e => e.id);
      await supabase.from('document_submissions').delete().in('id', oldIds);
    }

    const { data, error } = await supabase
      .from('document_submissions')
      .insert({
        driver_id: id,
        document_type: documentType,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize || null,
        expiry_date: expiryDate || null,
        submission_date: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error uploading document:', error);
      return res.status(500).json({ error: 'Failed to save document record' });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /drivers/:id/documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/drivers/:id/documents/:docId
 * Delete a document for a driver
 */
router.delete('/:id/documents/:docId', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { docId } = req.params;

    // Get the document to find the file URL for storage cleanup
    const { data: doc } = await supabase
      .from('document_submissions')
      .select('file_url')
      .eq('id', docId)
      .single();

    const { error } = await supabase
      .from('document_submissions')
      .delete()
      .eq('id', docId);

    if (error) {
      console.error('Error deleting document:', error);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    // Try to clean up storage file if it exists
    if (doc?.file_url && !doc.file_url.startsWith('pending://')) {
      // file_url is stored as the direct storage path (e.g. 'driverId/docType/timestamp_file.jpg')
      const path = doc.file_url.includes('/driver-documents/')
        ? doc.file_url.split('/driver-documents/')[1]
        : doc.file_url;
      await supabase.storage.from('driver-documents').remove([path]);
    }

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error in DELETE /drivers/:id/documents/:docId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
