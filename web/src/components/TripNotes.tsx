import React, { useState } from 'react';
import { MessageSquare, Save, X, Plus, Clock, User, AlertCircle } from 'lucide-react';
import { Trip } from '../types';

interface TripNote {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  note: string;
  category: 'general' | 'pickup' | 'dropoff' | 'patient' | 'billing' | 'safety';
  timestamp: string;
  isImportant: boolean;
}

interface TripNotesProps {
  trip: Trip;
  onClose: () => void;
  onSave: (notes: TripNote[]) => void;
}

export const TripNotes: React.FC<TripNotesProps> = ({ trip, onClose, onSave }) => {
  const [notes, setNotes] = useState<TripNote[]>([
    {
      id: '1',
      tripId: trip.id,
      userId: 'user1',
      userName: 'John Dispatcher',
      note: 'Patient prefers front door pickup. Building has ramp access.',
      category: 'pickup',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      isImportant: false,
    },
  ]);
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState<TripNote['category']>('general');
  const [isImportant, setIsImportant] = useState(false);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: TripNote = {
      id: Date.now().toString(),
      tripId: trip.id,
      userId: 'current-user',
      userName: 'Current User',
      note: newNote.trim(),
      category,
      timestamp: new Date().toISOString(),
      isImportant,
    };

    setNotes([note, ...notes]);
    setNewNote('');
    setCategory('general');
    setIsImportant(false);
  };

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  const getCategoryColor = (cat: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-700',
      pickup: 'bg-green-100 text-green-700',
      dropoff: 'bg-blue-100 text-blue-700',
      patient: 'bg-purple-100 text-purple-700',
      billing: 'bg-yellow-100 text-yellow-700',
      safety: 'bg-red-100 text-red-700',
    };
    return colors[cat as keyof typeof colors] || colors.general;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6" />
            <h2 className="text-xl font-bold">Trip Notes & Instructions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Trip Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pickup:</span>
                <p className="font-medium text-gray-900">{trip.pickup}</p>
              </div>
              <div>
                <span className="text-gray-600">Dropoff:</span>
                <p className="font-medium text-gray-900">{trip.dropoff}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add New Note</span>
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TripNote['category'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="pickup">Pickup Instructions</option>
                    <option value="dropoff">Dropoff Instructions</option>
                    <option value="patient">Patient Care</option>
                    <option value="billing">Billing Note</option>
                    <option value="safety">Safety Alert</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                      className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Mark as Important
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter note or special instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleAddNote}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Note</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Note History</h3>
            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No notes yet. Add your first note above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`border rounded-lg p-4 ${
                      note.isImportant ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(
                            note.category
                          )}`}
                        >
                          {note.category}
                        </span>
                        {note.isImportant && (
                          <span className="flex items-center space-x-1 text-xs text-red-600 font-semibold">
                            <AlertCircle className="w-4 h-4" />
                            <span>Important</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(note.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-gray-900 mb-2">{note.note}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{note.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Save Notes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
