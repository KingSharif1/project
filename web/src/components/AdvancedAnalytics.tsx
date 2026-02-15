import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  Percent
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdvancedAnalytics: React.FC = () => {
  const { trips, drivers, patients } = useApp();
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split('T')[0]);

  const analytics = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    const currentTrips = trips.filter(t => {
      const d = new Date(t.scheduledTime);
      return d >= start && d <= end;
    });

    const totalRevenue = currentTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
    const totalPayout = currentTrips.reduce((sum, t) => sum + (t.driverPayout || 0), 0);
    const totalProfit = totalRevenue - totalPayout;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const completedTrips = currentTrips.filter(t => t.status === 'completed');
    const cancelledTrips = currentTrips.filter(t => t.status === 'cancelled');
    const noShowTrips = currentTrips.filter(t => t.status === 'no-show');

    const completionRate = currentTrips.length > 0
      ? (completedTrips.length / currentTrips.length) * 100
      : 0;

    const cancellationRate = currentTrips.length > 0
      ? (cancelledTrips.length / currentTrips.length) * 100
      : 0;

    const noShowRate = currentTrips.length > 0
      ? (noShowTrips.length / currentTrips.length) * 100
      : 0;

    const activeDrivers = drivers.filter(d => d.status !== 'offline');
    const driverUtilization = activeDrivers.length > 0
      ? (completedTrips.length / (activeDrivers.length * 30)) * 100 // Approximation
      : 0;

    const topDrivers = drivers
      .map(driver => {
        const driverTrips = completedTrips.filter(t => t.driverId === driver.id);
        const revenue = driverTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
        return {
          ...driver,
          tripCount: driverTrips.length,
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const peakHours = Array.from({ length: 24 }, (_, hour) => {
      const hourTrips = currentTrips.filter(t => {
        const tripHour = new Date(t.scheduledTime).getHours();
        return tripHour === hour;
      });
      return {
        hour,
        count: hourTrips.length,
        revenue: hourTrips.reduce((sum, t) => sum + (t.fare || 0), 0),
      };
    }).sort((a, b) => b.count - a.count).slice(0, 3);

    const patientFrequency = patients
      .map(patient => {
        const patientTrips = currentTrips.filter(t => t.patientId === patient.id);
        return {
          ...patient,
          tripCount: patientTrips.length,
        };
      })
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 5);

    return {
      totalRevenue,
      totalPayout,
      totalProfit,
      profitMargin,
      totalTrips: currentTrips.length,
      completedTrips: completedTrips.length,
      completionRate,
      cancellationRate,
      noShowRate,
      driverUtilization,
      topDrivers,
      peakHours,
      patientFrequency,
      revenueGrowth: 0, // Placeholder for revenue growth
    };
  }, [trips, drivers, patients, startDate, endDate]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.FC<{ className?: string }>;
    iconColor: string;
  }> = ({ title, value, subValue, icon: Icon, iconColor }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Analytics</h1>
          <p className="text-gray-600">Profitability and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none focus:ring-0 text-sm text-gray-600"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none focus:ring-0 text-sm text-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />

        <MetricCard
          title="Total Payout"
          value={`$${analytics.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="bg-red-100 text-red-600"
        />

        <MetricCard
          title="Net Profit"
          value={`$${analytics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`Margin: ${analytics.profitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          iconColor="bg-blue-100 text-blue-600"
        />

        <MetricCard
          title="Completed Trips"
          value={analytics.completedTrips}
          subValue={`${analytics.completionRate.toFixed(1)}% Completion`}
          icon={CheckCircle2}
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Completion Rate</h3>
              <p className="text-2xl font-bold text-green-600">{analytics.completionRate.toFixed(1)}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Cancellation Rate</h3>
              <p className="text-2xl font-bold text-red-600">{analytics.cancellationRate.toFixed(1)}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-red-600 h-3 rounded-full transition-all"
              style={{ width: `${analytics.cancellationRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">No-Show Rate</h3>
              <p className="text-2xl font-bold text-orange-600">{analytics.noShowRate.toFixed(1)}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-orange-600 h-3 rounded-full transition-all"
              style={{ width: `${analytics.noShowRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Award className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900">Top Performing Drivers</h2>
          </div>
          <div className="space-y-3">
            {analytics.topDrivers.map((driver, index) => (
              <div key={driver.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.tripCount} trips completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${driver.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Peak Service Hours</h2>
          </div>
          <div className="space-y-3">
            {analytics.peakHours.map((hour) => (
              <div key={hour.hour} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">
                    {hour.hour === 0 ? '12 AM' : hour.hour < 12 ? `${hour.hour} AM` : hour.hour === 12 ? '12 PM' : `${hour.hour - 12} PM`}
                  </p>
                  <p className="text-sm text-gray-600">{hour.count} trips</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${hour.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Most Frequent Patients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Trips</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Phone</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {analytics.patientFrequency.map((patient, index) => (
                <tr key={patient.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-gray-900 font-medium">{patient.firstName} {patient.lastName}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {patient.tripCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{patient.phone}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">Revenue Trend</p>
              <p className="text-sm text-gray-600">
                {analytics.revenueGrowth > 0 ? 'Increase' : 'Decrease'} of {Math.abs(analytics.revenueGrowth).toFixed(1)}% vs previous period
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Percent className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">Driver Utilization</p>
              <p className="text-sm text-gray-600">
                {analytics.driverUtilization.toFixed(1)}% average utilization rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
