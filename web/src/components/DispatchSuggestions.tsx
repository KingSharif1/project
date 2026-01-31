import React from 'react';
import { Zap, Star, CheckCircle, AlertTriangle, TrendingUp, MapPin, Car, Clock, Award } from 'lucide-react';
import { Trip, Driver } from '../types';
import { getTopDriverRecommendations, getNoDriversExplanation } from '../utils/smartDriverSelection';

interface DispatchSuggestionsProps {
  trip: Trip;
  drivers: Driver[];
  allTrips: Trip[];
  onSelectDriver: (driverId: string) => void;
}

export const DispatchSuggestions: React.FC<DispatchSuggestionsProps> = ({
  trip,
  drivers,
  allTrips,
  onSelectDriver,
}) => {
  const suggestions = getTopDriverRecommendations(trip, drivers, allTrips);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <TrendingUp className="w-5 h-5 text-blue-600" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">AI-Powered Driver Suggestions</h3>
        </div>
        <p className="text-sm text-gray-700">
          Analyzing {drivers.length} drivers based on location, availability, vehicle type, performance, and workload...
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 mb-2">No Optimal Drivers Available</p>
          <p className="text-sm text-gray-700">{getNoDriversExplanation(trip, drivers, allTrips)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            Top {suggestions.length} Recommendations
          </div>

          {suggestions.map((suggestion, index) => {
            const driver = suggestion.driver;
            const rankColors = [
              'from-yellow-400 to-yellow-500',
              'from-gray-300 to-gray-400',
              'from-amber-600 to-amber-700'
            ];

            return (
              <button
                key={driver.id}
                onClick={() => onSelectDriver(driver.id)}
                className={`w-full p-5 rounded-xl border-2 transition-all text-left hover:shadow-lg transform hover:-translate-y-0.5 ${
                  index === 0
                    ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md'
                    : index === 1
                    ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50'
                    : 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-14 h-14 bg-gradient-to-br ${rankColors[index]} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-current">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-lg">{driver.name}</span>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full shadow">
                            🏆 BEST MATCH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        {driver.vehicleType && (
                          <div className="flex items-center gap-1">
                            <Car className="w-3.5 h-3.5" />
                            <span>{driver.vehicleType}</span>
                          </div>
                        )}
                        {suggestion.distance !== undefined && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{suggestion.distance.toFixed(1)} mi</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-col items-end gap-1`}>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${getScoreColor(suggestion.score)} font-bold shadow-sm`}>
                      {getScoreIcon(suggestion.score)}
                      <span className="text-lg">{Math.round(suggestion.score)}</span>
                    </div>
                    <span className="text-xs text-gray-500">Match Score</span>
                  </div>
                </div>

                {/* Match Details */}
                <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-white bg-opacity-50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-4 h-4 ${suggestion.matchDetails.availabilityMatch ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-gray-700">Available</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className={`w-4 h-4 ${suggestion.matchDetails.vehicleMatch ? 'text-green-500' : 'text-yellow-500'}`} />
                    <span className="text-gray-700">Vehicle Match</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">Performance: {Math.round(suggestion.matchDetails.performanceScore)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">Workload: {Math.round(suggestion.matchDetails.workloadScore)}</span>
                  </div>
                </div>

                {/* Reasons */}
                <div className="space-y-1.5">
                  {suggestion.reasons.slice(0, 4).map((reason, idx) => {
                    const isWarning = reason.startsWith('⚠');
                    return (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        {isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={isWarning ? 'text-yellow-700' : 'text-gray-700'}>{reason}</span>
                      </div>
                    );
                  })}
                  {suggestion.reasons.length > 4 && (
                    <div className="text-xs text-gray-500 ml-6">
                      +{suggestion.reasons.length - 4} more factors
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 mb-2">
          <span className="font-bold">🧠 AI Scoring Algorithm:</span>
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
          <div>• Vehicle Match (25%)</div>
          <div>• Availability (25%)</div>
          <div>• Proximity (20%)</div>
          <div>• Performance History (15%)</div>
          <div>• Current Workload (15%)</div>
        </div>
      </div>
    </div>
  );
};
