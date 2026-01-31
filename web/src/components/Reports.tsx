import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, TrendingUp, Clock, DollarSign, Star, Calendar, Building2, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import { CustomReportBuilder } from './CustomReportBuilder';

export const Reports: React.FC = () => {
  const { trips, drivers, clinics } = useApp();
  const { user, isAdmin } = useAuth();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
  const [showCustomReport, setShowCustomReport] = useState(false);

  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filteredTrips = trips.filter(trip => {
      if (selectedClinics.length > 0 && !selectedClinics.includes(trip.clinicId)) {
        return false;
      }

      const tripDate = new Date(trip.scheduledTime);
      if (timeRange === 'custom' && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return tripDate >= startDate && tripDate <= endDate;
      }
      switch (timeRange) {
        case 'today':
          return tripDate >= today;
        case 'week':
          return tripDate >= weekAgo;
        case 'month':
          return tripDate >= monthAgo;
        default:
          return true;
      }
    });

    const completedTrips = filteredTrips.filter(trip => trip.status === 'completed');
    const totalRevenue = completedTrips.reduce((sum, trip) => sum + trip.fare, 0);
    const totalDistance = completedTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const avgFare = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;
    const avgDistance = completedTrips.length > 0 ? totalDistance / completedTrips.length : 0;

    const statusCounts = {
      pending: filteredTrips.filter(t => t.status === 'pending').length,
      assigned: filteredTrips.filter(t => t.status === 'assigned').length,
      in_progress: filteredTrips.filter(t => t.status === 'in_progress').length,
      completed: completedTrips.length,
      cancelled: filteredTrips.filter(t => t.status === 'cancelled').length,
      noShow: filteredTrips.filter(t => t.status === 'no-show').length,
    };

    const cancelledRevenue = filteredTrips
      .filter(t => t.status === 'cancelled')
      .reduce((sum, trip) => sum + trip.fare, 0);

    const noShowRevenue = filteredTrips
      .filter(t => t.status === 'no-show')
      .reduce((sum, trip) => sum + trip.fare, 0);

    const driverStats = drivers.map(driver => {
      const driverTrips = completedTrips.filter(trip => trip.driverId === driver.id);
      const revenue = driverTrips.reduce((sum, trip) => sum + trip.fare, 0);
      return {
        id: driver.id,
        name: driver.name,
        trips: driverTrips.length,
        revenue,
        rating: driver.rating,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const completionRate =
      filteredTrips.length > 0
        ? ((completedTrips.length / filteredTrips.length) * 100).toFixed(1)
        : '0';

    const cancellationRate =
      filteredTrips.length > 0
        ? ((statusCounts.cancelled / filteredTrips.length) * 100).toFixed(1)
        : '0';

    return {
      totalTrips: filteredTrips.length,
      completedTrips: completedTrips.length,
      totalRevenue,
      avgFare,
      totalDistance,
      avgDistance,
      statusCounts,
      driverStats,
      completionRate,
      cancellationRate,
      cancelledRevenue,
      noShowRevenue,
    };
  }, [trips, drivers, timeRange, dateRange, selectedClinics]);

  const handleExportPDF = () => {
    const clinicName = user?.clinicId ? clinics.find(c => c.id === user.clinicId)?.name : undefined;

    const filteredTrips = trips.filter(trip => {
      if (selectedClinics.length > 0 && !selectedClinics.includes(trip.clinicId)) {
        return false;
      }

      const tripDate = new Date(trip.scheduledTime);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (timeRange === 'custom' && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return tripDate >= startDate && tripDate <= endDate;
      }

      switch (timeRange) {
        case 'today':
          return tripDate >= today;
        case 'week':
          return tripDate >= weekAgo;
        case 'month':
          return tripDate >= monthAgo;
        default:
          return true;
      }
    });

    exportToPDF(filteredTrips, drivers, analytics, timeRange, clinicName, clinics);
  };

  const handleExportCSV = () => {
    const filteredTrips = trips.filter(trip => {
      if (selectedClinics.length > 0 && !selectedClinics.includes(trip.clinicId)) {
        return false;
      }

      const tripDate = new Date(trip.scheduledTime);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (timeRange === 'custom' && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return tripDate >= startDate && tripDate <= endDate;
      }

      switch (timeRange) {
        case 'today':
          return tripDate >= today;
        case 'week':
          return tripDate >= weekAgo;
        case 'month':
          return tripDate >= monthAgo;
        default:
          return true;
      }
    });

    exportToCSV(filteredTrips, drivers, analytics, timeRange, clinics);
  };

  return (
    <>
      {showCustomReport && <CustomReportBuilder onClose={() => setShowCustomReport(false)} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-gray-600">Insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCustomReport(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Settings className="w-5 h-5" />
              <span>Custom Report</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm"
            >
              <FileText className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {(['today', 'week', 'month', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setShowDatePicker(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
            <button
              onClick={() => {
                setShowDatePicker(!showDatePicker);
                if (!showDatePicker) {
                  setTimeRange('custom');
                }
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                timeRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Date Range</span>
            </button>
          </div>

          {showDatePicker && (
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {dateRange.start && dateRange.end && (
                <button
                  onClick={() => {
                    setDateRange({ start: '', end: '' });
                    setTimeRange('all');
                    setShowDatePicker(false);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isAdmin && clinics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-semibold text-gray-700">Filter by Clinics:</label>
            <div className="flex-1 flex flex-wrap gap-2">
              {clinics.filter(c => c.isActive).map(clinic => (
                <button
                  key={clinic.id}
                  onClick={() => {
                    setSelectedClinics(prev =>
                      prev.includes(clinic.id)
                        ? prev.filter(id => id !== clinic.id)
                        : [...prev, clinic.id]
                    );
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedClinics.includes(clinic.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {clinic.name}
                </button>
              ))}
              {selectedClinics.length > 0 && (
                <button
                  onClick={() => setSelectedClinics([])}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Trips</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalTrips}</p>
          <p className="text-sm text-green-600 mt-2">
            {analytics.completedTrips} completed
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">${analytics.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-2">
            Avg: ${analytics.avgFare.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Completion Rate</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.completionRate}%</p>
          <p className="text-sm text-gray-600 mt-2">
            {analytics.statusCounts.cancelled} cancelled
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Distance</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalDistance.toFixed(1)}</p>
          <p className="text-sm text-gray-600 mt-2">
            Avg: {analytics.avgDistance.toFixed(1)} mi
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Billing Summary</h2>
            <p className="text-sm text-gray-600">Financial overview for facility payment</p>
          </div>
          <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm">
            {timeRange === 'custom' && dateRange.start && dateRange.end
              ? `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
              : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{analytics.statusCounts.completed}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Completed Trips</p>
            <div className="flex items-baseline space-x-1">
              <p className="text-lg font-bold text-green-600">${analytics.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">revenue</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{analytics.statusCounts.cancelled}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Cancelled Trips</p>
            <div className="flex items-baseline space-x-1">
              <p className="text-lg font-bold text-red-600">${analytics.cancelledRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">lost revenue</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{analytics.statusCounts.noShow}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No-Show Trips</p>
            <div className="flex items-baseline space-x-1">
              <p className="text-lg font-bold text-orange-600">${analytics.noShowRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">billable*</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-blue-200 shadow-sm border-2">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{analytics.statusCounts.completed + analytics.statusCounts.noShow}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Total Billable</p>
            <div className="flex items-baseline space-x-1">
              <p className="text-lg font-bold text-blue-600">${(analytics.totalRevenue + analytics.noShowRevenue).toFixed(2)}</p>
              <p className="text-xs text-gray-500">amount due</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Summary</h3>
              <p className="text-sm text-gray-600">Total amount to be paid by facility/dispatcher</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Amount Due</p>
              <p className="text-4xl font-bold text-blue-600">${(analytics.totalRevenue + analytics.noShowRevenue).toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Completed Revenue</p>
                <p className="font-bold text-gray-900">${analytics.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">No-Show Fees</p>
                <p className="font-bold text-gray-900">${analytics.noShowRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Cancelled (Non-billable)</p>
                <p className="font-bold text-red-600">-${analytics.cancelledRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600">
              * No-show trips are billable as the vehicle was dispatched and driver was en route. Cancelled trips are not billable.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Trip Status Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(analytics.statusCounts).map(([status, count]) => {
              const total = analytics.totalTrips;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              const colors: Record<string, string> = {
                pending: 'bg-yellow-500',
                assigned: 'bg-cyan-500',
                in_progress: 'bg-blue-500',
                completed: 'bg-green-500',
                cancelled: 'bg-red-500',
                noShow: 'bg-orange-500',
              };

              const labels: Record<string, string> = {
                pending: 'Pending',
                assigned: 'Assigned',
                in_progress: 'In Progress',
                completed: 'Completed',
                cancelled: 'Cancelled',
                noShow: 'No-Show',
              };

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {labels[status] || status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${colors[status]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Drivers</h2>
          <div className="space-y-4">
            {analytics.driverStats.slice(0, 5).map((driver, index) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driver.name}</p>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="text-gray-600">{driver.trips} trips</span>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center space-x-1 text-amber-600">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{driver.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${driver.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>
            ))}

            {analytics.driverStats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No driver data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Key Metrics Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-700 mb-1">Average Trip Fare</p>
            <p className="text-2xl font-bold text-blue-900">${analytics.avgFare.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-700 mb-1">Average Trip Distance</p>
            <p className="text-2xl font-bold text-green-900">{analytics.avgDistance.toFixed(1)} mi</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-700 mb-1">Revenue per Mile</p>
            <p className="text-2xl font-bold text-amber-900">
              ${analytics.totalDistance > 0 ? (analytics.totalRevenue / analytics.totalDistance).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
