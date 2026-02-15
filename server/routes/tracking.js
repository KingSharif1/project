import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/tracking/links
 * Create a tracking link for a trip
 */
router.post('/links', authenticateToken, async (req, res) => {
  try {
    const { tripId, token, expiresAt } = req.body;

    if (!tripId || !token) {
      return res.status(400).json({ error: 'tripId and token are required' });
    }

    const { data, error } = await supabase
      .from('tracking_links')
      .insert({
        trip_id: tripId,
        token,
        expires_at: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tracking link:', error);
      return res.status(500).json({ error: 'Failed to create tracking link' });
    }

    // Update trip with tracking link ID
    await supabase
      .from('trips')
      .update({ tracking_link_id: data.id })
      .eq('id', tripId);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /tracking/links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tracking/links/:token
 * Get tracking info by token (public - no auth required)
 */
router.get('/links/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Get tracking link
    const { data: trackingLink, error: linkError } = await supabase
      .from('tracking_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !trackingLink) {
      return res.status(404).json({ error: 'Invalid or expired tracking link' });
    }

    // Check if expired
    if (new Date(trackingLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This tracking link has expired' });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        drivers (
          id,
          name,
          first_name,
          last_name,
          phone,
          vehicle_id
        ),
        vehicles (
          make,
          model,
          color,
          license_plate
        )
      `)
      .eq('id', trackingLink.trip_id)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Update access count
    const userAgent = req.headers['user-agent'] || 'unknown';
    const accessLog = {
      timestamp: new Date().toISOString(),
      ip: req.ip || 'unknown',
      userAgent,
    };

    await supabase
      .from('tracking_links')
      .update({
        access_count: trackingLink.access_count + 1,
        last_accessed_at: new Date().toISOString(),
        access_logs: [...(trackingLink.access_logs || []), accessLog],
      })
      .eq('id', trackingLink.id);

    res.json({ success: true, data: { trip, trackingLink } });
  } catch (error) {
    console.error('Error in GET /tracking/links/:token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tracking/trips/:tripId/link
 * Get existing tracking link for a trip
 */
router.get('/trips/:tripId/link', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('tracking_links')
      .select('token')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: { token: data.token } });
  } catch (error) {
    console.error('Error in GET /tracking/trips/:tripId/link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tracking/trips/:tripId/deactivate
 * Deactivate tracking link for a trip
 */
router.put('/trips/:tripId/deactivate', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;

    await supabase
      .from('tracking_links')
      .update({ is_active: false })
      .eq('trip_id', tripId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /tracking/trips/:tripId/deactivate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tracking/drivers/:driverId/location
 * Get driver's current location
 */
router.get('/drivers/:driverId/location', async (req, res) => {
  try {
    const { driverId } = req.params;

    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        lat: data.latitude,
        lng: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: data.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in GET /tracking/drivers/:driverId/location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
