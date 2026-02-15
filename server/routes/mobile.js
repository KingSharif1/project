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

    const token = jwt.sign(
      { userId: userData.id, driverId: profile.id, email: userData.email, userType },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({ success: true, token, profile, driver: profile, mustChangePassword: usedTempPassword });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', (req, res) => res.json({ success: true }));

// ── DRIVER TRIPS ──

router.get('/driver/trips', authenticateToken, async (req, res) => {
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

router.post('/driver/trips/:tripId/status', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status, latitude, longitude, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

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

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

router.post('/driver/trips/:tripId/signature', authenticateToken, async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature) return res.status(400).json({ error: 'Signature required' });

    const { data: trip, error } = await supabase.from('trips')
      .update({ passenger_signature: signature, updated_at: new Date().toISOString() })
      .eq('id', req.params.tripId).select().single();
    if (error) return res.status(500).json({ error: 'Failed to save signature' });

    res.json({ success: true, trip });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// ── DRIVER LOCATION ──

router.post('/driver/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'lat/lng required' });

    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driver, error } = await supabase.from('drivers').update({
      current_location_lat: latitude, current_location_lng: longitude,
      last_location_update: new Date().toISOString()
    }).eq('id', driverId).select().single();
    if (error) return res.status(500).json({ error: 'Failed to update location' });

    res.json({ success: true, driver });
  } catch (error) {
    console.error('Location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ── DRIVER CHECK-IN ──

router.post('/driver/check-in', authenticateToken, async (req, res) => {
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

    res.json({ success: true, driver, status: updates.availability_status });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in/out' });
  }
});

// ── DRIVER PROFILE ──

router.get('/driver/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    const driverId = await resolveDriverId(userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const { data: driverData, error } = await supabase.from('drivers').select('*').eq('id', driverId).single();
    if (error || !driverData) return res.status(404).json({ error: 'Driver not found' });

    const profile = {
      ...driverData,
      name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : '',
      email: userData?.email || '',
      phone: userData?.phone || '',
    };
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/driver/profile', authenticateToken, async (req, res) => {
  try {
    const driverId = await resolveDriverId(req.user.userId);
    if (!driverId) return res.status(404).json({ error: 'Driver not found' });

    const allowed = ['first_name', 'last_name', 'availability_status'];
    const updates = { updated_at: new Date().toISOString() };
    for (const f of allowed) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }

    const { data: driver, error } = await supabase.from('drivers').update(updates).eq('id', driverId).select().single();
    if (error) return res.status(500).json({ error: 'Failed to update profile' });

    res.json({ success: true, driver });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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
