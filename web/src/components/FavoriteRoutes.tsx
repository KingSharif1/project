import React, { useState, useEffect } from 'react';
import { Star, Plus, Trash2, X } from 'lucide-react';
import { Modal } from './Modal';

interface FavoriteRoute {
  id: string;
  name: string;
  pickupLocation: string;
  dropoffLocation: string;
  createdAt: string;
}

export const FavoriteRoutes: React.FC<{
  onSelectRoute: (pickup: string, dropoff: string) => void;
}> = ({ onSelectRoute }) => {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pickupLocation: '',
    dropoffLocation: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('favoriteRoutes');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const saveFavorites = (routes: FavoriteRoute[]) => {
    setFavorites(routes);
    localStorage.setItem('favoriteRoutes', JSON.stringify(routes));
  };

  const handleSave = () => {
    if (!formData.name || !formData.pickupLocation || !formData.dropoffLocation) {
      alert('Please fill in all fields');
      return;
    }

    const newRoute: FavoriteRoute = {
      id: Date.now().toString(),
      name: formData.name,
      pickupLocation: formData.pickupLocation,
      dropoffLocation: formData.dropoffLocation,
      createdAt: new Date().toISOString(),
    };

    saveFavorites([...favorites, newRoute]);
    setFormData({ name: '', pickupLocation: '', dropoffLocation: '' });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this favorite route?')) {
      saveFavorites(favorites.filter(f => f.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Favorite Routes
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Route
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No favorite routes saved yet</p>
          <p className="text-sm">Save frequently used routes for quick access</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {favorites.map(route => (
            <div
              key={route.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
              onClick={() => onSelectRoute(route.pickupLocation, route.dropoffLocation)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <h4 className="font-semibold text-gray-900">{route.name}</h4>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700">From:</span>
                      <span className="flex-1">{route.pickupLocation}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700">To:</span>
                      <span className="flex-1">{route.dropoffLocation}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(route.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ name: '', pickupLocation: '', dropoffLocation: '' });
        }}
        title="Add Favorite Route"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Route Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Home to Hospital"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pickup Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              placeholder="Enter pickup address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Drop-off Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.dropoffLocation}
              onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
              placeholder="Enter drop-off address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Save Route
            </button>
            <button
              onClick={() => {
                setIsModalOpen(false);
                setFormData({ name: '', pickupLocation: '', dropoffLocation: '' });
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
