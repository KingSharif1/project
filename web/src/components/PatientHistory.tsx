import React, { useMemo } from 'react';
import { User, MapPin, Calendar, Clock, Star, TrendingUp, FileText } from 'lucide-react';
import { Trip } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

interface PatientHistoryProps {
  patientName: string;
  patientPhone?: string;
  trips: Trip[];
  isOpen: boolean;
  onClose: () => void;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  patientName,
  patientPhone,
  trips,
  isOpen,
  onClose,
}) => {
  const patientTrips = useMemo(() => {
    return trips
      .filter(t =>
        t.customerName.toLowerCase().includes(patientName.toLowerCase()) ||
        (patientPhone && t.customerPhone === patientPhone)
      )
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }, [trips, patientName, patientPhone]);

  const stats = useMemo(() => {
    const totalTrips = patientTrips.length;
    const completedTrips = patientTrips.filter(t => t.status === 'completed').length;
    const cancelledTrips = patientTrips.filter(t => t.status === 'cancelled').length;
    const noShowTrips = patientTrips.filter(t => t.status === 'no-show').length;
    const totalSpent = patientTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
    const avgFare = totalTrips > 0 ? totalSpent / totalTrips : 0;

    // Most common locations
    const pickupLocations = patientTrips.reduce((acc, t) => {
      acc[t.pickupLocation] = (acc[t.pickupLocation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dropoffLocations = patientTrips.reduce((acc, t) => {
      acc[t.dropoffLocation] = (acc[t.dropoffLocation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonPickup = Object.entries(pickupLocations).sort(([, a], [, b]) => b - a)[0];
    const mostCommonDropoff = Object.entries(dropoffLocations).sort(([, a], [, b]) => b - a)[0];

    // Reliability score
    const reliabilityScore = totalTrips > 0
      ? ((completedTrips / totalTrips) * 100).toFixed(0)
      : 'N/A';

    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      noShowTrips,
      totalSpent,
      avgFare,
      mostCommonPickup: mostCommonPickup?.[0] || 'N/A',
      mostCommonDropoff: mostCommonDropoff?.[0] || 'N/A',
      reliabilityScore,
    };
  }, [patientTrips]);

  // Collect all notes
  const allNotes = useMemo(() => {
    return patientTrips
      .filter(t => t.notes && t.notes.trim().length > 0)
      .map(t => ({ date: t.scheduledTime, note: t.notes!, tripNumber: t.tripNumber }));
  }, [patientTrips]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Patient History: ${patientName}`} size="xl">
      <div className="space-y-6">
        {/* Patient Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{patientName}</h3>
                {patientPhone && (
                  <p className="text-sm text-gray-600">{patientPhone}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    {stats.reliabilityScore}% Reliability Score
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
            <p className="text-sm text-gray-600">Total Trips</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedTrips}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(0)}</p>
            <p className="text-sm text-gray-600">Total Spent</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.avgFare.toFixed(0)}</p>
            <p className="text-sm text-gray-600">Avg Fare</p>
          </div>
        </div>

        {/* Common Locations */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Common Locations
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Most Common Pickup:</span>
              <p className="font-medium text-gray-900 mt-1">{stats.mostCommonPickup}</p>
            </div>
            <div>
              <span className="text-gray-600">Most Common Drop-off:</span>
              <p className="font-medium text-gray-900 mt-1">{stats.mostCommonDropoff}</p>
            </div>
          </div>
        </div>

        {/* Notes & Preferences */}
        {allNotes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Notes & Preferences
            </h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {allNotes.slice(0, 10).map((item, idx) => (
                <div key={idx} className="border-l-4 border-purple-200 pl-3 py-2 bg-purple-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-purple-800">{item.tripNumber}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trip History */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Recent Trip History</h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {patientTrips.slice(0, 15).map(trip => (
              <div
                key={trip.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">{trip.tripNumber}</span>
                    <StatusBadge status={trip.status} size="sm" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(trip.scheduledTime).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-600">From: {trip.pickupLocation}</p>
                      <p className="text-gray-600">To: {trip.dropoffLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-gray-600">{trip.serviceLevel}</span>
                    <span className="font-semibold text-gray-900">${trip.fare.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            {patientTrips.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No trip history found</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
