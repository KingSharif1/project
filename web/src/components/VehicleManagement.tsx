import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Car, Wrench, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { Vehicle } from '../types';

export const VehicleManagement: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    vin: '',
    type: 'sedan' as Vehicle['type'],
    status: 'available' as Vehicle['status'],
    mileage: 0,
    lastServiceDate: '',
    nextServiceDue: '',
    insuranceExpiry: '',
    registrationExpiry: '',
  });

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      vin: '',
      type: 'sedan',
      status: 'available',
      mileage: 0,
      lastServiceDate: '',
      nextServiceDue: '',
      insuranceExpiry: '',
      registrationExpiry: '',
    });
    setEditingVehicle(null);
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.licensePlate,
        vin: vehicle.vin,
        type: vehicle.type,
        status: vehicle.status,
        mileage: vehicle.mileage,
        lastServiceDate: vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toISOString().slice(0, 10) : '',
        nextServiceDue: vehicle.nextServiceDue ? new Date(vehicle.nextServiceDue).toISOString().slice(0, 10) : '',
        insuranceExpiry: vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toISOString().slice(0, 10) : '',
        registrationExpiry: vehicle.registrationExpiry ? new Date(vehicle.registrationExpiry).toISOString().slice(0, 10) : '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const vehicleData = {
      ...formData,
      clinicId: user?.clinicId || '',
      createdBy: user?.id,
      lastServiceDate: formData.lastServiceDate ? new Date(formData.lastServiceDate).toISOString() : undefined,
      nextServiceDue: formData.nextServiceDue ? new Date(formData.nextServiceDue).toISOString() : undefined,
      insuranceExpiry: formData.insuranceExpiry ? new Date(formData.insuranceExpiry).toISOString() : undefined,
      registrationExpiry: formData.registrationExpiry ? new Date(formData.registrationExpiry).toISOString() : undefined,
    };

    if (editingVehicle) {
      setVehicles(prev =>
        prev.map(v =>
          v.id === editingVehicle.id
            ? { ...v, ...vehicleData, updatedAt: new Date().toISOString() }
            : v
        )
      );
    } else {
      const newVehicle: Vehicle = {
        ...vehicleData,
        id: Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVehicles(prev => [...prev, newVehicle]);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      setVehicles(prev => prev.filter(v => v.id !== id));
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
          <p className="text-gray-600">Manage your fleet and maintenance schedules</p>
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
          const serviceStatus = getExpiryStatus(vehicle.nextServiceDue);

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
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-600">{vehicle.licensePlate}</p>
                  </div>
                </div>
                <StatusBadge status={vehicle.status} size="sm" />
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">
                    <span className="text-gray-600">VIN:</span>
                    <p className="font-medium text-gray-900">{vehicle.vin}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium text-gray-900 capitalize">{vehicle.type.replace('-', ' ')}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Mileage:</span>
                    <p className="font-medium text-gray-900">{vehicle.mileage.toLocaleString()} mi</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Last Service:</span>
                    <p className="font-medium text-gray-900">{formatDate(vehicle.lastServiceDate)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="space-y-2">
                    {serviceStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Wrench className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Next Service:</span>
                        </div>
                        <span className={`font-semibold ${serviceStatus.color}`}>
                          {serviceStatus.status === 'expired' ? `${serviceStatus.days}d overdue` :
                           serviceStatus.status === 'expiring-soon' ? `${serviceStatus.days}d left` :
                           formatDate(vehicle.nextServiceDue)}
                        </span>
                      </div>
                    )}
                    {insuranceStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {insuranceStatus.status === 'expired' || insuranceStatus.status === 'expiring-soon' ? (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          <span className="text-gray-600">Insurance:</span>
                        </div>
                        <span className={`font-semibold ${insuranceStatus.color}`}>
                          {insuranceStatus.status === 'expired' ? 'Expired' :
                           insuranceStatus.status === 'expiring-soon' ? `${insuranceStatus.days}d left` :
                           'Valid'}
                        </span>
                      </div>
                    )}
                    {registrationStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {registrationStatus.status === 'expired' || registrationStatus.status === 'expiring-soon' ? (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          <span className="text-gray-600">Registration:</span>
                        </div>
                        <span className={`font-semibold ${registrationStatus.color}`}>
                          {registrationStatus.status === 'expired' ? 'Expired' :
                           registrationStatus.status === 'expiring-soon' ? `${registrationStatus.days}d left` :
                           'Valid'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Make</label>
              <input
                type="text"
                required
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Toyota"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sienna"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
              <input
                type="number"
                required
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">License Plate</label>
              <input
                type="text"
                required
                value={formData.licensePlate}
                onChange={e => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">VIN</label>
              <input
                type="text"
                required
                maxLength={17}
                value={formData.vin}
                onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="17-character VIN"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as Vehicle['type'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="wheelchair-accessible">Wheelchair Accessible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Vehicle['status'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Mileage</label>
              <input
                type="number"
                required
                min="0"
                value={formData.mileage}
                onChange={e => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Service Date</label>
              <input
                type="date"
                value={formData.lastServiceDate}
                onChange={e => setFormData({ ...formData, lastServiceDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Next Service Due</label>
              <input
                type="date"
                value={formData.nextServiceDue}
                onChange={e => setFormData({ ...formData, nextServiceDue: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Expiry</label>
              <input
                type="date"
                value={formData.insuranceExpiry}
                onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Expiry</label>
              <input
                type="date"
                value={formData.registrationExpiry}
                onChange={e => setFormData({ ...formData, registrationExpiry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
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
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
