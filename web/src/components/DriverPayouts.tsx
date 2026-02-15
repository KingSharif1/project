import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Download, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { Driver, Trip } from '../types';
import Toast, { ToastType } from './Toast';

export const DriverPayouts: React.FC = () => {
  const { drivers } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setToast({ message: 'Please select a date range', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const result = await api.getDriverPayouts(
        startDate,
        endDate,
        selectedDriverId !== 'all' ? selectedDriverId : undefined
      );
      const trips = result.data || [];

      // Group by driver and calculate totals
      const driverMap = new Map<string, {
        driverName: string;
        driverId: string;
        tripCount: number;
        totalPayout: number;
        trips: any[];
      }>();

      trips?.forEach((trip: any) => {
        if (!trip.driver_id) return;
        
        const current = driverMap.get(trip.driver_id) || {
          driverName: trip.driver?.name || 'Unknown Driver',
          driverId: trip.driver_id,
          tripCount: 0,
          totalPayout: 0,
          trips: [] as any[]
        };

        current.tripCount += 1;
        // Use driver_payout if calculated, otherwise fall back to estimated calculation
        //Ideally, driver_payout is stored on trip completion.
        current.totalPayout += Number(trip.driver_payout) || 0; 
        current.trips.push(trip);
        
        driverMap.set(trip.driver_id, current);
      });

      setPayouts(Array.from(driverMap.values()));
      
      if (driverMap.size === 0) {
        setToast({ message: 'No completed trips found for this period', type: 'info' });
      }

    } catch (error) {
      console.error('Error generating payout report:', error);
      setToast({ message: 'Failed to generate report', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Payouts</h1>
          <p className="text-gray-600">Generate and manage driver payment reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Driver</label>
            <select
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Generating...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {payouts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trips</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Payout</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.driverId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{payout.driverName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payout.tripCount}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      ${payout.totalPayout.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-6 py-3 text-gray-900">Total</td>
                  <td className="px-6 py-3 text-gray-900">
                    {payouts.reduce((acc, p) => acc + p.tripCount, 0)}
                  </td>
                  <td className="px-6 py-3 text-green-700">
                    ${payouts.reduce((acc, p) => acc + p.totalPayout, 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
