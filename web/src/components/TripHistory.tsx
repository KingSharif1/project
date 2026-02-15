import React, { useState, useEffect } from 'react';
import { Clock, User, Edit, AlertCircle, Calendar, UserPlus } from 'lucide-react';
import * as api from '../services/api';
import { formatDateUS, formatDateTimeUS, formatTimeUS } from '../utils/dateFormatter';

interface TripHistoryProps {
  tripId: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  dispatcherName?: string;
}

interface ChangeHistoryEntry {
  id: string;
  change_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changed_by_name?: string;
  change_description?: string;
  created_at: string;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  tripId,
  createdAt,
  createdBy,
  updatedAt,
  dispatcherName
}) => {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('');
  const [lastModifierName, setLastModifierName] = useState<string>('');

  useEffect(() => {
    loadHistory();
    if (createdBy) {
      fetchCreatorName();
    }
    if (updatedAt && updatedAt !== createdAt) {
      fetchLastModifier();
    }

    // Use dispatcherName as the creator name if available
    if (dispatcherName && !creatorName) {
      setCreatorName(dispatcherName);
    }
  }, [tripId, createdBy, updatedAt, dispatcherName]);

  const fetchCreatorName = async () => {
    try {
      const result = await api.getTripCreator(tripId);
      if (result.data?.creatorName) {
        setCreatorName(result.data.creatorName);
      }
      if (result.data?.lastModifierName) {
        setLastModifierName(result.data.lastModifierName);
      }
    } catch (error) {
      console.error('Error fetching creator name:', error);
    }
  };

  const fetchLastModifier = async () => {
    // Already handled by fetchCreatorName via getTripCreator
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await api.getTripHistory(tripId);
      setHistory(result.data || []);
    } catch (error) {
      console.error('Error loading trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use our standard date formatter
  const formatDateTime = (dateString: string) => {
    return formatDateTimeUS(dateString);
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <AlertCircle className="w-4 h-4 text-green-600" />;
      case 'field_updated':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'status_changed':
        return <Clock className="w-4 h-4 text-purple-600" />;
      case 'driver_assigned':
      case 'driver_reassigned':
        return <User className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatChangeDescription = (entry: ChangeHistoryEntry) => {
    if (entry.change_description) {
      return entry.change_description;
    }

    if (entry.change_type === 'created') {
      return 'Trip created';
    }

    if (entry.field_name && entry.old_value && entry.new_value) {
      const fieldLabel = entry.field_name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return `${fieldLabel}: ${entry.old_value} → ${entry.new_value}`;
    }

    if (entry.field_name && entry.new_value) {
      const fieldLabel = entry.field_name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return `${fieldLabel} set to: ${entry.new_value}`;
    }

    return 'Updated';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading history...</p>
      </div>
    );
  }

  const displayHistory = isExpanded ? history : history.slice(0, 3);
  const hasMore = history.length > 3;

  return (
    <div className="space-y-4">
      {/* Trip Metadata Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 space-y-3">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Trip Information
        </h4>

        {/* Creation Info */}
        {createdAt && (
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">Created</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-700 font-medium">{formatDateUS(createdAt)}</span>
                  <Clock className="w-3.5 h-3.5 text-gray-500 ml-2" />
                  <span className="text-gray-700 font-medium">{formatTimeUS(createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-600">
                    By: <span className="font-medium text-gray-900">{creatorName || dispatcherName || 'System'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Modified Info */}
        {updatedAt && updatedAt !== createdAt && (
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
            <Edit className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">Last Modified</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-700 font-medium">{formatDateUS(updatedAt)}</span>
                  <Clock className="w-3.5 h-3.5 text-gray-500 ml-2" />
                  <span className="text-gray-700 font-medium">{formatTimeUS(updatedAt)}</span>
                </div>
                {lastModifierName && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">
                      By: <span className="font-medium text-gray-900">{lastModifierName}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change History Title */}
      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 pt-2">
        <Clock className="w-4 h-4 text-gray-600" />
        Change History
      </h4>

      {/* Change History */}
      {history.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No changes recorded yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="mt-0.5">{getChangeIcon(entry.change_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900 font-medium">
                      {formatChangeDescription(entry)}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.changed_by_name && (
                    <p className="text-xs text-gray-600 mt-1">
                      By: <span className="font-medium">{entry.changed_by_name}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              {isExpanded ? 'Show Less' : `Show ${history.length - 3} More Changes`}
            </button>
          )}
        </>
      )}
    </div>
  );
};
