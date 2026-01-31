import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Play, Pause, RotateCcw, FastForward, MapPin, Navigation, CheckCircle2, Clock, User, Car } from 'lucide-react';
import { Trip } from '../types';

interface TripPlaybackViewerProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

interface PlaybackPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  event: string;
  description: string;
}

export const TripPlaybackViewer: React.FC<TripPlaybackViewerProps> = ({ isOpen, onClose, trip }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackPoints, setPlaybackPoints] = useState<PlaybackPoint[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (trip && isOpen) {
      generatePlaybackPoints(trip);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [trip, isOpen]);

  useEffect(() => {
    if (isPlaying && currentIndex < playbackPoints.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= playbackPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, playbackPoints.length, playbackSpeed]);

  const generatePlaybackPoints = (trip: Trip) => {
    const points: PlaybackPoint[] = [];
    const startTime = trip.actualPickupTime ? new Date(trip.actualPickupTime) : new Date();
    const endTime = trip.actualDropoffTime ? new Date(trip.actualDropoffTime) : new Date(startTime.getTime() + 30 * 60000);

    const pickupHash = (trip.pickupAddress || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dropoffHash = (trip.dropoffAddress || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const pickupLat = 29.7 + (pickupHash % 50) / 100;
    const pickupLng = -95.4 + (pickupHash % 50) / 100;
    const dropoffLat = 29.7 + (dropoffHash % 50) / 100;
    const dropoffLng = -95.4 + (dropoffHash % 50) / 100;

    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = pickupLat + (dropoffLat - pickupLat) * progress;
      const lng = pickupLng + (dropoffLng - pickupLng) * progress;
      const timestamp = new Date(startTime.getTime() + (endTime.getTime() - startTime.getTime()) * progress);

      let event = 'En Route';
      let description = 'Traveling to destination';

      if (i === 0) {
        event = 'Trip Started';
        description = `Driver arrived at pickup location`;
      } else if (i === Math.floor(steps * 0.15)) {
        event = 'Patient Loaded';
        description = 'Patient secured in vehicle';
      } else if (i === Math.floor(steps * 0.5)) {
        event = 'Halfway Point';
        description = 'Trip is 50% complete';
      } else if (i === Math.floor(steps * 0.85)) {
        event = 'Approaching Destination';
        description = 'Nearing dropoff location';
      } else if (i === steps) {
        event = 'Trip Completed';
        description = 'Patient safely delivered';
      }

      points.push({ lat, lng, timestamp, event, description });
    }

    setPlaybackPoints(points);
  };

  const handlePlayPause = () => {
    if (currentIndex >= playbackPoints.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 2, 4];
    const currentSpeedIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentSpeedIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  if (!trip) {
    return null;
  }

  const currentPoint = playbackPoints[currentIndex];
  const progress = playbackPoints.length > 0 ? (currentIndex / (playbackPoints.length - 1)) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Trip Playback - ${trip.tripNumber}`} size="xl">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold">Patient</p>
                <p className="text-sm font-bold text-gray-900">{trip.customerName}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-semibold">Service Level</p>
                <p className="text-sm font-bold text-gray-900 capitalize">{trip.serviceLevel}</p>
              </div>
            </div>
          </div>

          <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-violet-600 font-semibold">Distance</p>
                <p className="text-sm font-bold text-gray-900">{trip.distance?.toFixed(1)} mi</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl" style={{ height: '400px' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

          <svg className="w-full h-full relative z-10">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {playbackPoints.length > 1 && (
              <>
                <polyline
                  points={playbackPoints.map((p, i) => {
                    const x = ((p.lng + 95.4) / 0.5) * 100;
                    const y = ((29.75 - p.lat) / 0.5) * 100;
                    return `${x}%,${y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity="0.2"
                  strokeDasharray="5,5"
                />

                {currentIndex > 0 && (
                  <polyline
                    points={playbackPoints.slice(0, currentIndex + 1).map((p, i) => {
                      const x = ((p.lng + 95.4) / 0.5) * 100;
                      const y = ((29.75 - p.lat) / 0.5) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </>
            )}

            {playbackPoints.length > 0 && (
              <>
                <circle
                  cx={`${((playbackPoints[0].lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - playbackPoints[0].lat) / 0.5) * 100}%`}
                  r="8"
                  fill="#10b981"
                  className="drop-shadow-lg"
                />
                <circle
                  cx={`${((playbackPoints[0].lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - playbackPoints[0].lat) / 0.5) * 100}%`}
                  r="12"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  opacity="0.5"
                />

                <circle
                  cx={`${((playbackPoints[playbackPoints.length - 1].lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - playbackPoints[playbackPoints.length - 1].lat) / 0.5) * 100}%`}
                  r="8"
                  fill="#ef4444"
                  className="drop-shadow-lg"
                />
                <circle
                  cx={`${((playbackPoints[playbackPoints.length - 1].lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - playbackPoints[playbackPoints.length - 1].lat) / 0.5) * 100}%`}
                  r="12"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  opacity="0.5"
                />
              </>
            )}

            {currentPoint && (
              <>
                <circle
                  cx={`${((currentPoint.lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - currentPoint.lat) / 0.5) * 100}%`}
                  r="10"
                  fill="#3b82f6"
                  className="drop-shadow-2xl animate-pulse"
                />
                <circle
                  cx={`${((currentPoint.lng + 95.4) / 0.5) * 100}%`}
                  cy={`${((29.75 - currentPoint.lat) / 0.5) * 100}%`}
                  r="20"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  opacity="0.3"
                  className="animate-ping"
                />
              </>
            )}
          </svg>

          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-lg rounded-xl p-3 text-white border border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold">Pickup</span>
            </div>
            <p className="text-xs text-gray-300">{trip.pickupAddress}</p>
          </div>

          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-lg rounded-xl p-3 text-white border border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold">Dropoff</span>
            </div>
            <p className="text-xs text-gray-300">{trip.dropoffAddress}</p>
          </div>

          {currentPoint && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-lg rounded-xl p-4 text-white border border-white/20 min-w-80">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  {currentIndex === playbackPoints.length - 1 ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Navigation className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm mb-1">{currentPoint.event}</p>
                  <p className="text-xs text-gray-300 mb-2">{currentPoint.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{currentPoint.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
              <span>{currentIndex} / {playbackPoints.length - 1}</span>
              <span>{progress.toFixed(0)}% Complete</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleReset}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={handlePlayPause}
              className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl shadow-lg transition-all transform hover:scale-105"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            <button
              onClick={handleSpeedChange}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center space-x-2"
              title="Change Speed"
            >
              <FastForward className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-semibold text-gray-700">{playbackSpeed}x</span>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Trip Completed Successfully</p>
              <p className="text-xs text-gray-600">
                Duration: {trip.actualPickupTime && trip.actualDropoffTime ?
                  Math.round((new Date(trip.actualDropoffTime).getTime() - new Date(trip.actualPickupTime).getTime()) / 60000) : 'N/A'} minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
