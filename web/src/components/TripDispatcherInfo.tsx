import React from 'react';
import { UserCheck, Clock, User, Edit3 } from 'lucide-react';
import { Trip } from '../types';

interface TripDispatcherInfoProps {
  trip: Trip;
  compact?: boolean;
}

export const TripDispatcherInfo: React.FC<TripDispatcherInfoProps> = ({ trip, compact = false }) => {
  if (!trip.dispatcherName && !trip.lastModifiedByName) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        {trip.dispatcherName && (
          <>
            <UserCheck className="w-3 h-3" />
            <span>
              <strong>Assigned by:</strong> {trip.dispatcherName}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
        <UserCheck className="w-5 h-5 text-blue-600" />
        <span>Dispatcher Information</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {trip.dispatcherName && (
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Created/Assigned By</p>
              <p className="text-sm font-semibold text-gray-900">{trip.dispatcherName}</p>
              {trip.dispatcherAssignedAt && (
                <p className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(trip.dispatcherAssignedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {trip.lastModifiedByName && trip.lastModifiedByName !== trip.dispatcherName && (
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Edit3 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Last Modified By</p>
              <p className="text-sm font-semibold text-gray-900">{trip.lastModifiedByName}</p>
              {trip.updatedAt && (
                <p className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(trip.updatedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-blue-200">
        <p className="text-xs text-gray-600 flex items-start space-x-2">
          <UserCheck className="w-4 h-4 mt-0.5 text-blue-600" />
          <span>
            All dispatcher actions are automatically tracked for auditing and compliance purposes.
            View complete history below for detailed assignment timeline.
          </span>
        </p>
      </div>
    </div>
  );
};
