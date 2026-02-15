import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Car, AlertTriangle, CheckCircle, Upload, Eye, FileText, CheckSquare, X as XIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { Vehicle } from '../types';
import * as api from '../services/api';

// Curated make → model mapping for common NEMT fleet vehicles
const VEHICLE_MAKES_MODELS: Record<string, string[]> = {
  'Chrysler': ['Pacifica', 'Voyager', 'Town & Country', '300'],
  'Dodge': ['Grand Caravan', 'Caravan', 'Durango', 'Journey', 'Ram ProMaster', 'Ram ProMaster City'],
  'Ford': ['Transit', 'Transit Connect', 'E-Series', 'Explorer', 'Expedition', 'Escape', 'Edge', 'F-150', 'Flex', 'Freestyle'],
  'Chevrolet': ['Express', 'Suburban', 'Tahoe', 'Traverse', 'Equinox', 'Uplander', 'Astro', 'Silverado'],
  'GMC': ['Savana', 'Yukon', 'Yukon XL', 'Terrain', 'Acadia', 'Sierra'],
  'Toyota': ['Sienna', 'Highlander', 'RAV4', 'Camry', 'Corolla', '4Runner', 'Sequoia'],
  'Honda': ['Odyssey', 'Pilot', 'CR-V', 'HR-V', 'Accord', 'Civic'],
  'Nissan': ['NV200', 'NV Passenger', 'NV Cargo', 'Pathfinder', 'Rogue', 'Murano', 'Armada'],
  'Hyundai': ['Staria', 'Tucson', 'Santa Fe', 'Palisade', 'Sonata', 'Elantra'],
  'Kia': ['Carnival', 'Sedona', 'Sorento', 'Telluride', 'Sportage', 'Soul'],
  'Mercedes-Benz': ['Sprinter', 'Metris', 'GLE', 'GLS', 'V-Class'],
  'Ram': ['ProMaster', 'ProMaster City', '1500', '2500', '3500'],
  'Volkswagen': ['Transporter', 'Caddy', 'Atlas', 'ID.Buzz', 'Tiguan'],
  'Subaru': ['Outback', 'Forester', 'Ascent', 'Crosstrek'],
  'Buick': ['Enclave', 'Encore', 'Envision'],
  'Jeep': ['Grand Cherokee', 'Cherokee', 'Wagoneer', 'Grand Wagoneer'],
  'Lincoln': ['Navigator', 'Aviator', 'Corsair'],
  'Cadillac': ['Escalade', 'XT5', 'XT6'],
  'Tesla': ['Model X', 'Model Y', 'Model S', 'Model 3'],
  'Mazda': ['CX-9', 'CX-90', 'CX-5', 'CX-50'],
  'Mitsubishi': ['Outlander', 'Eclipse Cross'],
  'Freightliner': ['Sprinter'],
  'International': ['TerraStar', 'CV Series'],
  'Blue Bird': ['Micro Bird', 'Vision'],
  'ElDorado': ['Aerotech', 'EZ Rider', 'National'],
  'Braun': ['UVL', 'Companion Van'],
  'MV-1': ['MV-1'],
};

const ALL_MAKES = Object.keys(VEHICLE_MAKES_MODELS).sort();

const COMMON_COLORS = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Navy',
  'Green', 'Beige', 'Gold', 'Brown', 'Maroon', 'Orange', 'Yellow',
];

