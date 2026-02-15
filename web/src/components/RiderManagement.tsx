import React, { useState } from 'react';
import { Plus, Edit2, Trash2, User, Search, Phone, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Patient } from '../types';
import Toast, { ToastType } from './Toast';

export const RiderManagement: React.FC = () => {
    const { patients, isLoading, addPatient, updatePatient, deletePatient } = useApp();
    const { user, isAdmin } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRider, setEditingRider] = useState<Patient | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Simplified Form State - Only required fields
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        phone: '',
        accountNumber: '',
        serviceLevel: '',
        notes: ''
    });

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            phone: '',
            accountNumber: '',
            serviceLevel: '',
            notes: ''
        });
        setEditingRider(null);
    };

    const handleOpenModal = (rider?: Patient) => {
        if (rider) {
            setEditingRider(rider);
            setFormData({
                firstName: rider.firstName,
                lastName: rider.lastName,
                dateOfBirth: rider.dateOfBirth || '',
                phone: rider.phone,
                accountNumber: rider.accountNumber || '',
                serviceLevel: rider.serviceLevel || '',
                notes: rider.notes || ''
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const patientData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dateOfBirth || undefined,
                phone: formData.phone,
                accountNumber: formData.accountNumber,
                serviceLevel: (formData.serviceLevel || 'ambulatory') as Patient['serviceLevel'],
                notes: formData.notes,
                clinicId: isAdmin ? undefined : user?.clinicId,
            };

            if (editingRider) {
                await updatePatient(editingRider.id, patientData);
                setToast({ message: 'Rider updated successfully!', type: 'success' });
            } else {
                await addPatient(patientData);
                setToast({ message: 'Rider created successfully!', type: 'success' });
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            console.error('Error saving rider:', error);
            setToast({ message: error?.message || 'Failed to save rider', type: 'error' });
        }
    };

    // Access Control Logic
    const filteredRiders = patients.filter(rider => {
        const matchesSearch =
            (rider.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rider.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rider.phone || '').includes(searchTerm);

        if (!matchesSearch) return false;

        if (isAdmin) return true;

        // Contractor Dispatcher (has clinicId) -> See all riders in contractor
        if (user?.clinicId) {
            return rider.clinicId === user.clinicId;
        }

        // Regular Dispatcher -> See all riders in their clinic
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Rider Management</h1>
                    <p className="text-gray-600">Manage patient profiles and access details.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Rider</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search riders by name or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRiders.map(rider => (
                        <div key={rider.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg">{rider.firstName} {rider.lastName}</h3>
                                        <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <Phone className="w-3 h-3 mr-1" />
                                            {rider.phone}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handleOpenModal(rider)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm(`Are you sure you want to delete ${rider.firstName} ${rider.lastName}?`)) {
                                                try {
                                                    await deletePatient(rider.id);
                                                    setToast({ message: 'Rider deleted successfully!', type: 'success' });
                                                } catch (error: any) {
                                                    setToast({ message: error?.message || 'Failed to delete rider', type: 'error' });
                                                }
                                            }
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                {rider.notes && (
                                    <div className="flex items-start">
                                        <FileText className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-gray-400" />
                                        <span className="line-clamp-2">{rider.notes}</span>
                                    </div>
                                )}
                                <div className="pt-3 flex flex-wrap gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rider.serviceLevel === 'wheelchair' ? 'bg-purple-100 text-purple-700' :
                                        rider.serviceLevel === 'stretcher' ? 'bg-red-100 text-red-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {(rider.serviceLevel || 'ambulatory').charAt(0).toUpperCase() + (rider.serviceLevel || 'ambulatory').slice(1)}
                                    </span>
                                    {rider.accountNumber && (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            #{rider.accountNumber}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredRiders.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No riders found matching your criteria.
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRider ? 'Edit Rider' : 'Add New Rider'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* DOB and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Account Number and Level of Service */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                            <input
                                type="text"
                                value={formData.accountNumber}
                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Level of Service</label>
                            <select
                                value={formData.serviceLevel}
                                onChange={e => setFormData({ ...formData, serviceLevel: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Level</option>
                                <option value="ambulatory">Ambulatory</option>
                                <option value="wheelchair">Wheelchair</option>
                                <option value="stretcher">Stretcher</option>
                            </select>
                        </div>
                    </div>

                    {/* Rider Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Rider Notes</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter any notes about this rider..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            {editingRider ? 'Update Rider' : 'Save New Rider'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Toast Notification */}
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
