import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/earnings
 * Create a driver earning record
 */
router.post('/', async (req, res) => {
  try {
    const { tripId, driverId } = req.body;

    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if earnings already exist
    const { data: existing } = await supabase
      .from('driver_earnings')
      .select('id')
      .eq('trip_id', tripId)
      .single();

    if (existing) {
      return res.json({ success: true, data: existing, message: 'Earnings already exist' });
    }

    // Insert earnings (calculation done client-side and passed in, or server can calculate)
    const earningsData = req.body.earnings || {};
    const { data, error } = await supabase
      .from('driver_earnings')
      .insert({
        driver_id: driverId,
        trip_id: tripId,
        ...earningsData,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating earnings:', error);
      return res.status(500).json({ error: 'Failed to create earnings' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /earnings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/earnings/driver/:driverId
 * Get earnings summary for a driver
 */
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('driver_earnings')
      .select('*')
      .eq('driver_id', driverId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching earnings:', error);
      return res.status(500).json({ error: 'Failed to fetch earnings' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /earnings/driver/:driverId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/earnings/mark-paid
 * Mark earnings as paid
 */
router.put('/mark-paid', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { earningIds, paymentMethod } = req.body;

    const { error } = await supabase
      .from('driver_earnings')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod || 'direct_deposit',
      })
      .in('id', earningIds);

    if (error) {
      console.error('Error marking earnings as paid:', error);
      return res.status(500).json({ error: 'Failed to update earnings' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /earnings/mark-paid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/earnings/all
 * Get all drivers earnings summary
 */
router.get('/all', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('driver_earnings')
      .select(`*, drivers (id, name, first_name, last_name)`);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all earnings:', error);
      return res.status(500).json({ error: 'Failed to fetch earnings' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /earnings/all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
