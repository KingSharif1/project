import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Users,
  Car,
  AlertCircle,
  AlertTriangle,
  Award,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdvancedAnalytics: React.FC = () => {
  const { trips, drivers, patients } = useApp();

  const analytics = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentTrips = trips.filter(t => new Date(t.scheduledTime) >= last30Days);
    const previousTrips = trips.filter(
      t => new Date(t.scheduledTime) >= last60Days && new Date(t.scheduledTime) < last30Days
    );

    const currentRevenue = currentTrips.reduce((sum, t) => sum + t.fare, 0);
    const previousRevenue = previousTrips.reduce((sum, t) => sum + t.fare, 0);
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

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

    const avgFare = completedTrips.length > 0
      ? completedTrips.reduce((sum, t) => sum + t.fare, 0) / completedTrips.length
      : 0;

    const activeDrivers = drivers.filter(d => d.status !== 'offline');
    const driverUtilization = activeDrivers.length > 0
      ? (completedTrips.length / (activeDrivers.length * 30)) * 100
      : 0;

    const topDrivers = drivers
      .map(driver => {
        const driverTrips = completedTrips.filter(t => t.driverId === driver.id);
        const revenue = driverTrips.reduce((sum, t) => sum + t.fare, 0);
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
        revenue: hourTrips.reduce((sum, t) => sum + t.fare, 0),
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
      currentRevenue,
      previousRevenue,
      revenueGrowth,
      totalTrips: currentTrips.length,
      completedTrips: completedTrips.length,
      completionRate,
      cancellationRate,
      noShowRate,
      avgFare,
      driverUtilization,
      topDrivers,
      peakHours,
      patientFrequency,
    };
  }, [trips, drivers, patients]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.FC<{ className?: string }>;
    iconColor: string;
    trend?: 'up' | 'down';
  }> = ({ title, value, change, icon: Icon, iconColor, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Analytics</h1>
        <p className="text-gray-600">Comprehensive performance insights and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue (30 Days)"
          value={`$${analytics.currentRevenue.toLocaleString()}`}
          change={analytics.revenueGrowth}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
          trend={analytics.revenueGrowth > 0 ? 'up' : 'down'}
        />

        <MetricCard
          title="Completed Trips"
          value={analytics.completedTrips}
          icon={Car}
          iconColor="bg-blue-100 text-blue-600"
        />

        <MetricCard
          title="Completion Rate"
          value={`${analytics.completionRate.toFixed(1)}%`}
          icon={Target}
          iconColor="bg-purple-100 text-purple-600"
        />

        <MetricCard
          title="Average Fare"
          value={`$${analytics.avgFare.toFixed(2)}`}
          icon={DollarSign}
          iconColor="bg-cyan-100 text-cyan-600"
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
          <h2 className="text-xl font-bold text-gray-900">Most Frequent Patients (30 Days)</h2>
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
                  <td className="py-3 px-4 text-gray-900 font-medium">{patient.name}</td>
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
