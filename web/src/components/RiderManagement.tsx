import React, { useState } from 'react';
import { Plus, Edit2, Trash2, User, Search, Phone, MapPin, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Patient } from '../types';
import Toast, { ToastType } from './Toast';
import { AddressAutocomplete } from './AddressAutocomplete';

export const RiderManagement: React.FC = () => {
    const { patients, isLoading, addPatient, updatePatient, deletePatient, clinics, facilities } = useApp();
    const { user, isAdmin } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRider, setEditingRider] = useState<Patient | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
        mobileNumber: '',
        email: '',
        accountNumber: '',
        status: 'active',
        rideAlone: false,
        serviceLevel: '',
        notes: '',
        addressLabel: '',
        landmark: '',
        address: '',
        addressLine2: '',
        company: '',
    });

    const resetForm = () => {
        setFormData({
            firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '',
            phone: '', mobileNumber: '', email: '', accountNumber: '', status: 'active',
            rideAlone: false, serviceLevel: '', notes: '', addressLabel: '', landmark: '',
            address: '', addressLine2: '', company: user?.clinicId || ''
        });
        setEditingRider(null);
    };

    const handleOpenModal = (rider?: Patient) => {
        if (rider) {
            setEditingRider(rider);
            setFormData({
                firstName: rider.firstName,
                middleName: '', // Not in schema, leave empty
                lastName: rider.lastName,
                dateOfBirth: rider.dateOfBirth || '',
                gender: '', // Not in schema
                phone: rider.phone,
                mobileNumber: '',
                email: rider.email || '',
                accountNumber: '', // Not in schema
                status: rider.isActive ? 'active' : 'inactive',
                rideAlone: false, // Not in schema
                serviceLevel: rider.mobilityType,
                notes: rider.notes || '',
                addressLabel: '',
                landmark: '',
                address: rider.address,
                addressLine2: '',
                company: rider.clinicId || '',
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
                email: formData.email,
                address: formData.address,
                city: '', // Placeholder
                state: '', // Placeholder
                zipCode: '', // Placeholder
                notes: formData.notes,
                mobilityType: formData.serviceLevel as any || 'ambulatory',
                clinicId: formData.company || (isAdmin ? undefined : user?.clinicId),
                // Note: status, middleName, gender etc are not in core Patient type yet
                // but we preserve the form fields for UI consistency
                isActive: formData.status === 'active',
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

        // Facility Dispatcher (has clinicId) -> See all riders in facility
        if (user?.clinicId) {
            return rider.clinicId === user.clinicId;
        }

        // Regular Dispatcher -> See own riders (created by or assigned to)
        return rider.createdBy === user?.id || rider.dispatcherId === user?.id;
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
                                <div className="flex items-start">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-gray-400" />
                                    <span>{rider.address}, {rider.city}, {rider.state}</span>
                                </div>
                                {rider.notes && (
                                    <div className="flex items-start">
                                        <FileText className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-gray-400" />
                                        <span className="line-clamp-2">{rider.notes}</span>
                                    </div>
                                )}
                                <div className="pt-3 flex flex-wrap gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rider.mobilityType === 'wheelchair' ? 'bg-purple-100 text-purple-700' :
                                        rider.mobilityType === 'stretcher' ? 'bg-red-100 text-red-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {(rider.mobilityType || 'ambulatory').charAt(0).toUpperCase() + (rider.mobilityType || 'ambulatory').slice(1)}
                                    </span>
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
                    {/* Company Row */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Company (Facility) <span className="text-red-500">*</span></label>
                        {isAdmin ? (
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            >
                                <option value="">Select Facility</option>
                                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        ) : (
                            <input
                                type="text"
                                disabled
                                value={user?.clinicId ? clinics.find(c => c.id === user.clinicId)?.name || 'My Facility' : 'Admin'}
                                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
                            />
                        )}
                    </div>

                    {/* Name Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Middle Name</label>
                            <input
                                type="text"
                                value={formData.middleName}
                                onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* DOB / Age / Gender */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">DOB</label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                            <input
                                type="text"
                                disabled
                                placeholder="Age"
                                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                            <input
                                type="tel"
                                value={formData.mobileNumber}
                                onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Account / Status */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                            <input
                                type="text"
                                value={formData.accountNumber}
                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${formData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {formData.status.toUpperCase()}
                                </span>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, status: p.status === 'active' ? 'inactive' : 'active' }))} className="text-blue-600 text-xs hover:underline">Toggle</button>
                            </div>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Ride Alone?</label>
                            <div className="mt-2">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.rideAlone}
                                        onChange={e => setFormData({ ...formData, rideAlone: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Service / Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Default Level of Service</label>
                            <select
                                value={formData.serviceLevel}
                                onChange={e => setFormData({ ...formData, serviceLevel: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Level</option>
                                <option value="ambulatory">Ambulatory</option>
                                <option value="wheelchair">Wheelchair</option>
                                <option value="stretcher">Stretcher</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Rider Notes</label>
                            <textarea
                                rows={2}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Enter Rider Notes"
                            />
                        </div>
                    </div>

                    {/* Address Section */}
                    <div className="pt-2 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Address Label</label>
                                <input type="text" placeholder="Home, Facility, etc"
                                    value={formData.addressLabel}
                                    onChange={e => setFormData({ ...formData, addressLabel: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Landmark</label>
                                <input type="text" placeholder="Behind the gate..."
                                    value={formData.landmark}
                                    onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                                <AddressAutocomplete
                                    label=""
                                    value={formData.address}
                                    onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 2</label>
                                <input type="text"
                                    value={formData.addressLine2}
                                    onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
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
