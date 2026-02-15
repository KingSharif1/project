import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Contractor } from '../types';
import Toast, { ToastType } from './Toast';

// Rate tier structure
interface RateTier {
  fromMiles: number;
  toMiles: number;
  rate: number;
}

interface RateTiersJson {
  ambulatory?: RateTier[];
  wheelchair?: RateTier[];
  stretcher?: RateTier[];
  ambulatoryAdditionalRate?: number;
  wheelchairAdditionalRate?: number;
  stretcherAdditionalRate?: number;
  cancellationRate?: number;
  noShowRate?: number;
}

export const ContractorManagement: React.FC = () => {
  const { contractors, addContractor, updateContractor, deleteContractor } = useApp();
  const { user, canManageContractors } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Tiered rate state - start with zeros until user sets values
  const [ambulatoryTiers, setAmbulatoryTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [wheelchairTiers, setWheelchairTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [stretcherTiers, setStretcherTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [ambulatoryAdditionalRate, setAmbulatoryAdditionalRate] = useState(0);
  const [wheelchairAdditionalRate, setWheelchairAdditionalRate] = useState(0);
  const [stretcherAdditionalRate, setStretcherAdditionalRate] = useState(0);
  const [cancellationRate, setCancellationRate] = useState(0);
  const [noShowRate, setNoShowRate] = useState(0);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };


  const [formData, setFormData] = useState({
    name: '',
    contractorCode: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    contactPerson: '',
    username: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contractorCode: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      contactPerson: '',
      username: '',
      notes: '',
    });
    setEditingContractor(null);
  };

  const handleOpenModal = async (contractor?: Contractor) => {
    if (contractor) {
      setEditingContractor(contractor);
      setFormData({
        name: contractor.name,
        contractorCode: (contractor as any).contractorCode || '',
        address: contractor.address,
        city: contractor.city || '',
        state: contractor.state || '',
        zipCode: contractor.zipCode || '',
        phone: contractor.phone,
        email: contractor.email || '',
        contactPerson: contractor.contactPerson || '',
        username: '',
        notes: contractor.notes || '',
      });
      
      // Load all rates from rate_tiers JSONB
      const rt = contractor.rateTiers as RateTiersJson;
      if (rt) {
        if (rt.ambulatory?.length) setAmbulatoryTiers(rt.ambulatory);
        if (rt.wheelchair?.length) setWheelchairTiers(rt.wheelchair);
        if (rt.stretcher?.length) setStretcherTiers(rt.stretcher);
        if (rt.ambulatoryAdditionalRate) setAmbulatoryAdditionalRate(rt.ambulatoryAdditionalRate);
        if (rt.wheelchairAdditionalRate) setWheelchairAdditionalRate(rt.wheelchairAdditionalRate);
        if (rt.stretcherAdditionalRate) setStretcherAdditionalRate(rt.stretcherAdditionalRate);
        if (rt.cancellationRate) setCancellationRate(rt.cancellationRate);
        if (rt.noShowRate) setNoShowRate(rt.noShowRate);
      }
    } else {
      resetForm();
      resetRateTiers();
    }
    setIsModalOpen(true);
  };

  // Helper functions for tiered rates
  const addTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher') => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers : setStretcherTiers;
    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers : stretcherTiers;
    const lastTier = tiers[tiers.length - 1];
    // New tier starts at lastTier.toMiles + 1
    const newFrom = lastTier.toMiles + 1;
    setter([...tiers, { fromMiles: newFrom, toMiles: 0, rate: 0 }]);
  };

  const removeTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher', index: number) => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers : setStretcherTiers;
    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers : stretcherTiers;
    if (tiers.length > 1) {
      const newTiers = tiers.filter((_, i) => i !== index);
      // Recalculate fromMiles to maintain continuity
      const recalculated = newTiers.map((tier, i) => ({
        ...tier,
        fromMiles: i === 0 ? 1 : newTiers[i - 1].toMiles + 1
      }));
      setter(recalculated);
    }
  };

  const updateTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher', index: number, field: keyof RateTier, value: number) => {
    const setter = serviceLevel === 'ambulatory' ? setAmbulatoryTiers :
                   serviceLevel === 'wheelchair' ? setWheelchairTiers : setStretcherTiers;
    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers : stretcherTiers;
    const updated = [...tiers];
    
    if (field === 'toMiles') {
      // Ensure toMiles > fromMiles
      const minTo = updated[index].fromMiles + 1;
      updated[index] = { ...updated[index], toMiles: Math.max(value, minTo) };
      // Update next tier's fromMiles to be toMiles + 1
      if (index + 1 < updated.length) {
        updated[index + 1] = { ...updated[index + 1], fromMiles: updated[index].toMiles + 1 };
      }
    } else if (field === 'fromMiles' && index === 0) {
      // First tier always starts at 1
      updated[0] = { ...updated[0], fromMiles: 1 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setter(updated);
  };

  const resetRateTiers = () => {
    setAmbulatoryTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setWheelchairTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setStretcherTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setAmbulatoryAdditionalRate(0);
    setWheelchairAdditionalRate(0);
    setStretcherAdditionalRate(0);
    setCancellationRate(0);
    setNoShowRate(0);
  };

  // Check if a tier is valid (To > From)
  const isTierValid = (tier: RateTier) => tier.toMiles > tier.fromMiles;
  
  // Check if can add new tier (last tier must be valid)
  const canAddTier = (serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher') => {
    const tiers = serviceLevel === 'ambulatory' ? ambulatoryTiers :
                  serviceLevel === 'wheelchair' ? wheelchairTiers : stretcherTiers;
    const lastTier = tiers[tiers.length - 1];
    return isTierValid(lastTier);
  };

  // Check if all tiers are valid for saving
  const areAllTiersValid = () => {
    const allTiers = [...ambulatoryTiers, ...wheelchairTiers, ...stretcherTiers];
    return allTiers.every(isTierValid);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all tiers before saving
    if (!areAllTiersValid()) {
      showToast('Please ensure all rate tiers have "To Miles" greater than "From Miles"', 'error');
      return;
    }

    // Build rate_tiers JSONB — all rate data lives here
    const rateTiersData = {
      ambulatory: ambulatoryTiers,
      wheelchair: wheelchairTiers,
      stretcher: stretcherTiers,
      ambulatoryAdditionalRate,
      wheelchairAdditionalRate,
      stretcherAdditionalRate,
      cancellationRate,
      noShowRate,
    };

    const contractorData = {
      name: formData.name,
      contractorCode: formData.contractorCode,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      phone: formData.phone,
      email: formData.email,
      contactPerson: formData.contactPerson,
      notes: formData.notes,
      clinicId: user?.clinicId || '',
      rate_tiers: rateTiersData,
    };

    try {
      if (editingContractor) {
        await updateContractor(editingContractor.id, contractorData as any);
        showToast('Contractor updated successfully', 'success');
      } else {
        await addContractor(contractorData as any);
        showToast('Contractor added successfully', 'success');
      }
      handleCloseModal();
      resetRateTiers();
    } catch (error) {
      console.error('Failed to save contractor:', error);
      showToast('Failed to save contractor. Please check your inputs.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contractor?')) {
      try {
        await deleteContractor(id);
        showToast('Contractor deleted successfully', 'success');
      } catch (error) {
        showToast('Failed to delete contractor', 'error');
      }
    }
  };

  const filteredContractors = contractors.filter((contractor: Contractor) =>
    contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contractor Management</h1>
          <p className="text-gray-600">Manage saved contractors (Hospitals, Nursing Homes, etc.)</p>
        </div>
        {canManageContractors && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Contractor</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search contractors..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContractors.map((contractor: Contractor) => (
          <div key={contractor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{contractor.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </div>
              {canManageContractors && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenModal(contractor)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contractor.id)}
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
                  {contractor.address}
                  <br />
                  {contractor.city}, {contractor.state} {contractor.zipCode}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{contractor.phone}</span>
              </div>
              {contractor.email && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{contractor.email}</span>
                </div>
              )}
              {contractor.contactPerson && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Contact Person</p>
                  <p className="font-medium text-gray-900">{contractor.contactPerson}</p>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {filteredContractors.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No contractors found</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contractor Name
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contractor Code
              </label>
              <input
                type="text"
                value={formData.contractorCode}
                onChange={e => setFormData({ ...formData, contractorCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="e.g., RVMC"
                maxLength={10}
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

            {/* Tiered Billing Rates Section */}
            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Billing Rate Tiers
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure tiered rates based on mileage for each service level.
              </p>

              {/* Ambulatory Tiers */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-800">Ambulatory Rates</h4>
                  <button type="button" onClick={() => addTier('ambulatory')} disabled={!canAddTier('ambulatory')} className={`text-sm font-medium flex items-center gap-1 ${canAddTier('ambulatory') ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}>
                    <Plus className="w-4 h-4" /> Add Tier
                  </button>
                </div>
                {ambulatoryTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">From Miles</label>
                      <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('ambulatory', idx, 'fromMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">To Miles</label>
                      <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('ambulatory', idx, 'toMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">Rate ($)</label>
                      <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('ambulatory', idx, 'rate', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    {ambulatoryTiers.length > 1 && (
                      <button type="button" onClick={() => removeTier('ambulatory', idx)} className="text-red-500 hover:text-red-700 mt-4"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <div className="mt-2">
                  <label className="text-xs text-gray-600">Additional Rate ($/mile beyond tiers)</label>
                  <input type="number" step="0.01" min="0" value={ambulatoryAdditionalRate} onChange={e => setAmbulatoryAdditionalRate(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-sm" />
                </div>
              </div>

              {/* Wheelchair Tiers */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-purple-800">Wheelchair Rates</h4>
                  <button type="button" onClick={() => addTier('wheelchair')} disabled={!canAddTier('wheelchair')} className={`text-sm font-medium flex items-center gap-1 ${canAddTier('wheelchair') ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400 cursor-not-allowed'}`}>
                    <Plus className="w-4 h-4" /> Add Tier
                  </button>
                </div>
                {wheelchairTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">From Miles</label>
                      <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('wheelchair', idx, 'fromMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">To Miles</label>
                      <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('wheelchair', idx, 'toMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">Rate ($)</label>
                      <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('wheelchair', idx, 'rate', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    {wheelchairTiers.length > 1 && (
                      <button type="button" onClick={() => removeTier('wheelchair', idx)} className="text-red-500 hover:text-red-700 mt-4"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <div className="mt-2">
                  <label className="text-xs text-gray-600">Additional Rate ($/mile beyond tiers)</label>
                  <input type="number" step="0.01" min="0" value={wheelchairAdditionalRate} onChange={e => setWheelchairAdditionalRate(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-sm" />
                </div>
              </div>

              {/* Stretcher Tiers */}
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-orange-800">Stretcher Rates</h4>
                  <button type="button" onClick={() => addTier('stretcher')} disabled={!canAddTier('stretcher')} className={`text-sm font-medium flex items-center gap-1 ${canAddTier('stretcher') ? 'text-orange-600 hover:text-orange-800' : 'text-gray-400 cursor-not-allowed'}`}>
                    <Plus className="w-4 h-4" /> Add Tier
                  </button>
                </div>
                {stretcherTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">From Miles</label>
                      <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('stretcher', idx, 'fromMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">To Miles</label>
                      <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('stretcher', idx, 'toMiles', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600">Rate ($)</label>
                      <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('stretcher', idx, 'rate', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    {stretcherTiers.length > 1 && (
                      <button type="button" onClick={() => removeTier('stretcher', idx)} className="text-red-500 hover:text-red-700 mt-4"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <div className="mt-2">
                  <label className="text-xs text-gray-600">Additional Rate ($/mile beyond tiers)</label>
                  <input type="number" step="0.01" min="0" value={stretcherAdditionalRate} onChange={e => setStretcherAdditionalRate(Number(e.target.value))} className="w-32 px-2 py-1 border rounded text-sm" />
                </div>
              </div>

              {/* Cancellation & No-Show */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cancellation Rate ($)</label>
                  <input type="number" step="0.01" min="0" value={cancellationRate} onChange={e => setCancellationRate(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">No-Show Rate ($)</label>
                  <input type="number" step="0.01" min="0" value={noShowRate} onChange={e => setNoShowRate(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" />
                </div>
              </div>
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
              {editingContractor ? 'Update Contractor' : 'Add Contractor'}
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
