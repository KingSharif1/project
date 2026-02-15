import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Users, Car, MapPin, Clock, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Trip } from '../types';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarSchedulingViewProps {
  onCreateTrip?: (date: Date) => void;
  onTripClick?: (trip: Trip) => void;
}

export const CalendarSchedulingView: React.FC<CalendarSchedulingViewProps> = ({ onCreateTrip, onTripClick }) => {
  const { trips, drivers, clinics } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedFilters, setSelectedFilters] = useState({
    status: 'all',
    driver: 'all',
    clinic: 'all',
    serviceLevel: 'all'
  });

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar title
  const getCalendarTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Helper to get week start
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (selectedFilters.status !== 'all' && trip.status !== selectedFilters.status) return false;
      if (selectedFilters.driver !== 'all' && trip.driverId !== selectedFilters.driver) return false;
      if (selectedFilters.clinic !== 'all' && trip.clinicId !== selectedFilters.clinic) return false;
      if (selectedFilters.serviceLevel !== 'all' && trip.serviceLevel !== selectedFilters.serviceLevel) return false;
      return true;
    });
  }, [trips, selectedFilters]);

  // Get trips for a specific date
  const getTripsForDate = (date: Date) => {
    return filteredTrips.filter(trip => {
      const tripDate = new Date(trip.scheduledTime);
      return tripDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  };

  // Generate month calendar days
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Generate week days
  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 border-gray-300 text-gray-700',
      scheduled: 'bg-blue-100 border-blue-300 text-blue-700',
      assigned: 'bg-cyan-100 border-cyan-300 text-cyan-700',
      arrived: 'bg-indigo-100 border-indigo-300 text-indigo-700',
      'on-way': 'bg-purple-100 border-purple-300 text-purple-700',
      in_progress: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      completed: 'bg-green-100 border-green-300 text-green-700',
      cancelled: 'bg-red-100 border-red-300 text-red-700',
      'no-show': 'bg-orange-100 border-orange-300 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 border-gray-300 text-gray-700';
  };

  // Get service level icon color
  const getServiceLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      ambulatory: 'text-blue-600',
      wheelchair: 'text-green-600',
      stretcher: 'text-amber-600'
    };
    return colors[level] || 'text-gray-600';
  };

  // Trip card component
  const TripCard: React.FC<{ trip: Trip; compact?: boolean }> = ({ trip, compact = false }) => {
    const driver = drivers.find(d => d.id === trip.driverId);
    const clinic = clinics.find(c => c.id === trip.clinicId);
    const time = new Date(trip.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (compact) {
      return (
        <div
          onClick={() => onTripClick?.(trip)}
          className={`text-xs p-1.5 rounded border-l-2 mb-1 cursor-pointer hover:shadow-md transition-all ${getStatusColor(trip.status)}`}
        >
          <div className="font-semibold truncate">{time}</div>
          <div className="truncate text-xs opacity-90">{trip.firstName} {trip.lastName}</div>
        </div>
      );
    }

    return (
      <div
        onClick={() => onTripClick?.(trip)}
        className={`p-3 rounded-lg border-l-4 mb-2 cursor-pointer hover:shadow-lg transition-all ${getStatusColor(trip.status)}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="font-bold text-sm">{time}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getServiceLevelColor(trip.serviceLevel)}`}>
            {trip.serviceLevel === 'ambulatory' ? 'AMB' : trip.serviceLevel === 'wheelchair' ? 'W/C' : 'STR'}
          </span>
        </div>

        <div className="space-y-1 text-sm">
          <div className="font-semibold truncate">{trip.firstName} {trip.lastName}</div>

          {trip.customerPhone && (
            <div className="flex items-center space-x-1 text-xs opacity-80">
              <Phone className="w-3 h-3" />
              <span className="truncate">{trip.customerPhone}</span>
            </div>
          )}

          <div className="flex items-start space-x-1 text-xs opacity-80">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="truncate">{trip.pickupLocation}</span>
          </div>

          {driver && (
            <div className="flex items-center space-x-1 text-xs opacity-80">
              <Car className="w-3 h-3" />
              <span className="truncate">{driver.name}</span>
            </div>
          )}

          {clinic && (
            <div className="flex items-center space-x-1 text-xs opacity-80">
              <Users className="w-3 h-3" />
              <span className="truncate">{clinic.name}</span>
            </div>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-current opacity-50">
          <span className="text-xs font-medium uppercase">{trip.status}</span>
        </div>
      </div>
    );
  };

  // Month View
  const MonthView = () => {
    const days = getMonthDays();
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-700">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === today.toDateString();
          const dayTrips = getTripsForDate(day);

          return (
            <div
              key={idx}
              className={`bg-white min-h-[120px] p-2 ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${isToday ? 'bg-blue-500 text-white px-2 py-0.5 rounded-full' : ''}`}>
                  {day.getDate()}
                </span>
                {dayTrips.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    {dayTrips.length}
                  </span>
                )}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {dayTrips.slice(0, 3).map(trip => (
                  <TripCard key={trip.id} trip={trip} compact />
                ))}
                {dayTrips.length > 3 && (
                  <div className="text-xs text-blue-600 font-medium text-center py-1">
                    +{dayTrips.length - 3} more
                  </div>
                )}
              </div>
              <button
                onClick={() => onCreateTrip?.(day)}
                className="mt-1 w-full text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3 mx-auto" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Week View
  const WeekView = () => {
    const days = getWeekDays();
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = day.toDateString() === today.toDateString();
          const dayTrips = getTripsForDate(day);

          return (
            <div
              key={idx}
              className={`bg-white rounded-lg p-4 shadow-sm border-2 ${isToday ? 'border-blue-500' : 'border-gray-200'}`}
            >
              <div className="text-center mb-3">
                <div className="text-xs font-semibold text-gray-600 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
                {dayTrips.length > 0 && (
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium inline-block mt-1">
                    {dayTrips.length} trips
                  </div>
                )}
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[500px]">
                {dayTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
                {dayTrips.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No trips scheduled
                  </div>
                )}
              </div>

              <button
                onClick={() => onCreateTrip?.(day)}
                className="mt-3 w-full flex items-center justify-center space-x-2 text-sm text-blue-600 hover:bg-blue-50 py-2 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trip</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Day View
  const DayView = () => {
    const dayTrips = getTripsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="text-sm font-semibold text-gray-600 uppercase mb-1">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-4xl font-bold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {dayTrips.length > 0 && (
            <div className="text-lg bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-medium inline-block">
              {dayTrips.length} trips scheduled
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {dayTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          {dayTrips.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-12">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No trips scheduled for this day</p>
            </div>
          )}
        </div>

        <button
          onClick={() => onCreateTrip?.(currentDate)}
          className="w-full flex items-center justify-center space-x-2 text-lg text-blue-600 hover:bg-blue-50 py-4 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all"
        >
          <Plus className="w-6 h-6" />
          <span>Schedule New Trip</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Calendar Scheduling</h1>
            <p className="text-blue-100">Visual trip management at your fingertips</p>
          </div>
          <CalendarIcon className="w-12 h-12 opacity-50" />
        </div>

        {/* Navigation and View Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={navigatePrevious}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={navigateToday}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors font-semibold"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold ml-4">{getCalendarTitle()}</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'month' ? 'bg-white text-blue-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'week' ? 'bg-white text-blue-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'day' ? 'bg-white text-blue-600' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedFilters.status}
            onChange={e => setSelectedFilters({ ...selectedFilters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={selectedFilters.driver}
            onChange={e => setSelectedFilters({ ...selectedFilters, driver: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Drivers</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>

          <select
            value={selectedFilters.clinic}
            onChange={e => setSelectedFilters({ ...selectedFilters, clinic: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Contractors</option>
            {clinics.map(clinic => (
              <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
            ))}
          </select>

          <select
            value={selectedFilters.serviceLevel}
            onChange={e => setSelectedFilters({ ...selectedFilters, serviceLevel: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Service Levels</option>
            <option value="ambulatory">Ambulatory</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="stretcher">Stretcher</option>
          </select>
        </div>
      </div>

      {/* Calendar View */}
      <div>
        {viewMode === 'month' && <MonthView />}
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'day' && <DayView />}
      </div>

      {/* Stats Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{filteredTrips.length}</div>
            <div className="text-sm text-gray-600">Total Trips</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {filteredTrips.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {filteredTrips.filter(t => ['scheduled', 'assigned'].includes(t.status)).length}
            </div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {filteredTrips.filter(t => t.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </div>
      </div>
    </div>
  );
};
