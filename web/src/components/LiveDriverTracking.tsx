import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, User, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { loadGoogleMapsAPI } from '../utils/googleMapsLoader';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DriverLocation {
  id: string;
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  heading?: number;
  speed?: number;
  status: string;
  isOnline: boolean;
  batteryLevel?: number;
  accuracy?: number;
}

export const LiveDriverTracking: React.FC = () => {
  const { drivers, trips } = useApp();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverMarkers, setDriverMarkers] = useState<Map<string, google.maps.Marker>>(new Map());
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      await loadGoogleMapsAPI();

      if (mapRef.current && !map) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 32.7555, lng: -97.3308 }, // Fort Worth, TX
          zoom: 11,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });
        setMap(newMap);
      }
    };

    initMap();
  }, []);

  // Fetch initial driver locations
  useEffect(() => {
    const fetchDriverLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('active_driver_locations')
          .select('*');

        if (error) throw error;

        if (data) {
          const locations: DriverLocation[] = data.map((loc: any) => ({
            id: loc.id,
            driverId: loc.driver_id,
            driverName: loc.driver_name,
            lat: parseFloat(loc.latitude),
            lng: parseFloat(loc.longitude),
            heading: parseFloat(loc.heading || 0),
            speed: parseFloat(loc.speed || 0),
            status: loc.location_status,
            isOnline: loc.is_online,
            batteryLevel: loc.battery_level,
            accuracy: parseFloat(loc.accuracy || 0),
            lastUpdate: loc.last_update,
          }));
          setDriverLocations(locations);
        }
      } catch (error) {
        console.error('Error fetching driver locations:', error);
      }
    };

    fetchDriverLocations();

    // Set up realtime subscription
    const channel = supabase
      .channel('driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
        },
        async () => {
          // Refetch all locations when any change occurs
          await fetchDriverLocations();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Update markers on map
  useEffect(() => {
    if (!map) return;

    const newMarkers = new Map<string, google.maps.Marker>();

    driverLocations.forEach(location => {
      const driver = drivers.find(d => d.id === location.driverId);
      if (!driver) return;

      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        title: driver.name,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: driver.status === 'available' ? '#10b981' : '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: location.heading || 0,
        },
        label: {
          text: driver.name.split(' ').map(n => n[0]).join(''),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        setSelectedDriver(driver.id);

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h3 style="font-weight: bold; margin-bottom: 5px;">${driver.name}</h3>
              <p style="margin: 5px 0;">Status: ${driver.status}</p>
              <p style="margin: 5px 0;">Speed: ${Math.round(location.speed || 0)} mph</p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">
                Updated: ${new Date(location.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
          `,
        });

        infoWindow.open(map, marker);
      });

      newMarkers.set(driver.id, marker);
    });

    // Remove old markers
    driverMarkers.forEach((marker, driverId) => {
      if (!newMarkers.has(driverId)) {
        marker.setMap(null);
      }
    });

    setDriverMarkers(newMarkers);
  }, [map, driverLocations, drivers]);

  const getDriverCurrentTrip = (driverId: string) => {
    return trips.find(
      t => t.driverId === driverId && t.status === 'in-progress'
    );
  };

  const activeDrivers = drivers.filter(d => d.isActive && d.status !== 'off_duty');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Navigation className="w-6 h-6 text-blue-600" />
          Live Driver Tracking
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 font-medium">Connecting...</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">On Trip</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Driver List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Active Drivers ({activeDrivers.length})</h3>
          <div className="space-y-2">
            {activeDrivers.map(driver => {
              const location = driverLocations.find(l => l.driverId === driver.id);
              const currentTrip = getDriverCurrentTrip(driver.id);

              return (
                <button
                  key={driver.id}
                  onClick={() => {
                    setSelectedDriver(driver.id);
                    if (location && map) {
                      map.panTo({ lat: location.lat, lng: location.lng });
                      map.setZoom(14);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedDriver === driver.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          driver.status === 'available' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      ></div>
                      <span className="font-semibold text-sm">{driver.name}</span>
                    </div>
                  </div>

                  {currentTrip && (
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>En route to {currentTrip.dropoffLocation.slice(0, 30)}...</span>
                    </div>
                  )}

                  {location && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {Math.floor((Date.now() - new Date(location.lastUpdate).getTime()) / 1000)}s ago</span>
                    </div>
                  )}
                </button>
              );
            })}

            {activeDrivers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No active drivers</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div
            ref={mapRef}
            className="w-full h-[600px] rounded-xl shadow-sm border border-gray-200 bg-gray-100"
          >
            {!map && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Real-Time Tracking Active</p>
            <p className="text-blue-800">
              Driver locations update in real-time via GPS. Mobile apps send location updates every 30 seconds.
              Click on a driver in the list or on the map to view details. {isConnected && '🟢 Connected to live data stream.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
