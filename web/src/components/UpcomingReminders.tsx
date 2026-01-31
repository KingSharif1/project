import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Send, CheckCircle, AlertCircle, Clock, History, Filter, MessageSquare, Calendar, Phone, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

interface UpcomingRemindersProps {
  hoursAhead?: number;
}

interface SMSHistory {
  id: string;
  trip_id: string;
  recipient_phone: string;
  message_type: string;
  message_content: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export const UpcomingReminders: React.FC<UpcomingRemindersProps> = ({ hoursAhead = 72 }) => {
  const { trips, drivers, patients, clinics } = useApp();
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<Map<string, { success: boolean; message: string }>>(new Map());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [smsHistory, setSmsHistory] = useState<SMSHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'tomorrow' | 'week' | 'month' | 'all' | 'range' | 'specific-date'>('week');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [specificDate, setSpecificDate] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'history') {
      loadSMSHistory();
    }
  }, [activeTab, dateFilter, dateRange, specificDate]);

  const loadSMSHistory = async () => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from('sms_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      } else if (dateFilter === 'yesterday') {
        const startOfYesterday = new Date();
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date();
        endOfYesterday.setDate(endOfYesterday.getDate() - 1);
        endOfYesterday.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfYesterday.toISOString()).lte('created_at', endOfYesterday.toISOString());
      } else if (dateFilter === 'tomorrow') {
        const startOfTomorrow = new Date();
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);
        const endOfTomorrow = new Date();
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
        endOfTomorrow.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfTomorrow.toISOString()).lte('created_at', endOfTomorrow.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (dateFilter === 'range' && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      } else if (dateFilter === 'specific-date' && specificDate) {
        const startOfDate = new Date(specificDate);
        startOfDate.setHours(0, 0, 0, 0);
        const endOfDate = new Date(specificDate);
        endOfDate.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfDate.toISOString()).lte('created_at', endOfDate.toISOString());
      }

      query = query.limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setSmsHistory(data || []);
    } catch (error) {
      console.error('Error loading SMS history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const upcomingTrips = useMemo(() => {
    if (!trips) return [];

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return trips
      .filter(trip => {
        if (trip.status === 'cancelled' || trip.status === 'completed') return false;
        if (!trip.driverId) return false;

        const tripTime = new Date(trip.scheduledTime);
        return tripTime >= startOfToday && tripTime <= futureTime;
      })
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [trips, hoursAhead]);

  const getPatient = (patientId?: string) => {
    if (!patientId) return null;
    return patients?.find(p => p.id === patientId);
  };

  const getDriver = (driverId?: string) => {
    if (!driverId) return null;
    return drivers?.find(d => d.id === driverId);
  };

  const getFacility = (facilityId?: string) => {
    if (!facilityId) return null;
    return clinics?.find(c => c.id === facilityId);
  };

  const getTripById = (tripId?: string) => {
    if (!tripId) return null;
    return trips?.find(t => t.id === tripId);
  };

  const formatPickupTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const sendReminders = async () => {
    if (selectedTrips.size === 0) return;

    setSending(true);
    const newStatus = new Map<string, { success: boolean; message: string }>();

    for (const tripId of selectedTrips) {
      const trip = upcomingTrips.find(t => t.id === tripId);
      if (!trip) continue;

      try {
        const patient = getPatient(trip.patientId);
        const driver = getDriver(trip.driverId);

        const phoneNumber = trip.customerPhone || patient?.phone;

        if (!phoneNumber) {
          newStatus.set(tripId, {
            success: false,
            message: 'No phone number'
          });
          continue;
        }

        const fullDate = formatFullDate(trip.scheduledTime);
        const time = formatTime(trip.scheduledTime);
        const passengerName = trip.customerName || patient?.name || 'Passenger';
        const facility = getFacility(trip.facilityId);
        const facilityName = facility?.name || 'your healthcare facility';

        // Professional clinic-branded message with confirmation request
        const message = `Hello, this is Fort Worth Non-Emergency Transportation on behalf of ${facilityName}. You are scheduled for pickup on ${fullDate}, at ${time} from ${trip.pickupLocation}. Please confirm your trip by replying Confirm or Cancel.`;

        const { data: smsData, error: smsError } = await supabase.functions.invoke('sms-notifications', {
          body: {
            to: phoneNumber,
            message: message,
            tripId: tripId,
            messageType: 'trip_reminder'
          }
        });

        if (smsError) {
          console.error('SMS error:', smsError);

          const errorMsg = smsError.message || 'Failed to send';
          const isTwilioVerificationError = errorMsg.includes('unverified') || errorMsg.includes('Trial accounts');

          newStatus.set(tripId, {
            success: false,
            message: isTwilioVerificationError ? 'Phone not verified' : 'Failed to send'
          });
        } else {
          const responseStatus = smsData?.status || 'unknown';
          const isSimulated = responseStatus === 'simulated';

          newStatus.set(tripId, {
            success: true,
            message: isSimulated ? 'Simulated (no Twilio)' : 'SMS sent'
          });

          await supabase
            .from('trip_reminders')
            .insert({
              trip_id: tripId,
              reminder_type: 'manual',
              scheduled_for: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              status: isSimulated ? 'simulated' : 'sent',
              sms_sent: !isSimulated,
              email_sent: false
            });
        }
      } catch (error) {
        console.error('Error sending reminder:', error);
        newStatus.set(tripId, {
          success: false,
          message: 'Error occurred'
        });
      }
    }

    setSentStatus(newStatus);
    setSelectedTrips(new Set());
    setSending(false);

    setTimeout(() => {
      setSentStatus(new Map());
      if (activeTab === 'history') {
        loadSMSHistory();
      }
    }, 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={14} />
            SMS Sent
          </div>
        );
      case 'simulated':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <CheckCircle size={14} />
            Simulated
          </div>
        );
      case 'delivered':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle size={14} />
            Delivered
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle size={14} />
            Failed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock size={14} />
            Pending
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip Reminders</h1>
          <p className="text-gray-500 mt-1">Send SMS reminders to passengers and view message history</p>
        </div>
        <div className="flex items-center gap-4">
          {activeTab === 'upcoming' && selectedTrips.size > 0 && (
            <div className="text-sm text-gray-600 font-medium">
              {selectedTrips.size} trip{selectedTrips.size > 1 ? 's' : ''} selected
            </div>
          )}
          {activeTab === 'upcoming' && (
            <button
              onClick={sendReminders}
              disabled={selectedTrips.size === 0 || sending}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedTrips.size === 0 || sending
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
              }`}
            >
              <Send size={20} />
              {sending ? 'Sending...' : 'Send SMS Reminders'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Bell size={18} />
                Upcoming Trips ({upcomingTrips.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <History size={18} />
                SMS History
              </button>
            </div>

            {activeTab === 'history' && (
              <div className="flex items-center gap-3">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    const value = e.target.value as any;
                    setDateFilter(value);
                    if (value !== 'range' && value !== 'specific-date') {
                      setDateRange({ start: '', end: '' });
                      setSpecificDate('');
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="specific-date">Specific Date</option>
                  <option value="range">Date Range</option>
                  <option value="all">All Time</option>
                </select>

                {dateFilter === 'specific-date' && (
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {dateFilter === 'range' && (
                  <>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      placeholder="Start Date"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500 text-sm">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      placeholder="End Date"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'upcoming' ? (
          upcomingTrips.length === 0 ? (
            <div className="p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Bell size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Trips</h3>
                <p className="text-gray-500">No trips scheduled in the next {hoursAhead} hours.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                      Select
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Passenger Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pickup Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {upcomingTrips.map((trip) => {
                    const patient = getPatient(trip.patientId);
                    const isSelected = selectedTrips.has(trip.id);
                    const status = sentStatus.get(trip.id);
                    const passengerName = trip.customerName || patient?.name || 'Unknown Passenger';
                    const phoneNumber = trip.customerPhone || patient?.phone;

                    return (
                      <tr
                        key={trip.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTripSelection(trip.id)}
                            disabled={!!status || !phoneNumber}
                            className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {passengerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {passengerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Trip #{trip.tripNumber || trip.id.substring(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatPickupTime(trip.scheduledTime)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {trip.pickupLocation?.substring(0, 40)}
                                {(trip.pickupLocation?.length || 0) > 40 ? '...' : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {phoneNumber ? (
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-100 rounded">
                                <Phone size={14} className="text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {phoneNumber}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-red-100 rounded">
                                <AlertCircle size={14} className="text-red-600" />
                              </div>
                              <span className="text-sm text-gray-500 italic">No phone</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {status ? (
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                status.success
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {status.success ? (
                                  <CheckCircle size={14} />
                                ) : (
                                  <AlertCircle size={14} />
                                )}
                                {status.message}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Ready</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-500">Loading SMS history...</p>
              </div>
            ) : smsHistory.length === 0 ? (
              <div className="p-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <MessageSquare size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No SMS History</h3>
                  <p className="text-gray-500">No messages sent in the selected time period.</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Passenger
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {smsHistory.map((sms) => {
                    const trip = getTripById(sms.trip_id);
                    const patient = getPatient(trip?.patientId);
                    const passengerName = trip?.customerName || patient?.name || 'Unknown';

                    return (
                      <tr key={sms.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDateTime(sms.sent_at || sms.created_at)}
                              </p>
                              {trip && (
                                <p className="text-xs text-gray-500">
                                  Trip #{trip.tripNumber || trip.id.substring(0, 8)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {passengerName}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {sms.recipient_phone}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {sms.message_content}
                            </p>
                            {sms.error_message && (
                              <p className="text-xs text-red-600 mt-1">
                                Error: {sms.error_message}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {getStatusBadge(sms.status)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {activeTab === 'upcoming'
                ? 'Select trips and click "Send SMS Reminders" to notify passengers'
                : `Showing ${smsHistory.length} message${smsHistory.length !== 1 ? 's' : ''}`
              }
            </div>
            <div className="text-gray-500">
              {activeTab === 'upcoming'
                ? `${upcomingTrips.length} total trip${upcomingTrips.length !== 1 ? 's' : ''}`
                : `Filter: ${dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 Days' : dateFilter === 'month' ? 'Last 30 Days' : 'All Time'}`
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
