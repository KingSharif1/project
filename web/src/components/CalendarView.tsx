import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { Trip } from '../types';
import StatusBadge from './StatusBadge';

interface CalendarViewProps {
  trips: Trip[];
  onTripClick: (trip: Trip) => void;
  onDateClick: (date: Date) => void;
  onCreateTrip: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  trips,
  onTripClick,
  onDateClick,
  onCreateTrip
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const getTripsByDate = (date: Date) => {
    const dateStr = date.toDateString();
    return trips.filter(trip => {
      const tripDate = new Date(trip.scheduledPickupTime || trip.scheduledTime);
      return tripDate.toDateString() === dateStr;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  const renderMonthView = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const day = i - startingDayOfWeek + 1;
      if (day > 0 && day <= daysInMonth) {
        const cellDate = new Date(year, month, day);
        const dayTrips = getTripsByDate(cellDate);
        const isCurrentDay = isToday(day);

        days.push(
          <div
            key={i}
            className={`min-h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
              isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'
            }`}
            onClick={() => onDateClick(cellDate)}
          >
            <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
              {isCurrentDay && <span className="ml-1 text-xs">(Today)</span>}
            </div>
            <div className="space-y-1">
              {dayTrips.slice(0, 3).map(trip => (
                <div
                  key={trip.id}
                  className="text-xs p-1 bg-blue-100 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTripClick(trip);
                  }}
                >
                  <div className="font-medium truncate">
                    {trip.customerName}
                  </div>
                  <div className="text-gray-600 truncate">
                    {new Date(trip.scheduledPickupTime || trip.scheduledTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
              {dayTrips.length > 3 && (
                <div className="text-xs text-gray-500 font-medium">
                  +{dayTrips.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      } else {
        days.push(
          <div key={i} className="min-h-24 border border-gray-100 bg-gray-50"></div>
        );
      }
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Trip Calendar</h2>
          </div>
          <button
            onClick={onCreateTrip}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center">
              <span className="text-sm font-semibold text-gray-700">{day}</span>
            </div>
          ))}
          {renderMonthView()}
        </div>

        <div className="mt-6 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
            <span className="text-gray-600">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span className="text-gray-600">Has trips</span>
          </div>
          <div className="ml-auto text-gray-600">
            Total trips this month: <span className="font-semibold">{trips.filter(t => {
              const tripDate = new Date(t.scheduledPickupTime || t.scheduledTime);
              return tripDate.getMonth() === month && tripDate.getFullYear() === year;
            }).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
