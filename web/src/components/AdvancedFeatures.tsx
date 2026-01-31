import React, { useState } from 'react';
import { Calendar, RepeatIcon, Search, Download, FileText, Users } from 'lucide-react';
import CalendarView from './CalendarView';
import RecurringTripManager from './RecurringTripManager';
import { Trip, RecurringTrip, Driver } from '../types';
import { exportDriverPayoutToCSV, exportDriverPayoutToPDF } from '../utils/exportUtils';

interface AdvancedFeaturesProps {
  activeTab: 'calendar' | 'recurring' | 'search' | 'export';
  trips: Trip[];
  recurringTrips: RecurringTrip[];
  drivers: Driver[];
  onTripClick: (trip: Trip) => void;
  onDateClick: (date: Date) => void;
  onCreateTrip: () => void;
  onAddRecurring: (trip: Omit<RecurringTrip, 'id' | 'createdAt' | 'updated At'>) => void;
  onEditRecurring: (id: string, trip: Partial<RecurringTrip>) => void;
  onDeleteRecurring: (id: string) => void;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({
  activeTab,
  trips,
  recurringTrips,
  drivers,
  onTripClick,
  onDateClick,
  onCreateTrip,
  onAddRecurring,
  onEditRecurring,
  onDeleteRecurring
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'name' | 'tripNumber'>('name');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleSearch = () => {
    const query = searchQuery.toLowerCase();
    return trips.filter(trip => {
      switch (searchType) {
        case 'phone':
          return trip.customerPhone.toLowerCase().includes(query);
        case 'name':
          return trip.customerName.toLowerCase().includes(query);
        case 'tripNumber':
          return trip.tripNumber?.toLowerCase().includes(query);
        default:
          return false;
      }
    });
  };

  const handleExportDriverPayout = () => {
    if (!selectedDriver || !exportStartDate || !exportEndDate) {
      alert('Please select a driver and date range');
      return;
    }

    const driver = drivers.find(d => d.id === selectedDriver);
    if (!driver) return;

    exportDriverPayoutToCSV(
      driver.id,
      driver.name,
      trips,
      exportStartDate,
      exportEndDate
    );
  };

  const renderCalendar = () => (
    <CalendarView
      trips={trips}
      onTripClick={onTripClick}
      onDateClick={onDateClick}
      onCreateTrip={onCreateTrip}
    />
  );

  const renderRecurring = () => (
    <RecurringTripManager
      recurringTrips={recurringTrips}
      onAdd={onAddRecurring}
      onEdit={onEditRecurring}
      onDelete={onDeleteRecurring}
    />
  );

  const renderAdvancedSearch = () => {
    const searchResults = searchQuery ? handleSearch() : [];

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Advanced Search</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search By
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Patient Name</option>
                <option value="phone">Phone Number</option>
                <option value="tripNumber">Trip Number</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Query
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by ${searchType}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {searchQuery && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Search Results ({searchResults.length})
              </h3>
              <div className="space-y-2">
                {searchResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No results found</p>
                ) : (
                  searchResults.map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => onTripClick(trip)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{trip.customerName}</p>
                          <p className="text-sm text-gray-600">{trip.customerPhone}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Trip #{trip.tripNumber} - {new Date(trip.scheduledTime).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                          trip.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {trip.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExports = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Download className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Export Data</h2>
      </div>

      <div className="space-y-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Driver Payout Report</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Driver
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose driver...</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                min={exportStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleExportDriverPayout}
              disabled={!selectedDriver || !exportStartDate || !exportEndDate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export to CSV
            </button>
            <button
              onClick={() => {
                const driver = drivers.find(d => d.id === selectedDriver);
                if (!driver) return;
                exportDriverPayoutToPDF(
                  driver.id,
                  driver.name,
                  trips,
                  exportStartDate,
                  exportEndDate
                );
              }}
              disabled={!selectedDriver || !exportStartDate || !exportEndDate}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  switch (activeTab) {
    case 'calendar':
      return renderCalendar();
    case 'recurring':
      return renderRecurring();
    case 'search':
      return renderAdvancedSearch();
    case 'export':
      return renderExports();
    default:
      return renderCalendar();
  }
};

export default AdvancedFeatures;
