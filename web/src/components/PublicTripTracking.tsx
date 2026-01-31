import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Phone, Car, Clock, Navigation, User, Map, X } from 'lucide-react';
import { getTrackingInfo, getDriverLocation } from '../utils/trackingLinks';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

interface Driver {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  vehicle_id?: string;
}

interface Vehicle {
  make?: string;
  model?: string;
  color?: string;
  license_plate?: string;
}

interface Trip {
  id: string;
  trip_number: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_pickup_time: string;
  actual_pickup_time?: string;
  drivers?: Driver;
  vehicles?: Vehicle;
}

interface PublicTripTrackingProps {
  token: string;
}

export const PublicTripTracking: React.FC<PublicTripTrackingProps> = ({ token }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    loadTrackingData();

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadTrackingData();
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const loadTrackingData = async () => {
    const result = await getTrackingInfo(token);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setTrip(result.trip);
    setError(null);
    setLastUpdated(new Date());

    // Get driver location if trip is active
    if (result.trip?.drivers?.id && ['assigned', 'in_progress'].includes(result.trip.status)) {
      const location = await getDriverLocation(result.trip.drivers.id);
      if (location) {
        setDriverLocation({ lat: location.lat, lng: location.lng });
      }
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Scheduled';
      case 'assigned': return 'Driver Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const initializeMap = async () => {
    if (!mapRef.current || !trip) return;

    try {
      await loadGoogleMaps();

      const pickupCoords = await geocodeAddress(trip.pickup_address);
      const dropoffCoords = await geocodeAddress(trip.dropoff_address);

      if (!pickupCoords) {
        alert('Unable to locate pickup address on map');
        return;
      }

      const center = driverLocation || pickupCoords;

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      if (pickupCoords) {
        pickupMarkerRef.current = new google.maps.Marker({
          position: pickupCoords,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Pickup Location',
        });

        new google.maps.InfoWindow({
          content: `<div style="padding: 8px;"><strong>Pickup</strong><br/>${trip.pickup_address}</div>`,
        }).open(map, pickupMarkerRef.current);
      }

      if (dropoffCoords) {
        dropoffMarkerRef.current = new google.maps.Marker({
          position: dropoffCoords,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Dropoff Location',
        });
      }

      if (driverLocation) {
        driverMarkerRef.current = new google.maps.Marker({
          position: driverLocation,
          map,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: 'Driver Location',
        });

        new google.maps.InfoWindow({
          content: `<div style="padding: 8px;"><strong>Driver</strong><br/>${driverName}</div>`,
        }).open(map, driverMarkerRef.current);
      }

      const bounds = new google.maps.LatLngBounds();
      if (pickupCoords) bounds.extend(pickupCoords);
      if (dropoffCoords) bounds.extend(dropoffCoords);
      if (driverLocation) bounds.extend(driverLocation);
      map.fitBounds(bounds);

    } catch (error) {
      console.error('Error initializing map:', error);
      alert('Unable to load map. Please try again.');
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });

      if (result.results && result.results[0]) {
        const location = result.results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng(),
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const updateDriverMarker = () => {
    if (driverMarkerRef.current && driverLocation && mapInstanceRef.current) {
      driverMarkerRef.current.setPosition(driverLocation);
      mapInstanceRef.current.panTo(driverLocation);
    }
  };

  useEffect(() => {
    if (showMap && trip) {
      initializeMap();
    }
  }, [showMap, trip]);

  useEffect(() => {
    if (showMap && driverLocation) {
      updateDriverMarker();
    }
  }, [driverLocation, showMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MapPin className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Trip</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const driverName = trip.drivers?.first_name && trip.drivers?.last_name
    ? `${trip.drivers.first_name} ${trip.drivers.last_name}`
    : trip.drivers?.name || 'Not assigned yet';

  const vehicleInfo = trip.vehicles
    ? `${trip.vehicles.color} ${trip.vehicles.make} ${trip.vehicles.model}`.trim()
    : 'Vehicle info not available';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Track Your Ride</h1>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(trip.status)}`}>
              {getStatusText(trip.status)}
            </span>
          </div>
          <p className="text-gray-600">Trip #{trip.trip_number}</p>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Driver Info */}
        {trip.drivers && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <User className="mr-2" size={24} />
                Your Driver
              </h2>
              {(trip.status === 'assigned' || trip.status === 'in_progress') && (
                <button
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Map size={20} />
                  View Map
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-32">Name:</span>
                <span className="text-gray-900">{driverName}</span>
              </div>
              {trip.drivers.phone && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-32">Phone:</span>
                  <a href={`tel:${trip.drivers.phone}`} className="text-blue-600 hover:text-blue-800 flex items-center">
                    <Phone size={16} className="mr-1" />
                    {trip.drivers.phone}
                  </a>
                </div>
              )}
              {trip.vehicles && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-32">Vehicle:</span>
                  <span className="text-gray-900 flex items-center">
                    <Car size={16} className="mr-2" />
                    {vehicleInfo}
                    {trip.vehicles.license_plate && ` (${trip.vehicles.license_plate})`}
                  </span>
                </div>
              )}
              {driverLocation && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 flex items-center">
                    <Navigation size={16} className="mr-2" />
                    Driver location is being tracked in real-time
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trip Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Navigation className="mr-2" size={24} />
            Trip Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-green-100 rounded-full p-2 mr-3 mt-1">
                <MapPin className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-700">Pickup</p>
                <p className="text-gray-900">{trip.pickup_address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <Clock size={14} className="inline mr-1" />
                  {formatDate(trip.scheduled_pickup_time)} at {formatTime(trip.scheduled_pickup_time)}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-red-100 rounded-full p-2 mr-3 mt-1">
                <MapPin className="text-red-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-700">Dropoff</p>
                <p className="text-gray-900">{trip.dropoff_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Updates</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${trip.status === 'pending' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <span className={trip.status === 'pending' ? 'font-medium text-gray-900' : 'text-gray-500'}>
                Trip Scheduled
              </span>
            </div>

            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${trip.status === 'assigned' || trip.status === 'in_progress' || trip.status === 'completed' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <span className={trip.status === 'assigned' || trip.status === 'in_progress' || trip.status === 'completed' ? 'font-medium text-gray-900' : 'text-gray-500'}>
                Driver Assigned
              </span>
            </div>

            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${trip.status === 'in_progress' || trip.status === 'completed' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <span className={trip.status === 'in_progress' || trip.status === 'completed' ? 'font-medium text-gray-900' : 'text-gray-500'}>
                Trip In Progress
              </span>
            </div>

            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${trip.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <span className={trip.status === 'completed' ? 'font-medium text-gray-900' : 'text-gray-500'}>
                Trip Completed
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            This tracking link will expire in 24 hours
          </p>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Map className="mr-2" size={24} />
                Live Trip Map
              </h3>
              <button
                onClick={() => setShowMap(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 relative">
              <div ref={mapRef} className="w-full h-[600px]"></div>
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Pickup Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">Dropoff Location</span>
                </div>
                {driverLocation && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 transform rotate-45"></div>
                    <span className="text-sm font-medium">Driver Location</span>
                  </div>
                )}
              </div>
              {driverLocation && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white rounded-lg shadow-lg p-3">
                  <p className="text-sm font-medium flex items-center">
                    <Navigation size={16} className="mr-2" />
                    Driver location updates every 10 seconds
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
