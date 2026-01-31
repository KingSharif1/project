import React, { useState, useMemo } from 'react';
import { Download, ChevronDown, Calendar, DollarSign, TrendingUp, Clock, ChevronUp, MapPin, Navigation } from 'lucide-react';
import { useApp } from '../context/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateUS, formatTimeUS } from '../utils/dateFormatter';

interface DriverEarningsDashboardProps {
  driverId?: string;
  isDriverView?: boolean;
}

export const DriverEarningsDashboard: React.FC<DriverEarningsDashboardProps> = ({
  driverId: initialDriverId,
  isDriverView = false
}) => {
  const { trips, drivers } = useApp();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(initialDriverId || 'all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());

  const toggleDriverExpansion = (driverId: string) => {
    const newExpanded = new Set(expandedDrivers);
    if (newExpanded.has(driverId)) {
      newExpanded.delete(driverId);
    } else {
      newExpanded.add(driverId);
    }
    setExpandedDrivers(newExpanded);
  };

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekAgo, end: now };
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return { start: monthAgo, end: now };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return { start: today, end: now };
      default:
        return { start: today, end: now };
    }
  };

  // Calculate driver payout
  const calculateDriverPayout = (trip: any, driver: any) => {
    if (!driver) return 0;

    // Check for cancelled trips
    if (trip.status === 'cancelled') {
      return driver.cancellationRate !== undefined && driver.cancellationRate !== null
        ? driver.cancellationRate
        : 0;
    }

    // Check for no-show trips
    if (trip.status === 'no-show') {
      return driver.noShowRate !== undefined && driver.noShowRate !== null
        ? driver.noShowRate
        : 0;
    }

    // If driverPayout is already set, use it
    if (trip.driverPayout !== undefined && trip.driverPayout !== null && trip.driverPayout > 0) {
      return trip.driverPayout;
    }

    // Calculate payout based on service level and distance
    const distance = trip.distance || 0;
    if (distance === 0) {
      return 0;
    }

    // Use default base rate + additional miles system (matching rateCalculator.ts)
    const defaultTiers = {
      ambulatory: { base: 14, baseMiles: 5, additional: 1.2 },
      wheelchair: { base: 28, baseMiles: 5, additional: 2.0 },
      stretcher: { base: 35, baseMiles: 5, additional: 2.5 }
    };

    const serviceLevel = trip.serviceLevel || 'ambulatory';
    const tier = defaultTiers[serviceLevel as keyof typeof defaultTiers] || defaultTiers.ambulatory;

    let payout = tier.base;
    const roundedMiles = Math.round(distance);

    if (roundedMiles > tier.baseMiles) {
      const additionalMiles = roundedMiles - tier.baseMiles;
      payout += additionalMiles * tier.additional;
    }

    return Math.round(payout * 100) / 100;
  };

  // Filter and calculate earnings
  const payoutData = useMemo(() => {
    if (!trips || !Array.isArray(trips)) return [];

    const dateRange = getDateRange();
    let filteredTrips = trips.filter(t => t.status === 'completed' || t.status === 'cancelled' || t.status === 'no-show');

    // Filter by date
    filteredTrips = filteredTrips.filter(t => {
      const tripDate = new Date(t.scheduledTime);
      return tripDate >= dateRange.start && tripDate <= dateRange.end;
    });

    // Group by driver
    const driverMap = new Map();

    filteredTrips.forEach(trip => {
      if (!trip.driverId) return;

      const driver = drivers?.find(d => d.id === trip.driverId);
      if (!driver) return;

      // Filter by selected driver if not "all"
      if (selectedDriverId !== 'all' && trip.driverId !== selectedDriverId) return;

      if (!driverMap.has(trip.driverId)) {
        driverMap.set(trip.driverId, {
          driver,
          trips: [],
          totalEarnings: 0,
          tripCount: 0,
        });
      }

      const payout = calculateDriverPayout(trip, driver);
      const driverData = driverMap.get(trip.driverId);
      driverData.trips.push({ ...trip, payout });
      driverData.totalEarnings += payout;
      driverData.tripCount += 1;
    });

    return Array.from(driverMap.values()).sort((a, b) =>
      b.totalEarnings - a.totalEarnings
    );
  }, [trips, drivers, selectedDriverId, selectedPeriod, customStartDate, customEndDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalEarnings = payoutData.reduce((sum, d) => sum + d.totalEarnings, 0);
    const totalTrips = payoutData.reduce((sum, d) => sum + d.tripCount, 0);
    return { totalEarnings, totalTrips };
  }, [payoutData]);

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text('Driver Payout Report', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    const periodLabel = selectedPeriod === 'custom' && customStartDate && customEndDate
      ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
      : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
    doc.text(`Period: ${periodLabel}`, pageWidth / 2, 22, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    const headers = [['Driver Name', 'Total Trips', 'Total Earnings', 'Avg per Trip']];
    const body = payoutData.map(d => [
      d.driver.name,
      d.tripCount.toString(),
      `$${d.totalEarnings.toFixed(2)}`,
      `$${(d.totalEarnings / d.tripCount).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 11 },
      styles: { fontSize: 10 },
      foot: [[
        'TOTAL',
        totals.totalTrips.toString(),
        `$${totals.totalEarnings.toFixed(2)}`,
        totals.totalTrips > 0 ? `$${(totals.totalEarnings / totals.totalTrips).toFixed(2)}` : '$0.00'
      ]],
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`driver-payouts-${selectedPeriod}-${Date.now()}.pdf`);
  };

  const exportToCSV = () => {
    const headerData = [
      ['Driver Payout Report'],
      [`Period: ${selectedPeriod === 'custom' && customStartDate && customEndDate
        ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
        : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Driver Name', 'Total Trips', 'Total Earnings', 'Avg per Trip'],
      ...payoutData.map(d => [
        d.driver.name,
        d.tripCount,
        d.totalEarnings.toFixed(2),
        (d.totalEarnings / d.tripCount).toFixed(2)
      ]),
      [],
      ['TOTAL', totals.totalTrips, totals.totalEarnings.toFixed(2), (totals.totalEarnings / totals.totalTrips).toFixed(2)]
    ];

    const ws = XLSX.utils.aoa_to_sheet(headerData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Driver Payouts');
    XLSX.writeFile(wb, `driver-payouts-${selectedPeriod}-${Date.now()}.csv`, { bookType: 'csv' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Driver Payouts</h1>
        <p className="text-gray-500 mt-1">Calculate and generate payout reports for drivers</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trip Date Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trip Date</label>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => {
                const value = e.target.value as typeof selectedPeriod;
                setSelectedPeriod(value);
                setShowCustomDatePicker(value === 'custom');
              }}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {/* Driver Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
          <div className="relative">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Drivers</option>
              {drivers?.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {/* Download Button */}
        <div className="flex items-end">
          <button
            onClick={exportToPDF}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Download size={20} />
            Download Report
          </button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Calendar size={20} className="text-blue-600" />
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {customStartDate && customEndDate && (
              <div className="text-sm text-blue-700 font-medium">
                {Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-100 text-sm font-medium">Total Payouts</p>
            <DollarSign size={24} className="text-blue-200" />
          </div>
          <p className="text-4xl font-bold mb-1">${totals.totalEarnings.toFixed(2)}</p>
          <p className="text-blue-100 text-sm">
            {selectedPeriod === 'custom' && customStartDate && customEndDate
              ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
              : selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'yesterday' ? 'Yesterday' : `Last ${selectedPeriod === 'week' ? '7' : '30'} days`}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-600 text-sm font-medium">Total Trips</p>
            <TrendingUp size={24} className="text-green-500" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">{totals.totalTrips}</p>
          <p className="text-gray-500 text-sm">Completed trips</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-600 text-sm font-medium">Avg per Trip</p>
            <Clock size={24} className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            ${totals.totalTrips > 0 ? (totals.totalEarnings / totals.totalTrips).toFixed(2) : '0.00'}
          </p>
          <p className="text-gray-500 text-sm">Average payout</p>
        </div>
      </div>

      {/* Driver Table */}
      {payoutData.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">

                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Driver Name
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Trips
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Earnings
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Avg per Trip
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payoutData.map((data, index) => (
                  <React.Fragment key={data.driver.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleDriverExpansion(data.driver.id)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          {expandedDrivers.has(data.driver.id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {data.driver.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{data.driver.name}</p>
                            <p className="text-xs text-gray-500">{data.driver.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {data.tripCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-bold text-gray-900">${data.totalEarnings.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-gray-700">
                        ${(data.totalEarnings / data.tripCount).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          const doc = new jsPDF();
                          doc.setFontSize(18);
                          doc.text(`Payout Report - ${data.driver.name}`, 14, 20);
                          doc.setFontSize(11);
                          doc.text(`Total Trips: ${data.tripCount}`, 14, 30);
                          doc.text(`Total Earnings: $${data.totalEarnings.toFixed(2)}`, 14, 37);
                          doc.text(`Average per Trip: $${(data.totalEarnings / data.tripCount).toFixed(2)}`, 14, 44);

                          const tripHeaders = [['Date', 'Trip #', 'Pickup', 'Dropoff', 'Miles', 'Payout']];
                          const tripBody = data.trips.map(trip => [
                            new Date(trip.scheduledTime).toLocaleDateString(),
                            trip.tripNumber || trip.id.substring(0, 8),
                            trip.pickupLocation?.substring(0, 30) || 'N/A',
                            trip.dropoffLocation?.substring(0, 30) || 'N/A',
                            trip.distance?.toFixed(1) || '0',
                            `$${trip.payout.toFixed(2)}`
                          ]);

                          autoTable(doc, {
                            startY: 50,
                            head: tripHeaders,
                            body: tripBody,
                            theme: 'striped',
                            headStyles: { fillColor: [59, 130, 246] },
                          });

                          doc.save(`${data.driver.name.replace(/\s+/g, '-')}-payout-${Date.now()}.pdf`);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Download
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Trip Details Row */}
                  {expandedDrivers.has(data.driver.id) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 mb-3">Trip Summary ({data.trips.length} trips)</h4>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Trip #</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Pickup</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Dropoff</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Miles</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Payout</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {data.trips.map((trip, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {formatDateUS(trip.scheduledTime)}
                                      <div className="text-xs text-gray-500">{formatTimeUS(trip.scheduledTime)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-sm font-medium text-blue-600">
                                        {trip.tripNumber || trip.id.substring(0, 8)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-start space-x-1">
                                        <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-900">{trip.pickupLocation || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-start space-x-1">
                                        <Navigation className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-900">{trip.dropoffLocation || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                                      {trip.distance?.toFixed(1) || '0.0'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        trip.status === 'no-show' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {trip.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="text-sm font-semibold text-gray-900">
                                        ${trip.payout.toFixed(2)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-100 border-t border-gray-200">
                                <tr>
                                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                                    Total:
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <span className="text-sm font-bold text-gray-900">
                                      ${data.totalEarnings.toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-900">
                      {totals.totalTrips}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-lg font-bold text-gray-900">${totals.totalEarnings.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-gray-700">
                      ${totals.totalTrips > 0 ? (totals.totalEarnings / totals.totalTrips).toFixed(2) : '0.00'}
                    </p>
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <DollarSign size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No payouts found</h3>
          <p className="text-gray-500">
            There are no completed trips for the selected period and driver.
          </p>
        </div>
      )}
    </div>
  );
};
