import React, { useState } from 'react';
import { Star, MapPin, Plus, Trash2, Edit2, Home, Building2, Hospital, School } from 'lucide-react';

interface FavoriteLocation {
  id: string;
  patientId: string;
  nickname: string;
  address: string;
  type: 'home' | 'clinic' | 'hospital' | 'dialysis' | 'therapy' | 'other';
  notes: string;
  useCount: number;
  lastUsed: string;
}

interface FavoriteLocationsProps {
  patientId: string;
  onSelect: (address: string) => void;
}

export const FavoriteLocations: React.FC<FavoriteLocationsProps> = ({ patientId, onSelect }) => {
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([
    {
      id: '1',
      patientId,
      nickname: 'Home',
      address: '123 Main St, New York, NY 10001',
      type: 'home',
      notes: 'Front door entrance, wheelchair ramp available',
      useCount: 45,
      lastUsed: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      patientId,
      nickname: 'Dialysis Center',
      address: '456 Health Ave, New York, NY 10002',
      type: 'dialysis',
      notes: 'Tuesday/Thursday/Saturday appointments',
      useCount: 38,
      lastUsed: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: '3',
      patientId,
      nickname: 'Primary Care Doctor',
      address: '789 Medical Plaza, New York, NY 10003',
      type: 'clinic',
      notes: 'Monthly checkups',
      useCount: 12,
      lastUsed: new Date(Date.now() - 2592000000).toISOString(),
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newFavorite, setNewFavorite] = useState({
    nickname: '',
    address: '',
    type: 'other' as FavoriteLocation['type'],
    notes: '',
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return Home;
      case 'clinic':
      case 'hospital':
        return Hospital;
      case 'dialysis':
      case 'therapy':
        return Building2;
      default:
        return MapPin;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'home':
        return 'bg-blue-100 text-blue-700';
      case 'clinic':
        return 'bg-green-100 text-green-700';
      case 'hospital':
        return 'bg-red-100 text-red-700';
      case 'dialysis':
        return 'bg-purple-100 text-purple-700';
      case 'therapy':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddFavorite = () => {
    if (!newFavorite.nickname || !newFavorite.address) return;

    const favorite: FavoriteLocation = {
      id: Date.now().toString(),
      patientId,
      ...newFavorite,
      useCount: 0,
      lastUsed: new Date().toISOString(),
    };

    setFavorites([...favorites, favorite]);
    setNewFavorite({ nickname: '', address: '', type: 'other', notes: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setFavorites(favorites.filter((f) => f.id !== id));
  };

  const handleSelect = (favorite: FavoriteLocation) => {
    setFavorites(
      favorites.map((f) =>
        f.id === favorite.id
          ? { ...f, useCount: f.useCount + 1, lastUsed: new Date().toISOString() }
          : f
      )
    );
    onSelect(favorite.address);
  };

  const sortedFavorites = [...favorites].sort((a, b) => b.useCount - a.useCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Favorite Locations</h3>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
              <input
                type="text"
                value={newFavorite.nickname}
                onChange={(e) => setNewFavorite({ ...newFavorite, nickname: e.target.value })}
                placeholder="e.g., Mom's House"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newFavorite.type}
                onChange={(e) =>
                  setNewFavorite({ ...newFavorite, type: e.target.value as FavoriteLocation['type'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="home">Home</option>
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="dialysis">Dialysis Center</option>
                <option value="therapy">Therapy Center</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={newFavorite.address}
              onChange={(e) => setNewFavorite({ ...newFavorite, address: e.target.value })}
              placeholder="Full address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={newFavorite.notes}
              onChange={(e) => setNewFavorite({ ...newFavorite, notes: e.target.value })}
              placeholder="Special instructions..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleAddFavorite}
              disabled={!newFavorite.nickname || !newFavorite.address}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save Favorite
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewFavorite({ nickname: '', address: '', type: 'other', notes: '' });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sortedFavorites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No favorite locations yet</p>
            <p className="text-sm mt-1">Add your first favorite above</p>
          </div>
        ) : (
          sortedFavorites.map((favorite) => {
            const Icon = getTypeIcon(favorite.type);
            return (
              <div
                key={favorite.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
                onClick={() => handleSelect(favorite)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${getTypeColor(favorite.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{favorite.nickname}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(favorite.type)}`}
                        >
                          {favorite.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{favorite.address}</p>
                      {favorite.notes && (
                        <p className="text-xs text-gray-500 italic">{favorite.notes}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Used {favorite.useCount} times</span>
                        <span>•</span>
                        <span>Last: {new Date(favorite.lastUsed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(favorite.id);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sortedFavorites.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
          Click any location to use it for pickup or dropoff
        </div>
      )}
    </div>
  );
};
