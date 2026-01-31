import React, { useState, useEffect } from 'react';
import { Car, Users, CheckCircle, DollarSign, MapPin, Clock, Navigation, Bell, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';
import { QuickActions } from './QuickActions';
import { DriverLeaderboard } from './DriverLeaderboard';
import { RealtimeMetrics } from './RealtimeMetrics';
import { DocumentAlertsWidget } from './DocumentAlertsWidget';
import { AutoAssignModal } from './AutoAssignModal';
import { Trip } from '../types';

interface DashboardProps {
  onNavigate?: (view: 'dashboard' | 'trips' | 'drivers' | 'vehicles' | 'facilities' | 'billing' | 'reports' | 'users' | 'activity') => void;
  onOpenDocumentMonitor?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenDocumentMonitor }) => {
  const { dashboardStats, trips, drivers } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [showAutoAssign, setShowAutoAssign] = useState(false);

  useEffect(() => {
    const active = trips.filter(
      trip => trip.status === 'in_progress' || trip.status === 'assigned'
    );
    setActiveTrips(active);
  }, [trips]);

  const getDriverName = (driverId?: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'Unassigned';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleQuickAction = (action: string) => {
    if (!onNavigate && action !== 'quick-assign') return;

    switch (action) {
      case 'new-trip':
        onNavigate?.('trips');
        break;
      case 'add-driver':
        onNavigate?.('drivers');
        break;
      case 'schedule-bulk':
        onNavigate?.('trips');
        break;
      case 'generate-report':
        onNavigate?.('reports');
        break;
      case 'send-notification':
        alert('Notification feature coming soon!');
        break;
      case 'quick-assign':
        setShowAutoAssign(true);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 rounded-xl border border-blue-200">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <QuickActions onAction={handleQuickAction} />

      <RealtimeMetrics />

      <DocumentAlertsWidget
        drivers={drivers}
        onNavigateToMonitor={onOpenDocumentMonitor}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Trips"
          value={dashboardStats.todaysTrips}
          icon={Car}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active Drivers"
          value={dashboardStats.activeDrivers}
          icon={Users}
          color="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Completed Today"
          value={dashboardStats.completedToday}
          icon={CheckCircle}
          color="bg-gradient-to-br from-cyan-500 to-blue-600"
        />
        <StatCard
          title="Total Revenue"
          value={`$${dashboardStats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Active Trips</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>

          <div className="space-y-4">
            {activeTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active trips at the moment</p>
              </div>
            ) : (
              activeTrips.map(trip => (
                <div
                  key={trip.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{trip.customerName}</h3>
                      <p className="text-sm text-gray-600">{getDriverName(trip.driverId)}</p>
                    </div>
                    <StatusBadge status={trip.status} size="sm" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{trip.pickupLocation}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Navigation className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{trip.dropoffLocation}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatTime(trip.scheduledTime)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        ${trip.fare.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Driver Status</h2>

          <div className="space-y-3">
            {drivers.slice(0, 5).map(driver => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {driver.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driver.name}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{driver.totalTrips} trips</span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-amber-600">★ {driver.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={driver.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Real-Time Tracking</h2>
              <p className="text-blue-100 mb-4">
                Monitor all active trips and driver locations in real-time
              </p>
              <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                View Map
              </button>
            </div>
            <MapPin className="w-24 h-24 opacity-20" />
          </div>
        </div>
      )}

      <DriverLeaderboard />

      <AutoAssignModal
        isOpen={showAutoAssign}
        onClose={() => setShowAutoAssign(false)}
      />
    </div>
  );
};
