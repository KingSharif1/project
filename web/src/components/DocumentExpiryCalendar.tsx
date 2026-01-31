import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Shield, Car, Heart, Clipboard, X, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface DocumentExpiryCalendarProps {
  drivers: any[];
  onClose: () => void;
}

export const DocumentExpiryCalendar: React.FC<DocumentExpiryCalendarProps> = ({ drivers, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const documentTypes = [
    { key: 'license_expiry_date', label: 'License', icon: Shield, color: 'blue' },
    { key: 'insurance_expiry_date', label: 'Insurance', icon: FileText, color: 'green' },
    { key: 'registration_expiry_date', label: 'Registration', icon: Car, color: 'purple' },
    { key: 'medical_cert_expiry_date', label: 'Medical', icon: Heart, color: 'red' },
    { key: 'background_check_expiry_date', label: 'Background', icon: Clipboard, color: 'amber' }
  ];

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const calendarDays: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    calendarDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const getExpiringDocuments = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const expiring: any[] = [];

    drivers.forEach(driver => {
      documentTypes.forEach(docType => {
        const expiryDate = (driver as any)[docType.key];
        if (expiryDate && expiryDate.split('T')[0] === dateStr) {
          if (filterType === 'all' || filterType === docType.key) {
            expiring.push({
              driver: driver.name,
              driverId: driver.id,
              type: docType.label,
              typeKey: docType.key,
              color: docType.color,
              icon: docType.icon,
              date: expiryDate
            });
          }
        }
      });
    });

    return expiring;
  };

  const hasExpiry = (date: Date) => {
    return getExpiringDocuments(date).length > 0;
  };

  const allExpiringDocuments = useMemo(() => {
    const all: any[] = [];
    drivers.forEach(driver => {
      documentTypes.forEach(docType => {
        const expiryDate = (driver as any)[docType.key];
        if (expiryDate) {
          const date = new Date(expiryDate);
          if (date >= monthStart && date <= monthEnd) {
            if (filterType === 'all' || filterType === docType.key) {
              all.push({
                driver: driver.name,
                driverId: driver.id,
                type: docType.label,
                typeKey: docType.key,
                color: docType.color,
                icon: docType.icon,
                date: expiryDate,
                dateObj: date
              });
            }
          }
        }
      });
    });
    return all.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [drivers, currentDate, filterType]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleExportExcel = () => {
    const data = allExpiringDocuments.map(doc => ({
      'Driver': doc.driver,
      'Document Type': doc.type,
      'Expiry Date': new Date(doc.date).toLocaleDateString(),
      'Days Until Expiry': Math.floor((new Date(doc.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Document Expiries');
    XLSX.writeFile(wb, `document_expiries_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Document Expiry Calendar', 14, 20);
    doc.setFontSize(12);
    doc.text(`${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 30);

    let yPos = 45;
    allExpiringDocuments.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.text(`${new Date(item.date).toLocaleDateString()} - ${item.driver} - ${item.type}`, 14, yPos);
      yPos += 7;
    });

    doc.save(`document_expiries_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.pdf`);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Document Expiry Calendar</h2>
              <p className="text-blue-100 mt-1">Visual overview of all document expiration dates</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h3 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Documents</option>
                {documentTypes.map(type => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>

              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <span className="font-semibold text-gray-700">Legend:</span>
            {documentTypes.map(type => {
              const Icon = type.icon;
              return (
                <div key={type.key} className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded-full bg-${type.color}-500`}></div>
                  <span className="text-gray-600">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              const expiring = getExpiringDocuments(date);
              const isDateToday = isToday(date);
              const isDateCurrentMonth = isCurrentMonth(date);

              return (
                <div
                  key={index}
                  onClick={() => expiring.length > 0 && setSelectedDate(date)}
                  className={`min-h-[100px] p-2 rounded-lg border-2 transition-all ${
                    isDateToday
                      ? 'border-blue-500 bg-blue-50'
                      : hasExpiry(date)
                      ? 'border-red-200 bg-red-50 cursor-pointer hover:border-red-400'
                      : 'border-gray-200 bg-white'
                  } ${!isDateCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    isDateToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {expiring.slice(0, 3).map((doc, i) => {
                      const Icon = doc.icon;
                      return (
                        <div
                          key={i}
                          className={`flex items-center space-x-1 text-xs bg-${doc.color}-100 text-${doc.color}-700 px-1 py-0.5 rounded`}
                        >
                          <Icon className="w-3 h-3" />
                          <span className="truncate">{doc.driver}</span>
                        </div>
                      );
                    })}
                    {expiring.length > 3 && (
                      <div className="text-xs text-gray-500 font-semibold">
                        +{expiring.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900">
                Expiring on {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h4>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getExpiringDocuments(selectedDate).map((doc, index) => {
                const Icon = doc.icon;
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 border-${doc.color}-200 bg-${doc.color}-50`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className={`w-4 h-4 text-${doc.color}-600`} />
                      <span className="font-semibold text-gray-900">{doc.driver}</span>
                    </div>
                    <div className="text-sm text-gray-700">{doc.type}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month Summary */}
        {allExpiringDocuments.length > 0 && (
          <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">
                  {allExpiringDocuments.length} document{allExpiringDocuments.length !== 1 ? 's' : ''} expiring this month
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {documentTypes.map(type => {
                  const count = allExpiringDocuments.filter(d => d.typeKey === type.key).length;
                  if (count === 0) return null;
                  return (
                    <span key={type.key} className={`px-2 py-1 rounded-full text-xs font-semibold bg-${type.color}-100 text-${type.color}-700`}>
                      {type.label}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
