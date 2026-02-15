import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/trip-sources
 * Get all trip sources (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;

    let query = supabase
      .from('trip_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trip sources:', error);
      return res.status(500).json({ error: 'Failed to fetch trip sources' });
    }

    // Transform to frontend format
    const tripSources = (data || []).map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      phone: source.phone,
      email: source.contact_email,
      contactEmail: source.contact_email,
      address: source.address,
      billingAddress: source.billing_address,
      clinicId: source.clinic_id,
      createdAt: source.created_at,
      updatedAt: source.updated_at,
    }));

    res.json({ success: true, data: tripSources });
  } catch (error) {
    console.error('Error in GET /trip-sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
