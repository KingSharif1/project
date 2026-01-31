import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Car, Clock, User, Phone, RefreshCw, Map as MapIcon, History, Filter, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Trip, Driver } from '../types';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../utils/googleMapsLoader';
import { TripHistoryViewer } from './TripHistoryViewer';

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  last_updated: string;
}

type ViewMode = 'active' | 'history';

export const RealtimeTracking: React.FC = () => {
  const { trips, drivers } = useApp();
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [historyTrip, setHistoryTrip] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const activeTrips = trips.filter(trip =>
    trip.status === 'assigned' || trip.status === 'in_progress'
  );

  const completedTrips = trips.filter(trip => {
    if (trip.status !== 'completed') return false;

    // Date filter
    if (!dateFilter) return true;
    const tripDate = new Date(trip.scheduledPickupTime).toISOString().split('T')[0];
    if (tripDate !== dateFilter) return false;

    // Driver filter
    if (driverFilter !== 'all' && trip.driverId !== driverFilter) return false;

    return true;
  }).sort((a, b) =>
    new Date(b.scheduledPickupTime).getTime() - new Date(a.scheduledPickupTime).getTime()
  );

  // Get unique drivers who have completed trips
  const driversWithCompletedTrips = Array.from(
    new Set(
      trips
        .filter(trip => trip.status === 'completed' && trip.driverId)
        .map(trip => trip.driverId)
    )
  ).map(driverId => drivers.find(d => d.id === driverId))
    .filter((d): d is Driver => d !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    loadDriverLocations();
    const interval = setInterval(() => {
      loadDriverLocations();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadDriverLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('realtime_driver_locations')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) {
        console.error('Error loading driver locations:', error);
        return;
      }

      const locationsMap = new Map<string, DriverLocation>();
      data?.forEach(location => {
        if (!locationsMap.has(location.driver_id)) {
          locationsMap.set(location.driver_id, location);
        }
      });

      setDriverLocations(locationsMap);
      setLastUpdated(new Date());

      if (showMap) {
        updateMapMarkers(locationsMap);
      }
    } catch (error) {
      console.error('Error loading driver locations:', error);
    }
  };

  const getDriverForTrip = (trip: Trip): Driver | undefined => {
    return drivers.find(d => d.id === trip.driverId);
  };

  const getDriverLocation = (driverId: string): DriverLocation | undefined => {
    return driverLocations.get(driverId);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date().getTime();
    const updated = new Date(dateString).getTime();
    const diffMinutes = Math.floor((now - updated) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      await loadGoogleMaps();

      const center = activeTrips.length > 0
        ? await geocodeAddress(activeTrips[0].pickupAddress)
        : { lat: 40.7128, lng: -74.0060 };

      const map = new google.maps.Map(mapRef.current, {
        center: center || { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      await updateMapMarkers(driverLocations);

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMapMarkers = async (locations: Map<string, DriverLocation>) => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();
    let hasLocations = false;

    for (const trip of activeTrips) {
      const driver = getDriverForTrip(trip);
      const location = trip.driverId ? locations.get(trip.driverId) : undefined;

      if (location && driver) {
        const position = { lat: location.latitude, lng: location.longitude };

        const marker = new google.maps.Marker({
          position,
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            rotation: location.heading || 0,
          },
          title: driver.name,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>${driver.name}</strong><br/>
              Trip: ${trip.tripNumber}<br/>
              Status: ${trip.status}<br/>
              ${location.speed ? `Speed: ${Math.round(location.speed)} mph<br/>` : ''}
              Updated: ${getTimeSince(location.last_updated)}
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
          setSelectedTrip(trip);
        });

        markersRef.current.set(trip.id, marker);
        bounds.extend(position);
        hasLocations = true;
      }
    }

    if (hasLocations) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });

      if (result.results && result.results[0]) {
        const location = result.results[0].geometry.location;
        return { lat: location.lat(), lng: location.lng() };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  useEffect(() => {
    if (showMap) {
      setTimeout(() => initializeMap(), 100);
    }
  }, [showMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Tracking</h2>
          <p className="text-gray-600">Monitor active trips and view historical routes</p>
        </div>
        <div className="flex items-center gap-4">
          {viewMode === 'active' && (
            <>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <button
                onClick={loadDriverLocations}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={20} />
                Refresh
              </button>
            </>
          )}
          {viewMode === 'active' && (
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showMap
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <MapIcon size={20} />
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Navigation size={20} />
            Active Tracking ({activeTrips.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History size={20} />
            Trip History ({completedTrips.length})
          </button>
        </div>
      </div>

      {/* Active Trips View */}
      {viewMode === 'active' && (
        <>
          {showMap && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div ref={mapRef} className="w-full h-[600px] rounded-lg"></div>
              <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 transform rotate-45"></div>
                  <span>Active Driver</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} />
                  <span>Updates every 10 seconds</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Active Trips ({activeTrips.length})
              </h3>
            </div>

        {activeTrips.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No active trips at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeTrips.map((trip) => {
              const driver = getDriverForTrip(trip);
              const location = trip.driverId ? getDriverLocation(trip.driverId) : undefined;

              return (
                <div
                  key={trip.id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedTrip?.id === trip.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg font-semibold text-gray-900">
                          Trip #{trip.tripNumber}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          trip.status === 'assigned'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {trip.status === 'assigned' ? 'Assigned' : 'In Progress'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="text-green-600 mt-1" size={16} />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Pickup</p>
                              <p className="text-sm text-gray-900">{trip.pickupAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="text-red-600 mt-1" size={16} />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Dropoff</p>
                              <p className="text-sm text-gray-900">{trip.dropoffAddress}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          {driver && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="text-gray-600" size={16} />
                                <span className="text-sm text-gray-900">{driver.name}</span>
                              </div>
                              {driver.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="text-gray-600" size={16} />
                                  <a
                                    href={`tel:${driver.phone}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {driver.phone}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Clock className="text-gray-600" size={16} />
                                <span className="text-sm text-gray-900">
                                  {formatTime(trip.scheduledPickupTime)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-2">
                      {location ? (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-green-600 mb-1">
                            <Navigation size={16} />
                            <span className="text-sm font-medium">Tracking Active</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {getTimeSince(location.last_updated)}
                          </p>
                          {location.speed && (
                            <p className="text-xs text-gray-600 mt-1">
                              {Math.round(location.speed)} mph
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Navigation size={16} />
                            <span className="text-sm font-medium">No Signal</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Location unavailable
                          </p>
                        </div>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryTrip(trip);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <History size={14} />
                          View Route
                        </button>
                      )}
                    </div>
                  </div>

                  {trip.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {trip.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </div>

          {selectedTrip && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-900">
                  <MapPin size={20} />
                  <h4 className="font-semibold">Selected Trip Details</h4>
                </div>
                <button
                  onClick={() => setHistoryTrip(selectedTrip)}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <History size={16} />
                  View History
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Passenger:</p>
                  <p className="text-blue-900">{selectedTrip.customerName}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Phone:</p>
                  <p className="text-blue-900">{selectedTrip.customerPhone}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Distance:</p>
                  <p className="text-blue-900">{selectedTrip.distance} miles</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Service Level:</p>
                  <p className="text-blue-900 capitalize">{selectedTrip.serviceLevel}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trip History View */}
      {viewMode === 'history' && (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Filter Trips
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-gray-600" />
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Date:
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Driver Filter */}
                <div className="flex items-center gap-2">
                  <User size={20} className="text-gray-600" />
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Driver:
                  </label>
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[200px]"
                  >
                    <option value="all">All Drivers</option>
                    {driversWithCompletedTrips.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(driverFilter !== 'all' || dateFilter !== new Date().toISOString().split('T')[0]) && (
                  <button
                    onClick={() => {
                      setDriverFilter('all');
                      setDateFilter(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <strong>{completedTrips.length}</strong> completed trip{completedTrips.length !== 1 ? 's' : ''}
                {driverFilter !== 'all' && (
                  <> for <strong>{driversWithCompletedTrips.find(d => d.id === driverFilter)?.name}</strong></>
                )}
                {' '}on <strong>{new Date(dateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </p>
            </div>

            {completedTrips.length === 0 ? (
              <div className="p-12 text-center">
                <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No completed trips found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try selecting a different date or driver
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <History className="text-orange-600 mt-1" size={20} />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">
                        How to View Trip History
                      </h4>
                      <p className="text-sm text-orange-800">
                        Click the <strong>"View Route History"</strong> button on any completed trip below to see the complete GPS route, playback animation, and trip statistics.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {completedTrips.map((trip) => {
                    const driver = getDriverForTrip(trip);

                    return (
                      <div
                        key={trip.id}
                        className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-lg font-semibold text-gray-900">
                                Trip #{trip.tripNumber}
                              </span>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                Completed
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="flex items-start gap-2 mb-2">
                                  <MapPin className="text-green-600 mt-1" size={16} />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Pickup</p>
                                    <p className="text-sm text-gray-900">{trip.pickupAddress}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="text-red-600 mt-1" size={16} />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Dropoff</p>
                                    <p className="text-sm text-gray-900">{trip.dropoffAddress}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {driver && (
                                  <div className="flex items-center gap-2">
                                    <User className="text-gray-600" size={16} />
                                    <span className="text-sm text-gray-900">{driver.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="text-gray-600" size={16} />
                                  <span className="text-sm text-gray-900">
                                    {formatTime(trip.scheduledPickupTime)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="text-gray-600" size={16} />
                                  <span className="text-sm text-gray-900">
                                    {trip.distance} miles
                                  </span>
                                </div>
                              </div>
                            </div>

                            {trip.actualPickupTime && trip.actualDropoffTime && (
                              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                                <strong>Actual Times:</strong> Picked up at {formatTime(trip.actualPickupTime)},
                                Dropped off at {formatTime(trip.actualDropoffTime)}
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <button
                              onClick={() => setHistoryTrip(trip)}
                              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
                            >
                              <History size={20} />
                              View Route History
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {historyTrip && (
        <TripHistoryViewer
          trip={historyTrip}
          onClose={() => setHistoryTrip(null)}
        />
      )}
    </div>
  );
};
