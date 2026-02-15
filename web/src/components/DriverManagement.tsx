import React, { useState, useCallback } from 'react';
import Toast, { ToastType } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Edit2, Trash2, Star, MapPin, Phone, Mail, Award, DollarSign, UserCheck, UserX, Search, Download, CheckSquare, TrendingUp, FileText, AlertCircle, Eye, Key, Upload, X as XIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { DriverPerformance } from './DriverPerformance';
import { DriverDocumentMonitor } from './DriverDocumentMonitor';
import { DriverProfilePage } from './DriverProfilePage';
import { BulkDocumentUpload } from './BulkDocumentUpload';
import { DocumentExpiryCalendar } from './DocumentExpiryCalendar';
import { PasswordResetModal } from './PasswordResetModal';
import { checkDriverDocuments } from '../utils/documentExpiryMonitor';
import { Driver } from '../types';
import * as api from '../services/api';

// Rate tier structure
interface RateTier {
  fromMiles: number;
  toMiles: number;
  rate: number;
}

// Rates are now stored as a single compact JSONB:
// { ambulatory: [...[from,to,rate], additionalRate], wheelchair: [...], stretcher: [...], deductions: [rental, insurance, %] }

export const DriverManagement: React.FC = () => {
  const { drivers, addDriver, updateDriver, deleteDriver, trips } = useApp();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocumentMonitorOpen, setIsDocumentMonitorOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [performanceDriver, setPerformanceDriver] = useState<Driver | null>(null);
  const [profileDriver, setProfileDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [resetPasswordDriver, setResetPasswordDriver] = useState<Driver | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmStyle: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
    driver_license: null,
    vehicle_insurance: null,
    vehicle_registration: null,
    medical_cert: null,
    background_check: null,
  });
  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  const fetchExistingDocs = useCallback(async (driverId: string) => {
    try {
      const result = await api.getDriverDocuments(driverId);
      if (result.success) setExistingDocs(result.data || []);
    } catch { setExistingDocs([]); }
  }, []);

  const getExistingDoc = (docType: string) =>
    existingDocs.find(d => d.document_type === docType && !d.file_url?.startsWith('pending://'));

  const handleViewExistingDoc = async (fileUrl: string) => {
    try {
      const url = await api.getSignedUrl('driver-documents', fileUrl);
      window.open(url, '_blank');
    } catch { showToast('Failed to open document', 'error'); }
  };

  const handleDeleteExistingDoc = async (driverId: string, docId: string) => {
    try {
      await api.deleteDriverDocument(driverId, docId);
      await fetchExistingDocs(driverId);
      showToast('Document deleted', 'success');
    } catch { showToast('Failed to delete document', 'error'); }
  };

  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    licenseNumber: '',
    temporaryPassword: '',
    status: 'available' as Driver['status'],
  });

  // Tiered rate state - start with zeros until user sets values
  const [ambulatoryTiers, setAmbulatoryTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [wheelchairTiers, setWheelchairTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [stretcherTiers, setStretcherTiers] = useState<RateTier[]>([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
  const [ambulatoryAdditionalRate, setAmbulatoryAdditionalRate] = useState(0);
  const [wheelchairAdditionalRate, setWheelchairAdditionalRate] = useState(0);
  const [stretcherAdditionalRate, setStretcherAdditionalRate] = useState(0);
  // Deductions state
  const [vehicleRentalDeduction, setVehicleRentalDeduction] = useState(0);
  const [insuranceDeduction, setInsuranceDeduction] = useState(0);
  const [percentageDeduction, setPercentageDeduction] = useState(0);

  const resetForm = () => {
    setFormData({
      name: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      licenseNumber: '',
      temporaryPassword: '',
      status: 'available',
    });
    setEditingDriver(null);
    setExistingDocs([]);
  };

  const resetRateTiers = () => {
    setAmbulatoryTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setWheelchairTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setStretcherTiers([{ fromMiles: 1, toMiles: 0, rate: 0 }]);
    setAmbulatoryAdditionalRate(0);
    setWheelchairAdditionalRate(0);
    setStretcherAdditionalRate(0);
    setVehicleRentalDeduction(0);
    setInsuranceDeduction(0);
    setPercentageDeduction(0);
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

  const handleOpenModal = async (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      fetchExistingDocs(driver.id);
      setFormData({
        name: driver.name,
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        dateOfBirth: driver.dateOfBirth || '',
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        temporaryPassword: driver.temporaryPassword || '',
        status: driver.status,
      });
      
      // Load rates from single JSONB column
      const rates = driver.rates || {};
      // Parse compact format: each service level is [...tiers, additionalRate]
      const parseServiceLevel = (arr: any[]) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return { tiers: [{ fromMiles: 1, toMiles: 0, rate: 0 }], additionalRate: 0 };
        const additionalRate = typeof arr[arr.length - 1] === 'number' && !Array.isArray(arr[arr.length - 1]) ? arr[arr.length - 1] : 0;
        const tierArrays = arr.filter(item => Array.isArray(item));
        const tiers = tierArrays.map((t: number[]) => ({ fromMiles: t[0], toMiles: t[1], rate: t[2] }));
        return { tiers: tiers.length > 0 ? tiers : [{ fromMiles: 1, toMiles: 0, rate: 0 }], additionalRate };
      };

      if (rates.ambulatory) {
        const { tiers, additionalRate } = parseServiceLevel(rates.ambulatory);
        setAmbulatoryTiers(tiers);
        setAmbulatoryAdditionalRate(additionalRate);
      }
      if (rates.wheelchair) {
        const { tiers, additionalRate } = parseServiceLevel(rates.wheelchair);
        setWheelchairTiers(tiers);
        setWheelchairAdditionalRate(additionalRate);
      }
      if (rates.stretcher) {
        const { tiers, additionalRate } = parseServiceLevel(rates.stretcher);
        setStretcherTiers(tiers);
        setStretcherAdditionalRate(additionalRate);
      }
      if (rates.deductions && Array.isArray(rates.deductions)) {
        setVehicleRentalDeduction(rates.deductions[0] || 0);
        setInsuranceDeduction(rates.deductions[1] || 0);
        setPercentageDeduction(rates.deductions[2] || 0);
      }
    } else {
      resetForm();
      resetRateTiers();
    }
    setIsModalOpen(true);
  };


  const handleOpenPerformance = (driver: Driver) => {
    setPerformanceDriver(driver);
  };

  const handleClosePerformance = () => {
    setPerformanceDriver(null);
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

    // Build compact rates JSONB: each service level = [...[from,to,rate], additionalRate], deductions = [rental, insurance, %]
    const rates = {
      ambulatory: [...ambulatoryTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), ambulatoryAdditionalRate],
      wheelchair: [...wheelchairTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), wheelchairAdditionalRate],
      stretcher: [...stretcherTiers.map(t => [t.fromMiles, t.toMiles, t.rate]), stretcherAdditionalRate],
      deductions: [vehicleRentalDeduction, insuranceDeduction, percentageDeduction],
    };

    const driverData = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      email: formData.email,
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      temporaryPassword: formData.temporaryPassword,
      status: formData.status,
      rates,
    };

    try {
      let driverId: string | null = null;

      if (editingDriver) {
        await updateDriver(editingDriver.id, driverData as any);
        driverId = editingDriver.id;
        showToast('Driver updated successfully', 'success');
      } else {
        const result: any = await addDriver({
          ...driverData,
          clinicId: user?.clinicId || '',
          createdBy: user?.id,
          isActive: true,
          status: 'available',
        } as any);
        driverId = result?.data?.id || null;
        const tempPw = result?.temporaryPassword;
        showToast(tempPw ? `Driver created! Temp password: ${tempPw}` : 'Driver created successfully', 'success');
      }

      // Upload any selected documents via backend → Supabase Storage
      if (driverId) {
        const docEntries = Object.entries(docFiles).filter(([, file]) => file !== null);
        for (const [docType, file] of docEntries) {
          if (file) {
            try {
              const filePath = `${driverId}/${docType}/${Date.now()}_${file.name}`;
              const uploadResult = await api.uploadFileToStorage('driver-documents', filePath, file);

              await api.uploadDriverDocument(driverId, {
                documentType: docType,
                fileName: file.name,
                fileUrl: uploadResult.filePath,
                fileSize: file.size,
              });
            } catch (uploadErr: any) {
              console.error(`Failed to upload ${docType}:`, uploadErr);
            }
          }
        }
      }

      setDocFiles({ driver_license: null, vehicle_insurance: null, vehicle_registration: null, medical_cert: null, background_check: null });
      handleCloseModal();
      resetRateTiers();
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      showToast(`Failed: ${msg}`, 'error');
    }
  };

  const handleDelete = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Driver',
      message: `Are you sure you want to delete ${driver?.name || 'this driver'}? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await deleteDriver(id);
          showToast('Driver deleted successfully', 'success');
        } catch (error: any) {
          showToast(`Failed to delete driver: ${error?.message || 'Unknown error'}`, 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleStatusChange = (driverId: string, newStatus: Driver['status']) => {
    updateDriver(driverId, { status: newStatus });
  };

  const handleActivateDriver = (driverId: string) => {
    updateDriver(driverId, { isActive: true, status: 'available' });
  };

  const handleDeactivateDriver = (driverId: string, showConfirm = true) => {
    if (!showConfirm) {
      updateDriver(driverId, { isActive: false, status: 'off_duty' });
      return;
    }
    const driver = drivers.find(d => d.id === driverId);
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Driver',
      message: `Are you sure you want to deactivate ${driver?.name || 'this driver'}? They will not be able to receive trips.`,
      confirmText: 'Deactivate',
      confirmStyle: 'warning',
      onConfirm: () => {
        updateDriver(driverId, { isActive: false, status: 'off_duty' });
        setConfirmModal(null);
      },
    });
  };

  const handleBulkActivate = () => {
    selectedDrivers.forEach(id => handleActivateDriver(id));
    setSelectedDrivers([]);
  };

  const handleBulkDeactivate = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Deactivate',
      message: `Are you sure you want to deactivate ${selectedDrivers.length} drivers? They will not be able to receive trips.`,
      confirmText: 'Deactivate All',
      confirmStyle: 'warning',
      onConfirm: () => {
        selectedDrivers.forEach(id => handleDeactivateDriver(id, false));
        setSelectedDrivers([]);
        setConfirmModal(null);
      },
    });
  };

  const toggleSelectDriver = (driverId: string) => {
    setSelectedDrivers(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDrivers.length === filteredDrivers.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(filteredDrivers.map(d => d.id));
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm) ||
      driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.isActive).length,
    inactive: drivers.filter(d => !d.isActive).length,
    available: drivers.filter(d => d.status === 'available' && d.isActive).length,
    onTrip: drivers.filter(d => d.status === 'on_trip').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Management</h1>
          <p className="text-gray-600">Manage your driver fleet and performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-sm"
          >
            <FileText className="w-5 h-5" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={() => setIsDocumentMonitorOpen(true)}
            className="flex items-center space-x-2 bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors shadow-sm"
          >
            <FileText className="w-5 h-5" />
            <span>Document Monitor</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Drivers</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Available</div>
          <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">On Trip</div>
          <div className="text-2xl font-bold text-amber-600">{stats.onTrip}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto">
            {['all', 'available', 'on_trip', 'off_duty'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDrivers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">
                {selectedDrivers.length} driver{selectedDrivers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkActivate}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Activate</span>
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <UserX className="w-4 h-4" />
                <span>Deactivate</span>
              </button>
              <button
                onClick={() => setSelectedDrivers([])}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredDrivers.length > 0 && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedDrivers.length === filteredDrivers.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700 font-medium">
            Select All ({filteredDrivers.length} drivers)
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map(driver => (
          <div
            key={driver.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all ${
              !driver.isActive ? 'border-red-200 bg-red-50' :
              selectedDrivers.includes(driver.id) ? 'border-blue-500' : 'border-gray-200'
            }`}
          >
            {/* Selection Checkbox */}
            <div className="flex items-start justify-between mb-3">
              <input
                type="checkbox"
                checked={selectedDrivers.includes(driver.id)}
                onChange={() => toggleSelectDriver(driver.id)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              {!driver.isActive && (
                <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                  INACTIVE
                </span>
              )}
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {(driver.name || '')
                    .split(' ')
                    .filter(n => n)
                    .map(n => n[0])
                    .join('') || '?'}
                </div>
                <div>
                  {driver.firstName && driver.lastName ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900">{driver.firstName} {driver.lastName}</h3>
                      <p className="text-xs text-gray-500">Full Name</p>
                    </>
                  ) : (
                    <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                  )}
                  <div className="flex items-center space-x-1 text-amber-500 mt-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-semibold">{(driver.rating ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={driver.status} size="sm" />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{driver.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{driver.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Award className="w-4 h-4" />
                <span>License: {driver.licenseNumber}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm">
                <span className="text-gray-600">Total Trips: </span>
                <span className="font-semibold text-gray-900">{driver.totalTrips}</span>
              </div>
            </div>

            {/* Document Status Indicator */}
            {(() => {
              const docStatus = checkDriverDocuments(driver);
              if (docStatus.hasExpiredDocs || docStatus.hasExpiringSoon) {
                const expiredCount = docStatus.documents.filter(d => d.status === 'expired').length;
                const expiringCount = docStatus.documents.filter(d => d.status === 'expiring_soon').length;

                return (
                  <div className={`mt-3 p-3 rounded-lg border-2 ${
                    docStatus.hasExpiredDocs
                      ? 'bg-red-50 border-red-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className={`w-4 h-4 ${
                        docStatus.hasExpiredDocs ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <span className={`text-sm font-bold ${
                        docStatus.hasExpiredDocs ? 'text-red-900' : 'text-yellow-900'
                      }`}>
                        Document Alert
                      </span>
                    </div>
                    <div className="text-xs text-gray-700">
                      {expiredCount > 0 && (
                        <div className="text-red-800 font-semibold">
                          {expiredCount} document{expiredCount !== 1 ? 's' : ''} expired
                        </div>
                      )}
                      {expiringCount > 0 && (
                        <div className={expiredCount > 0 ? 'text-yellow-800' : 'text-yellow-800 font-semibold'}>
                          {expiringCount} document{expiringCount !== 1 ? 's' : ''} expiring soon
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm font-semibold text-gray-700">Quick Actions:</span>
              </div>

              {/* Activation/Deactivation */}
              <div className="mb-3">
                {driver.isActive ? (
                  <button
                    onClick={() => handleDeactivateDriver(driver.id)}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    <span className="text-sm font-semibold">Deactivate Driver</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivateDriver(driver.id)}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span className="text-sm font-semibold">Activate Driver</span>
                  </button>
                )}
              </div>

              {/* Status Change */}
              {driver.isActive && (
                <div className="flex items-center space-x-2 mb-3">
                  {driver.status === 'available' && (
                    <button
                      onClick={() => handleStatusChange(driver.id, 'off_duty')}
                      className="flex-1 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Set Off Duty
                    </button>
                  )}
                  {(driver.status === 'off_duty' || driver.status === 'offline') && (
                    <button
                      onClick={() => handleStatusChange(driver.id, 'available')}
                      className="flex-1 text-xs px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Set Available
                    </button>
                  )}
                  {driver.status === 'on_trip' && (
                    <button
                      disabled
                      className="flex-1 text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded-lg cursor-not-allowed"
                    >
                      On Trip
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setProfileDriver(driver)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm font-semibold">View Full Profile</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenModal(driver)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(driver.id)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Delete</span>
                </button>
              </div>
              <button
                onClick={() => setResetPasswordDriver(driver)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                title="Reset Password"
              >
                <Key className="w-4 h-4" />
                <span className="text-xs font-semibold">Reset Password</span>
              </button>
            </div>

            {driver.currentLatitude && driver.currentLongitude && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>
                    Location: {(driver.currentLatitude ?? 0).toFixed(4)}, {(driver.currentLongitude ?? 0).toFixed(4)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No drivers found</h3>
          <p className="text-gray-600 mb-6">Add your first driver to get started</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Driver</span>
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => {
                  const firstName = e.target.value;
                  setFormData({
                    ...formData,
                    firstName,
                    name: `${firstName} ${formData.lastName}`.trim()
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => {
                  const lastName = e.target.value;
                  setFormData({
                    ...formData,
                    lastName,
                    name: `${formData.firstName} ${lastName}`.trim()
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            />
          </div>

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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1-555-0100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Driver License Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.licenseNumber}
              onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DL12345678"
            />
          </div>

          {!editingDriver && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required={!editingDriver}
                value={formData.temporaryPassword}
                onChange={e => setFormData({ ...formData, temporaryPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter temporary password for driver app login"
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Driver will use this password for initial login to the mobile app
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as Driver['status'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">Available</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>

          {/* Document Uploads Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              Driver Documents
            </h3>
            <div className="space-y-3">
              {[
                { key: 'driver_license', label: 'Driver License' },
                { key: 'vehicle_insurance', label: 'Vehicle Insurance' },
                { key: 'vehicle_registration', label: 'Vehicle Registration' },
                { key: 'medical_cert', label: 'Medical Certificate' },
                { key: 'background_check', label: 'Background Check' },
              ].map(({ key, label }) => {
                const existing = getExistingDoc(key);
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{label}</span>
                      {existing && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                      {!existing && !docFiles[key] && (
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Missing</span>
                      )}
                    </div>

                    {/* Show existing uploaded doc */}
                    {existing && (
                      <div className="flex items-center justify-between bg-white rounded-md px-3 py-2 mb-2 border border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{existing.file_name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(existing.submission_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleViewExistingDoc(existing.file_url)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {editingDriver && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingDoc(editingDriver.id, existing.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* File picker for new/replacement upload */}
                    {docFiles[key] ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-green-700 truncate flex-1">{docFiles[key]!.name}</span>
                        <button
                          type="button"
                          onClick={() => setDocFiles(prev => ({ ...prev, [key]: null }))}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors text-xs text-gray-500">
                        <Upload className="w-3.5 h-3.5" />
                        {existing ? 'Replace with new file' : 'Choose file'}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setDocFiles(prev => ({ ...prev, [key]: file }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Accepted: PDF, JPG, PNG, DOC. New documents will be uploaded after saving.</p>
          </div>

          {/* Driver Tiered Rates & Deductions Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payout Rate Tiers
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure tiered payout rates based on mileage for each service level.
            </p>

            {/* Ambulatory Tiers */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-800 text-sm">Ambulatory Rates</h4>
                <button type="button" onClick={() => addTier('ambulatory')} disabled={!canAddTier('ambulatory')} className={`text-xs font-medium flex items-center gap-1 ${canAddTier('ambulatory') ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}>
                  <Plus className="w-3 h-3" /> Add Tier
                </button>
              </div>
              {ambulatoryTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1">
                  <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('ambulatory', idx, 'fromMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="From" />
                  <span className="text-xs text-gray-500">to</span>
                  <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('ambulatory', idx, 'toMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="To" />
                  <span className="text-xs text-gray-500">mi = $</span>
                  <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('ambulatory', idx, 'rate', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
                  {ambulatoryTiers.length > 1 && <button type="button" onClick={() => removeTier('ambulatory', idx)} className="text-red-500 text-xs"><Trash2 className="w-3 h-3" /></button>}
                </div>
              ))}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-600">Additional $/mi:</span>
                <input type="number" step="0.01" min="0" value={ambulatoryAdditionalRate} onChange={e => setAmbulatoryAdditionalRate(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
              </div>
            </div>

            {/* Wheelchair Tiers */}
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-purple-800 text-sm">Wheelchair Rates</h4>
                <button type="button" onClick={() => addTier('wheelchair')} disabled={!canAddTier('wheelchair')} className={`text-xs font-medium flex items-center gap-1 ${canAddTier('wheelchair') ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400 cursor-not-allowed'}`}>
                  <Plus className="w-3 h-3" /> Add Tier
                </button>
              </div>
              {wheelchairTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1">
                  <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('wheelchair', idx, 'fromMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="From" />
                  <span className="text-xs text-gray-500">to</span>
                  <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('wheelchair', idx, 'toMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="To" />
                  <span className="text-xs text-gray-500">mi = $</span>
                  <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('wheelchair', idx, 'rate', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
                  {wheelchairTiers.length > 1 && <button type="button" onClick={() => removeTier('wheelchair', idx)} className="text-red-500 text-xs"><Trash2 className="w-3 h-3" /></button>}
                </div>
              ))}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-600">Additional $/mi:</span>
                <input type="number" step="0.01" min="0" value={wheelchairAdditionalRate} onChange={e => setWheelchairAdditionalRate(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
              </div>
            </div>

            {/* Stretcher Tiers */}
            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-orange-800 text-sm">Stretcher Rates</h4>
                <button type="button" onClick={() => addTier('stretcher')} disabled={!canAddTier('stretcher')} className={`text-xs font-medium flex items-center gap-1 ${canAddTier('stretcher') ? 'text-orange-600 hover:text-orange-800' : 'text-gray-400 cursor-not-allowed'}`}>
                  <Plus className="w-3 h-3" /> Add Tier
                </button>
              </div>
              {stretcherTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1">
                  <input type="number" min="0" value={tier.fromMiles} onChange={e => updateTier('stretcher', idx, 'fromMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="From" />
                  <span className="text-xs text-gray-500">to</span>
                  <input type="number" min="0" value={tier.toMiles} onChange={e => updateTier('stretcher', idx, 'toMiles', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" placeholder="To" />
                  <span className="text-xs text-gray-500">mi = $</span>
                  <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => updateTier('stretcher', idx, 'rate', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
                  {stretcherTiers.length > 1 && <button type="button" onClick={() => removeTier('stretcher', idx)} className="text-red-500 text-xs"><Trash2 className="w-3 h-3" /></button>}
                </div>
              ))}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-600">Additional $/mi:</span>
                <input type="number" step="0.01" min="0" value={stretcherAdditionalRate} onChange={e => setStretcherAdditionalRate(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-xs" />
              </div>
            </div>

            <h4 className="text-md font-semibold text-gray-800 mb-3 mt-4">Deductions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Rental ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={vehicleRentalDeduction}
                  onChange={e => setVehicleRentalDeduction(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed deduction per pay period</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Insurance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={insuranceDeduction}
                  onChange={e => setInsuranceDeduction(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed deduction per pay period</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={percentageDeduction}
                  onChange={e => setPercentageDeduction(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">% deducted from total payout</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {editingDriver ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>


      {/* Performance Modal */}
      {performanceDriver && (
        <DriverPerformance driver={performanceDriver} onClose={handleClosePerformance} />
      )}

      {/* Document Monitor Modal */}
      <Modal
        isOpen={isDocumentMonitorOpen}
        onClose={() => setIsDocumentMonitorOpen(false)}
        title="Driver Document Expiry Monitor"
        size="xl"
      >
        <DriverDocumentMonitor drivers={drivers} onUpdateDriver={updateDriver} />
      </Modal>

      {/* Driver Profile Modal */}
      {profileDriver && (
        <DriverProfilePage
          driver={profileDriver}
          trips={trips}
          vehicles={[]}
          onClose={() => setProfileDriver(null)}
          onUpdateDriver={updateDriver}
          onSuspendDriver={(driverId) => updateDriver(driverId, { status: 'off_duty', isActive: false })}
          onReactivateDriver={(driverId) => updateDriver(driverId, { status: 'available', isActive: true })}
          onSendMessage={(driverId, message) => {
            console.log('Send message to driver:', driverId, message);
            // TODO: Implement actual message sending
          }}
          onAssignVehicle={(driverId, vehicleId) => {
            updateDriver(driverId, { assignedVehicleId: vehicleId });
          }}
        />
      )}

      {/* Bulk Document Upload Modal */}
      {isBulkUploadOpen && (
        <BulkDocumentUpload
          drivers={drivers}
          onUpdateMultiple={(updates) => {
            updates.forEach(({ driverId, updates }) => {
              updateDriver(driverId, updates);
            });
          }}
          onClose={() => setIsBulkUploadOpen(false)}
        />
      )}

      {/* Document Expiry Calendar */}
      {isCalendarOpen && (
        <DocumentExpiryCalendar
          drivers={drivers}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}

      {/* Password Reset Modal */}
      {resetPasswordDriver && (
        <PasswordResetModal
          isOpen={!!resetPasswordDriver}
          onClose={() => setResetPasswordDriver(null)}
          userEmail={resetPasswordDriver.email}
          userName={resetPasswordDriver.name}
          userPhone={resetPasswordDriver.phone}
          userType="driver"
          onSuccess={() => {
            console.log('Password reset successfully');
          }}
        />
      )}

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
          duration={toast.type === 'error' ? 8000 : 5000}
        />
      )}
    </div>
  );
};
