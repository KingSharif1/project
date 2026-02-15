import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/vehicles
 * Get all vehicles (filtered by clinic for non-superadmin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    
    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by clinic for non-superadmin users
    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }

    // Transform to frontend format
    const vehicles = data.map(v => ({
      id: v.id,
      vehicleName: v.vehicle_name,
      licensePlate: v.license_plate,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin,
      vehicleType: v.vehicle_type,
      ownershipType: v.ownership_type || 'company',
      capacity: v.capacity,
      wheelchairAccessible: v.wheelchair_accessible,
      stretcherCapable: v.stretcher_capable,
      status: v.status,
      lastMaintenanceDate: v.last_maintenance_date,
      insuranceExpiry: v.insurance_expiry,
      registrationExpiry: v.registration_expiry,
      inspectionExpiry: v.inspection_expiry,
      assignedDriverId: v.assigned_driver_id,
      color: v.color || null,
      clinicId: v.clinic_id,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    res.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('Error in GET /vehicles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/vehicles/:id
 * Get a single vehicle by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching vehicle:', error);
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /vehicles/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/vehicles
 * Create a new vehicle
 */
router.post('/', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      vehicleName,
      licensePlate,
      make,
      model,
      year,
      vin,
      vehicleType,
      ownershipType,
      capacity,
      wheelchairAccessible,
      stretcherCapable,
      lastMaintenanceDate,
      insuranceExpiry,
      registrationExpiry,
      inspectionExpiry,
      clinicId,
      color,
      assignedDriverId,
    } = req.body;

    // Validate required fields
    if (!licensePlate || !make || !model) {
      return res.status(400).json({ error: 'License plate, make, and model are required' });
    }

    // Use the clinic from request or from the authenticated user
    const vehicleClinicId = clinicId || req.user.clinicId;

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        vehicle_name: vehicleName || null,
        license_plate: licensePlate,
        make,
        model,
        year: year || null,
        vin: vin || null,
        vehicle_type: vehicleType || 'sedan',
        ownership_type: ownershipType || 'company',
        capacity: capacity || 4,
        wheelchair_accessible: wheelchairAccessible || false,
        stretcher_capable: stretcherCapable || false,
        status: 'available',
        last_maintenance_date: lastMaintenanceDate || null,
        insurance_expiry: insuranceExpiry || null,
        registration_expiry: registrationExpiry || null,
        inspection_expiry: inspectionExpiry || null,
        color: color || null,
        assigned_driver_id: assignedDriverId || null,
        clinic_id: vehicleClinicId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return res.status(500).json({ error: 'Failed to create vehicle: ' + error.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_vehicle',
      entity_type: 'vehicle',
      entity_id: data.id,
      details: { licensePlate, make, model },
    });

    res.status(201).json({ success: true, data, message: 'Vehicle created successfully' });
  } catch (error) {
    console.error('Error in POST /vehicles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/vehicles/:id
 * Update a vehicle
 */
router.put('/:id', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    // Build update object
    const vehicleUpdates = {};
    if (updates.vehicleName !== undefined) vehicleUpdates.vehicle_name = updates.vehicleName;
    if (updates.licensePlate !== undefined) vehicleUpdates.license_plate = updates.licensePlate;
    if (updates.make !== undefined) vehicleUpdates.make = updates.make;
    if (updates.model !== undefined) vehicleUpdates.model = updates.model;
    if (updates.year !== undefined) vehicleUpdates.year = updates.year;
    if (updates.vin !== undefined) vehicleUpdates.vin = updates.vin;
    if (updates.vehicleType !== undefined) vehicleUpdates.vehicle_type = updates.vehicleType;
    if (updates.ownershipType !== undefined) vehicleUpdates.ownership_type = updates.ownershipType;
    if (updates.capacity !== undefined) vehicleUpdates.capacity = updates.capacity;
    if (updates.wheelchairAccessible !== undefined) vehicleUpdates.wheelchair_accessible = updates.wheelchairAccessible;
    if (updates.stretcherCapable !== undefined) vehicleUpdates.stretcher_capable = updates.stretcherCapable;
    if (updates.status !== undefined) vehicleUpdates.status = updates.status;
    if (updates.lastMaintenanceDate !== undefined) vehicleUpdates.last_maintenance_date = updates.lastMaintenanceDate;
    if (updates.insuranceExpiry !== undefined) vehicleUpdates.insurance_expiry = updates.insuranceExpiry;
    if (updates.registrationExpiry !== undefined) vehicleUpdates.registration_expiry = updates.registrationExpiry;
    if (updates.inspectionExpiry !== undefined) vehicleUpdates.inspection_expiry = updates.inspectionExpiry;
    if (updates.color !== undefined) vehicleUpdates.color = updates.color;
    if (updates.assignedDriverId !== undefined) vehicleUpdates.assigned_driver_id = updates.assignedDriverId || null;
    vehicleUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicleUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return res.status(500).json({ error: 'Failed to update vehicle' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_vehicle',
      entity_type: 'vehicle',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Error in PUT /vehicles/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Check if vehicle is assigned to any driver
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id')
      .eq('assigned_vehicle_id', id);

    if (drivers && drivers.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vehicle. It is currently assigned to a driver. Unassign it first.' 
      });
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return res.status(500).json({ error: 'Failed to delete vehicle' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_vehicle',
      entity_type: 'vehicle',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /vehicles/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/vehicles/:id/documents
 * Get all documents for a vehicle
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('vehicle_id', id)
      .order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /vehicles/:id/documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/vehicles/:id/documents
 * Upload a document for a vehicle
 */
router.post('/:id/documents', requireRole('superadmin', 'admin', 'dispatcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, fileName, fileUrl, fileSize, expiryDate } = req.body;

    if (!documentType || !fileName) {
      return res.status(400).json({ error: 'Document type and file name are required' });
    }

    // Delete any existing document of the same type for this vehicle (replace, not duplicate)
    const { data: existing } = await supabase
      .from('document_submissions')
      .select('id, file_url')
      .eq('vehicle_id', id)
      .eq('document_type', documentType);

    if (existing && existing.length > 0) {
      for (const old of existing) {
        if (old.file_url && !old.file_url.startsWith('pending://')) {
          await supabase.storage.from('vehicle-documents').remove([old.file_url]);
        }
      }
      const oldIds = existing.map(e => e.id);
      await supabase.from('document_submissions').delete().in('id', oldIds);
    }

    const { data, error } = await supabase
      .from('document_submissions')
      .insert({
        vehicle_id: id,
        document_type: documentType,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize || null,
        expiry_date: expiryDate || null,
        submission_date: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error uploading vehicle document:', error);
      return res.status(500).json({ error: 'Failed to save document record' });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /vehicles/:id/documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/vehicles/:id/documents/:docId
 * Delete a document for a vehicle
 */
router.delete('/:id/documents/:docId', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { docId } = req.params;

    // Get the document to find the file URL for storage cleanup
    const { data: doc } = await supabase
      .from('document_submissions')
      .select('file_url')
      .eq('id', docId)
      .single();

    const { error } = await supabase
      .from('document_submissions')
      .delete()
      .eq('id', docId);

    if (error) {
      console.error('Error deleting vehicle document:', error);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    // Try to clean up storage file if it exists
    if (doc?.file_url && !doc.file_url.startsWith('pending://')) {
      const path = doc.file_url.includes('/vehicle-documents/')
        ? doc.file_url.split('/vehicle-documents/')[1]
        : doc.file_url;
      await supabase.storage.from('vehicle-documents').remove([path]);
    }

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error in DELETE /vehicles/:id/documents/:docId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
