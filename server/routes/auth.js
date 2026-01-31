import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Helper function to create login response
const createLoginResponse = (userData) => {
  const userProfile = {
    id: userData.id,
    email: userData.email,
    username: userData.username || null,
    fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
    firstName: userData.first_name,
    lastName: userData.last_name,
    role: userData.role,
    clinicId: userData.clinic_id || null,
    isActive: userData.status === 'active',
    mustChangePassword: userData.must_change_password || false,
    phone: userData.phone || null,
    address: userData.address || null,
    city: userData.city || null,
    state: userData.state || null,
    zipCode: userData.zip_code || null,
    dateOfBirth: userData.date_of_birth || null,
    createdAt: userData.created_at,
    updatedAt: userData.updated_at,
  };

  const token = jwt.sign(
    {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { token, userProfile };
};

/**
 * POST /api/auth/login
 * Authenticate user with email/username and password
 * Supports both email and username for login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Username and password required' });
    }

    // Check if input is email or username
    const isEmail = email.includes('@');
    
    // Find user by email or username
    let userQuery = supabase.from('users').select('*');
    
    if (isEmail) {
      userQuery = userQuery.eq('email', email);
    } else {
      // Try username first
      userQuery = userQuery.eq('username', email);
    }
    
    const { data: userData, error: userError } = await userQuery.single();

    // If username lookup failed, try email as fallback
    if (userError && !isEmail) {
      const { data: emailFallback, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (!emailError && emailFallback) {
        // Found by email
        const userEmail = emailFallback.email;
        
        // Verify password
        const { data: authData, error: pwError } = await supabase.rpc('verify_user_password', {
          user_email: userEmail,
          user_password: password
        });

        if (pwError || !authData) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (emailFallback.status !== 'active') {
          return res.status(403).json({ error: 'Account is not active' });
        }

        // Create response and return
        const { token, userProfile } = createLoginResponse(emailFallback);
        
        // Log audit entry
        await supabase.from('activity_log').insert({
          user_id: emailFallback.id,
          action: 'login',
          entity_type: 'auth',
          details: { email, method: 'backend_api' },
        });

        return res.json({ success: true, token, user: userProfile });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (userError || !userData) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userEmail = userData.email;

    // Query auth.users table directly for password verification
    const { data: authData, error: pwError } = await supabase.rpc('verify_user_password', {
      user_email: userEmail,
      user_password: password
    });

    if (pwError || !authData) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (userData.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Create response using helper
    const { token, userProfile } = createLoginResponse(userData);

    // Log audit entry
    await supabase.from('activity_log').insert({
      user_id: userData.id,
      action: 'login',
      entity_type: 'auth',
      details: { email, method: 'backend_api' },
    });

    res.json({
      success: true,
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Decode token to get user info for audit log
      const decoded = jwt.decode(token);
      if (decoded && decoded.userId) {
        await supabase.from('activity_log').insert({
          user_id: decoded.userId,
          action: 'logout',
          entity_type: 'auth',
          details: { method: 'backend_api' },
        });
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userProfile = {
      id: userData.id,
      email: userData.email,
      fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role,
      clinicId: userData.clinic_id || null,
      isActive: userData.status === 'active',
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    res.json({ success: true, user: userProfile });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/create-company-admin
 * Create a new company (clinic) and its admin user
 * Only accessible by super admin
 */
router.post('/create-company-admin', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token and check if super admin
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: requestingUser, error: userCheckError } = await supabase
      .from('users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (userCheckError || requestingUser?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only super admin can create companies' });
    }

    const { 
      companyName, 
      companyAddress, 
      companyPhone, 
      companyEmail, 
      companyCode,
      adminEmail, 
      adminFirstName, 
      adminLastName, 
      adminPassword 
    } = req.body;

    const { existingClinicId } = req.body;

    // Validate required fields
    if (!adminEmail || !adminFirstName || !adminLastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If not using existing clinic, validate company fields
    if (!existingClinicId && (!companyName || !companyEmail)) {
      return res.status(400).json({ error: 'Missing company name or email' });
    }

    // Generate password if not provided
    const password = adminPassword || generatePassword();
    const code = companyCode || generateCompanyCode(companyName || 'CMP');

    let clinicId = existingClinicId;
    let newClinic = null;

    // 1. Create the company (clinic) only if not using existing
    if (!existingClinicId) {
      const { data: createdClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: companyName,
          address: companyAddress || '',
          phone: companyPhone || '',
          email: companyEmail,
          company_code: code,
          is_active: true,
        })
        .select()
        .single();

      if (clinicError) {
        console.error('Clinic creation error:', clinicError);
        return res.status(500).json({ error: 'Failed to create company: ' + clinicError.message });
      }
      newClinic = createdClinic;
      clinicId = createdClinic.id;
    }

    // 2. Create auth user using Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'admin',
      }
    });

    if (authError) {
      // Rollback: delete the clinic we just created (only if we created it)
      if (newClinic) {
        await supabase.from('clinics').delete().eq('id', newClinic.id);
      }
      console.error('Auth user creation error:', authError);
      return res.status(500).json({ error: 'Failed to create admin user: ' + authError.message });
    }

    // 3. Create the user profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'admin',
        clinic_id: clinicId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      // Rollback: delete auth user and clinic (only if we created it)
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (newClinic) {
        await supabase.from('clinics').delete().eq('id', newClinic.id);
      }
      console.error('User profile creation error:', profileError);
      return res.status(500).json({ error: 'Failed to create user profile: ' + profileError.message });
    }

    // Log audit entry
    await supabase.from('activity_log').insert({
      user_id: decoded.userId,
      action: 'create',
      entity_type: existingClinicId ? 'user' : 'company',
      entity_id: clinicId,
      details: { 
        companyName: companyName || 'Existing Company', 
        companyCode: code,
        adminEmail,
        createdBy: 'superadmin',
        addedToExisting: !!existingClinicId
      },
    });

    res.json({
      success: true,
      company: {
        id: clinicId,
        name: companyName || 'Existing Company',
        code: code,
        email: companyEmail || '',
      },
      admin: {
        id: authData.user.id,
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        temporaryPassword: password,
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
/**
 * POST /api/auth/reset-user-password
 * Reset a user's password (admin only)
 */
router.post('/reset-user-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if requesting user is admin
    const { data: requestingUser, error: userCheckError } = await supabase
      .from('users')
      .select('role, clinic_id')
      .eq('id', decoded.userId)
      .single();

    if (userCheckError || !['admin', 'superadmin'].includes(requestingUser?.role)) {
      return res.status(403).json({ error: 'Only admins can reset passwords' });
    }

    const { userId, newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Generate password if not provided
    const password = newPassword || generatePassword();

    // Get target user to verify they belong to same clinic (unless superadmin)
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('clinic_id, email, role')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only reset passwords for users in their clinic
    if (requestingUser.role === 'admin' && targetUser.clinic_id !== requestingUser.clinic_id) {
      return res.status(403).json({ error: 'Cannot reset password for users outside your company' });
    }

    // Cannot reset superadmin password (only superadmins can reset other superadmin passwords)
    if (targetUser.role === 'superadmin' && requestingUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot reset superadmin password' });
    }
    
    // Regular admins cannot reset other admin passwords
    if (targetUser.role === 'admin' && requestingUser.role === 'admin' && targetUser.clinic_id !== requestingUser.clinic_id) {
      return res.status(403).json({ error: 'Cannot reset admin password for other companies' });
    }

    // Use RPC function to update password directly in auth.users (updated to use extensions.crypt)
    console.log('Attempting password reset for user:', userId, 'email:', targetUser.email);
    
    // Call the RPC function that updates auth.users directly
    const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
      target_email: targetUser.email,
      new_password: password
    });
    
    if (rpcError) {
      console.error('Password reset RPC failed:', rpcError.message);
      return res.status(500).json({ error: 'Failed to reset password: ' + rpcError.message });
    }
    
    console.log('Password reset successful for:', targetUser.email);

    // Log audit entry
    await supabase.from('activity_log').insert({
      user_id: decoded.userId,
      action: 'update',
      entity_type: 'user',
      entity_id: userId,
      details: { 
        action: 'password_reset',
        targetEmail: targetUser.email,
        resetBy: decoded.userId
      },
    });

    res.json({
      success: true,
      temporaryPassword: password,
      email: targetUser.email,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user's own password (used for first login or voluntary change)
 */
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const { data: authData, error: pwError } = await supabase.rpc('verify_user_password', {
      user_email: userData.email,
      user_password: currentPassword
    });

    if (pwError || !authData) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password using RPC
    const { error: updateError } = await supabase.rpc('update_user_password', {
      user_email: userData.email,
      new_password: newPassword
    });

    if (updateError) {
      console.error('Password update failed:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Clear the must_change_password flag
    await supabase
      .from('users')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', decoded.userId);

    // Log audit entry
    await supabase.from('activity_log').insert({
      user_id: decoded.userId,
      action: 'change_password',
      entity_type: 'auth',
      details: { method: 'self_change' },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user's own profile
 */
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { firstName, lastName, phone, address, city, state, zipCode, dateOfBirth } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (zipCode !== undefined) updates.zip_code = zipCode;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', decoded.userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update failed:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Log audit entry
    await supabase.from('activity_log').insert({
      user_id: decoded.userId,
      action: 'update_profile',
      entity_type: 'user',
      entity_id: decoded.userId,
      details: { fields: Object.keys(updates) },
    });

    res.json({ 
      success: true, 
      user: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        dateOfBirth: data.date_of_birth,
        role: data.role,
        clinicId: data.clinic_id,
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateCompanyCode(name) {
  const prefix = (name || 'CMP').substring(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
}

export default router;
