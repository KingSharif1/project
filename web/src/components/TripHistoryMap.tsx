import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

interface StatusChange {
  status: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

interface TripHistoryMapProps {
  locationHistory: LocationPoint[];
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupCoords?: { latitude: number; longitude: number };
  dropoffCoords?: { latitude: number; longitude: number };
  statusHistory?: StatusChange[];
}

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const TripHistoryMap: React.FC<TripHistoryMapProps> = ({ 
  locationHistory, 
  pickupAddress, 
  dropoffAddress,
  pickupCoords,
  dropoffCoords,
  statusHistory = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('standard');

  useEffect(() => {
    if (!mapRef.current || locationHistory.length === 0) {
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create map centered on first point
    const firstPoint = locationHistory[0];
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([firstPoint.latitude, firstPoint.longitude], 13);

    // Add tile layer based on selected style
    const tileLayers = {
      standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 19,
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      }),
    };

    tileLayers[mapStyle].addTo(map);

    // Create polyline from all points
    const coordinates: [number, number][] = locationHistory.map(point => [
      point.latitude,
      point.longitude,
    ]);

    // Create animated gradient polyline
    const polyline = L.polyline(coordinates, {
      color: '#3B82F6',
      weight: 5,
      opacity: 0.9,
      smoothFactor: 1.5,
      className: 'route-polyline',
    }).addTo(map);

    // Add shadow/outline effect
    L.polyline(coordinates, {
      color: '#1E40AF',
      weight: 7,
      opacity: 0.4,
      smoothFactor: 1.5,
    }).addTo(map);

    // Add start marker (green with gradient and pulse animation)
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5), 0 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse 2s infinite;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 16px;
            font-weight: bold;
          ">▶</div>
        </div>
        <style>
          @keyframes pulse {
            0% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5), 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5), 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5), 0 0 0 0 rgba(16, 185, 129, 0); }
          }
        </style>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([coordinates[0][0], coordinates[0][1]], { icon: startIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <div style="font-weight: 700; font-size: 14px; color: #10B981; margin-bottom: 4px;">🚀 Trip Start</div>
          <div style="font-size: 12px; color: #6B7280;">${new Date(locationHistory[0].timestamp).toLocaleString()}</div>
        </div>
      `, { className: 'custom-popup' });

    // Add end marker (red with gradient)
    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 16px;
            font-weight: bold;
          ">🏁</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const lastIdx = coordinates.length - 1;
    L.marker([coordinates[lastIdx][0], coordinates[lastIdx][1]], { icon: endIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <div style="font-weight: 700; font-size: 14px; color: #EF4444; margin-bottom: 4px;">🏁 Trip End</div>
          <div style="font-size: 12px; color: #6B7280;">${new Date(locationHistory[lastIdx].timestamp).toLocaleString()}</div>
        </div>
      `, { className: 'custom-popup' });

    // Add pickup address marker (if provided)
    if (pickupCoords && pickupAddress) {
      const pickupIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
            transform: rotate(-45deg);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              color: white;
              font-size: 18px;
              font-weight: bold;
            ">📍</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([pickupCoords.latitude, pickupCoords.longitude], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px; min-width: 200px;">
            <div style="font-weight: 700; font-size: 14px; color: #8B5CF6; margin-bottom: 8px;">
              📍 Pickup Location
            </div>
            <div style="font-size: 12px; color: #374151; line-height: 1.6;">
              ${pickupAddress}
            </div>
          </div>
        `, { className: 'custom-popup' });
    }

    // Add dropoff address marker (if provided)
    if (dropoffCoords && dropoffAddress) {
      const dropoffIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
            transform: rotate(-45deg);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              color: white;
              font-size: 18px;
              font-weight: bold;
            ">🎯</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([dropoffCoords.latitude, dropoffCoords.longitude], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px; min-width: 200px;">
            <div style="font-weight: 700; font-size: 14px; color: #F59E0B; margin-bottom: 8px;">
              🎯 Dropoff Location
            </div>
            <div style="font-size: 12px; color: #374151; line-height: 1.6;">
              ${dropoffAddress}
            </div>
          </div>
        `, { className: 'custom-popup' });
    }

    // Add status change markers (if provided)
    if (statusHistory && statusHistory.length > 0) {
      const statusConfig: Record<string, { emoji: string; color: string; label: string }> = {
        'en_route_pickup': { emoji: '🚗', color: '#3B82F6', label: 'En Route to Pickup' },
        'arrived_pickup': { emoji: '🅿️', color: '#10B981', label: 'Arrived at Pickup' },
        'patient_loaded': { emoji: '👤', color: '#8B5CF6', label: 'Patient Loaded' },
        'en_route_dropoff': { emoji: '🚙', color: '#F59E0B', label: 'En Route to Dropoff' },
        'arrived_dropoff': { emoji: '🏁', color: '#EF4444', label: 'Arrived at Dropoff' },
        'completed': { emoji: '✅', color: '#059669', label: 'Trip Completed' },
      };

      statusHistory.forEach((statusChange) => {
        const config = statusConfig[statusChange.status];
        if (!config) return;

        // Find nearest GPS point to this status change timestamp
        const statusTime = new Date(statusChange.timestamp).getTime();
        let nearestPoint = locationHistory[0];
        let minDiff = Math.abs(new Date(locationHistory[0].timestamp).getTime() - statusTime);

        locationHistory.forEach((point) => {
          const diff = Math.abs(new Date(point.timestamp).getTime() - statusTime);
          if (diff < minDiff) {
            minDiff = diff;
            nearestPoint = point;
          }
        });

        // Create status marker
        const statusIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background: ${config.color};
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">${config.emoji}</div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([nearestPoint.latitude, nearestPoint.longitude], { icon: statusIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: system-ui; padding: 8px; min-width: 180px;">
              <div style="font-weight: 700; font-size: 14px; color: ${config.color}; margin-bottom: 6px;">
                ${config.emoji} ${config.label}
              </div>
              <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">
                ${new Date(statusChange.timestamp).toLocaleString()}
              </div>
              <div style="font-size: 10px; color: #9CA3AF;">
                Speed: ${nearestPoint.speed ? Math.round(nearestPoint.speed * 2.23694) : 0} mph
              </div>
            </div>
          `, { className: 'custom-popup' });
      });
    }

    // Add breadcrumb markers for each point
    locationHistory.forEach((point, index) => {
      // Skip first and last (already have start/end markers)
      if (index === 0 || index === locationHistory.length - 1) return;

      const breadcrumbIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #1E40AF;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.4);
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const timestamp = new Date(point.timestamp);
      const speed = point.speed ? `${Math.round(point.speed * 2.23694)} mph` : 'N/A';
      const heading = point.heading !== undefined ? `${Math.round(point.heading)}°` : 'N/A';
      const accuracy = point.accuracy ? `${Math.round(point.accuracy)}m` : 'N/A';

      const popupContent = `
        <div style="
          font-family: system-ui;
          min-width: 200px;
          background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);
          border-radius: 8px;
          padding: 12px;
        ">
          <div style="
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            margin: -12px -12px 12px -12px;
            font-weight: 700;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-size: 16px;">📍</span>
            <span>Point #${index + 1} of ${locationHistory.length}</span>
          </div>
          <div style="font-size: 12px; color: #374151; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
              <span style="font-size: 14px;">⏰</span>
              <span><strong>Time:</strong> ${timestamp.toLocaleTimeString()}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
              <span style="font-size: 14px;">🚗</span>
              <span><strong>Speed:</strong> <span style="color: #3B82F6; font-weight: 600;">${speed}</span></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
              <span style="font-size: 14px;">🧭</span>
              <span><strong>Heading:</strong> ${heading}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
              <span style="font-size: 14px;">📍</span>
              <span><strong>Accuracy:</strong> ${accuracy}</span>
            </div>
            <div style="
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #E5E7EB;
              font-size: 11px;
              color: #6B7280;
              text-align: center;
            ">
              ${timestamp.toLocaleDateString()}
            </div>
          </div>
        </div>
      `;

      L.marker([point.latitude, point.longitude], { icon: breadcrumbIcon })
        .addTo(map)
        .bindPopup(popupContent, {
          className: 'custom-popup',
          maxWidth: 250,
          closeButton: true,
        });
    });

    // Fit map to show entire route
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locationHistory, mapStyle]);

  if (locationHistory.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Map Style Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMapStyle('standard');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
            mapStyle === 'standard'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Standard Map"
        >
          🗺️ Standard
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMapStyle('dark');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
            mapStyle === 'dark'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Dark Mode Map"
        >
          🌙 Dark
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMapStyle('satellite');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all ${
            mapStyle === 'satellite'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Satellite View"
        >
          🛰️ Satellite
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="h-96 w-full rounded-lg border border-gray-300 shadow-lg"
        style={{ minHeight: '384px' }}
      />

      {/* Trip Stats Badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-blue-600 font-bold">📍</span>
            <span className="font-semibold text-gray-700">{locationHistory.length}</span>
            <span className="text-gray-500">points</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-1">
            <span className="text-green-600 font-bold">⏱️</span>
            <span className="font-semibold text-gray-700">
              {Math.round(
                (new Date(locationHistory[locationHistory.length - 1].timestamp).getTime() -
                  new Date(locationHistory[0].timestamp).getTime()) /
                  60000
              )}
            </span>
            <span className="text-gray-500">min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