export const VehicleManagement: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [docUploadVehicle, setDocUploadVehicle] = useState<Vehicle | null>(null);
  const [vehicleDocs, setVehicleDocs] = useState<any[]>([]);
  const [docUploading, setDocUploading] = useState<string | null>(null);

  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [modalDocs, setModalDocs] = useState<any[]>([]);
  const [modalDocFiles, setModalDocFiles] = useState<Record<string, File | null>>({
    insurance: null,
    registration: null,
    inspection: null,
    title: null,
  });

  const [formData, setFormData] = useState({
    vehicleName: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    vin: '',
    color: '',
    vehicleType: 'sedan' as Vehicle['vehicleType'],
    ownershipType: 'company' as Vehicle['ownershipType'],
    assignedDriverId: '',
    capacity: 4,
    wheelchairAccessible: false,
    stretcherCapable: false,
    status: 'available' as Vehicle['status'],
    lastMaintenanceDate: '',
    insuranceExpiry: '',
    registrationExpiry: '',
    inspectionExpiry: '',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const result = await api.getVehicles();
      if (result.success) {
        setVehicles(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      showToast('Failed to load vehicles', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const fetchDrivers = useCallback(async () => {
    try {
      const result = await api.getDrivers();
      if (result.success) setAllDrivers(result.data || []);
    } catch { setAllDrivers([]); }
  }, []);

  const fetchModalDocs = useCallback(async (vehicleId: string) => {
    try {
      const result = await api.getVehicleDocuments(vehicleId);
      if (result.success) setModalDocs(result.data || []);
    } catch { setModalDocs([]); }
  }, []);

  const getModalDoc = (docType: string) =>
    modalDocs.find(d => d.document_type === docType && !d.file_url?.startsWith('pending://'));

  const handleViewModalDoc = async (fileUrl: string) => {
    try {
      const path = fileUrl.includes('/vehicle-documents/') ? fileUrl.split('/vehicle-documents/')[1] : fileUrl;
      const url = await api.getSignedUrl('vehicle-documents', path);
      window.open(url, '_blank');
    } catch { showToast('Failed to open document', 'error'); }
  };

  const handleDeleteModalDoc = async (vehicleId: string, docId: string) => {
    try {
      await api.deleteVehicleDocument(vehicleId, docId);
      await fetchModalDocs(vehicleId);
      showToast('Document deleted', 'success');
    } catch { showToast('Failed to delete document', 'error'); }
  };

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const resetForm = () => {
    setFormData({
      vehicleName: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      vin: '',
      color: '',
      vehicleType: 'sedan',
      ownershipType: 'company',
      assignedDriverId: '',
      capacity: 4,
      wheelchairAccessible: false,
      stretcherCapable: false,
      status: 'available',
      lastMaintenanceDate: '',
      insuranceExpiry: '',
      registrationExpiry: '',
      inspectionExpiry: '',
    });
    setEditingVehicle(null);
    setModalDocs([]);
    setModalDocFiles({ insurance: null, registration: null, inspection: null, title: null });
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      fetchModalDocs(vehicle.id);
      setFormData({
        vehicleName: vehicle.vehicleName || '',
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.licensePlate,
        vin: vehicle.vin,
        color: vehicle.color || '',
        vehicleType: vehicle.vehicleType,
        ownershipType: vehicle.ownershipType || 'company',
        assignedDriverId: vehicle.assignedDriverId || '',
        capacity: vehicle.capacity || 4,
        wheelchairAccessible: vehicle.wheelchairAccessible || false,
        stretcherCapable: vehicle.stretcherCapable || false,
        status: vehicle.status,
        lastMaintenanceDate: vehicle.lastMaintenanceDate ? vehicle.lastMaintenanceDate.slice(0, 10) : '',
        insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.slice(0, 10) : '',
        registrationExpiry: vehicle.registrationExpiry ? vehicle.registrationExpiry.slice(0, 10) : '',
        inspectionExpiry: vehicle.inspectionExpiry ? vehicle.inspectionExpiry.slice(0, 10) : '',
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

    const vehicleData: any = {
      vehicleName: formData.vehicleName,
      make: formData.make,
      model: formData.model,
      year: formData.year,
      licensePlate: formData.licensePlate,
      vin: formData.vin,
      color: formData.color || null,
      vehicleType: formData.vehicleType,
      ownershipType: formData.ownershipType,
      assignedDriverId: formData.assignedDriverId || null,
      capacity: formData.capacity,
      wheelchairAccessible: formData.wheelchairAccessible,
      stretcherCapable: formData.stretcherCapable,
      status: formData.status,
      lastMaintenanceDate: formData.lastMaintenanceDate || null,
      insuranceExpiry: formData.insuranceExpiry || null,
      registrationExpiry: formData.registrationExpiry || null,
      inspectionExpiry: formData.inspectionExpiry || null,
    };

    try {
      let vehicleId: string | null = null;

      if (editingVehicle) {
        const result = await api.updateVehicle(editingVehicle.id, vehicleData);
        if (result.success) {
          vehicleId = editingVehicle.id;
          showToast('Vehicle updated successfully', 'success');
          fetchVehicles();
        }
      } else {
        const result = await api.createVehicle(vehicleData);
        if (result.success) {
          vehicleId = result.data?.id;
          showToast('Vehicle added successfully', 'success');
          fetchVehicles();
        }
      }

      // Upload any selected documents via backend → Supabase Storage
      if (vehicleId) {
        const docEntries = Object.entries(modalDocFiles).filter(([, file]) => file !== null);
        for (const [docType, file] of docEntries) {
          if (file) {
            try {
              const filePath = `${vehicleId}/${docType}/${Date.now()}_${file.name}`;
              const uploadResult = await api.uploadFileToStorage('vehicle-documents', filePath, file);
              await api.uploadVehicleDocument(vehicleId, {
                documentType: docType,
                fileName: file.name,
                fileUrl: uploadResult.filePath,
                fileSize: file.size,
              });
            } catch (err) {
              console.error(`Failed to upload ${docType}:`, err);
            }
          }
        }
      }

      setModalDocFiles({ insurance: null, registration: null, inspection: null, title: null });
      handleCloseModal();
    } catch (error: any) {
      showToast(error.message || 'Failed to save vehicle', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const result = await api.deleteVehicle(id);
      if (result.success) {
        showToast('Vehicle deleted', 'success');
        fetchVehicles();
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to delete vehicle', 'error');
    }
  };

  // Document upload helpers
  const handleOpenDocs = async (vehicle: Vehicle) => {
    setDocUploadVehicle(vehicle);
    try {
      const result = await api.getVehicleDocuments(vehicle.id);
      if (result.success) setVehicleDocs(result.data);
    } catch { setVehicleDocs([]); }
  };

  const handleDocUpload = async (docType: string, file: File) => {
    if (!docUploadVehicle) return;
    setDocUploading(docType);
    try {
      const filePath = `${docUploadVehicle.id}/${docType}/${Date.now()}_${file.name}`;
      const uploadResult = await api.uploadFileToStorage('vehicle-documents', filePath, file);

      await api.uploadVehicleDocument(docUploadVehicle.id, {
        documentType: docType,
        fileName: file.name,
        fileUrl: uploadResult.filePath,
        fileSize: file.size,
      });

      showToast(`${docType} uploaded successfully`, 'success');
      const result = await api.getVehicleDocuments(docUploadVehicle.id);
      if (result.success) setVehicleDocs(result.data);
    } catch (error: any) {
      console.error('Upload error:', error);
      showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setDocUploading(null);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!docUploadVehicle) return;
    try {
      await api.deleteVehicleDocument(docUploadVehicle.id, docId);
      showToast('Document deleted', 'success');
      const result = await api.getVehicleDocuments(docUploadVehicle.id);
      if (result.success) setVehicleDocs(result.data);
    } catch (error: any) {
      showToast('Failed to delete document', 'error');
    }
  };

  const handleViewDoc = async (fileUrl: string) => {
    try {
      const path = fileUrl.includes('/vehicle-documents/') ? fileUrl.split('/vehicle-documents/')[1] : fileUrl;
      const signedUrl = await api.getSignedUrl('vehicle-documents', path);
      window.open(signedUrl, '_blank');
    } catch { showToast('Failed to open document', 'error'); }
  };

  const filteredVehicles = vehicles.filter(
    vehicle => filterStatus === 'all' || vehicle.status === filterStatus
  );

  const getExpiryStatus = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { status: 'expired', color: 'text-red-600', days: Math.abs(daysUntil) };
    if (daysUntil < 30) return { status: 'expiring-soon', color: 'text-orange-600', days: daysUntil };
    return { status: 'valid', color: 'text-green-600', days: daysUntil };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const vehicleDocTypes = [
    { key: 'insurance', label: 'Insurance' },
    { key: 'registration', label: 'Registration' },
    { key: 'inspection', label: 'Inspection' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
          <p className="text-gray-600">Manage your fleet, documents, and maintenance</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Vehicle</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {['all', 'available', 'in_use', 'maintenance', 'retired'].map(status => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVehicles.map(vehicle => {
          const insuranceStatus = getExpiryStatus(vehicle.insuranceExpiry);
          const registrationStatus = getExpiryStatus(vehicle.registrationExpiry);
          const inspectionStatus = getExpiryStatus(vehicle.inspectionExpiry);

          return (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {vehicle.vehicleName || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {vehicle.licensePlate} · {vehicle.vehicleType.replace('-', ' ')}
                      {vehicle.color ? ` · ${vehicle.color}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {vehicle.ownershipType} owned · Capacity: {vehicle.capacity}
                      {vehicle.assignedDriverId && (() => {
                        const d = allDrivers.find((dr: any) => dr.id === vehicle.assignedDriverId);
                        if (!d) return null;
                        const name = d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim();
                        return ` · ${vehicle.ownershipType === 'private' ? 'Owner' : 'Driver'}: ${name}`;
                      })()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={vehicle.status} size="sm" />
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">
                    <span className="text-gray-600">VIN:</span>
                    <p className="font-medium text-gray-900">{vehicle.vin || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Last Maintenance:</span>
                    <p className="font-medium text-gray-900">{formatDate(vehicle.lastMaintenanceDate)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="space-y-2">
                    {insuranceStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {insuranceStatus.status !== 'valid' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                          <span className="text-gray-600">Insurance:</span>
                        </div>
                        <span className={`font-semibold ${insuranceStatus.color}`}>
                          {insuranceStatus.status === 'expired' ? 'Expired' : insuranceStatus.status === 'expiring-soon' ? `${insuranceStatus.days}d left` : 'Valid'}
                        </span>
                      </div>
                    )}
                    {registrationStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {registrationStatus.status !== 'valid' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                          <span className="text-gray-600">Registration:</span>
                        </div>
                        <span className={`font-semibold ${registrationStatus.color}`}>
                          {registrationStatus.status === 'expired' ? 'Expired' : registrationStatus.status === 'expiring-soon' ? `${registrationStatus.days}d left` : 'Valid'}
                        </span>
                      </div>
                    )}
                    {inspectionStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {inspectionStatus.status !== 'valid' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                          <span className="text-gray-600">Inspection:</span>
                        </div>
                        <span className={`font-semibold ${inspectionStatus.color}`}>
                          {inspectionStatus.status === 'expired' ? 'Expired' : inspectionStatus.status === 'expiring-soon' ? `${inspectionStatus.days}d left` : 'Valid'}
                        </span>
                      </div>
                    )}
                    {vehicle.wheelchairAccessible && (
                      <span className="inline-block text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full mr-1">♿ Wheelchair</span>
                    )}
                    {vehicle.stretcherCapable && (
                      <span className="inline-block text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">🛏 Stretcher</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenModal(vehicle)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Delete</span>
                  </button>
                </div>
                <button
                  onClick={() => handleOpenDocs(vehicle)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-semibold">Documents</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No vehicles found</h3>
          <p className="text-gray-600 mb-6">Add your first vehicle to get started</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Vehicle</span>
          </button>
        </div>
      )}

      {/* Add/Edit Vehicle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.vehicleName}
                onChange={e => setFormData({ ...formData, vehicleName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Blue Van #3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Make <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.make} list="vehicle-makes-list"
                onChange={e => {
                  const newMake = e.target.value;
                  const models = VEHICLE_MAKES_MODELS[newMake] || [];
                  setFormData(prev => ({
                    ...prev,
                    make: newMake,
                    model: models.includes(prev.model) ? prev.model : '',
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Start typing or select..." />
              <datalist id="vehicle-makes-list">
                {ALL_MAKES.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.model} list="vehicle-models-list"
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.make ? 'Start typing or select...' : 'Select a make first'} />
              <datalist id="vehicle-models-list">
                {(VEHICLE_MAKES_MODELS[formData.make] || []).map(m => <option key={m} value={m} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
              <input type="number" required min="1990" max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
              <input type="text" value={formData.color} list="vehicle-colors-list"
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Start typing or select..." />
              <datalist id="vehicle-colors-list">
                {COMMON_COLORS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">License Plate <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.licensePlate}
                onChange={e => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC-1234" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">VIN</label>
              <input type="text" maxLength={17} value={formData.vin}
                onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="17-character VIN" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
              <select value={formData.vehicleType}
                onChange={e => setFormData({ ...formData, vehicleType: e.target.value as Vehicle['vehicleType'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="wheelchair-accessible">Wheelchair Accessible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
              <input type="number" required min="1" max="20" value={formData.capacity}
                onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Vehicle['status'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={formData.wheelchairAccessible}
                  onChange={e => setFormData({ ...formData, wheelchairAccessible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">♿ Wheelchair Accessible</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={formData.stretcherCapable}
                  onChange={e => setFormData({ ...formData, stretcherCapable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">🛏 Stretcher Capable</span>
              </label>
            </div>
          </div>

          {/* Ownership Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Ownership
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ownership Type</label>
                <select value={formData.ownershipType}
                  onChange={e => setFormData({ ...formData, ownershipType: e.target.value as Vehicle['ownershipType'], assignedDriverId: e.target.value === 'company' ? '' : formData.assignedDriverId })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="company">Company Owned</option>
                  <option value="private">Private (Employee Owned)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {formData.ownershipType === 'private' ? 'Owner (Driver)' : 'Assigned Driver'}
                </label>
                <select value={formData.assignedDriverId}
                  onChange={e => setFormData({ ...formData, assignedDriverId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">— None —</option>
                  {allDrivers.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email}</option>
                  ))}
                </select>
                {formData.ownershipType === 'private' && !formData.assignedDriverId && (
                  <p className="text-xs text-orange-600 mt-1">Select the driver who owns this vehicle</p>
                )}
              </div>
            </div>
          </div>

          {/* Dates Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Dates & Maintenance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Maintenance Date</label>
                <input type="date" value={formData.lastMaintenanceDate}
                  onChange={e => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Expiry</label>
                <input type="date" value={formData.insuranceExpiry}
                  onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Expiry</label>
                <input type="date" value={formData.registrationExpiry}
                  onChange={e => setFormData({ ...formData, registrationExpiry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Inspection Expiry</label>
                <input type="date" value={formData.inspectionExpiry}
                  onChange={e => setFormData({ ...formData, inspectionExpiry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Vehicle Documents Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              Vehicle Documents
            </h3>
            <div className="space-y-3">
              {[
                { key: 'insurance', label: 'Insurance' },
                { key: 'registration', label: 'Registration' },
                { key: 'inspection', label: 'Inspection Report' },
                { key: 'title', label: 'Vehicle Title' },
              ].map(({ key, label }) => {
                const existing = getModalDoc(key);
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{label}</span>
                      {existing && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                      {!existing && !modalDocFiles[key] && (
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
                            onClick={() => handleViewModalDoc(existing.file_url)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {editingVehicle && (
                            <button
                              type="button"
                              onClick={() => handleDeleteModalDoc(editingVehicle.id, existing.id)}
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
                    {modalDocFiles[key] ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-green-700 truncate flex-1">{modalDocFiles[key]!.name}</span>
                        <button
                          type="button"
                          onClick={() => setModalDocFiles(prev => ({ ...prev, [key]: null }))}
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
                            setModalDocFiles(prev => ({ ...prev, [key]: file }));
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

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Documents Modal */}
      {docUploadVehicle && (
        <Modal
          isOpen={!!docUploadVehicle}
          onClose={() => setDocUploadVehicle(null)}
          title={`Documents — ${docUploadVehicle.vehicleName || `${docUploadVehicle.year} ${docUploadVehicle.make} ${docUploadVehicle.model}`}`}
          size="lg"
        >
          <div className="space-y-4">
            {vehicleDocTypes.map(docType => {
              const existingDocs = vehicleDocs.filter(d => d.document_type === docType.key);
              return (
                <div key={docType.key} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{docType.label}</h4>
                    <label className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm">
                      <Upload className="w-4 h-4" />
                      <span>{docUploading === docType.key ? 'Uploading...' : 'Upload'}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        disabled={docUploading === docType.key}
                        onChange={e => { if (e.target.files?.[0]) handleDocUpload(docType.key, e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  </div>
                  {existingDocs.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {existingDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">{new Date(doc.submission_date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            {doc.file_url && (
                              <button onClick={() => handleViewDoc(doc.file_url)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View/Download">
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDocDelete(doc.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};
