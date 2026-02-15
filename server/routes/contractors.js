import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/facilities
 * Get all facilities (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    
    let query = supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by clinic for non-superadmin users
    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching facilities:', error);
      return res.status(500).json({ error: 'Failed to fetch facilities' });
    }

    // Transform to frontend format
    const contractors = data.map(c => ({
      id: c.id,
      name: c.name,
      contractorCode: c.contractor_code || '',
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zip_code,
      phone: c.phone,
      email: c.email,
      contactPerson: c.contact_person,
      notes: c.notes,
      rateTiers: c.rate_tiers || {},
      clinicId: c.clinic_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    res.json({ success: true, data: contractors });
  } catch (error) {
    console.error('Error in GET /contractors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/contractors/:id
 * Get a single contractor by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contractor:', error);
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /contractors/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/contractors
 * Create a new contractor
 */
router.post('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, address, city, state, zipCode, phone, email, contactPerson, notes, clinicId, rate_tiers } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Contractor name is required' });
    }

    // Use the clinic from request or from the authenticated user
    const contractorClinicId = clinicId || req.user.clinicId;

    const contractorCode = req.body.contractorCode;

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        name,
        contractor_code: contractorCode || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        phone: phone || null,
        email: email || null,
        contact_person: contactPerson || null,
        notes: notes || null,
        clinic_id: contractorClinicId,
        rate_tiers: rate_tiers || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contractor:', error);
      return res.status(500).json({ error: 'Failed to create contractor: ' + error.message });
    }

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'create_contractor',
        entity_type: 'contractor',
        entity_id: data.id,
        details: { name },
      });
    } catch (_) { /* table may not exist yet */ }

    res.status(201).json({ success: true, data, message: 'Contractor created successfully' });
  } catch (error) {
    console.error('Error in POST /contractors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/contractors/:id
 * Update a contractor
 */
router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object — only columns that exist in DB
    const contractorUpdates = {};
    if (updates.name !== undefined) contractorUpdates.name = updates.name;
    if (updates.address !== undefined) contractorUpdates.address = updates.address;
    if (updates.city !== undefined) contractorUpdates.city = updates.city;
    if (updates.state !== undefined) contractorUpdates.state = updates.state;
    if (updates.zipCode !== undefined) contractorUpdates.zip_code = updates.zipCode;
    if (updates.phone !== undefined) contractorUpdates.phone = updates.phone;
    if (updates.email !== undefined) contractorUpdates.email = updates.email;
    if (updates.contactPerson !== undefined) contractorUpdates.contact_person = updates.contactPerson;
    if (updates.notes !== undefined) contractorUpdates.notes = updates.notes;
    if (updates.contractorCode !== undefined) contractorUpdates.contractor_code = updates.contractorCode;
    if (updates.rate_tiers !== undefined) contractorUpdates.rate_tiers = updates.rate_tiers;
    contractorUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('contractors')
      .update(contractorUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contractor:', error);
      return res.status(500).json({ error: 'Failed to update contractor' });
    }

    // Log audit (non-critical)
    try {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'update_contractor',
        entity_type: 'contractor',
        entity_id: id,
        details: { updates: Object.keys(updates) },
      });
    } catch (_) { /* table may not exist yet */ }

    res.json({ success: true, data, message: 'Contractor updated successfully' });
  } catch (error) {
    console.error('Error in PUT /contractors/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/contractors/:id
 * Delete a contractor
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Check if contractor has any trips
    // Note: trips table might still use facility_id, checking both just in case or assuming facility_id
    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('facility_id', id)
      .limit(1);

    if (trips && trips.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete contractor with existing trips.' 
      });
    }

    const { error } = await supabase
      .from('contractors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contractor:', error);
      return res.status(500).json({ error: 'Failed to delete contractor' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_contractor',
      entity_type: 'contractor',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /contractors/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/contractors/:id/rates
 * Get rate tiers for a contractor
 */
router.get('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contractors')
      .select('rate_tiers')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contractor rates:', error);
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ success: true, data: { rate_tiers: data.rate_tiers || {} } });
  } catch (error) {
    console.error('Error in GET /contractors/:id/rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/contractors/:id/rates
 * Update rate tiers for a contractor
 */
router.put('/:id/rates', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rate_tiers } = req.body;

    const { data, error } = await supabase
      .from('contractors')
      .update({ rate_tiers: rate_tiers || {}, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contractor rates:', error);
      return res.status(500).json({ error: 'Failed to update rates' });
    }

    res.json({ success: true, data, message: 'Rates updated successfully' });
  } catch (error) {
    console.error('Error in PUT /contractors/:id/rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
