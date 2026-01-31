import React, { useState } from 'react';
import { Calendar, Upload, Download, Plus, Trash2, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';

interface BulkTrip {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledDate: string;
  scheduledTime: string;
  classification: string;
  clinicId: string;
}

export const BulkTripScheduler: React.FC = () => {
  const { addTrip, clinics } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [trips, setTrips] = useState<BulkTrip[]>([]);

  const addEmptyTrip = () => {
    const newTrip: BulkTrip = {
      id: `temp-${Date.now()}`,
      customerName: '',
      customerPhone: '',
      pickupLocation: '',
      dropoffLocation: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
      classification: 'adult',
      clinicId: clinics[0]?.id || ''
    };
    setTrips([...trips, newTrip]);
  };

  const removeTrip = (id: string) => {
    setTrips(trips.filter(t => t.id !== id));
  };

  const updateTrip = (id: string, field: keyof BulkTrip, value: string) => {
    setTrips(trips.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = () => {
    trips.forEach(trip => {
      const scheduledDateTime = `${trip.scheduledDate}T${trip.scheduledTime}:00`;

      addTrip({
        customerName: trip.customerName,
        customerPhone: trip.customerPhone,
        customerEmail: '',
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        scheduledTime: scheduledDateTime,
        classification: trip.classification as any,
        status: 'pending',
        distance: 0,
        fare: 0,
        clinicId: trip.clinicId
      });
    });

    setTrips([]);
    setIsOpen(false);
    alert(`${trips.length} trips scheduled successfully!`);
  };

  const downloadTemplate = () => {
    const csv = 'Customer Name,Phone,Pickup Location,Dropoff Location,Date,Time,Classification\n' +
                'John Doe,555-0100,123 Main St,456 Oak Ave,2024-01-15,09:00,adult\n' +
                'Jane Smith,555-0101,789 Pine Rd,321 Elm St,2024-01-15,10:00,senior';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-trip-template.csv';
    a.click();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-sm"
      >
        <Calendar className="w-5 h-5" />
        <span>Bulk Schedule</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Bulk Trip Scheduler" size="xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <p className="text-gray-600">Schedule multiple trips at once</p>
            <div className="flex space-x-2">
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                <Download className="w-4 h-4" />
                <span>CSV Template</span>
              </button>
              <button
                onClick={addEmptyTrip}
                className="flex items-center space-x-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trip</span>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {trips.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No trips added yet</p>
                <button
                  onClick={addEmptyTrip}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Click "Add Trip" to get started
                </button>
              </div>
            ) : (
              trips.map((trip, index) => (
                <div key={trip.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Trip #{index + 1}</h4>
                    <button
                      onClick={() => removeTrip(trip.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={trip.customerName}
                      onChange={e => updateTrip(trip.id, 'customerName', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={trip.customerPhone}
                      onChange={e => updateTrip(trip.id, 'customerPhone', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Pickup Location"
                      value={trip.pickupLocation}
                      onChange={e => updateTrip(trip.id, 'pickupLocation', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Dropoff Location"
                      value={trip.dropoffLocation}
                      onChange={e => updateTrip(trip.id, 'dropoffLocation', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={trip.scheduledDate}
                      onChange={e => updateTrip(trip.id, 'scheduledDate', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="time"
                      value={trip.scheduledTime}
                      onChange={e => updateTrip(trip.id, 'scheduledTime', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={trip.classification}
                      onChange={e => updateTrip(trip.id, 'classification', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="adult">Adult</option>
                      <option value="child & family">Child & Family</option>
                      <option value="senior">Senior</option>
                      <option value="veteran">Veteran</option>
                    </select>
                    <select
                      value={trip.clinicId}
                      onChange={e => updateTrip(trip.id, 'clinicId', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} ready to schedule
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={trips.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Schedule All</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
