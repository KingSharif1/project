import React, { useState, useEffect } from 'react';
import { Clock, User, Edit, AlertCircle, Calendar, UserPlus, ArrowRight, CheckCircle, XCircle, EyeOff, Truck, MapPin, UserCheck, Navigation, FileText, Map as MapIcon, Download } from 'lucide-react';
import * as api from '../services/api';
import { formatDateUS, formatDateTimeUS, formatTimeUS } from '../utils/dateFormatter';
import { generateTripReportPDF } from '../utils/tripReportPDF';
import { TripHistoryMap } from './TripHistoryMap';
import html2canvas from 'html2canvas';

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

interface StatusHistoryEntry {
  id: string;
  tripId: string;
  oldStatus: string;
  newStatus: string;
  changedById?: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

interface TripSignature {
  id: string;
  signature_type: string;
  signature_data: string;
  signer_name?: string;
  signed_at: string;
}

interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: <Calendar className="w-3.5 h-3.5" /> },
  assigned: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <UserCheck className="w-3.5 h-3.5" /> },
  en_route_pickup: { label: 'En Route to Pickup', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: <Navigation className="w-3.5 h-3.5" /> },
  arrived_pickup: { label: 'Arrived at Pickup', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <MapPin className="w-3.5 h-3.5" /> },
  patient_loaded: { label: 'Patient Loaded', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <UserCheck className="w-3.5 h-3.5" /> },
  en_route_dropoff: { label: 'En Route to Drop-off', color: 'text-teal-600', bgColor: 'bg-teal-100', icon: <Truck className="w-3.5 h-3.5" /> },
  arrived_dropoff: { label: 'Arrived at Drop-off', color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: <MapPin className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="w-3.5 h-3.5" /> },
  no_show: { label: 'No Show', color: 'text-gray-600', bgColor: 'bg-gray-200', icon: <EyeOff className="w-3.5 h-3.5" /> },
};

