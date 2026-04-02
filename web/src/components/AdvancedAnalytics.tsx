import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  Car,
  BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateContractorRate } from '../utils/rateCalculator';

export const AdvancedAnalytics: React.FC = () => {
  const { trips, drivers, patients, clinics, contractors } = useApp();
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split('T')[0]);

  const analytics = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const currentTrips = trips.filter(t => {
      const d = new Date(t.scheduledTime);
      return d >= start && d <= end;
    });

    // Helper: get fare for a trip, dynamically calculating from contractor rate if fare is 0
    const getTripFare = (trip: any): number => {
      if (trip.fare && trip.fare > 0) return trip.fare;
      const rateSource = (trip.contractorId ? contractors.find((c: any) => c.id === trip.contractorId) : null)
        || (trip.clinicId ? clinics.find((c: any) => c.id === trip.clinicId) : null);
      if (rateSource && (trip.distance || trip.distanceMiles)) {
        const calc = calculateContractorRate(
          (trip.serviceLevel || 'ambulatory') as any,
          trip.distance || trip.distanceMiles || 0,
          rateSource as any
        );
        return calc.rate;
      }
      return 0;
    };

    const completedTrips = currentTrips.filter(t => t.status === 'completed');
    const cancelledTrips = currentTrips.filter(t => t.status === 'cancelled');
    const noShowTrips = currentTrips.filter(t => t.status === 'no-show');

    const totalRevenue = completedTrips.reduce((sum, t) => sum + getTripFare(t), 0);
    const avgRevenuePerTrip = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;
    const totalMiles = completedTrips.reduce((sum, t) => sum + (t.distance || t.mileage || 0), 0);

    const completionRate = currentTrips.length > 0
      ? (completedTrips.length / currentTrips.length) * 100
      : 0;

    const cancellationRate = currentTrips.length > 0
      ? (cancelledTrips.length / currentTrips.length) * 100
      : 0;

    const noShowRate = currentTrips.length > 0
      ? (noShowTrips.length / currentTrips.length) * 100
      : 0;

    const topDrivers = drivers
      .map(driver => {
        const driverTrips = completedTrips.filter(t => t.driverId === driver.id);
        const revenue = driverTrips.reduce((sum, t) => sum + getTripFare(t), 0);
        return {
          ...driver,
          tripCount: driverTrips.length,
          revenue,
        };
      })
      .filter(d => d.tripCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue by service level
    const serviceLevels = ['ambulatory', 'wheelchair', 'stretcher'];
    const revenueByService = serviceLevels.map(level => {
      const levelTrips = completedTrips.filter(t => (t.serviceLevel || 'ambulatory') === level);
      const revenue = levelTrips.reduce((sum, t) => sum + getTripFare(t), 0);
      const miles = levelTrips.reduce((sum, t) => sum + (t.distance || t.mileage || 0), 0);
      return {
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count: levelTrips.length,
        revenue,
        miles,
      };
    });

    const patientFrequency = patients
      .map(patient => {
        const patientTrips = currentTrips.filter(t => t.patientId === patient.id);
        return {
          ...patient,
          tripCount: patientTrips.length,
        };
      })
      .filter(p => p.tripCount > 0)
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 5);

    return {
      totalRevenue,
      avgRevenuePerTrip,
      totalMiles,
      totalTrips: currentTrips.length,
      completedTrips: completedTrips.length,
      cancelledCount: cancelledTrips.length,
      noShowCount: noShowTrips.length,
      completionRate,
      cancellationRate,
      noShowRate,
      topDrivers,
      revenueByService,
      patientFrequency,
    };
  }, [trips, drivers, patients, clinics, contractors, startDate, endDate]);

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
          <p className="text-gray-600">Revenue and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none focus:ring-0 text-sm text-gray-600"
          />
          <span className="text-gray-400">to</span>
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
          subValue={`From ${analytics.completedTrips} completed trips`}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />

        <MetricCard
          title="Total Trips"
          value={analytics.totalTrips}
          subValue={`${analytics.completedTrips} completed, ${analytics.cancelledCount} cancelled, ${analytics.noShowCount} no-show`}
          icon={Car}
          iconColor="bg-blue-100 text-blue-600"
        />

        <MetricCard
          title="Avg Revenue / Trip"
          value={`$${analytics.avgRevenuePerTrip.toFixed(2)}`}
          subValue={`${analytics.totalMiles.toFixed(1)} total miles`}
          icon={TrendingUp}
          iconColor="bg-purple-100 text-purple-600"
        />

        <MetricCard
          title="Completion Rate"
          value={`${analytics.completionRate.toFixed(1)}%`}
          subValue={`${analytics.cancellationRate.toFixed(1)}% cancelled · ${analytics.noShowRate.toFixed(1)}% no-show`}
          icon={CheckCircle2}
          iconColor="bg-emerald-100 text-emerald-600"
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
              style={{ width: `${Math.min(analytics.completionRate, 100)}%` }}
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
              style={{ width: `${Math.min(analytics.cancellationRate, 100)}%` }}
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
              style={{ width: `${Math.min(analytics.noShowRate, 100)}%` }}
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
          {analytics.topDrivers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No completed trips in this period</p>
          ) : (
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
                    <p className="font-bold text-gray-900">${driver.revenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Revenue by Service Level</h2>
          </div>
          <div className="space-y-4">
            {analytics.revenueByService.map((service) => {
              const maxRevenue = Math.max(...analytics.revenueByService.map(s => s.revenue), 1);
              const barWidth = (service.revenue / maxRevenue) * 100;
              return (
                <div key={service.level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{service.level}</p>
                      <p className="text-sm text-gray-600">{service.count} trips · {service.miles.toFixed(1)} mi</p>
                    </div>
                    <p className="font-bold text-gray-900">${service.revenue.toFixed(2)}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        service.level === 'Ambulatory' ? 'bg-blue-500' :
                        service.level === 'Wheelchair' ? 'bg-purple-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Most Frequent Riders</h2>
        </div>
        {analytics.patientFrequency.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trips in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rider</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Trips</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Phone</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
