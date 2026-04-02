import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

async function resolveDriverId(userId) {
  const { data: d1 } = await supabase.from('drivers').select('id').eq('id', userId).single();
  if (d1) return d1.id;
  const { data: d2 } = await supabase.from('drivers').select('id').eq('user_id', userId).single();
  return d2?.id || null;
}

// ── AUTH ──

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType required' });
    }

    // Look up user in users table
    const isEmailAddr = email.includes('@');
    let uq = supabase.from('users').select('*');
    uq = isEmailAddr ? uq.eq('email', email) : uq.eq('username', email);
    const { data: userData, error: userError } = await uq.single();
    if (userError || !userData) return res.status(401).json({ error: 'Invalid credentials' });

    if (userData.status !== 'active') return res.status(403).json({ error: 'Account not active' });

    let profile;
    let usedTempPassword = false;

    if (userType === 'driver') {
      const { data, error } = await supabase.from('drivers').select('*').eq('user_id', userData.id).single();
      if (error || !data) return res.status(404).json({ error: 'Driver profile not found' });

      // Check temp password first
      if (data.temporary_password && password === data.temporary_password) {
        usedTempPassword = true;
      } else {
        // Try Supabase Auth password
        const { data: authOk, error: pwErr } = await supabase.rpc('verify_user_password', {
          user_email: userData.email, user_password: password
        });
        if (pwErr || !authOk) return res.status(401).json({ error: 'Invalid credentials' });
      }

      profile = { ...data, name: `${userData.first_name} ${userData.last_name}`.trim(), email: userData.email, phone: userData.phone };
    } else {
      return res.status(400).json({ error: 'Only driver login supported currently' });
    }

    // Single-device enforcement: generate a unique session token
    // This invalidates any previous session (other device gets logged out)
    const sessionToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await supabase.from('drivers').update({ session_token: sessionToken }).eq('id', profile.id);

    const token = jwt.sign(
      { userId: userData.id, driverId: profile.id, email: userData.email, userType, sessionToken },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({ success: true, token, profile, driver: profile, mustChangePassword: usedTempPassword });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', (req, res) => res.json({ success: true }));

// ── SESSION VALIDATION (single-device enforcement) ──
async function validateDriverSession(req, res, next) {
  try {
    const { driverId, sessionToken } = req.user || {};
    if (!driverId || !sessionToken) return next(); // non-driver routes skip

    const { data } = await supabase.from('drivers').select('session_token').eq('id', driverId).single();
    if (data && data.session_token && data.session_token !== sessionToken) {
      return res.status(401).json({
        error: 'Session expired — you have been logged in on another device.',
        code: 'SESSION_REPLACED',
      });
    }
    next();
  } catch (err) {
    next(); // don't block on errors
  }
}

// Apply session validation to all authenticated /driver/* routes
router.use('/driver', authenticateToken, validateDriverSession);

// ── DRIVER LOCATION (uses service_role — bypasses RLS) ──

router.post('/driver/location', async (req, res) => {
  try {
    const driverId = req.user.driverId;
    if (!driverId) return res.status(400).json({ error: 'No driverId in token' });

    const { latitude, longitude, heading, speed, accuracy, status, trip_id } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    // Update current location (for real-time tracking)
    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        trip_id: trip_id || null,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 0,
        status: status || 'available',
        is_online: true,
        last_update: new Date().toISOString(),
      }, { onConflict: 'driver_id' });

    if (error) {
      console.error('Location upsert error:', error);
      return res.status(500).json({ error: 'Failed to update location' });
    }

    // ALWAYS save to location history (breadcrumbs) - don't rely on trigger
    try {
      await supabase.from('driver_location_history').insert({
        driver_id: driverId,
        trip_id: trip_id || null,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 0,
        status: status || 'available',
        timestamp: new Date().toISOString(),
      });
    } catch (histErr) {
      console.error('Location history insert error:', histErr);
      // Non-fatal - don't fail the request
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /driver/location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/driver/location/offline', async (req, res) => {
  try {
    const driverId = req.user.driverId;
    if (!driverId) return res.status(400).json({ error: 'No driverId in token' });

    const { error } = await supabase
      .from('driver_locations')
      .update({
        is_online: false,
        status: 'off_duty',
        last_update: new Date().toISOString(),
      })
      .eq('driver_id', driverId);

    if (error) {
      console.error('Location offline error:', error);
      return res.status(500).json({ error: 'Failed to set offline' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /driver/location/offline error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DRIVER TRIPS ──

router.get('/driver/trips', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    let query = supabase.from('trips')
      .select('*, patients(first_name, last_name, phone, service_level)')
      .eq('driver_id', driverId)
      .order('scheduled_pickup_time', { ascending: true });

    if (req.query.timeframe === 'today') {
      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      query = query.gte('scheduled_pickup_time', today.toISOString()).lt('scheduled_pickup_time', tomorrow.toISOString());
    }

    const { data: trips, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch trips' });

    const formatted = (trips || []).map(t => ({
      ...t,
      patient_name: t.patients ? `${t.patients.first_name} ${t.patients.last_name}`.trim() : (t.rider || 'Unknown'),
      patient_phone: t.patients?.phone || t.phone || '',
    }));

    res.json({ success: true, trips: formatted });
  } catch (error) {
    console.error('Driver trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

router.post('/driver/trips/:tripId/status', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status, latitude, longitude, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

    // Get current status before updating (for status history old_status)
    let oldStatus = null;
    try {
      const { data: current } = await supabase.from('trips').select('status').eq('id', tripId).single();
      if (current) oldStatus = current.status;
    } catch (_) {}

    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'patient_loaded') updates.actual_pickup_time = new Date().toISOString();
    if (status === 'completed') updates.actual_dropoff_time = new Date().toISOString();
    if (notes) updates.notes = notes;

    const { data: trip, error } = await supabase.from('trips').update(updates).eq('id', tripId).select().single();
    if (error) return res.status(500).json({ error: 'Failed to update trip' });

    if (latitude && longitude) {
      const driverId = await resolveDriverId(req.user.userId);
      if (driverId) {
        await supabase.from('drivers').update({
          current_location_lat: latitude, current_location_lng: longitude,
          last_location_update: new Date().toISOString()
        }).eq('id', driverId);
      }
    }

    // Log activity
    try {
      await supabase.from('activity_log').insert({
        user_id: req.user.userId,
        action: `trip_status_${status}`,
        entity_type: 'trip',
        entity_id: tripId,
        details: { status, latitude, longitude, notes: notes || null },
      });
    } catch (logErr) {
      console.log('Activity log error (non-fatal):', logErr.message);
    }

    // Log to trip_status_history (for web Status Timeline)
    try {
      await supabase.from('trip_status_history').insert({
        trip_id: tripId,
        status: status,
        changed_by: req.user.userId,
        notes: notes || null,
      });
    } catch (histErr) {
      console.error('trip_status_history insert error:', histErr);
    }

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

router.get('/driver/trips/:tripId/activity', async (req, res) => {
  try {
    const { tripId } = req.params;

    const { data: logs, error } = await supabase
      .from('activity_log')
      .select('id, action, details, created_at, user_id, users(first_name, last_name, role)')
      .eq('entity_type', 'trip')
      .eq('entity_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Activity log fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch activity log' });
    }

    const formatted = (logs || []).map(l => ({
      id: l.id,
      action: l.action,
      status: l.details?.status || l.action.replace('trip_status_', ''),
      userName: l.users ? `${l.users.first_name} ${l.users.last_name}`.trim() : 'System',
      userRole: l.users?.role || 'system',
      timestamp: l.created_at,
      notes: l.details?.notes || null,
    }));

    res.json({ success: true, activity: formatted });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

router.post('/driver/trips/:tripId/signature', async (req, res) => {
  try {
    const tripId = req.params.tripId;
    // Accept both 'signature' (legacy) and 'signature_data' (from SignatureCapture component)
    const signatureData = req.body.signature_data || req.body.signature;
    if (!signatureData) return res.status(400).json({ error: 'Signature required' });

    const signatureType = req.body.signature_type || 'pickup';
    const signerName = req.body.signer_name || req.body.signerName || '';

    // 1) Update trips table (legacy column)
    const updates = {
      passenger_signature: signatureData,
      updated_at: new Date().toISOString(),
    };

    const { data: trip, error } = await supabase.from('trips')
      .update(updates)
      .eq('id', tripId).select().single();
    if (error) {
      console.error('Signature DB error:', error);
      return res.status(500).json({ error: 'Failed to save signature' });
    }

    // 2) Also insert into trip_signatures table (for web display)
    try {
      await supabase.from('trip_signatures').insert({
        trip_id: tripId,
        signature_type: signatureType,
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: new Date().toISOString(),
        location_lat: req.body.location_lat || null,
        location_lng: req.body.location_lng || null,
      });
    } catch (sigErr) {
      console.error('trip_signatures insert error:', sigErr);
    }

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// ── DRIVER CHECK-IN ──

router.post('/driver/check-in', async (req, res) => {
  try {
    const { action, latitude, longitude } = req.body;
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const updates = {
      availability_status: action === 'in' ? 'available' : 'off_duty',
      updated_at: new Date().toISOString()
    };
    if (latitude && longitude) {
      updates.current_location_lat = latitude;
      updates.current_location_lng = longitude;
      updates.last_location_update = new Date().toISOString();
    }

    const { data: driver, error } = await supabase.from('drivers').update(updates).eq('id', driverId).select().single();
    if (error) return res.status(500).json({ error: 'Failed to check in/out' });

    // Sync driver_locations table for consistency
    try {
      if (action === 'in' && latitude && longitude) {
        // Upsert initial location on check-in
        await supabase.from('driver_locations').upsert({
          driver_id: driverId,
          latitude, longitude,
          heading: 0, speed: 0, accuracy: 0,
          status: 'available',
          is_online: true,
          last_update: new Date().toISOString(),
        }, { onConflict: 'driver_id' });
      } else if (action === 'out') {
        // Mark offline on check-out
        await supabase.from('driver_locations').update({
          is_online: false,
          status: 'off_duty',
          last_update: new Date().toISOString(),
        }).eq('driver_id', driverId);
      }
    } catch (_) { /* driver_locations sync is non-critical */ }

    res.json({ success: true, driver, status: updates.availability_status });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in/out' });
  }
});

// ── DRIVER SIGNATURE ──

router.post('/drivers/:id/signature', authenticateToken, async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const { signatureData, latitude, longitude } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: 'Signature data required' });
    }

    // Update driver's signature
    const { data, error } = await supabase
      .from('drivers')
      .update({
        signature_data: signatureData,
        signature_signed_at: new Date().toISOString(),
        signature_location_lat: latitude || null,
        signature_location_lng: longitude || null,
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) {
      console.error('Error saving driver signature:', error);
      return res.status(500).json({ error: 'Failed to save signature' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /drivers/:id/signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/drivers/:id/signature', authenticateToken, async (req, res) => {
  try {
    const { id: driverId } = req.params;

    const { data, error } = await supabase
      .from('drivers')
      .select('signature_data, signature_signed_at')
      .eq('id', driverId)
      .single();

    if (error) {
      console.error('Error fetching driver signature:', error);
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (!data.signature_data) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: { signature_data: data.signature_data, captured_at: data.signature_signed_at } });
  } catch (error) {
    console.error('Error in GET /drivers/:id/signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DRIVER PROFILE ──

router.get('/driver/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    const driverId = await resolveDriverId(userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driverData, error } = await supabase.from('drivers').select('*').eq('id', driverId).single();
    if (error || !driverData) return res.status(404).json({ error: 'Driver not found' });

    // Fetch driver's document submissions
    const { data: docs } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('driver_id', driverId)
      .order('submission_date', { ascending: false });

    // Count all trips assigned to this driver
    const { count: totalTrips } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', driverId);

    // Count this month's trips
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: tripsThisMonth } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', driverId)
      .gte('created_at', startOfMonth.toISOString());

    const profile = {
      id: driverData.id,
      userId: userData?.id,
      // Personal info (from users table)
      name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : '',
      firstName: userData?.first_name || '',
      lastName: userData?.last_name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      dateOfBirth: userData?.date_of_birth || null,
      address: userData?.address || '',
      city: userData?.city || '',
      state: userData?.state || '',
      zipCode: userData?.zip_code || '',
      profileImageUrl: userData?.profile_image_url || null,
      // Driver info
      licenseNumber: driverData.license_number || '',
      availabilityStatus: driverData.availability_status || 'off_duty',
      assignedVehicleId: driverData.assigned_vehicle_id || null,
      // Stats
      totalTrips: totalTrips || 0,
      tripsThisMonth: tripsThisMonth || 0,
      // Documents
      documents: (docs || []).map(d => ({
        id: d.id,
        documentType: d.document_type,
        fileName: d.file_name,
        fileUrl: d.file_url,
        fileSize: d.file_size,
        expiryDate: d.expiry_date,
        submissionDate: d.submission_date,
        status: d.status,
        reviewNotes: d.review_notes,
        rejectionReason: d.rejection_reason,
      })),
      // Timestamps
      createdAt: driverData.created_at,
    };
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/driver/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const driverId = await resolveDriverId(userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    // Fields that go to users table
    const userFields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'city', 'state', 'zip_code'];
    const userUpdates = {};
    for (const f of userFields) {
      if (req.body[f] !== undefined) userUpdates[f] = req.body[f];
    }

    // Fields that go to drivers table
    const driverFields = ['license_number', 'availability_status'];
    const driverUpdates = { updated_at: new Date().toISOString() };
    for (const f of driverFields) {
      if (req.body[f] !== undefined) driverUpdates[f] = req.body[f];
    }
    // Also sync first_name/last_name to drivers table
    if (req.body.first_name !== undefined) driverUpdates.first_name = req.body.first_name;
    if (req.body.last_name !== undefined) driverUpdates.last_name = req.body.last_name;

    // Update users table if there are changes
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      const { error: userErr } = await supabase.from('users').update(userUpdates).eq('id', userId);
      if (userErr) {
        console.error('User update error:', userErr);
        return res.status(500).json({ error: 'Failed to update personal info' });
      }
    }

    // Update drivers table
    const { error: driverErr } = await supabase.from('drivers').update(driverUpdates).eq('id', driverId);
    if (driverErr) {
      console.error('Driver update error:', driverErr);
      return res.status(500).json({ error: 'Failed to update driver info' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── DRIVER STATUS (online/offline) ──
router.put('/driver/status', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { status } = req.body;
    const validStatuses = ['available', 'on_trip', 'off_duty', 'break'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { error } = await supabase
      .from('drivers')
      .update({ availability_status: status, updated_at: new Date().toISOString() })
      .eq('id', driverId);

    if (error) return res.status(500).json({ error: 'Failed to update status' });
    res.json({ success: true, status });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── DRIVER DOCUMENTS ──
router.get('/driver/documents', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: docs, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('driver_id', driverId)
      .order('submission_date', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch documents' });

    const formatted = (docs || []).map(d => ({
      id: d.id,
      documentType: d.document_type,
      fileName: d.file_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      expiryDate: d.expiry_date,
      submissionDate: d.submission_date,
      status: d.status,
      reviewNotes: d.review_notes,
      rejectionReason: d.rejection_reason,
    }));

    res.json({ success: true, documents: formatted });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/driver/documents', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { documentType, fileName, fileUrl, fileSize, expiryDate } = req.body;
    if (!documentType) {
      return res.status(400).json({ error: 'documentType is required' });
    }

    // Delete existing doc of same type for this driver (replace, no duplicates)
    const { data: existing } = await supabase
      .from('document_submissions')
      .select('id')
      .eq('driver_id', driverId)
      .eq('document_type', documentType);

    if (existing && existing.length > 0) {
      await supabase.from('document_submissions').delete().in('id', existing.map(e => e.id));
    }

    const { data: doc, error } = await supabase
      .from('document_submissions')
      .insert({
        driver_id: driverId,
        document_type: documentType,
        file_name: fileName || null,
        file_url: fileUrl || null,
        file_size: fileSize || null,
        expiry_date: expiryDate || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Document insert error:', error);
      return res.status(500).json({ error: 'Failed to submit document' });
    }

    res.json({
      success: true,
      document: {
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        expiryDate: doc.expiry_date,
        submissionDate: doc.submission_date,
        status: doc.status,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to submit document' });
  }
});

// ── VEHICLE ──
router.get('/driver/vehicle', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    // Get driver's assigned vehicle ID
    const { data: driver } = await supabase.from('drivers').select('assigned_vehicle_id').eq('id', driverId).single();
    if (!driver?.assigned_vehicle_id) {
      return res.json({ success: true, vehicle: null });
    }

    // Get vehicle details
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', driver.assigned_vehicle_id)
      .single();

    if (error || !vehicle) {
      return res.json({ success: true, vehicle: null });
    }

    // Get document submissions for this vehicle
    const { data: docs } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('submission_date', { ascending: false });

    const formatted = {
      id: vehicle.id,
      vehicleName: vehicle.vehicle_name,
      licensePlate: vehicle.license_plate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      color: vehicle.color,
      vehicleType: vehicle.vehicle_type,
      ownershipType: vehicle.ownership_type,
      capacity: vehicle.capacity,
      wheelchairAccessible: vehicle.wheelchair_accessible,
      stretcherCapable: vehicle.stretcher_capable,
      status: vehicle.status,
      lastMaintenanceDate: vehicle.last_maintenance_date,
      insuranceExpiry: vehicle.insurance_expiry,
      registrationExpiry: vehicle.registration_expiry,
      inspectionExpiry: vehicle.inspection_expiry,
      documents: (docs || []).map(d => ({
        id: d.id,
        documentType: d.document_type,
        fileName: d.file_name,
        fileUrl: d.file_url,
        status: d.status,
        submissionDate: d.submission_date,
        expiryDate: d.expiry_date,
        reviewedAt: d.reviewed_at,
        notes: d.notes,
      })),
    };

    res.json({ success: true, vehicle: formatted });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to get vehicle' });
  }
});

// Submit own vehicle (when no admin-assigned vehicle)
router.post('/driver/vehicle', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    // Check if driver already has a vehicle
    const { data: driver } = await supabase.from('drivers').select('assigned_vehicle_id, clinic_id').eq('id', driverId).single();
    if (driver?.assigned_vehicle_id) {
      return res.status(400).json({ error: 'You already have a vehicle assigned. Contact admin to change it.' });
    }

    const {
      vehicleName, make, model, year, licensePlate, color, vin, vehicleType,
      capacity, wheelchairAccessible, stretcherCapable,
      lastMaintenanceDate, insuranceExpiry, registrationExpiry, inspectionExpiry,
    } = req.body;

    if (!make || !model || !year || !licensePlate) {
      return res.status(400).json({ error: 'Make, model, year, and license plate are required' });
    }

    // Create vehicle with all fields matching web admin
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        vehicle_name: vehicleName || `${make} ${model}`,
        make,
        model,
        year: parseInt(year),
        license_plate: licensePlate,
        color: color || null,
        vin: vin || null,
        vehicle_type: vehicleType || 'sedan',
        ownership_type: 'private',
        status: 'available',
        assigned_driver_id: driverId,
        clinic_id: driver?.clinic_id || null,
        capacity: parseInt(capacity) || 4,
        wheelchair_accessible: wheelchairAccessible || false,
        stretcher_capable: stretcherCapable || false,
        last_maintenance_date: lastMaintenanceDate || null,
        insurance_expiry: insuranceExpiry || null,
        registration_expiry: registrationExpiry || null,
        inspection_expiry: inspectionExpiry || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Vehicle create error:', error);
      return res.status(500).json({ error: 'Failed to create vehicle' });
    }

    // Assign vehicle to driver
    await supabase.from('drivers').update({
      assigned_vehicle_id: vehicle.id,
      updated_at: new Date().toISOString(),
    }).eq('id', driverId);

    res.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        vehicleName: vehicle.vehicle_name,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.license_plate,
        color: vehicle.color,
        vin: vehicle.vin,
        vehicleType: vehicle.vehicle_type,
        ownershipType: vehicle.ownership_type,
        status: vehicle.status,
        capacity: vehicle.capacity,
        wheelchairAccessible: vehicle.wheelchair_accessible,
        stretcherCapable: vehicle.stretcher_capable,
        lastMaintenanceDate: vehicle.last_maintenance_date,
        insuranceExpiry: vehicle.insurance_expiry,
        registrationExpiry: vehicle.registration_expiry,
        inspectionExpiry: vehicle.inspection_expiry,
      },
    });
  } catch (error) {
    console.error('Submit vehicle error:', error);
    res.status(500).json({ error: 'Failed to submit vehicle' });
  }
});

// ── VEHICLE DOCUMENTS (for assigned vehicle) ──
router.post('/driver/vehicle/documents', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driver } = await supabase.from('drivers').select('assigned_vehicle_id').eq('id', driverId).single();
    if (!driver?.assigned_vehicle_id) {
      return res.status(400).json({ error: 'No vehicle assigned to you' });
    }

    const { documentType, fileName, fileUrl, fileSize, expiryDate } = req.body;
    if (!documentType) {
      return res.status(400).json({ error: 'documentType is required' });
    }

    // Delete existing doc of same type for this vehicle (replace)
    const { data: existing } = await supabase
      .from('document_submissions')
      .select('id')
      .eq('vehicle_id', driver.assigned_vehicle_id)
      .eq('document_type', documentType);

    if (existing && existing.length > 0) {
      await supabase.from('document_submissions').delete().in('id', existing.map(e => e.id));
    }

    const { data: doc, error } = await supabase
      .from('document_submissions')
      .insert({
        vehicle_id: driver.assigned_vehicle_id,
        driver_id: null,
        document_type: documentType,
        file_name: fileName || null,
        file_url: fileUrl || null,
        file_size: fileSize || null,
        expiry_date: expiryDate || null,
        status: 'pending',
        submission_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Vehicle doc insert error:', error);
      return res.status(500).json({ error: 'Failed to submit vehicle document' });
    }

    res.json({
      success: true,
      document: {
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        status: doc.status,
        submissionDate: doc.submission_date,
      },
    });
  } catch (error) {
    console.error('Vehicle doc upload error:', error);
    res.status(500).json({ error: 'Failed to submit vehicle document' });
  }
});

// Unassign current vehicle (driver keeps vehicle in DB, just unlinks it)
router.put('/driver/vehicle/unassign', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driver } = await supabase.from('drivers').select('assigned_vehicle_id').eq('id', driverId).single();
    if (!driver?.assigned_vehicle_id) {
      return res.status(400).json({ error: 'No vehicle currently assigned' });
    }

    // Unlink vehicle from driver
    await supabase.from('drivers').update({
      assigned_vehicle_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', driverId);

    // Also clear assigned_driver_id on the vehicle
    await supabase.from('vehicles').update({
      assigned_driver_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', driver.assigned_vehicle_id);

    res.json({ success: true, message: 'Vehicle unassigned successfully' });
  } catch (error) {
    console.error('Unassign vehicle error:', error);
    res.status(500).json({ error: 'Failed to unassign vehicle' });
  }
});

// Delete own vehicle (only if ownership_type is 'private' — driver-created)
router.delete('/driver/vehicle', async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driver } = await supabase.from('drivers').select('assigned_vehicle_id').eq('id', driverId).single();
    if (!driver?.assigned_vehicle_id) {
      return res.status(400).json({ error: 'No vehicle currently assigned' });
    }

    // Verify ownership — only allow deleting private (driver-created) vehicles
    const { data: vehicle } = await supabase.from('vehicles').select('id, ownership_type').eq('id', driver.assigned_vehicle_id).single();
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    if (vehicle.ownership_type !== 'private') {
      return res.status(403).json({ error: 'You can only delete vehicles you created. Contact admin for company vehicles.' });
    }

    // Unlink from driver first
    await supabase.from('drivers').update({
      assigned_vehicle_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', driverId);

    // Delete vehicle documents
    await supabase.from('document_submissions').delete().eq('vehicle_id', vehicle.id);

    // Delete the vehicle
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
    if (error) {
      console.error('Vehicle delete error:', error);
      return res.status(500).json({ error: 'Failed to delete vehicle' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// ── CHANGE PASSWORD ──
router.post('/driver/change-password', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user email and driver record
    const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
    if (!userData) return res.status(404).json({ error: 'User not found' });

    const driverId = await resolveDriverId(userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driverData } = await supabase.from('drivers').select('temporary_password').eq('id', driverId).single();

    // Verify current password — check temp password first, then Supabase Auth
    let verified = false;
    if (driverData?.temporary_password && currentPassword === driverData.temporary_password) {
      verified = true;
    } else {
      const { data: authOk, error: pwErr } = await supabase.rpc('verify_user_password', {
        user_email: userData.email, user_password: currentPassword
      });
      if (!pwErr && authOk) verified = true;
    }

    if (!verified) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateErr) {
      console.error('Auth password update error:', updateErr);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Clear temporary password
    if (driverData?.temporary_password) {
      await supabase.from('drivers').update({
        temporary_password: null,
        updated_at: new Date().toISOString(),
      }).eq('id', driverId);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ── MESSAGES ──

// Get conversations for the logged-in driver
router.get('/driver/messages/conversations', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, role)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch conversations' });

    const conversationMap = {};
    for (const msg of (messages || [])) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;

      if (!conversationMap[otherId]) {
        conversationMap[otherId] = {
          userId: otherId,
          name: otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Unknown',
          role: otherUser?.role || 'unknown',
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        };
      }
      if (msg.receiver_id === userId && !msg.read_at) {
        conversationMap[otherId].unreadCount++;
      }
    }

    const conversations = Object.values(conversationMap)
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Mobile conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get contacts (admins/dispatchers) the driver can message
router.get('/driver/messages/contacts', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: currentUser } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('id', userId)
      .single();

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, role, email, phone')
      .neq('id', userId)
      .eq('status', 'active')
      .in('role', ['admin', 'dispatcher', 'superadmin']);

    if (currentUser?.clinic_id) {
      query = query.eq('clinic_id', currentUser.clinic_id);
    }

    const { data: contacts, error } = await query.order('first_name');
    if (error) return res.status(500).json({ error: 'Failed to fetch contacts' });

    const formatted = (contacts || []).map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
      role: c.role,
    }));

    res.json({ success: true, contacts: formatted });
  } catch (error) {
    console.error('Mobile contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get total unread message count (for badge)
router.get('/driver/messages/unread-count', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) return res.status(500).json({ error: 'Failed to get unread count' });
    res.json({ success: true, unreadCount: count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get messages between driver and another user
router.get('/driver/messages/:otherUserId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role)
      `)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });

    // Mark unread as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .is('read_at', null);

    const formatted = (messages || []).reverse().map(m => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      senderName: m.sender ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() : 'Unknown',
      senderRole: m.sender?.role || 'unknown',
      content: m.content,
      readAt: m.read_at,
      createdAt: m.created_at,
      isMe: m.sender_id === userId,
    }));

    res.json({ success: true, messages: formatted });
  } catch (error) {
    console.error('Mobile messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/driver/messages', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        content: content.trim(),
      })
      .select(`
        id, sender_id, receiver_id, content, read_at, created_at,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, role)
      `)
      .single();

    if (error) return res.status(500).json({ error: 'Failed to send message' });

    res.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        senderName: message.sender ? `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() : 'Unknown',
        senderRole: message.sender?.role || 'unknown',
        content: message.content,
        readAt: message.read_at,
        createdAt: message.created_at,
        isMe: true,
      },
    });
  } catch (error) {
    console.error('Mobile send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages from a specific user as read
router.post('/driver/messages/:otherUserId/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.params;

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) return res.status(500).json({ error: 'Failed to mark messages as read' });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ── PATIENT (kept for future) ──

router.get('/patient/trips', authenticateToken, async (req, res) => {
  try {
    const { data: trips, error } = await supabase.from('trips')
      .select('*, drivers(first_name, last_name)')
      .eq('patient_id', req.user.userId)
      .order('scheduled_pickup_time', { ascending: true });
    if (error) return res.status(500).json({ error: 'Failed to fetch trips' });
    res.json({ success: true, trips });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

export default router;
