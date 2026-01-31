import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, DollarSign, Users, Car } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Metric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

export const RealtimeMetrics: React.FC = () => {
  const { trips, drivers } = useApp();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [hourlyData, setHourlyData] = useState<number[]>([]);

  useEffect(() => {
    calculateMetrics();
    const interval = setInterval(calculateMetrics, 30000);
    return () => clearInterval(interval);
  }, [trips, drivers]);

  const calculateMetrics = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const todaysTrips = trips.filter(t => new Date(t.scheduledTime) >= todayStart);
    const yesterdaysTrips = trips.filter(
      t => new Date(t.scheduledTime) >= yesterdayStart && new Date(t.scheduledTime) < todayStart
    );

    const completedToday = todaysTrips.filter(t => t.status === 'completed').length;
    const completedYesterday = yesterdaysTrips.filter(t => t.status === 'completed').length;

    const activeDriversCount = drivers.filter(d => d.status === 'available' || d.status === 'on_trip').length;
    const totalDrivers = drivers.length;

    const avgResponseTime = calculateAvgResponseTime(todaysTrips);
    const avgResponseTimeYesterday = calculateAvgResponseTime(yesterdaysTrips);

    const revenueToday = todaysTrips
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const revenueYesterday = yesterdaysTrips
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const newMetrics: Metric[] = [
      {
        label: 'Completion Rate',
        value: todaysTrips.length > 0 ? Math.round((completedToday / todaysTrips.length) * 100) : 0,
        change: calculatePercentChange(
          todaysTrips.length > 0 ? completedToday / todaysTrips.length : 0,
          yesterdaysTrips.length > 0 ? completedYesterday / yesterdaysTrips.length : 0
        ),
        trend: completedToday >= completedYesterday ? 'up' : 'down',
        icon: TrendingUp,
        color: 'text-green-600'
      },
      {
        label: 'Avg Response Time',
        value: avgResponseTime,
        change: calculatePercentChange(avgResponseTime, avgResponseTimeYesterday),
        trend: avgResponseTime <= avgResponseTimeYesterday ? 'up' : 'down',
        icon: Clock,
        color: 'text-blue-600'
      },
      {
        label: 'Revenue Today',
        value: revenueToday,
        change: calculatePercentChange(revenueToday, revenueYesterday),
        trend: revenueToday >= revenueYesterday ? 'up' : 'down',
        icon: DollarSign,
        color: 'text-emerald-600'
      },
      {
        label: 'Driver Utilization',
        value: totalDrivers > 0 ? Math.round((activeDriversCount / totalDrivers) * 100) : 0,
        change: 0,
        trend: 'neutral',
        icon: Users,
        color: 'text-purple-600'
      },
      {
        label: 'Active Trips',
        value: todaysTrips.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
        change: 0,
        trend: 'neutral',
        icon: Car,
        color: 'text-orange-600'
      }
    ];

    setMetrics(newMetrics);

    const hourly = calculateHourlyTrips(todaysTrips);
    setHourlyData(hourly);
  };

  const calculateAvgResponseTime = (tripList: typeof trips): number => {
    const responseTimes = tripList
      .filter(t => t.status === 'completed' && t.createdAt)
      .map(t => {
        const created = new Date(t.createdAt!).getTime();
        const scheduled = new Date(t.scheduledTime).getTime();
        return Math.abs(scheduled - created) / (1000 * 60);
      });

    if (responseTimes.length === 0) return 0;
    const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(avg);
  };

  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateHourlyTrips = (tripList: typeof trips): number[] => {
    const hourCounts = new Array(24).fill(0);
    tripList.forEach(trip => {
      const hour = new Date(trip.scheduledTime).getHours();
      hourCounts[hour]++;
    });
    return hourCounts;
  };

  const maxHourlyTrips = Math.max(...hourlyData, 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Real-Time Metrics</h2>
        <p className="text-gray-600 flex items-center">
          <Activity className="w-4 h-4 mr-2 animate-pulse text-green-500" />
          Live performance indicators updated every 30 seconds
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${metric.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {metric.change !== 0 && (
                  <div
                    className={`flex items-center space-x-1 text-xs font-semibold ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(metric.change)}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.label.includes('Revenue') ? `$${metric.value.toFixed(2)}` :
                   metric.label.includes('Time') ? `${metric.value}m` :
                   metric.label.includes('Rate') || metric.label.includes('Utilization') ? `${metric.value}%` :
                   metric.value}
                </p>
                <p className="text-xs text-gray-600 mt-1">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Volume by Hour (Today)</h3>
        <div className="flex items-end space-x-1 h-40">
          {hourlyData.map((count, hour) => {
            const height = maxHourlyTrips > 0 ? (count / maxHourlyTrips) * 100 : 0;
            const currentHour = new Date().getHours();
            const isCurrent = hour === currentHour;

            return (
              <div key={hour} className="flex-1 flex flex-col items-center group">
                <div className="w-full flex flex-col justify-end h-32">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-blue-600 to-blue-400 animate-pulse'
                        : count > 0
                        ? 'bg-gradient-to-t from-blue-500 to-blue-300 group-hover:from-blue-600 group-hover:to-blue-400'
                        : 'bg-gray-200'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 font-medium">
                  {hour.toString().padStart(2, '0')}
                </div>
                {count > 0 && (
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 -mt-8">
                    {count} trip{count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Hover over bars to see trip counts. Current hour is highlighted.
        </p>
      </div>
    </div>
  );
};
