import React, { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, RepeatIcon, Save, X } from 'lucide-react';
import { RecurringTrip } from '../types';
import Modal from './Modal';

interface RecurringTripManagerProps {
  recurringTrips: RecurringTrip[];
  onAdd: (trip: Omit<RecurringTrip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEdit: (id: string, trip: Partial<RecurringTrip>) => void;
  onDelete: (id: string) => void;
}

const RecurringTripManager: React.FC<RecurringTripManagerProps> = ({
  recurringTrips,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<RecurringTrip | null>(null);
  const [formData, setFormData] = useState({
    templateName: '',
    pickupAddress: '',
    dropoffAddress: '',
    tripType: 'ambulatory' as 'ambulatory' | 'wheelchair' | 'stretcher',
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    daysOfWeek: [] as string[],
    timeOfDay: '09:00',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });

  const daysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleOpenModal = (trip?: RecurringTrip) => {
    if (trip) {
      setEditingTrip(trip);
      setFormData({
        templateName: trip.templateName,
        pickupAddress: trip.pickupAddress,
        dropoffAddress: trip.dropoffAddress,
        tripType: trip.tripType,
        frequency: trip.frequency,
        daysOfWeek: trip.daysOfWeek || [],
        timeOfDay: trip.timeOfDay,
        startDate: trip.startDate,
        endDate: trip.endDate || '',
        notes: trip.notes || ''
      });
    } else {
      setEditingTrip(null);
      setFormData({
        templateName: '',
        pickupAddress: '',
        dropoffAddress: '',
        tripType: 'ambulatory',
        frequency: 'weekly',
        daysOfWeek: [],
        timeOfDay: '09:00',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrip) {
      onEdit(editingTrip.id, formData);
    } else {
      onAdd({
        ...formData,
        isActive: true
      });
    }
    setIsModalOpen(false);
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <RepeatIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Recurring Trips</h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="grid gap-4">
        {recurringTrips.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No recurring trip templates yet</p>
            <p className="text-gray-400 text-sm mt-1">Create templates for frequently repeated trips</p>
          </div>
        ) : (
          recurringTrips.map(trip => (
            <div key={trip.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{trip.templateName}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      trip.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {trip.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Pickup</p>
                      <p className="text-gray-900 font-medium">{trip.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dropoff</p>
                      <p className="text-gray-900 font-medium">{trip.dropoffAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Type</p>
                      <p className="text-gray-900 font-medium capitalize">{trip.tripType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Frequency</p>
                      <p className="text-gray-900 font-medium capitalize">{trip.frequency}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Time</p>
                      <p className="text-gray-900 font-medium">{trip.timeOfDay}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Days</p>
                      <p className="text-gray-900 font-medium">
                        {trip.daysOfWeek && trip.daysOfWeek.length > 0
                          ? trip.daysOfWeek.join(', ')
                          : 'Daily'}
                      </p>
                    </div>
                  </div>

                  {trip.notes && (
                    <p className="text-sm text-gray-600 mt-2">{trip.notes}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleOpenModal(trip)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this recurring trip template?')) {
                        onDelete(trip.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? 'Edit Recurring Trip Template' : 'New Recurring Trip Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formData.templateName}
              onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Monday Dialysis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Address
            </label>
            <input
              type="text"
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dropoff Address
            </label>
            <input
              type="text"
              value={formData.dropoffAddress}
              onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Type
              </label>
              <select
                value={formData.tripType}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ambulatory">Ambulatory</option>
                <option value="wheelchair">Wheelchair</option>
                <option value="stretcher">Stretcher</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {formData.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOptions.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      formData.daysOfWeek.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time of Day
              </label>
              <input
                type="time"
                value={formData.timeOfDay}
                onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={formData.startDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes about this recurring trip..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingTrip ? 'Update Template' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RecurringTripManager;
