import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Phone, User, Car, AlertCircle, CheckCircle2, Share2 } from 'lucide-react';
import { Trip, Driver } from '../types';

interface LiveTripTrackingProps {
  trip: Trip;
  driver?: Driver;
  shareableLink?: boolean;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export const LiveTripTracking: React.FC<LiveTripTrackingProps> = ({
  trip,
  driver,
  shareableLink = false,
}) => {
  const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
  const [eta, setEta] = useState<number>(15);
  const [distance, setDistance] = useState<number>(3.2);
  const [tripStatus, setTripStatus] = useState<'pending' | 'on_way' | 'arrived' | 'in_transit' | 'completed'>(
    'on_way'
  );
  const [shareLink, setShareLink] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate real-time location updates
    const interval = setInterval(() => {
      simulateDriverMovement();
    }, 3000);

    // Generate shareable link
    if (shareableLink) {
      const link = `${window.location.origin}/track/${trip.id}`;
      setShareLink(link);
    }

    return () => clearInterval(interval);
  }, []);

  const simulateDriverMovement = () => {
    // Simulate driver moving closer
    setEta(prev => Math.max(0, prev - 1));
    setDistance(prev => Math.max(0, prev - 0.2));

    // Update location
    setDriverLocation({
      latitude: (trip.pickupLatitude || 40.7128) + Math.random() * 0.01,
      longitude: (trip.pickupLongitude || -74.0060) + Math.random() * 0.01,
      timestamp: new Date().toISOString(),
      speed: 25 + Math.random() * 10,
      heading: Math.random() * 360,
    });

    // Update status based on ETA
    if (eta <= 1) {
      setTripStatus('arrived');
    } else if (eta <= 5) {
      setTripStatus('on_way');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Share link copied to clipboard!');
  };

  const getStatusColor = () => {
    switch (tripStatus) {
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'on_way':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'arrived':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_transit':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = () => {
    switch (tripStatus) {
      case 'pending':
        return 'Driver Assigned';
      case 'on_way':
        return 'Driver On The Way';
      case 'arrived':
        return 'Driver Has Arrived';
      case 'in_transit':
        return 'Trip In Progress';
      case 'completed':
        return 'Trip Completed';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusIcon = () => {
    switch (tripStatus) {
      case 'arrived':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'on_way':
        return <Navigation className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Trip Tracking</h1>
            <p className="text-gray-600">Trip #{trip.tripNumber || trip.id.slice(0, 8)}</p>
          </div>
          {shareableLink && (
            <button
              onClick={copyShareLink}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          )}
        </div>

        {/* Status Banner */}
        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${getStatusColor()}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-semibold">{getStatusText()}</p>
              {tripStatus === 'on_way' && eta > 0 && (
                <p className="text-sm">Estimated arrival: {eta} minutes</p>
              )}
              {tripStatus === 'arrived' && (
                <p className="text-sm">Your driver is waiting at the pickup location</p>
              )}
            </div>
          </div>
          {driverLocation && (
            <div className="text-right">
              <p className="text-sm font-medium">{distance.toFixed(1)} miles away</p>
              <p className="text-xs">Updated {new Date(driverLocation.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div
          ref={mapRef}
          className="w-full h-96 bg-gradient-to-br from-blue-100 to-blue-200 relative flex items-center justify-center"
        >
          {/* Placeholder Map */}
          <div className="text-center">
            <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Live Map View</p>
            <p className="text-sm text-gray-600">Tracking driver location in real-time</p>
          </div>

          {/* Driver Marker Animation */}
          {driverLocation && (
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Pulsing circle */}
                <div className="absolute inset-0 animate-ping">
                  <div className="w-16 h-16 bg-blue-500 rounded-full opacity-75"></div>
                </div>
                {/* Car icon */}
                <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Car className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Pickup location marker */}
          <div className="absolute bottom-1/4 right-1/4">
            <div className="bg-green-600 p-3 rounded-full shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Driver Info Card */}
      {driver && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Driver</h2>
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{driver.name}</h3>
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium text-gray-700">{driver.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({driver.totalTrips} trips)</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{driver.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Car className="w-4 h-4" />
                  <span>License: {driver.licenseNumber}</span>
                </div>
              </div>
            </div>
            <a
              href={`tel:${driver.phone}`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </a>
          </div>
        </div>
      )}

      {/* Trip Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Details</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pickup</p>
              <p className="text-gray-900">{trip.pickupLocation}</p>
              <p className="text-sm text-gray-500 mt-1">
                Scheduled: {new Date(trip.scheduledTime).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border-l-2 border-dashed border-gray-300 ml-4 h-8"></div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Dropoff</p>
              <p className="text-gray-900">{trip.dropoffLocation}</p>
              {trip.appointmentTime && (
                <p className="text-sm text-gray-500 mt-1">
                  Appointment: {new Date(trip.appointmentTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Service Level</p>
              <p className="font-medium text-gray-900 capitalize">{trip.serviceLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trip Type</p>
              <p className="font-medium text-gray-900 capitalize">{trip.tripType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-1">Need Help?</h3>
            <p className="text-sm text-orange-800 mb-3">
              If you have any concerns or need assistance, please contact our dispatch center.
            </p>
            <a
              href="tel:682-221-8746"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call Dispatch: 682-221-8746</span>
            </a>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Progress</h2>
        <div className="space-y-4">
          {[
            { label: 'Trip Scheduled', time: trip.createdAt, completed: true },
            { label: 'Driver Assigned', time: trip.updatedAt, completed: true },
            { label: 'Driver En Route', time: new Date().toISOString(), completed: tripStatus !== 'pending' },
            { label: 'Driver Arrived', time: null, completed: tripStatus === 'arrived' || tripStatus === 'in_transit' || tripStatus === 'completed' },
            { label: 'Trip Started', time: trip.pickupTime, completed: tripStatus === 'in_transit' || tripStatus === 'completed' },
            { label: 'Trip Completed', time: trip.dropoffTime, completed: tripStatus === 'completed' },
          ].map((step, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-sm text-gray-500">
                    {new Date(step.time).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Shareable tracking page component
export const PublicTripTracking: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  const loadTripData = async () => {
    try {
      setIsLoading(true);
      // Load trip and driver data
      // const { data: tripData } = await supabase
      //   .from('trips')
      //   .select('*')
      //   .eq('id', tripId)
      //   .single();

      // Mock data for demo
      setTrip({
        id: tripId,
        tripNumber: 'FW1234',
        customerName: 'John Doe',
        customerPhone: '+1-555-0101',
        pickupLocation: '123 Main St, Fort Worth, TX',
        dropoffLocation: '456 Hospital Rd, Fort Worth, TX',
        scheduledTime: new Date().toISOString(),
        status: 'in_progress',
        tripType: 'clinic',
        serviceLevel: 'wheelchair',
        journeyType: 'one-way',
        fare: 25.50,
        distance: 5.2,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      } as Trip);

      setDriver({
        id: '1',
        name: 'Mike Johnson',
        phone: '+1-555-0102',
        email: 'mike@example.com',
        licenseNumber: 'DL123456',
        status: 'on_trip',
        rating: 4.8,
        totalTrips: 156,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Driver);
    } catch (err) {
      setError('Unable to load trip information');
      console.error('Error loading trip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip information...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Not Found</h2>
          <p className="text-gray-600">
            {error || 'The trip you are looking for could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <LiveTripTracking trip={trip} driver={driver || undefined} shareableLink={true} />
    </div>
  );
};
