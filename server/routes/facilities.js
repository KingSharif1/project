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
      .from('facilities')
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
    const facilities = data.map(f => ({
      id: f.id,
      name: f.name,
      address: f.address,
      city: f.city,
      state: f.state,
      zip: f.zip,
      phone: f.phone,
      email: f.email,
      contactName: f.contact_name,
      facilityType: f.facility_type,
      ambulatoryRate: f.ambulatory_rate,
      wheelchairRate: f.wheelchair_rate,
      stretcherRate: f.stretcher_rate,
      baseMiles: f.base_miles,
      additionalMileRate: f.additional_mile_rate,
      clinicId: f.clinic_id,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    res.json({ success: true, data: facilities });
  } catch (error) {
    console.error('Error in GET /facilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/facilities/:id
 * Get a single facility by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching facility:', error);
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /facilities/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/facilities
 * Create a new facility
 */
router.post('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      name,
      address,
      city,
      state,
      zip,
      phone,
      email,
      contactName,
      facilityType,
      ambulatoryRate,
      wheelchairRate,
      stretcherRate,
      baseMiles,
      additionalMileRate,
      clinicId,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Facility name is required' });
    }

    // Use the clinic from request or from the authenticated user
    const facilityClinicId = clinicId || req.user.clinicId;

    const { data, error } = await supabase
      .from('facilities')
      .insert({
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        phone: phone || null,
        email: email || null,
        contact_name: contactName || null,
        facility_type: facilityType || 'medical',
        ambulatory_rate: ambulatoryRate || 0,
        wheelchair_rate: wheelchairRate || 0,
        stretcher_rate: stretcherRate || 0,
        base_miles: baseMiles || 0,
        additional_mile_rate: additionalMileRate || 0,
        clinic_id: facilityClinicId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating facility:', error);
      return res.status(500).json({ error: 'Failed to create facility: ' + error.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_facility',
      entity_type: 'facility',
      entity_id: data.id,
      details: { name },
    });

    res.status(201).json({ success: true, data, message: 'Facility created successfully' });
  } catch (error) {
    console.error('Error in POST /facilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/facilities/:id
 * Update a facility
 */
router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object
    const facilityUpdates = {};
    if (updates.name !== undefined) facilityUpdates.name = updates.name;
    if (updates.address !== undefined) facilityUpdates.address = updates.address;
    if (updates.city !== undefined) facilityUpdates.city = updates.city;
    if (updates.state !== undefined) facilityUpdates.state = updates.state;
    if (updates.zip !== undefined) facilityUpdates.zip = updates.zip;
    if (updates.phone !== undefined) facilityUpdates.phone = updates.phone;
    if (updates.email !== undefined) facilityUpdates.email = updates.email;
    if (updates.contactName !== undefined) facilityUpdates.contact_name = updates.contactName;
    if (updates.facilityType !== undefined) facilityUpdates.facility_type = updates.facilityType;
    if (updates.ambulatoryRate !== undefined) facilityUpdates.ambulatory_rate = updates.ambulatoryRate;
    if (updates.wheelchairRate !== undefined) facilityUpdates.wheelchair_rate = updates.wheelchairRate;
    if (updates.stretcherRate !== undefined) facilityUpdates.stretcher_rate = updates.stretcherRate;
    if (updates.baseMiles !== undefined) facilityUpdates.base_miles = updates.baseMiles;
    if (updates.additionalMileRate !== undefined) facilityUpdates.additional_mile_rate = updates.additionalMileRate;
    facilityUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('facilities')
      .update(facilityUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating facility:', error);
      return res.status(500).json({ error: 'Failed to update facility' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_facility',
      entity_type: 'facility',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Facility updated successfully' });
  } catch (error) {
    console.error('Error in PUT /facilities/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/facilities/:id
 * Delete a facility
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Check if facility has any trips
    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('facility_id', id)
      .limit(1);

    if (trips && trips.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete facility with existing trips.' 
      });
    }

    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting facility:', error);
      return res.status(500).json({ error: 'Failed to delete facility' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_facility',
      entity_type: 'facility',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /facilities/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
