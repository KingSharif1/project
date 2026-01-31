import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Facility } from '../types';
import Toast, { ToastType } from './Toast';

export const FacilityManagement: React.FC = () => {
  const { facilities, addFacility, updateFacility, deleteFacility } = useApp();
  const { user, isAdmin, canManageFacilities } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };


  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    contactPerson: '',
    username: '', // Added for dispatcher creation
    notes: '',
    ambulatoryRate: '',
    wheelchairRate: '',
    stretcherRate: '',
    cancellationRate: '',
    noShowRate: '',
    paymentTerms: 'Net 30',
  });

  // WAIT. I need to be careful. The user might want these fields.
  // Ideally, I should strictly follow the schema.
  // Schema has: contact_person, contact_email.
  // I will map form "Contact Person" to contact_person.
  // Form "Email" to facilities.email (or contact_email? Schema has email AND contact_email?
  // Step 381 facilities table: 
  // 52: phone: string
  // 53: contact_person: string | null
  // 54: contact_email: string | null
  // It does NOT have a column named "email" distinct from contact_email?
  // Wait. Line 54 is contact_email.
  // Is there a generic email?
  // Line 52: phone.
  // Line 47-51: address stuff.
  // Ah, looking closer at Step 381:
  // 52: phone: string
  // 53: contact_person: string | null
  // 54: contact_email: string | null
  // It seems there is NO generic 'email' column, only 'contact_email'.
  // BUT AppContext (Step 389) uses:
  // 1367: email: facilityData.email,
  // And the 'insert' call (line 1360) has 'email: ...'.
  // If 'email' column doesn't exist in DB, insert will FAIL.
  // I need to verify if `facilities` table has `email`.
  // Step 381:
  // 44:       facilities: {
  // 45:         Row: {
  // ...
  // 52:           phone: string
  // 53:           contact_person: string | null
  // 54:           contact_email: string | null
  // ...
  // There is NO `email` column in the Row definition in `database.types.ts`.
  // This implies `AppContext.tsx` insert (line 1367 `email: facilityData.email`) is WRONG if it maps to `email` column.
  // Check Step 389 again.
  // 1367:           email: facilityData.email,
  // If Typescript didn't complain about `email` in `insert`, maybe I missed it in the file view?
  // Or maybe `database.types.ts` is outdated?
  // ERROR in Step 368: "Property 'email' does not exist on type 'never'".
  // If I fixed `never`, would it complain `email` does not exist on `Insert` type?
  // Likely yes.
  // So I need to fix `AppContext` to map `email` to `contact_email`? Or add `email` column?
  // Given `contact_email` exists, I should probably use that.
  // Or `facilities` might be expected to have an `email` (e.g. for notifications).
  //
  // Let's assume I should map form Email to `contact_email` (or generic email if I add it).
  // Given I can't easily change DB schema this second without SQL, I'll check if I should map to `contact_email`.
  // But wait, the previous `addClinic` logic might have had `email`.
  //
  // Let's look at `Facility` interface in `types/index.ts` (Step 368):
  //   email: string;
  //   contactPerson?: string;
  // schema (Step 381): contact_email, contact_person.
  //
  // I should align them. `Facility.email` -> DB `contact_email`? Or `Facility` should have `contactEmail`?
  // To keep it simple and consistent with common sense:
  // I will use `Facility.email` and map it to `contact_email` in AppContext if `email` column is missing.
  // BUT I previously saw errors in `AppContext`.
  // I will proceed with `FacilityManagement` assuming `Facility` has `email`.
  // AND I will check `AppContext` again to see if I should fix the mapping.
  //
  // Refactor `FacilityManagement` to matches `Facility` interface.

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      contactPerson: '',
      notes: '',
      ambulatoryRate: '',
      wheelchairRate: '',
      stretcherRate: '',
      cancellationRate: '',
      noShowRate: '',
      paymentTerms: 'Net 30',
    });
    setEditingFacility(null);
  };

  const handleOpenModal = (facility?: Facility) => {
    if (facility) {
      setEditingFacility(facility);
      setFormData({
        name: facility.name,
        address: facility.address,
        city: facility.city || '',
        state: facility.state || '',
        zipCode: facility.zipCode || '',
        phone: facility.phone,
        email: facility.email || '',
        contactPerson: facility.contactPerson || '',
        notes: facility.notes || '',
        ambulatoryRate: facility.ambulatoryRate?.toString() || '',
        wheelchairRate: facility.wheelchairRate?.toString() || '',
        stretcherRate: facility.stretcherRate?.toString() || '',
        cancellationRate: facility.cancellationRate?.toString() || '',
        noShowRate: facility.noShowRate?.toString() || '',
        paymentTerms: facility.paymentTerms || 'Net 30',
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

    const facilityData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      phone: formData.phone,
      email: formData.email,
      contactPerson: formData.contactPerson,
      notes: formData.notes,
      ambulatoryRate: parseFloat(formData.ambulatoryRate) || 0,
      wheelchairRate: parseFloat(formData.wheelchairRate) || 0,
      stretcherRate: parseFloat(formData.stretcherRate) || 0,
      cancellationRate: formData.cancellationRate ? parseFloat(formData.cancellationRate) : undefined,
      noShowRate: formData.noShowRate ? parseFloat(formData.noShowRate) : undefined,
      paymentTerms: formData.paymentTerms,
      isActive: true,
      clinicId: user?.clinicId || '',
    };

    try {
      if (editingFacility) {
        await updateFacility(editingFacility.id, facilityData);
        showToast('Location updated successfully', 'success');
      } else {
        await addFacility(facilityData);
        showToast('Location added successfully', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save location:', error);
      showToast('Failed to save location. Please check your inputs.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteFacility(id);
        showToast('Facility deleted successfully', 'success');
      } catch (error) {
        showToast('Failed to delete facility', 'error');
      }
    }
  };

  const filteredFacilities = facilities.filter(facility =>
    facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Facilities Management</h1>
          <p className="text-gray-600">Manage saved facilities (Hospitals, Nursing Homes, etc.)</p>
        </div>
        {canManageFacilities && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Facility</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search facilities..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map(facility => (
          <div key={facility.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{facility.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${facility.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {facility.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {canManageFacilities && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenModal(facility)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2 text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {facility.address}
                  <br />
                  {facility.city}, {facility.state} {facility.zipCode}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{facility.phone}</span>
              </div>
              {facility.email && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{facility.email}</span>
                </div>
              )}
              {facility.contactPerson && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Contact Person</p>
                  <p className="font-medium text-gray-900">{facility.contactPerson}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Billing Rates</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-blue-50 rounded px-2 py-1">
                    <p className="text-xs text-gray-600">Ambulatory</p>
                    <p className="font-semibold text-sm text-blue-700">${(facility.ambulatoryRate || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded px-2 py-1">
                    <p className="text-xs text-gray-600">Wheelchair</p>
                    <p className="font-semibold text-sm text-green-700">${(facility.wheelchairRate || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-amber-50 rounded px-2 py-1">
                    <p className="text-xs text-gray-600">Stretcher</p>
                    <p className="font-semibold text-sm text-amber-700">${(facility.stretcherRate || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFacilities.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No locations found</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFacility ? 'Edit Location' : 'Add New Location'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Memorial Hospital"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                required
                value={formData.zipCode}
                onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>


            <div className="md:col-span-2">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Dispatcher Account Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Dispatcher Username
                    </label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="e.g. northside_disp"
                      // Only require if creating a new facility
                      required={!editingFacility}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      This will be used for login: <strong>username</strong>@<strong>CODE</strong>.system
                    </p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-xs text-blue-700">
                      A default password <strong>Welcome123!</strong> will be assigned. The user can change it after first login.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ambulatory Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ambulatoryRate}
                  onChange={e => setFormData({ ...formData, ambulatoryRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="45.00"
                />
                <p className="text-xs text-gray-500 mt-1">Rate for ambulatory trips</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wheelchair Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wheelchairRate}
                  onChange={e => setFormData({ ...formData, wheelchairRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="75.00"
                />
                <p className="text-xs text-gray-500 mt-1">Rate for wheelchair trips</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stretcher Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.stretcherRate}
                  onChange={e => setFormData({ ...formData, stretcherRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="120.00"
                />
                <p className="text-xs text-gray-500 mt-1">Rate for stretcher trips</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cancellation Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cancellationRate}
                  onChange={e => setFormData({ ...formData, cancellationRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="25.00"
                />
                <p className="text-xs text-gray-500 mt-1">Fee charged for cancelled trips</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  No-Show Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.noShowRate}
                  onChange={e => setFormData({ ...formData, noShowRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50.00"
                />
                <p className="text-xs text-gray-500 mt-1">Fee charged for no-show trips</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {editingFacility ? 'Update Location' : 'Add Location'}
            </button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
};