export const TripHistory: React.FC<TripHistoryProps> = ({
  tripId,
  createdAt,
  createdBy,
  updatedAt,
  dispatcherName
}) => {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [signatures, setSignatures] = useState<TripSignature[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryPoint[]>([]);
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>('');
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);
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
    try {
      const [histResult, statusResult, sigResult, locResult] = await Promise.all([
        api.getTripHistory(tripId),
        api.getTripStatusHistory(tripId),
        api.getTripSignatures([tripId]).catch(() => ({ data: [] })),
        api.getTripLocationHistory(tripId).catch(() => ({ data: [] })),
      ]);
      setHistory(histResult.data || []);
      setStatusHistory(statusResult.data || []);
      setSignatures(sigResult.data || []);
      setLocationHistory(locResult.data || []);

      // Fetch trip data and driver signature if trip has a driver assigned
      try {
        const tripResult = await api.getTrips();
        const trip = tripResult.data?.find((t: any) => t.id === tripId);
        if (trip) {
          setTripData(trip);
          if (trip.driverId) {
            const driverSigResult = await api.getDriverSignature(trip.driverId);
            if (driverSigResult.success && driverSigResult.data?.signature_data) {
              setDriverSignature(driverSigResult.data.signature_data);
              setDriverName(trip.driverName || 'Driver');
            }
          }
        }
      } catch (err) {
        console.log('Could not fetch trip data or driver signature:', err);
      }
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

  const handleExportPDF = async () => {
    if (!tripData) {
      alert('Trip data not loaded yet. Please wait and try again.');
      return;
    }

    try {
      let mapImageData: string | undefined;

      // Capture map as image if location history exists
      if (locationHistory.length > 0) {
        const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
        if (mapContainer) {
          try {
            const canvas = await html2canvas(mapContainer, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              scale: 2, // Higher quality
            });
            mapImageData = canvas.toDataURL('image/png');
          } catch (mapError) {
            console.error('Error capturing map image:', mapError);
            // Continue without map image
          }
        }
      }

      await generateTripReportPDF({
        trip: tripData,
        statusHistory: statusHistory.map(entry => ({
          oldStatus: entry.oldStatus,
          newStatus: entry.newStatus,
          changedByName: entry.changedByName,
          reason: entry.reason,
          createdAt: entry.createdAt,
        })),
        patientSignature: signatures.find(s => s.signature_type === 'pickup'),
        driverSignature: driverSignature || undefined,
        driverName: driverName,
        locationHistory: locationHistory,
        mapImageData: mapImageData,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
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
      {/* PDF Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          disabled={!tripData}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Download className="w-4 h-4" />
          Download Trip Report (PDF)
        </button>
      </div>

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

        {/* Driver Actions Timeline */}
        {statusHistory.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">Driver Actions</span>
            </div>
            <div className="space-y-2">
              {statusHistory.map((entry) => {
                const config = STATUS_CONFIG[entry.newStatus] || { label: entry.newStatus?.replace(/_/g, ' '), color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="w-3.5 h-3.5" /> };
                return (
                  <div key={entry.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center ${config.color} flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{formatDateTime(entry.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Signatures Display */}
        {(signatures.length > 0 || driverSignature) && (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-900">Signatures</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Patient Signature */}
              {signatures.map((sig) => (
                <div key={sig.id} className="bg-purple-50 rounded-lg border border-purple-200 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-700 uppercase">Patient</span>
                    <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                      {sig.signature_type === 'pickup' ? 'Pickup' : 'Drop-off'}
                    </span>
                  </div>
                  {sig.signer_name && (
                    <p className="text-xs text-gray-600 mb-1">{sig.signer_name}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">{formatDateTime(sig.signed_at)}</p>
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <img src={sig.signature_data} alt="Patient Signature" className="w-full h-16 object-contain" />
                  </div>
                </div>
              ))}

              {/* Driver Signature */}
              {driverSignature && (
                <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-700 uppercase">Driver</span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">On File</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{driverName}</p>
                  <p className="text-xs text-gray-500 mb-2">One-time signature</p>
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <img src={driverSignature} alt="Driver Signature" className="w-full h-16 object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Status Timeline - Collapsible */}
      {statusHistory.length > 0 && (
        <div>
          <button
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
            className="w-full flex items-center justify-between pt-2 pb-1"
          >
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-600" />
              Detailed Status Timeline ({statusHistory.length} changes)
            </h4>
            <span className="text-xs text-gray-500">{isStatusExpanded ? 'Hide' : 'Show'}</span>
          </button>

          {isStatusExpanded && (
            <div className="relative mt-2">
              {statusHistory.map((entry, index) => {
                const config = STATUS_CONFIG[entry.newStatus] || { label: entry.newStatus?.replace(/_/g, ' '), color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="w-3.5 h-3.5" /> };
                const isLast = index === statusHistory.length - 1;
                const isFinal = ['completed', 'cancelled', 'no_show'].includes(entry.newStatus);

                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full ${config.bgColor} flex items-center justify-center ${config.color} flex-shrink-0 ${isFinal ? 'ring-2 ring-offset-1' : ''} ${entry.newStatus === 'completed' ? 'ring-green-300' : entry.newStatus === 'cancelled' ? 'ring-red-300' : entry.newStatus === 'no_show' ? 'ring-gray-300' : ''}`}>
                        {config.icon}
                      </div>
                      {!isLast && <div className="w-0.5 h-8 bg-gray-200 my-0.5" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 pb-3 ${isLast ? '' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      {entry.changedByName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          by <span className="font-medium text-gray-700">{entry.changedByName}</span>
                        </p>
                      )}
                      {entry.reason && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{entry.reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Route Breadcrumbs Map - Replace empty change history */}
      {locationHistory.length > 0 ? (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <MapIcon className="w-4 h-4 text-teal-600" />
            GPS Breadcrumb Trail ({locationHistory.length} points)
          </h4>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="mb-3 text-sm text-gray-600">
              <p className="mb-1">
                <span className="font-semibold">Start:</span> {formatDateTimeUS(locationHistory[0]?.timestamp)}
              </p>
              <p>
                <span className="font-semibold">End:</span> {formatDateTimeUS(locationHistory[locationHistory.length - 1]?.timestamp)}
              </p>
            </div>
            <TripHistoryMap 
              locationHistory={locationHistory}
              pickupAddress={tripData?.pickupLocation}
              dropoffAddress={tripData?.dropoffLocation}
              statusHistory={statusHistory.map(s => ({
                status: s.newStatus,
                timestamp: s.createdAt,
              }))}
            />
          </div>
        </div>
      ) : (
        history.length === 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
            <MapIcon className="w-10 h-10 mx-auto mb-2 text-gray-400 opacity-50" />
            <p className="text-sm text-gray-500">No GPS breadcrumbs recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">Location data will appear here once the driver starts the trip</p>
          </div>
        )
      )}

      {/* Change History - Only show if there are changes */}
      {history.length > 0 && (
        <>
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 pt-2">
            <Clock className="w-4 h-4 text-gray-600" />
            Change History
          </h4>
        </>
      )}

      {/* Change History */}
      {history.length > 0 && (
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
