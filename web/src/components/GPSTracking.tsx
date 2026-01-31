import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Users, Car, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface VehicleLocation {
  vehicleId: string;
  driverId: string;
  driverName: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  lastUpdate: string;
  tripId?: string;
  status: 'available' | 'on_trip' | 'offline';
}

export const GPSTracking: React.FC = () => {
  const { drivers, trips } = useApp();
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateMockLocations();

    if (autoRefresh) {
      const interval = setInterval(updateLocations, 10000);
      return () => clearInterval(interval);
    }
  }, [drivers, autoRefresh]);

  const generateMockLocations = () => {
    const baseLocations = [
      { lat: 40.7128, lng: -74.0060, name: 'New York' },
      { lat: 40.7589, lng: -73.9851, name: 'Times Square' },
      { lat: 40.7614, lng: -73.9776, name: 'Central Park' },
      { lat: 40.7484, lng: -73.9857, name: 'Empire State' },
    ];

    const mockLocations: VehicleLocation[] = drivers
      .filter(d => d.status !== 'offline')
      .map((driver, index) => {
        const base = baseLocations[index % baseLocations.length];
        const offset = (Math.random() - 0.5) * 0.05;

        const activeTrip = trips.find(
          t => t.driverId === driver.id && (t.status === 'in_progress' || t.status === 'assigned')
        );

        return {
          vehicleId: driver.vehicleId || `vehicle-${driver.id}`,
          driverId: driver.id,
          driverName: driver.name,
          latitude: base.lat + offset,
          longitude: base.lng + offset,
          heading: Math.random() * 360,
          speed: activeTrip ? 25 + Math.random() * 30 : 0,
          lastUpdate: new Date().toISOString(),
          tripId: activeTrip?.id,
          status: activeTrip ? 'on_trip' : 'available',
        };
      });

    setLocations(mockLocations);
  };

  const updateLocations = () => {
    setLocations(prev =>
      prev.map(loc => ({
        ...loc,
        latitude: loc.latitude + (Math.random() - 0.5) * 0.002,
        longitude: loc.longitude + (Math.random() - 0.5) * 0.002,
        heading: (loc.heading + (Math.random() - 0.5) * 30) % 360,
        speed: loc.status === 'on_trip' ? 25 + Math.random() * 30 : 0,
        lastUpdate: new Date().toISOString(),
      }))
    );
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_trip':
        return 'bg-blue-500';
      case 'available':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_trip':
        return 'On Trip';
      case 'available':
        return 'Available';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GPS Tracking</h1>
          <p className="text-gray-600 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Real-time vehicle location monitoring
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              autoRefresh
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>
          <button
            onClick={updateLocations}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-cyan-50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold">Interactive Map View</p>
                <p className="text-sm text-gray-500 mt-2">
                  Google Maps integration would display here
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  Showing {locations.length} active vehicle{locations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {locations.map((loc, index) => {
              const left = 20 + (index * 15) % 60;
              const top = 30 + (index * 20) % 40;

              return (
                <div
                  key={loc.vehicleId}
                  className="absolute cursor-pointer group"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onClick={() => setSelectedVehicle(loc.vehicleId)}
                >
                  <div className={`w-8 h-8 rounded-full ${getStatusColor(loc.status)} flex items-center justify-center shadow-lg border-2 border-white animate-pulse`}>
                    <Car className="w-4 h-4 text-white" style={{ transform: `rotate(${loc.heading}deg)` }} />
                  </div>
                  <div className="absolute left-10 top-0 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {loc.driverName}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-700">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700">On Trip</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-gray-700">Offline</span>
                </div>
              </div>
              <span className="text-gray-500">
                Last updated: {getTimeAgo(locations[0]?.lastUpdate || new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-4">Active Vehicles</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map(loc => (
                <div
                  key={loc.vehicleId}
                  onClick={() => setSelectedVehicle(loc.vehicleId)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedVehicle === loc.vehicleId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(loc.status)}`}></div>
                      <span className="font-semibold text-gray-900 text-sm">{loc.driverName}</span>
                    </div>
                    <span className="text-xs text-gray-500">{getTimeAgo(loc.lastUpdate)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-gray-900">{getStatusText(loc.status)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-semibold text-gray-900">{Math.round(loc.speed)} mph</span>
                    </div>
                    {loc.tripId && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Trip ID:</span>
                        <span className="font-mono text-gray-900">{loc.tripId.slice(0, 8)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">GPS Features:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Real-time location updates</li>
                  <li>Speed and heading tracking</li>
                  <li>Geofencing alerts</li>
                  <li>Route history playback</li>
                  <li>Driver behavior monitoring</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
