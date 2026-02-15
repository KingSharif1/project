import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/clinics
 * Get all clinics (superadmin sees all, others see their own)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    
    let query = supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    // Non-superadmin users only see their own clinic
    if (role !== 'superadmin' && clinicId) {
      query = query.eq('id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clinics:', error);
      return res.status(500).json({ error: 'Failed to fetch clinics' });
    }

    // Transform to frontend format
    const clinics = data.map(c => ({
      id: c.id,
      name: c.name,
      companyCode: c.company_code,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      phone: c.phone,
      email: c.email,
      ambulatoryRate: c.ambulatory_rate,
      wheelchairRate: c.wheelchair_rate,
      stretcherRate: c.stretcher_rate,
      baseMiles: c.base_miles,
      additionalMileRate: c.additional_mile_rate,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    res.json({ success: true, data: clinics });
  } catch (error) {
    console.error('Error in GET /clinics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clinics/stats
 * Get stats for all clinics (superadmin dashboard)
 */
router.get('/stats', requireRole('superadmin'), async (req, res) => {
  try {
    const { data: clinicsData, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clinics for stats:', error);
      return res.status(500).json({ error: 'Failed to fetch clinic stats' });
    }

    const stats = {};
    for (const clinic of (clinicsData || [])) {
      const [tripsResult, driversResult, usersResult] = await Promise.all([
        supabase.from('trips').select('id', { count: 'exact' }).eq('clinic_id', clinic.id),
        supabase.from('drivers').select('id', { count: 'exact' }).eq('clinic_id', clinic.id),
        supabase.from('users').select('id', { count: 'exact' }).eq('clinic_id', clinic.id),
      ]);

      stats[clinic.id] = {
        tripCount: tripsResult.count || 0,
        driverCount: driversResult.count || 0,
        userCount: usersResult.count || 0,
      };
    }

    res.json({ success: true, data: { clinics: clinicsData, stats } });
  } catch (error) {
    console.error('Error in GET /clinics/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clinics/:id/members
 * Get users and drivers for a specific clinic (superadmin)
 */
router.get('/:id/members', requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [usersResult, driversResult] = await Promise.all([
      supabase.from('users').select('*').eq('clinic_id', id),
      supabase.from('drivers').select('*').eq('clinic_id', id),
    ]);

    res.json({
      success: true,
      data: {
        users: usersResult.data || [],
        drivers: driversResult.data || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /clinics/:id/members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clinics/:id
 * Get a single clinic by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching clinic:', error);
      return res.status(404).json({ error: 'Clinic not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /clinics/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/clinics
 * Create a new clinic (superadmin only)
 */
router.post('/', requireRole('superadmin'), async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      name,
      companyCode,
      address,
      city,
      state,
      zip,
      phone,
      email,
      ambulatoryRate,
      wheelchairRate,
      stretcherRate,
      baseMiles,
      additionalMileRate,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Clinic name is required' });
    }

    // Generate company code if not provided
    const code = companyCode || name.substring(0, 4).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data, error } = await supabase
      .from('clinics')
      .insert({
        name,
        company_code: code,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        phone: phone || null,
        email: email || null,
        ambulatory_rate: ambulatoryRate || 0,
        wheelchair_rate: wheelchairRate || 0,
        stretcher_rate: stretcherRate || 0,
        base_miles: baseMiles || 0,
        additional_mile_rate: additionalMileRate || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating clinic:', error);
      return res.status(500).json({ error: 'Failed to create clinic: ' + error.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_clinic',
      entity_type: 'clinic',
      entity_id: data.id,
      details: { name, companyCode: code },
    });

    res.status(201).json({ success: true, data, message: 'Clinic created successfully' });
  } catch (error) {
    console.error('Error in POST /clinics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/clinics/:id
 * Update a clinic
 */
router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object
    const clinicUpdates = {};
    if (updates.name !== undefined) clinicUpdates.name = updates.name;
    if (updates.companyCode !== undefined) clinicUpdates.company_code = updates.companyCode;
    if (updates.address !== undefined) clinicUpdates.address = updates.address;
    if (updates.city !== undefined) clinicUpdates.city = updates.city;
    if (updates.state !== undefined) clinicUpdates.state = updates.state;
    if (updates.zip !== undefined) clinicUpdates.zip = updates.zip;
    if (updates.phone !== undefined) clinicUpdates.phone = updates.phone;
    if (updates.email !== undefined) clinicUpdates.email = updates.email;
    if (updates.ambulatoryRate !== undefined) clinicUpdates.ambulatory_rate = updates.ambulatoryRate;
    if (updates.wheelchairRate !== undefined) clinicUpdates.wheelchair_rate = updates.wheelchairRate;
    if (updates.stretcherRate !== undefined) clinicUpdates.stretcher_rate = updates.stretcherRate;
    if (updates.baseMiles !== undefined) clinicUpdates.base_miles = updates.baseMiles;
    if (updates.additionalMileRate !== undefined) clinicUpdates.additional_mile_rate = updates.additionalMileRate;
    clinicUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('clinics')
      .update(clinicUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinic:', error);
      return res.status(500).json({ error: 'Failed to update clinic' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_clinic',
      entity_type: 'clinic',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Clinic updated successfully' });
  } catch (error) {
    console.error('Error in PUT /clinics/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/clinics/:id
 * Delete a clinic (superadmin only)
 */
router.delete('/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Check if clinic has any users
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('clinic_id', id)
      .limit(1);

    if (users && users.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete clinic with existing users. Remove or reassign users first.' 
      });
    }

    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting clinic:', error);
      return res.status(500).json({ error: 'Failed to delete clinic' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_clinic',
      entity_type: 'clinic',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Clinic deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /clinics/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
