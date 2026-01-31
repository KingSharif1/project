import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, UserCircle, Mail, Calendar, Building, Lock, Eye, EyeOff, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { supabase } from '../lib/supabase';
import Toast, { ToastType } from './Toast';

export const UserManagement: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { facilities, clinics } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; email: string; password: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmStyle: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  // Load users from database on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        showToast('Failed to load users', 'error');
        return;
      }

      // Filter out superadmin users - they should not be visible to regular admins
      const filteredData = (data || []).filter((u: any) => u.role !== 'superadmin');
      
      const formattedUsers: User[] = filteredData.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        phone: u.phone || undefined,
        role: u.role as 'admin' | 'dispatcher',
        clinicId: u.clinic_id || undefined,
        isActive: u.is_active !== false,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'dispatcher' as User['role'],
    clinicId: '',
    temporaryPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access this page</p>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'dispatcher',
      clinicId: user?.clinicId || '',
      temporaryPassword: '',
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      const [firstName, ...lastNameParts] = user.fullName.split(' ');
      setFormData({
        email: user.email,
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        role: user.role,
        clinicId: user.clinicId || '',
        temporaryPassword: '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    try {
      if (editingUser) {
        // Update existing user in public.users
        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
            clinic_id: formData.clinicId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id);

        if (error) {
          console.error('Error updating user:', error);
          showToast(`Failed to update user: ${error.message}`, 'error');
          return;
        }

        setUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id
              ? { ...u, email: formData.email, fullName, role: formData.role, clinicId: formData.clinicId, updatedAt: new Date().toISOString() }
              : u
          )
        );
        showToast('User updated successfully', 'success');
      } else {
        // Create new user
        if (!formData.temporaryPassword) {
          showToast('Please enter a temporary password', 'error');
          return;
        }

        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.temporaryPassword,
          email_confirm: true,
          user_metadata: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          
          // If admin API fails, try signUp (for non-admin scenarios)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.temporaryPassword,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                role: formData.role,
              }
            }
          });

          if (signUpError) {
            console.error('Error with signUp:', signUpError);
            showToast(`Failed to create user: ${signUpError.message}`, 'error');
            return;
          }

          if (!signUpData.user) {
            showToast('Failed to create user - no user returned', 'error');
            return;
          }

          // Step 2: Create user in public.users table
          const { error: publicError } = await supabase
            .from('users')
            .insert({
              id: signUpData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: formData.role,
              clinic_id: formData.clinicId || user?.clinicId || null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (publicError) {
            console.error('Error creating public user:', publicError);
            showToast(`User created in auth but failed to sync: ${publicError.message}`, 'warning');
          }

          // Add to local state
          const newUser: User = {
            id: signUpData.user.id,
            email: formData.email,
            fullName,
            role: formData.role,
            clinicId: formData.clinicId || user?.clinicId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUsers(prev => [newUser, ...prev]);

          // Show success modal instead of ugly alert
          setSuccessModal({
            isOpen: true,
            email: formData.email,
            password: formData.temporaryPassword,
          });
          handleCloseModal();
          return;
        }

        // Admin API succeeded
        if (authData.user) {
          // Step 2: Create user in public.users table
          const { error: publicError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: formData.role,
              clinic_id: formData.clinicId || user?.clinicId || null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (publicError) {
            console.error('Error creating public user:', publicError);
            showToast(`User created in auth but failed to sync: ${publicError.message}`, 'warning');
          }

          // Add to local state
          const newUser: User = {
            id: authData.user.id,
            email: formData.email,
            fullName,
            role: formData.role,
            clinicId: formData.clinicId || user?.clinicId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUsers(prev => [newUser, ...prev]);

          // Show success modal instead of ugly alert
          setSuccessModal({
            isOpen: true,
            email: formData.email,
            password: formData.temporaryPassword,
          });
        }
      }

      handleCloseModal();
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      showToast(`An error occurred: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) return;

    const newActiveStatus = !userToToggle.isActive;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: newActiveStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling user status:', error);
        showToast(`Failed to update user status: ${error.message}`, 'error');
        return;
      }

      setUsers(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, isActive: newActiveStatus, updatedAt: new Date().toISOString() }
            : user
        )
      );
      showToast(`User ${newActiveStatus ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      showToast(`Failed to update user status: ${error.message}`, 'error');
    }
  };

  const handleDelete = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${userToDelete?.fullName || 'this user'}? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          // Delete from public.users table
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

          if (error) {
            console.error('Error deleting user:', error);
            showToast(`Failed to delete user: ${error.message}`, 'error');
            setConfirmModal(null);
            return;
          }

          setUsers(prev => prev.filter(user => user.id !== userId));
          setConfirmModal(null);
          showToast('User deleted successfully', 'success');
        } catch (error: any) {
          console.error('Error deleting user:', error);
          showToast(`Failed to delete user: ${error.message}`, 'error');
          setConfirmModal(null);
        }
      },
    });
  };

  const handleResetPassword = (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Reset password for ${userEmail}? A new temporary password will be generated and the user will need to use it to log in.`,
      confirmText: 'Reset Password',
      confirmStyle: 'warning',
      onConfirm: async () => {
        setConfirmModal(null);
        await performPasswordReset(userId);
      },
    });
  };

  const performPasswordReset = async (userId: string) => {
    try {
      const token = localStorage.getItem('transportHub_token');
      if (!token) {
        showToast('Not authenticated', 'error');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Show the new password
      setSuccessModal({
        isOpen: true,
        email: data.email,
        password: data.temporaryPassword,
      });

      showToast('Password reset successfully', 'success');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showToast(error.message || 'Failed to reset password', 'error');
    }
  };

  const filteredUsers = users.filter(
    user => filterRole === 'all' || user.role === filterRole
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage admin and dispatcher accounts</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {['all', 'admin', 'dispatcher'].map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filterRole === role
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${user.role === 'admin'
                    ? 'bg-gradient-to-br from-red-500 to-pink-500'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}
                >
                  {user.role === 'admin' ? (
                    <Shield className="w-8 h-8 text-white" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{user.fullName}</h3>
                    <StatusBadge
                      status={user.isActive ? 'active' : 'inactive'}
                      size="sm"
                    />
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </div>
                    {user.clinicId && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 md:col-span-2">
                        <Building className="w-4 h-4" />
                        <span className="font-medium">
                          {facilities.find(f => f.id === user.clinicId)?.name || clinics.find(c => c.id === user.clinicId)?.name || 'Company Level'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleToggleActive(user.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${user.isActive
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleResetPassword(user.id, user.email)}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Reset Password"
                >
                  <KeyRound className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleOpenModal(user)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading users...</h3>
          <p className="text-gray-600">Please wait while we fetch the user list</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-6">Add your first user to get started</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      ) : null}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Temporary Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.temporaryPassword}
                  onChange={e => setFormData({ ...formData, temporaryPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter temporary password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                User will be required to change this password on first login
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john.doe@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as User['role'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              {formData.role === 'admin'
                ? 'Admins can manage users, trips, and drivers'
                : 'Dispatchers can manage trips and drivers'}
            </p>
          </div>

          {formData.role === 'dispatcher' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assigned Facility
              </label>
              <select
                value={formData.clinicId}
                onChange={e => setFormData({ ...formData, clinicId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={user?.clinicId || ''}>
                  {clinics.find(c => c.id === user?.clinicId)?.name || 'Company'} (No Facility)
                </option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                {formData.clinicId === user?.clinicId || !formData.clinicId
                  ? 'Dispatcher will have access to all company trips and drivers'
                  : 'Dispatcher can only see and manage trips and drivers for their assigned facility'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{editingUser ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{editingUser ? 'Update User' : 'Add User'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal - Modern replacement for ugly alert */}
      <Modal
        isOpen={successModal?.isOpen || false}
        onClose={() => setSuccessModal(null)}
        title="User Created Successfully"
        size="md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome Aboard!</h3>
          <p className="text-gray-600 mb-6">
            The new user account has been created successfully.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <p className="text-gray-900 font-medium">{successModal?.email}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Temporary Password</label>
              <div className="flex items-center space-x-2">
                <code className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-mono text-lg">
                  {successModal?.password}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(successModal?.password || '');
                    showToast('Password copied to clipboard', 'success');
                  }}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copy password"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Security Notice</p>
                <p className="text-sm text-blue-700">
                  Please share this password securely with the user. They will be required to change it on first login.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                // For now, just show a toast - email sending can be implemented later
                showToast('Email functionality coming soon. Please share the password manually.', 'info');
              }}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
            >
              <Mail className="w-5 h-5" />
              <span>Send to Email</span>
            </button>
            <button
              onClick={() => setSuccessModal(null)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal?.isOpen || false}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText}
        confirmStyle={confirmModal?.confirmStyle}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
