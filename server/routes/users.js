import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users
 * Get all users (filtered by clinic for non-superadmin, excludes superadmins)
 */
router.get('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { role, clinicId } = req.user;

    let query = supabase
      .from('users')
      .select('*')
      .neq('role', 'superadmin')
      .order('created_at', { ascending: false });

    if (role !== 'superadmin' && clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Transform to frontend format
    const users = (data || []).map(u => ({
      id: u.id,
      email: u.email,
      fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone || undefined,
      role: u.role,
      clinicId: u.clinic_id || undefined,
      contractorId: u.facility_id || undefined,
      isActive: u.status !== 'inactive',
      mustChangePassword: u.must_change_password || false,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error in GET /users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Create a new user (auth + public.users)
 */
router.post('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      email,
      firstName,
      lastName,
      role,
      clinicId,
      temporaryPassword,
      contractorId,
    } = req.body;

    if (!email || !firstName || !lastName || !temporaryPassword) {
      return res.status(400).json({ error: 'Email, first name, last name, and password are required' });
    }

    const userClinicId = clinicId || req.user.clinicId;

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(500).json({ error: 'Failed to create user account: ' + authError.message });
    }

    // Step 2: Create user in public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: role || 'dispatcher',
        clinic_id: userClinicId,
        facility_id: contractorId || null,
        status: 'active',
        must_change_password: true,
      })
      .select()
      .single();

    if (publicError) {
      console.error('Error creating public user:', publicError);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user profile: ' + publicError.message });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'create_user',
      entity_type: 'user',
      entity_id: authData.user.id,
      clinic_id: userClinicId,
      details: { email, role, name: `${firstName} ${lastName}` },
    });

    const newUser = {
      id: authData.user.id,
      email,
      fullName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      role,
      clinicId: userClinicId,
      contractorId: contractorId || undefined,
      isActive: true,
      createdAt: publicUser.created_at,
      updatedAt: publicUser.updated_at,
    };

    res.status(201).json({
      success: true,
      data: newUser,
      temporaryPassword,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error in POST /users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const updates = req.body;

    const userUpdates = {};
    if (updates.email !== undefined) userUpdates.email = updates.email;
    if (updates.firstName !== undefined) userUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) userUpdates.last_name = updates.lastName;
    if (updates.role !== undefined) userUpdates.role = updates.role;
    if (updates.clinicId !== undefined) userUpdates.clinic_id = updates.clinicId;
    if (updates.contractorId !== undefined) userUpdates.facility_id = updates.contractorId;
    if (updates.isActive !== undefined) userUpdates.status = updates.isActive ? 'active' : 'inactive';
    if (updates.phone !== undefined) userUpdates.phone = updates.phone;
    userUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'update_user',
      entity_type: 'user',
      entity_id: id,
      details: { updates: Object.keys(updates) },
    });

    res.json({ success: true, data, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error in PUT /users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id/toggle-active
 * Toggle user active status
 */
router.put('/:id/toggle-active', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Get current status
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = currentUser.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling user status:', error);
      return res.status(500).json({ error: 'Failed to toggle user status' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: newStatus === 'active' ? 'activate_user' : 'deactivate_user',
      entity_type: 'user',
      entity_id: id,
      details: { newStatus },
    });

    res.json({ success: true, data: { isActive: newStatus === 'active' }, message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Error in PUT /users/:id/toggle-active:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Deactivate instead of delete to preserve history
    const { error } = await supabase
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    // Log audit
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'delete_user',
      entity_type: 'user',
      entity_id: id,
      details: {},
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error in DELETE /users/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password
 */
router.post('/:id/reset-password', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }

    // Mark user as needing password change
    await supabase
      .from('users')
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in POST /users/:id/reset-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/reset-password-by-email
 * Reset password by email - uses Supabase Admin API directly
 */
router.post('/reset-password-by-email', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { email, userType, temporaryPassword, sendSMS } = req.body;

    if (!email || !temporaryPassword) {
      return res.status(400).json({ error: 'Email and temporary password are required' });
    }

    // 1. Find the user in our users table by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (userError || !userData) {
      console.error('User not found for password reset:', email, userError);
      return res.status(404).json({ error: 'User not found with that email' });
    }

    // 2. Reset password via Supabase Auth Admin API
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: temporaryPassword }
    );

    if (authError) {
      console.error('Error resetting auth password:', authError);
      return res.status(500).json({ error: 'Failed to reset password: ' + authError.message });
    }

    // 3. Store temporary password on the driver/patient record
    if (userType === 'driver') {
      await supabase
        .from('drivers')
        .update({ temporary_password: temporaryPassword })
        .eq('user_id', userData.id);
    } else if (userType === 'patient') {
      await supabase
        .from('patients')
        .update({ temporary_password: temporaryPassword })
        .eq('email', email);
    }

    console.log('Password reset successfully for:', email);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error in POST /users/reset-password-by-email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
