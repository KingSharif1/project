import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Zap, CheckCircle2, XCircle, TrendingUp, Users, MapPin, Clock, Star, AlertCircle } from 'lucide-react';
import { generateAutoAssignments, AssignmentSuggestion, AutoAssignResult } from '../utils/autoAssign';
import { useApp } from '../context/AppContext';

interface AutoAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoAssignModal: React.FC<AutoAssignModalProps> = ({ isOpen, onClose }) => {
  const { trips, drivers, assignDriver } = useApp();
  const [result, setResult] = useState<AutoAssignResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentComplete, setAssignmentComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const autoAssignResult = generateAutoAssignments(trips, drivers);
      setResult(autoAssignResult);
      setSelectedSuggestions(new Set(autoAssignResult.suggestions.map(s => s.tripId)));
      setAssignmentComplete(false);
    }
  }, [isOpen, trips, drivers]);

  const toggleSuggestion = (tripId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const handleAssignAll = async () => {
    if (!result) return;

    setIsAssigning(true);
    const selectedAssignments = result.suggestions.filter(s => selectedSuggestions.has(s.tripId));

    for (const suggestion of selectedAssignments) {
      try {
        await assignDriver(suggestion.tripId, suggestion.driverId);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to assign trip ${suggestion.tripNumber}:`, error);
      }
    }

    setIsAssigning(false);
    setAssignmentComplete(true);

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 140) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 120) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 100) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 140) return 'Excellent Match';
    if (score >= 120) return 'Great Match';
    if (score >= 100) return 'Good Match';
    return 'Fair Match';
  };

  if (!result) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto-Assign Trips" size="xl">
      <div className="space-y-6">
        {assignmentComplete ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Assignments Complete!</h3>
            <p className="text-gray-600">
              Successfully assigned {selectedSuggestions.size} trip{selectedSuggestions.size !== 1 ? 's' : ''} to drivers
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{result.stats.totalUnassigned}</span>
                </div>
                <p className="text-sm text-blue-900 font-medium">Unassigned Trips</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">{result.stats.totalAvailable}</span>
                </div>
                <p className="text-sm text-green-900 font-medium">Available Drivers</p>
              </div>

              <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-5 h-5 text-violet-600" />
                  <span className="text-2xl font-bold text-violet-600">{result.stats.suggestionsGenerated}</span>
                </div>
                <p className="text-sm text-violet-900 font-medium">Suggestions</p>
              </div>

              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-600">{result.stats.unmatchedTrips}</span>
                </div>
                <p className="text-sm text-orange-900 font-medium">Unmatched</p>
              </div>
            </div>

            {result.suggestions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Assignments Available</h3>
                <p className="text-gray-600">
                  There are no unassigned trips for today or no available drivers.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Suggested Assignments</h3>
                    <p className="text-sm text-gray-600">
                      AI-powered matching based on location, vehicle type, and driver performance
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedSuggestions.size === result.suggestions.length) {
                        setSelectedSuggestions(new Set());
                      } else {
                        setSelectedSuggestions(new Set(result.suggestions.map(s => s.tripId)));
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedSuggestions.size === result.suggestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {result.suggestions.map((suggestion) => {
                    const isSelected = selectedSuggestions.has(suggestion.tripId);

                    return (
                      <div
                        key={suggestion.tripId}
                        className={`border rounded-xl p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                        onClick={() => toggleSuggestion(suggestion.tripId)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSuggestion(suggestion.tripId)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-bold text-gray-900">#{suggestion.tripNumber}</span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-semibold text-gray-700">{suggestion.customerName}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{suggestion.pickupLocation}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {new Date(suggestion.scheduledTime).toLocaleString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${getScoreColor(suggestion.score)}`}>
                                <div className="flex items-center space-x-1">
                                  <TrendingUp className="w-4 h-4" />
                                  <span>{suggestion.score}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg p-3 mb-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <Users className="w-4 h-4" />
                                <span className="font-semibold">{suggestion.driverName}</span>
                              </div>
                              <div className="text-xs text-blue-100">
                                {getScoreLabel(suggestion.score)} - Optimized Assignment
                              </div>
                            </div>

                            <div className="space-y-1">
                              {suggestion.reasons.map((reason, idx) => (
                                <div key={idx} className="flex items-start space-x-2 text-xs text-gray-600">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{selectedSuggestions.size}</span> of{' '}
                    <span className="font-semibold text-gray-900">{result.suggestions.length}</span> selected
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      disabled={isAssigning}
                      className="px-6 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignAll}
                      disabled={selectedSuggestions.size === 0 || isAssigning}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                      {isAssigning ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>Assign Selected ({selectedSuggestions.size})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
