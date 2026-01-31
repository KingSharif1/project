import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/mobile/auth/login
 * Mobile app login (driver or patient)
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType required' });
    }

    // Verify password
    const { data: isValid, error: pwError } = await supabase.rpc('verify_user_password', {
      user_email: email,
      user_password: password
    });

    if (pwError || !isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile based on type
    let profile;
    if (userType === 'driver') {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Driver profile not found' });
      }
      profile = data;
    } else if (userType === 'patient') {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      profile = data;
    } else {
      return res.status(400).json({ error: 'Invalid userType. Must be "driver" or "patient"' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: profile.id,
        email: profile.email,
        userType: userType
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      profile
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/mobile/driver/trips
 * Get trips for a driver
 */
router.get('/driver/trips', authenticateToken, async (req, res) => {
  try {
    const driverId = req.query.driverId || req.user.userId;

    const { data: trips, error } = await supabase
      .from('trips')
      .select('*, patients(*), clinics(*)')
      .eq('driver_id', driverId)
      .order('pickup_time', { ascending: true });

    if (error) {
      console.error('Error fetching driver trips:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    res.json({ success: true, trips });
  } catch (error) {
    console.error('Driver trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * POST /api/mobile/driver/trips/:tripId/status
 * Update trip status
 */
router.post('/driver/trips/:tripId/status', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trip status:', error);
      return res.status(500).json({ error: 'Failed to update trip' });
    }

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

/**
 * POST /api/mobile/driver/location
 * Update driver location
 */
router.post('/driver/location', authenticateToken, async (req, res) => {
  try {
    const { driverId, latitude, longitude } = req.body;

    if (!driverId || !latitude || !longitude) {
      return res.status(400).json({ error: 'driverId, latitude, and longitude required' });
    }

    const { data: driver, error } = await supabase
      .from('drivers')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver location:', error);
      return res.status(500).json({ error: 'Failed to update location' });
    }

    res.json({ success: true, driver });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

/**
 * GET /api/mobile/patient/trips
 * Get trips for a patient
 */
router.get('/patient/trips', authenticateToken, async (req, res) => {
  try {
    const patientId = req.query.patientId || req.user.userId;

    const { data: trips, error } = await supabase
      .from('trips')
      .select('*, drivers(*), clinics(*)')
      .eq('patient_id', patientId)
      .order('pickup_time', { ascending: true });

    if (error) {
      console.error('Error fetching patient trips:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    res.json({ success: true, trips });
  } catch (error) {
    console.error('Patient trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * POST /api/mobile/patient/trips
 * Create trip request
 */
router.post('/patient/trips', authenticateToken, async (req, res) => {
  try {
    const { patientId, pickupAddress, dropoffAddress, appointmentTime, notes } = req.body;

    if (!patientId || !pickupAddress || !dropoffAddress || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        patient_id: patientId,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup_time: appointmentTime,
        status: 'pending',
        notes: notes || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trip:', error);
      return res.status(500).json({ error: 'Failed to create trip' });
    }

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

export default router;
