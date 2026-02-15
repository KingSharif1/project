import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/patients
 * Get all patients/riders (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    
    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by clinic for non-superadmin users
    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching patients:', error);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    // Transform to frontend format (only columns that exist in DB)
    const patients = data.map(p => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      dateOfBirth: p.date_of_birth,
      phone: p.phone,
      accountNumber: p.account_number,
      serviceLevel: p.service_level || 'ambulatory',
      notes: p.notes,
      clinicId: p.clinic_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('Error in GET /patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/patients/:id
 * Get a single patient by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /patients/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/patients
 * Create a new patient/rider
 */
router.post('/', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { userId } = req.user;
    const body = req.body;

    // Accept both camelCase and snake_case field names
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    const dateOfBirth = body.dateOfBirth || body.date_of_birth;
    const phone = body.phone;
    const accountNumber = body.accountNumber || body.account_number;
    const serviceLevel = body.serviceLevel || body.service_level || body.mobilityType || 'ambulatory';
    const notes = body.notes;
    const clinicId = body.clinicId || body.clinic_id;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Use the clinic from request or from the authenticated user
    const patientClinicId = clinicId || req.user.clinicId;

    const { data, error } = await supabase
      .from('patients')
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        phone: phone || null,
        account_number: accountNumber || null,
        service_level: serviceLevel,
        notes: notes || null,
        clinic_id: patientClinicId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      return res.status(500).json({ error: 'Failed to create patient: ' + error.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_patient',
      entity_type: 'patient',
      entity_id: data.id,
      details: { name: `${firstName} ${lastName}` },
    });

    res.status(201).json({ success: true, data, message: 'Patient created successfully' });
  } catch (error) {
    console.error('Error in POST /patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/patients/:id
 * Update a patient
 */
router.put('/:id', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object (only columns that exist in DB)
    const patientUpdates = {};
    if (updates.firstName !== undefined) patientUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) patientUpdates.last_name = updates.lastName;
    if (updates.dateOfBirth !== undefined) patientUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.phone !== undefined) patientUpdates.phone = updates.phone;
    if (updates.accountNumber !== undefined) patientUpdates.account_number = updates.accountNumber;
    if (updates.serviceLevel !== undefined) patientUpdates.service_level = updates.serviceLevel;
    if (updates.mobilityType !== undefined) patientUpdates.service_level = updates.mobilityType;
    if (updates.notes !== undefined) patientUpdates.notes = updates.notes;
    if (updates.clinicId !== undefined) patientUpdates.clinic_id = updates.clinicId;
    patientUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('patients')
      .update(patientUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      return res.status(500).json({ error: 'Failed to update patient' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_patient',
      entity_type: 'patient',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Patient updated successfully' });
  } catch (error) {
    console.error('Error in PUT /patients/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/patients/:id
 * Delete a patient
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Check if patient has any trips
    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('patient_id', id)
      .limit(1);

    if (trips && trips.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete patient with existing trips. Consider deactivating instead.' 
      });
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      return res.status(500).json({ error: 'Failed to delete patient' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_patient',
      entity_type: 'patient',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /patients/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/patients/search
 * Search patients by name or phone
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { role, clinicId } = req.user;

    let dbQuery = supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,account_number.ilike.%${query}%`)
      .limit(20);

    // Filter by clinic for non-superadmin users
    if (role !== 'superadmin' && clinicId) {
      dbQuery = dbQuery.eq('clinic_id', clinicId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error searching patients:', error);
      return res.status(500).json({ error: 'Failed to search patients' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /patients/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
