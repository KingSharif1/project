import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  AlertTriangle,
  ThermometerSun,
  Wind,
  Droplets,
  Eye
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'drizzle';
  windSpeed: number;
  humidity: number;
  visibility: number;
  alerts: WeatherAlert[];
}

interface WeatherAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  type: string;
  message: string;
  startTime: string;
  endTime: string;
}

interface WeatherAlertsProps {
  location?: string;
}

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ location = 'New York, NY' }) => {
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 72,
    condition: 'cloudy',
    windSpeed: 12,
    humidity: 65,
    visibility: 10,
    alerts: [
      {
        id: '1',
        severity: 'medium',
        type: 'Heavy Rain Warning',
        message: 'Heavy rain expected between 2 PM and 6 PM. Roads may be slippery. Allow extra travel time.',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 18000000).toISOString(),
      },
    ],
  });

  const [showDetails, setShowDetails] = useState(false);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'clear':
        return ThermometerSun;
      case 'cloudy':
        return Cloud;
      case 'rain':
        return CloudRain;
      case 'snow':
        return CloudSnow;
      case 'storm':
        return CloudLightning;
      case 'drizzle':
        return CloudDrizzle;
      default:
        return Cloud;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'extreme':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getImpactMessage = (condition: string, windSpeed: number, visibility: number) => {
    const impacts: string[] = [];

    if (condition === 'rain' || condition === 'storm') {
      impacts.push('Roads may be slippery');
    }
    if (condition === 'snow') {
      impacts.push('Snow accumulation expected');
      impacts.push('Reduced traction');
    }
    if (windSpeed > 20) {
      impacts.push('High winds may affect driving');
    }
    if (visibility < 5) {
      impacts.push('Poor visibility');
    }

    return impacts.length > 0 ? impacts.join(' • ') : 'Good driving conditions';
  };

  const WeatherIcon = getWeatherIcon(weather.condition);
  const hasAlerts = weather.alerts.length > 0;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl p-4 cursor-pointer transition-all ${
          hasAlerts
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300'
            : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${hasAlerts ? 'bg-yellow-200' : 'bg-blue-200'}`}>
              <WeatherIcon className={`w-6 h-6 ${hasAlerts ? 'text-yellow-700' : 'text-blue-700'}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-gray-900 text-lg">{weather.temperature}°F</h3>
                <span className="text-sm text-gray-600 capitalize">{weather.condition}</span>
              </div>
              <p className="text-sm text-gray-600">{location}</p>
            </div>
          </div>

          {hasAlerts && (
            <div className="flex items-center space-x-2 bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">{weather.alerts.length} Alert{weather.alerts.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {hasAlerts && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <p className="text-sm text-gray-700">
              {getImpactMessage(weather.condition, weather.windSpeed, weather.visibility)}
            </p>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Detailed Weather Information</h4>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <ThermometerSun className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Temperature</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{weather.temperature}°F</p>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Wind className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Wind Speed</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{weather.windSpeed} mph</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Droplets className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Humidity</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{weather.humidity}%</p>
              </div>

              <div className="bg-cyan-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-5 h-5 text-cyan-600" />
                  <span className="text-sm font-medium text-gray-700">Visibility</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{weather.visibility} mi</p>
              </div>
            </div>

            {hasAlerts && (
              <div className="space-y-3">
                <h5 className="font-semibold text-gray-900">Active Weather Alerts</h5>
                {weather.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <h6 className="font-bold">{alert.type}</h6>
                      </div>
                      <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-white bg-opacity-50">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm mb-3">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span>
                        <strong>Start:</strong> {new Date(alert.startTime).toLocaleString()}
                      </span>
                      <span>
                        <strong>End:</strong> {new Date(alert.endTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h6 className="font-semibold text-blue-900 mb-2">Driving Recommendations</h6>
              <ul className="space-y-1 text-sm text-blue-800">
                {weather.condition === 'rain' && (
                  <>
                    <li>• Reduce speed and increase following distance</li>
                    <li>• Turn on headlights for better visibility</li>
                    <li>• Watch for standing water and hydroplaning</li>
                  </>
                )}
                {weather.condition === 'snow' && (
                  <>
                    <li>• Drive slowly and accelerate/brake gradually</li>
                    <li>• Increase following distance significantly</li>
                    <li>• Clear all snow and ice from vehicle before driving</li>
                  </>
                )}
                {weather.windSpeed > 20 && (
                  <li>• Be prepared for sudden gusts, especially on bridges</li>
                )}
                {weather.visibility < 5 && (
                  <li>• Use low beam headlights and reduce speed</li>
                )}
                {weather.condition === 'clear' && weather.windSpeed < 15 && (
                  <li>• Good conditions for normal driving</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
