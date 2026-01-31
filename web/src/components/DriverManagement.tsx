import React, { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Edit2, Trash2, Star, MapPin, Phone, Mail, Award, DollarSign, UserCheck, UserX, Search, Filter, Download, CheckSquare, TrendingUp, FileText, AlertCircle, Eye, Key } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { DriverRateTiers } from './DriverRateTiers';
import { DriverPerformance } from './DriverPerformance';
import { DriverDocumentMonitor } from './DriverDocumentMonitor';
import { DriverProfile } from './DriverProfile';
import { DriverProfilePage } from './DriverProfilePage';
import { BulkDocumentUpload } from './BulkDocumentUpload';
import { DocumentExpiryCalendar } from './DocumentExpiryCalendar';
import { PasswordResetModal } from './PasswordResetModal';
import { checkDriverDocuments } from '../utils/documentExpiryMonitor';
import { Driver } from '../types';

export const DriverManagement: React.FC = () => {
  const { drivers, addDriver, updateDriver, deleteDriver, trips } = useApp();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isDocumentMonitorOpen, setIsDocumentMonitorOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [rateConfigDriver, setRateConfigDriver] = useState<Driver | null>(null);
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
    licenseExpiryDate: '',
    insuranceExpiryDate: '',
    registrationExpiryDate: '',
    medicalCertExpiryDate: '',
    backgroundCheckExpiryDate: '',
  });

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
      licenseExpiryDate: '',
      insuranceExpiryDate: '',
      registrationExpiryDate: '',
      medicalCertExpiryDate: '',
      backgroundCheckExpiryDate: '',
    });
    setEditingDriver(null);
  };

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
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
        licenseExpiryDate: (driver as any).license_expiry_date || '',
        insuranceExpiryDate: (driver as any).insurance_expiry_date || '',
        registrationExpiryDate: (driver as any).registration_expiry_date || '',
        medicalCertExpiryDate: (driver as any).medical_cert_expiry_date || '',
        backgroundCheckExpiryDate: (driver as any).background_check_expiry_date || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleOpenRateConfig = (driver: Driver) => {
    setRateConfigDriver(driver);
    setIsRateModalOpen(true);
  };

  const handleCloseRateConfig = () => {
    setIsRateModalOpen(false);
    setRateConfigDriver(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const driverData = {
      ...formData,
      license_expiry_date: formData.licenseExpiryDate || null,
      insurance_expiry_date: formData.insuranceExpiryDate || null,
      registration_expiry_date: formData.registrationExpiryDate || null,
      medical_cert_expiry_date: formData.medicalCertExpiryDate || null,
      background_check_expiry_date: formData.backgroundCheckExpiryDate || null,
    };

    if (editingDriver) {
      updateDriver(editingDriver.id, driverData);
    } else {
      addDriver({
        ...driverData,
        clinicId: user?.clinicId || '',
        createdBy: user?.id,
        isActive: true,
        status: 'available',
      });
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Driver',
      message: `Are you sure you want to delete ${driver?.name || 'this driver'}? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteDriver(id);
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
      updateDriver(driverId, { isActive: false, status: 'offline' });
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
        updateDriver(driverId, { isActive: false, status: 'offline' });
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
            {['all', 'available', 'on_trip', 'offline'].map(status => (
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
                    <span className="text-sm font-semibold">{driver.rating.toFixed(1)}</span>
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
                      onClick={() => handleStatusChange(driver.id, 'offline')}
                      className="flex-1 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Set Offline
                    </button>
                  )}
                  {driver.status === 'offline' && (
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleOpenRateConfig(driver)}
                  className="flex items-center justify-center space-x-1 px-2 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-semibold">Rates</span>
                </button>
                <button
                  onClick={() => handleOpenPerformance(driver)}
                  className="flex items-center justify-center space-x-1 px-2 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold">Stats</span>
                </button>
                <button
                  onClick={() => setResetPasswordDriver(driver)}
                  className="flex items-center justify-center space-x-1 px-2 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  title="Reset Password"
                >
                  <Key className="w-4 h-4" />
                  <span className="text-xs font-semibold">Reset</span>
                </button>
              </div>
            </div>

            {driver.currentLatitude && driver.currentLongitude && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>
                    Location: {driver.currentLatitude.toFixed(4)}, {driver.currentLongitude.toFixed(4)}
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
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Document Expiry Dates Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Document Expiry Dates
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set expiry dates to receive automatic notifications before documents expire
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🪪 Driver License Expiry
                </label>
                <input
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={e => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📋 Vehicle Insurance Expiry
                </label>
                <input
                  type="date"
                  value={formData.insuranceExpiryDate}
                  onChange={e => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚗 Vehicle Registration Expiry
                </label>
                <input
                  type="date"
                  value={formData.registrationExpiryDate}
                  onChange={e => setFormData({ ...formData, registrationExpiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ❤️ Medical Certification Expiry
                </label>
                <input
                  type="date"
                  value={formData.medicalCertExpiryDate}
                  onChange={e => setFormData({ ...formData, medicalCertExpiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ✅ Background Check Expiry
                </label>
                <input
                  type="date"
                  value={formData.backgroundCheckExpiryDate}
                  onChange={e => setFormData({ ...formData, backgroundCheckExpiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Automatic Alerts:</span> You and the driver will receive notifications 30 days before expiry, with daily reminders in the final 7 days.
              </p>
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

      {/* Rate Configuration Modal */}
      {rateConfigDriver && (
        <Modal
          isOpen={isRateModalOpen}
          onClose={handleCloseRateConfig}
          title="Driver Rate Configuration"
          size="xl"
        >
          <DriverRateTiers driverId={rateConfigDriver.id} onClose={handleCloseRateConfig} />
        </Modal>
      )}

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
            updateDriver(driverId, { vehicleId });
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
    </div>
  );
};
