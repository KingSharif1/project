import React, { useState, useEffect } from 'react';
import { History, User, Clock, UserCheck, Edit, XCircle, Plus } from 'lucide-react';
import * as api from '../services/api';
import { TripAssignmentHistory } from '../types';

interface TripAssignmentHistoryProps {
  tripId: string;
}

export const TripAssignmentHistoryComponent: React.FC<TripAssignmentHistoryProps> = ({ tripId }) => {
  const [history, setHistory] = useState<TripAssignmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadHistory();
    loadDrivers();
  }, [tripId]);

  const loadDrivers = async () => {
    try {
      const result = await api.getDrivers();
      const driverMap: Record<string, string> = {};
      (result.data || []).forEach((d: any) => {
        driverMap[d.id] = d.name;
      });
      setDrivers(driverMap);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const result = await api.getTripAssignmentHistory(tripId);
      const data = result.data || [];

      const formattedHistory: TripAssignmentHistory[] = (data || []).map(record => ({
        id: record.id,
        tripId: record.trip_id,
        driverId: record.driver_id,
        driverName: record.driver_id ? drivers[record.driver_id] : undefined,
        dispatcherId: record.dispatcher_id,
        dispatcherName: record.dispatcher_name,
        action: record.action,
        previousDriverId: record.previous_driver_id,
        previousDriverName: record.previous_driver_id ? drivers[record.previous_driver_id] : undefined,
        notes: record.notes,
        createdAt: record.created_at,
      }));

      setHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading assignment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return Plus;
      case 'assigned':
        return UserCheck;
      case 'reassigned':
        return Edit;
      case 'updated':
        return Edit;
      case 'cancelled':
        return XCircle;
      default:
        return History;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700';
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'reassigned':
        return 'bg-yellow-100 text-yellow-700';
      case 'updated':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionText = (record: TripAssignmentHistory) => {
    const driverName = record.driverId ? (drivers[record.driverId] || 'Unknown Driver') : 'No driver';
    const prevDriverName = record.previousDriverId ? (drivers[record.previousDriverId] || 'Unknown Driver') : '';

    switch (record.action) {
      case 'created':
        return `Trip created${record.driverId ? ` and assigned to ${driverName}` : ''}`;
      case 'assigned':
        return `Driver ${driverName} assigned to trip`;
      case 'reassigned':
        return `Driver reassigned from ${prevDriverName} to ${driverName}`;
      case 'updated':
        return `Trip details updated`;
      case 'cancelled':
        return `Trip cancelled`;
      default:
        return record.notes || 'Action performed';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl">
          <History className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Assignment History</h2>
          <p className="text-sm text-gray-600">Complete audit trail of all trip changes</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No history available</p>
          <p className="text-sm mt-1">Assignment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const ActionIcon = getActionIcon(record.action);
            const isLatest = index === 0;

            return (
              <div
                key={record.id}
                className={`border rounded-lg p-4 ${
                  isLatest ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${getActionColor(record.action)}`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getActionText(record)}
                        </h3>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                        )}
                      </div>
                      {isLatest && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-semibold">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>
                          <strong>Dispatcher:</strong> {record.dispatcherName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(record.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {record.action === 'reassigned' && record.previousDriverId && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-medium text-gray-700">Previous Driver:</span>
                          <span className="text-gray-900">
                            {drivers[record.previousDriverId] || 'Unknown'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-700">New Driver:</span>
                          <span className="text-gray-900">
                            {record.driverId ? (drivers[record.driverId] || 'Unknown') : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-start space-x-2 text-xs text-gray-500">
          <History className="w-4 h-4 mt-0.5" />
          <p>
            All trip assignments and modifications are automatically tracked for auditing and compliance purposes.
            Each entry shows who made the change and when it occurred.
          </p>
        </div>
      </div>
    </div>
  );
};
