import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, RefreshCw, Phone, AlertCircle } from 'lucide-react';
import * as api from '../services/api';
import { formatDateUS, formatTimeUS } from '../utils/dateFormatter';

interface SMSNotification {
  id: string;
  trip_id: string | null;
  driver_id: string | null;
  recipient_phone: string;
  message_type: string;
  message_content: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'simulated';
  twilio_sid: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface SMSHistoryProps {
  tripId?: string;
  driverId?: string;
  limit?: number;
}

export const SMSHistory: React.FC<SMSHistoryProps> = ({ tripId, driverId, limit = 50 }) => {
  const [smsHistory, setSmsHistory] = useState<SMSNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, simulated: 0 });

  const fetchSMSHistory = async () => {
    setLoading(true);
    try {
      let data: any[] = [];

      if (tripId) {
        const result = await api.getTripSmsHistory(tripId);
        data = result.data || [];
      } else {
        const result = await api.getSmsHistory(undefined, undefined, limit);
        data = result.data || [];
      }

      // Client-side filter for driverId if needed
      if (driverId) {
        data = data.filter((s: any) => s.driver_id === driverId);
      }

      setSmsHistory(data);

      const statsData = {
        total: data.length,
        sent: data.filter((s: any) => s.status === 'sent' || s.status === 'delivered').length,
        failed: data.filter((s: any) => s.status === 'failed').length,
        simulated: data.filter((s: any) => s.status === 'simulated').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading SMS history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSMSHistory();
  }, [tripId, driverId, limit]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'simulated':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      sent: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      simulated: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
    }[status] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${classes}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatMessageType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading SMS history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">SMS Notifications</h3>
        </div>
        <button
          onClick={fetchSMSHistory}
          className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Sent</div>
          <div className="text-2xl font-bold text-green-900">{stats.sent}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600">Simulated</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.simulated}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">Failed</div>
          <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
        </div>
      </div>

      {stats.simulated > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Simulated SMS Mode</h4>
              <p className="text-sm text-yellow-800 mt-1">
                SMS notifications are being logged but not actually sent because Twilio credentials are not configured.
                To enable real SMS delivery, please add your Twilio credentials to the environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {smsHistory.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No SMS notifications found</p>
          <p className="text-sm text-gray-500 mt-1">
            SMS notifications will appear here when trips are assigned or status changes
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Patient Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {smsHistory.map((sms) => (
                  <tr key={sms.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateUS(sms.created_at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeUS(sms.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {sms.patient_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(sms.status)}
                        <span className="text-sm text-gray-900">
                          {formatMessageType(sms.message_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1 text-sm text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{sms.recipient_phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 max-w-md truncate" title={sms.message_content}>
                        {sms.message_content}
                      </div>
                      {sms.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-red-700">
                              <div className="font-semibold mb-1">Error</div>
                              <div>{sms.error_message}</div>
                              {sms.error_message.toLowerCase().includes('opted out') && (
                                <div className="mt-1 text-red-600">
                                  To re-enable SMS: Patient can text "START" to the Twilio number
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(sms.status)}
                      {sms.twilio_sid && (
                        <div className="text-xs text-gray-500 mt-1">
                          SID: {sms.twilio_sid.substring(0, 20)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
