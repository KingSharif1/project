import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, MapPin, Clock, Navigation, Gauge, Calendar, X } from 'lucide-react';
import * as api from '../services/api';
import { loadGoogleMaps } from '../utils/googleMapsLoader';
import { Trip } from '../types';

interface LocationPoint {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  recorded_at: string;
  driver_name: string;
}

interface TripRouteData {
  trip_id: string;
  trip_number: string;
  driver_name: string;
  start_time: string;
  end_time: string;
  total_distance_miles: number;
  total_duration_minutes: number;
  average_speed: number;
  max_speed: number;
  pickup_address: string;
  dropoff_address: string;
  location_points_count: number;
}

interface TripHistoryViewerProps {
  trip: Trip;
  onClose: () => void;
}

export const TripHistoryViewer: React.FC<TripHistoryViewerProps> = ({ trip, onClose }) => {
  const [routeData, setRouteData] = useState<TripRouteData | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const pathLineRef = useRef<google.maps.Polyline | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTripHistory();
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [trip.id]);

  useEffect(() => {
    if (locationPoints.length > 0 && mapRef.current) {
      initializeMap();
    }
  }, [locationPoints]);

  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= locationPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, locationPoints.length]);

  useEffect(() => {
    if (locationPoints[currentIndex]) {
      updateMarkerPosition(locationPoints[currentIndex]);
    }
  }, [currentIndex]);

  const loadTripHistory = async () => {
    try {
      setLoading(true);

      // Get route summary and location history via backend API
      const result = await api.getTripRoute(trip.id);

      if (result.data?.route) {
        setRouteData(result.data.route);
      }

      if (result.data?.locations && result.data.locations.length > 0) {
        setLocationPoints(result.data.locations);
      } else {
        console.log('No location history found for this trip');
      }

    } catch (error) {
      console.error('Error loading trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!mapRef.current || locationPoints.length === 0) return;

    try {
      await loadGoogleMaps();

      const firstPoint = locationPoints[0];
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: Number(firstPoint.latitude), lng: Number(firstPoint.longitude) },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      // Draw route path
      const path = locationPoints.map(point => ({
        lat: Number(point.latitude),
        lng: Number(point.longitude),
      }));

      pathLineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.6,
        strokeWeight: 4,
        map,
      });

      // Add start marker
      new google.maps.Marker({
        position: { lat: Number(firstPoint.latitude), lng: Number(firstPoint.longitude) },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: 'Start',
      });

      // Add end marker
      const lastPoint = locationPoints[locationPoints.length - 1];
      new google.maps.Marker({
        position: { lat: Number(lastPoint.latitude), lng: Number(lastPoint.longitude) },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: 'End',
      });

      // Add current position marker
      markerRef.current = new google.maps.Marker({
        position: { lat: Number(firstPoint.latitude), lng: Number(firstPoint.longitude) },
        map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: Number(firstPoint.heading) || 0,
        },
        title: 'Current Position',
        zIndex: 1000,
      });

      // Fit bounds to show entire route
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMarkerPosition = (point: LocationPoint) => {
    if (markerRef.current && mapInstanceRef.current) {
      const position = { lat: Number(point.latitude), lng: Number(point.longitude) };
      markerRef.current.setPosition(position);
      markerRef.current.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        rotation: Number(point.heading) || 0,
      });
      mapInstanceRef.current.panTo(position);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip history...</p>
        </div>
      </div>
    );
  }

  if (locationPoints.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <MapPin className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Location History</h3>
          <p className="text-gray-600 mb-6">
            This trip doesn't have any recorded location history yet.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentPoint = locationPoints[currentIndex];
  const progress = (currentIndex / (locationPoints.length - 1)) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trip History Playback</h2>
            <p className="text-gray-600">Trip #{trip.tripNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats */}
        {routeData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-600">Distance</p>
              <p className="text-lg font-semibold text-gray-900">
                {routeData.total_distance_miles?.toFixed(1) || '0'} mi
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-lg font-semibold text-gray-900">
                {routeData.total_duration_minutes || '0'} min
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Speed</p>
              <p className="text-lg font-semibold text-gray-900">
                {routeData.average_speed?.toFixed(0) || '0'} mph
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Max Speed</p>
              <p className="text-lg font-semibold text-gray-900">
                {routeData.max_speed?.toFixed(0) || '0'} mph
              </p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full min-h-[400px]"></div>

          {/* Current Info Overlay */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-600" />
              <span className="text-sm font-medium">
                {currentPoint && formatTime(currentPoint.recorded_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-gray-600" />
              <span className="text-sm font-medium">
                {currentPoint?.speed?.toFixed(0) || '0'} mph
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-gray-600" />
              <span className="text-sm font-medium">
                {currentPoint?.heading?.toFixed(0) || '0'}°
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-xs font-medium">Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-xs font-medium">End</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 transform rotate-45"></div>
              <span className="text-xs font-medium">Current</span>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="p-6 border-t space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Point {currentIndex + 1} of {locationPoints.length}
              </span>
              <span>{progress.toFixed(0)}% Complete</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max={locationPoints.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RotateCcw size={20} />
              Reset
            </button>
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Speed:</label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
