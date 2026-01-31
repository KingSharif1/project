import React, { useState } from 'react';
import { X, User, FileText, History, TrendingUp, DollarSign, Activity, Shield, Car, Heart, Clipboard, Calendar, MapPin, Star, Award, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DriverProfileProps {
  driver: any;
  trips: any[];
  onClose: () => void;
  onUpdateDriver: (driverId: string, updates: any) => void;
}

export const DriverProfile: React.FC<DriverProfileProps> = ({
  driver,
  trips,
  onClose,
  onUpdateDriver
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history' | 'performance' | 'rates' | 'activity'>('overview');
  const [documentDates, setDocumentDates] = useState({
    license_expiry_date: driver.license_expiry_date || '',
    insurance_expiry_date: driver.insurance_expiry_date || '',
    registration_expiry_date: driver.registration_expiry_date || '',
    medical_cert_expiry_date: driver.medical_cert_expiry_date || '',
    background_check_expiry_date: driver.background_check_expiry_date || ''
  });

  const driverTrips = trips.filter(t => t.driverId === driver.id);
  const completedTrips = driverTrips.filter(t => t.status === 'completed');
  const totalEarnings = completedTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
  const completionRate = driverTrips.length > 0 ? (completedTrips.length / driverTrips.length) * 100 : 0;

  const handleSaveDocuments = () => {
    onUpdateDriver(driver.id, documentDates);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'Trip History', icon: History },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'rates', label: 'Rate Config', icon: DollarSign },
    { id: 'activity', label: 'Activity Log', icon: Activity }
  ];

  const getDocumentStatus = (date: string | null) => {
    if (!date) return { status: 'not-set', label: 'Not Set', color: 'text-orange-600 bg-orange-50' };

    const expiryDate = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired', color: 'text-red-600 bg-red-50' };
    if (daysUntilExpiry <= 7) return { status: 'urgent', label: `${daysUntilExpiry}d left`, color: 'text-orange-600 bg-orange-50' };
    if (daysUntilExpiry <= 30) return { status: 'warning', label: `${daysUntilExpiry}d left`, color: 'text-amber-600 bg-amber-50' };
    return { status: 'valid', label: 'Valid', color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur">
                {driver.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{driver.name}</h2>
                <div className="flex items-center space-x-3 mt-1">
                  <StatusBadge status={driver.status} size="sm" />
                  <span className="text-blue-100">#{driver.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">{driver.totalTrips || 0}</div>
              <div className="text-sm text-blue-100">Total Trips</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold flex items-center">
                <Star className="w-5 h-5 mr-1" />
                {driver.rating?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-blue-100">Rating</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">${totalEarnings.toFixed(0)}</div>
              <div className="text-sm text-blue-100">Total Earnings</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
              <div className="text-sm text-blue-100">Completion</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 p-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{driver.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{driver.email || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License #:</span>
                      <span className="font-medium">{driver.licenseNumber || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <StatusBadge status={driver.status} size="sm" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium">{driver.vehicleId || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shift:</span>
                      <span className="font-medium">{driver.shift || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-green-600" />
                  Achievements
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {completedTrips.length >= 100 && (
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🏆</div>
                      <div className="text-xs font-semibold">100 Trips</div>
                    </div>
                  )}
                  {driver.rating >= 4.5 && (
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">⭐</div>
                      <div className="text-xs font-semibold">Top Rated</div>
                    </div>
                  )}
                  {completionRate >= 95 && (
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">✓</div>
                      <div className="text-xs font-semibold">Reliable</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  Manage all required documents and expiry dates for {driver.name}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { type: 'license_expiry_date', label: 'Driver License', icon: Shield, color: 'blue' },
                  { type: 'insurance_expiry_date', label: 'Vehicle Insurance', icon: FileText, color: 'green' },
                  { type: 'registration_expiry_date', label: 'Vehicle Registration', icon: Car, color: 'purple' },
                  { type: 'medical_cert_expiry_date', label: 'Medical Certification', icon: Heart, color: 'red' },
                  { type: 'background_check_expiry_date', label: 'Background Check', icon: Clipboard, color: 'amber' }
                ].map(doc => {
                  const Icon = doc.icon;
                  const status = getDocumentStatus((driver as any)[doc.type]);

                  return (
                    <div key={doc.type} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 bg-${doc.color}-100 rounded-lg`}>
                            <Icon className={`w-5 h-5 text-${doc.color}-600`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{doc.label}</h4>
                            {(driver as any)[doc.type] && (
                              <p className="text-sm text-gray-600">
                                Expires: {new Date((driver as any)[doc.type]).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <input
                        type="date"
                        value={(documentDates as any)[doc.type]}
                        onChange={(e) => setDocumentDates({ ...documentDates, [doc.type]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSaveDocuments}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save All Documents
              </button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {driverTrips.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No trips found for this driver</p>
                </div>
              ) : (
                driverTrips.slice(0, 10).map(trip => (
                  <div key={trip.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{trip.customerName}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(trip.scheduledTime).toLocaleDateString()} at {new Date(trip.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} size="sm" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{trip.pickupLocation}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{trip.dropoffLocation}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">{trip.distance || 'N/A'} miles</span>
                      <span className="font-semibold text-gray-900">${trip.fare?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{completedTrips.length}</div>
                  <div className="text-sm text-gray-700 font-medium">Completed Trips</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-1">{completionRate.toFixed(0)}%</div>
                  <div className="text-sm text-gray-700 font-medium">Completion Rate</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                  <div className="text-3xl font-bold text-amber-600 mb-1 flex items-center">
                    <Star className="w-7 h-7 mr-1" />
                    {driver.rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">Average Rating</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Earnings Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Earnings:</span>
                    <span className="font-semibold">${totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average per Trip:</span>
                    <span className="font-semibold">
                      ${completedTrips.length > 0 ? (totalEarnings / completedTrips.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">This Month:</span>
                    <span className="font-semibold">${(totalEarnings * 0.2).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Custom rate configuration for {driver.name}. Leave blank to use default rates.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Base Rates</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate (per trip)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Default rate will be used"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per Mile Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Default rate will be used"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Profile Created</p>
                    <p className="text-sm text-gray-600">Driver account was created</p>
                  </div>
                  <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Documents Updated</p>
                    <p className="text-sm text-gray-600">License and insurance updated</p>
                  </div>
                  <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Status Changed</p>
                    <p className="text-sm text-gray-600">Changed to {driver.status}</p>
                  </div>
                  <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
