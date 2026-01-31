import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Fuel,
  Gauge,
  Wrench,
  Camera,
  FileText,
  Clock
} from 'lucide-react';

interface VehicleInspection {
  brakes: 'good' | 'fair' | 'poor';
  tires: 'good' | 'fair' | 'poor';
  lights: 'good' | 'fair' | 'poor';
  fluids: 'good' | 'fair' | 'poor';
  cleanliness: 'good' | 'fair' | 'poor';
  safety_equipment: 'good' | 'fair' | 'poor';
  notes: string;
  photos: string[];
}

interface CheckInData {
  driverId: string;
  vehicleId: string;
  timestamp: string;
  odometer: number;
  fuelLevel: number;
  inspection: VehicleInspection;
  signature: string;
}

interface DriverCheckInProps {
  driverId: string;
  driverName: string;
  isCheckedIn: boolean;
  onCheckIn: (data: CheckInData) => void;
  onCheckOut: (odometer: number, notes: string) => void;
}

export const DriverCheckIn: React.FC<DriverCheckInProps> = ({
  driverId,
  driverName,
  isCheckedIn,
  onCheckIn,
  onCheckOut,
}) => {
  const [step, setStep] = useState<'select' | 'inspect' | 'confirm'>('select');
  const [vehicleId, setVehicleId] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState(75);
  const [inspection, setInspection] = useState<VehicleInspection>({
    brakes: 'good',
    tires: 'good',
    lights: 'good',
    fluids: 'good',
    cleanliness: 'good',
    safety_equipment: 'good',
    notes: '',
    photos: [],
  });
  const [checkOutOdometer, setCheckOutOdometer] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  const vehicles = [
    { id: 'V001', name: 'Van 001 - Honda Odyssey', plate: 'ABC-1234' },
    { id: 'V002', name: 'Van 002 - Toyota Sienna', plate: 'DEF-5678' },
    { id: 'V003', name: 'Van 003 - Chrysler Pacifica', plate: 'GHI-9012' },
  ];

  const inspectionItems = [
    { key: 'brakes' as const, label: 'Brakes', icon: Wrench },
    { key: 'tires' as const, label: 'Tires', icon: Gauge },
    { key: 'lights' as const, label: 'Lights', icon: CheckCircle },
    { key: 'fluids' as const, label: 'Fluids', icon: Fuel },
    { key: 'cleanliness' as const, label: 'Cleanliness', icon: CheckCircle },
    { key: 'safety_equipment' as const, label: 'Safety Equipment', icon: AlertTriangle },
  ];

  const handleCheckIn = () => {
    const data: CheckInData = {
      driverId,
      vehicleId,
      timestamp: new Date().toISOString(),
      odometer: parseInt(odometer),
      fuelLevel,
      inspection,
      signature: 'digital-signature',
    };
    onCheckIn(data);
  };

  const handleCheckOut = () => {
    onCheckOut(parseInt(checkOutOdometer), checkOutNotes);
  };

  const getStatusColor = (status: 'good' | 'fair' | 'poor') => {
    return status === 'good'
      ? 'text-green-600'
      : status === 'fair'
      ? 'text-yellow-600'
      : 'text-red-600';
  };

  const allItemsChecked = Object.values(inspection).every(
    (v) => typeof v === 'string' && v !== ''
  );

  if (isCheckedIn) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-green-100 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checked In</h2>
            <p className="text-sm text-gray-600">Ready for service</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Driver:</span>
              <p className="font-semibold text-gray-900">{driverName}</p>
            </div>
            <div>
              <span className="text-gray-600">Vehicle:</span>
              <p className="font-semibold text-gray-900">Van 001</p>
            </div>
            <div>
              <span className="text-gray-600">Check-in Time:</span>
              <p className="font-semibold text-gray-900">{new Date().toLocaleTimeString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Odometer:</span>
              <p className="font-semibold text-gray-900">{odometer} mi</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Check Out</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ending Odometer Reading
            </label>
            <input
              type="number"
              value={checkOutOdometer}
              onChange={(e) => setCheckOutOdometer(e.target.value)}
              placeholder="Enter odometer reading"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End of Shift Notes (Optional)
            </label>
            <textarea
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              placeholder="Any issues or notes from today..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={handleCheckOut}
            disabled={!checkOutOdometer}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Check Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl">
          <LogIn className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Driver Check-In</h2>
          <p className="text-sm text-gray-600">Start your shift - {driverName}</p>
        </div>
      </div>

      {step === 'select' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Odometer Reading
            </label>
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="Enter starting odometer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuel Level: {fuelLevel}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Empty</span>
              <span>Full</span>
            </div>
          </div>

          <button
            onClick={() => setStep('inspect')}
            disabled={!vehicleId || !odometer}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Vehicle Inspection
          </button>
        </div>
      )}

      {step === 'inspect' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Daily Vehicle Inspection:</strong> Check each item and mark its condition
            </p>
          </div>

          <div className="space-y-4">
            {inspectionItems.map((item) => (
              <div key={item.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </div>
                  <span className={`font-semibold ${getStatusColor(inspection[item.key])}`}>
                    {inspection[item.key].toUpperCase()}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {(['good', 'fair', 'poor'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        setInspection({ ...inspection, [item.key]: status })
                      }
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        inspection[item.key] === status
                          ? status === 'good'
                            ? 'bg-green-600 text-white'
                            : status === 'fair'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inspection Notes (Optional)
            </label>
            <textarea
              value={inspection.notes}
              onChange={(e) => setInspection({ ...inspection, notes: e.target.value })}
              placeholder="Any concerns or additional notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('select')}
              className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!allItemsChecked}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Review & Confirm
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Check-In Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Vehicle:</span>
                <p className="font-medium text-gray-900">
                  {vehicles.find((v) => v.id === vehicleId)?.name}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Odometer:</span>
                <p className="font-medium text-gray-900">{odometer} mi</p>
              </div>
              <div>
                <span className="text-gray-600">Fuel Level:</span>
                <p className="font-medium text-gray-900">{fuelLevel}%</p>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <p className="font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Inspection Results</h4>
            <div className="grid grid-cols-2 gap-3">
              {inspectionItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.label}:</span>
                  <span className={`text-sm font-semibold ${getStatusColor(inspection[item.key])}`}>
                    {inspection[item.key].toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('inspect')}
              className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCheckIn}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirm Check-In</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
