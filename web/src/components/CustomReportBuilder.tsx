import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckSquare,
  Square,
  Calendar,
  Users,
  Car,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  X,
  FileDown,
  Mail,
  Save,
  BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportSection {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const REPORT_SECTIONS: ReportSection[] = [
  { id: 'billing', name: 'Billing Summary', icon: DollarSign, description: 'Revenue, completed, cancelled, and no-show trips' },
  { id: 'trips', name: 'Trip Details', icon: Car, description: 'Complete list of trips with status and details' },
  { id: 'drivers', name: 'Driver Performance', icon: Users, description: 'Driver statistics and performance metrics' },
  { id: 'contractors', name: 'Contractor Summary', icon: Building2, description: 'Contractor-wise trip breakdown' },
  { id: 'analytics', name: 'Analytics & Metrics', icon: TrendingUp, description: 'Charts and performance indicators' },
  { id: 'patients', name: 'Patient List', icon: Users, description: 'Patient information and trip history' },
];

interface TripColumn {
  id: string;
  name: string;
  description: string;
}

const TRIP_COLUMNS: TripColumn[] = [
  { id: 'date', name: 'Date', description: 'Trip date' },
  { id: 'tripNumber', name: 'Trip #', description: 'Trip number' },
  { id: 'patient', name: 'Patient Name', description: 'Patient/passenger name' },
  { id: 'phone', name: 'Phone', description: 'Patient phone number' },
  { id: 'route', name: 'Route', description: 'Pickup → Dropoff' },
  { id: 'driver', name: 'Driver', description: 'Assigned driver' },
  { id: 'vehicle', name: 'Vehicle', description: 'Vehicle information' },
  { id: 'mileage', name: 'Mileage', description: 'Trip distance' },
  { id: 'serviceLevel', name: 'Service Level', description: 'Ambulatory/Wheelchair/Stretcher' },
  { id: 'tripType', name: 'Trip Type', description: 'Clinic/Private' },
  { id: 'status', name: 'Status', description: 'Trip status' },
  { id: 'fare', name: 'Fare', description: 'Trip charge' },
  { id: 'appointmentTime', name: 'Appt Time', description: 'Appointment time' },
  { id: 'pickupTime', name: 'Pickup Time', description: 'Actual pickup time' },
  { id: 'dropoffTime', name: 'Dropoff Time', description: 'Actual dropoff time' },
  { id: 'notes', name: 'Notes', description: 'Trip notes' },
];

interface CustomReportBuilderProps {
  onClose: () => void;
}

export const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({ onClose }) => {
  const { trips, drivers, clinics, patients } = useApp();
  const { user, isAdmin } = useAuth();

  const [selectedSections, setSelectedSections] = useState<string[]>(['billing', 'trips']);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportTitle, setReportTitle] = useState('Custom Transportation Report');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);

  // Column selection for trip details
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'date', 'tripNumber', 'patient', 'route', 'driver', 'vehicle', 'status', 'fare'
  ]);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const tripDate = new Date(trip.scheduledTime);
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      const inDateRange = tripDate >= startDate && tripDate <= endDate;
      const inContractor = selectedContractors.length === 0 || selectedContractors.includes(trip.clinicId);

      return inDateRange && inContractor;
    });
  }, [trips, dateRange, selectedContractors]);

  const analytics = useMemo(() => {
    const completedTrips = filteredTrips.filter(t => t.status === 'completed');
    const cancelledTrips = filteredTrips.filter(t => t.status === 'cancelled');
    const noShowTrips = filteredTrips.filter(t => t.status === 'no-show');

    const completedRevenue = completedTrips.reduce((sum, t) => sum + t.fare, 0);
    const cancelledRevenue = cancelledTrips.reduce((sum, t) => sum + t.fare, 0);
    const noShowRevenue = noShowTrips.reduce((sum, t) => sum + t.fare, 0);

    return {
      totalTrips: filteredTrips.length,
      completed: completedTrips.length,
      cancelled: cancelledTrips.length,
      noShow: noShowTrips.length,
      completedRevenue,
      cancelledRevenue,
      noShowRevenue,
      totalBillable: completedRevenue + noShowRevenue,
    };
  }, [filteredTrips]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Date Range
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${dateRange.start} to ${dateRange.end}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Billing Summary
    if (selectedSections.includes('billing')) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Billing Summary', 14, yPos);
      yPos += 8;

      const billingData = [
        ['Metric', 'Count', 'Revenue'],
        ['Total Trips', analytics.totalTrips.toString(), `$${analytics.completedRevenue.toFixed(2)}`],
        ['Completed Trips', analytics.completed.toString(), `$${analytics.completedRevenue.toFixed(2)}`],
        ['Cancelled Trips', analytics.cancelled.toString(), `$${analytics.cancelledRevenue.toFixed(2)}`],
        ['No-Show Trips', analytics.noShow.toString(), `$${analytics.noShowRevenue.toFixed(2)}`],
        ['Total Billable', '', `$${analytics.totalBillable.toFixed(2)}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [billingData[0]],
        body: billingData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Trip Details
    if (selectedSections.includes('trips') && filteredTrips.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Trip Details', 14, yPos);
      yPos += 8;

      const headers = selectedColumns.map(colId => {
        const col = TRIP_COLUMNS.find(c => c.id === colId);
        return col?.name || colId;
      });

      const rows = filteredTrips.slice(0, 100).map(trip => {
        return selectedColumns.map(colId => {
          switch (colId) {
            case 'date':
              return new Date(trip.scheduledTime).toLocaleDateString();
            case 'tripNumber':
              return trip.tripNumber || trip.id.slice(0, 8);
            case 'patient':
              return trip.customerName || 'Unknown';
            case 'phone':
              return trip.customerPhone || '';
            case 'route':
              return `${trip.pickupLocation} → ${trip.dropoffLocation}`;
            case 'driver':
              return drivers.find(d => d.id === trip.driverId)?.name || 'Unassigned';
            case 'vehicle':
              return trip.vehicleId || '';
            case 'mileage':
              return trip.distance?.toString() || '0';
            case 'serviceLevel':
              return trip.serviceLevel || '';
            case 'tripType':
              return trip.tripType || '';
            case 'status':
              return trip.status || '';
            case 'fare':
              return `$${trip.fare.toFixed(2)}`;
            case 'appointmentTime':
              return trip.appointmentTime ? new Date(trip.appointmentTime).toLocaleTimeString() : '';
            case 'pickupTime':
              return trip.actualPickupTime ? new Date(trip.actualPickupTime).toLocaleTimeString() : '';
            case 'dropoffTime':
              return trip.actualDropoffTime ? new Date(trip.actualDropoffTime).toLocaleTimeString() : '';
            case 'notes':
              return trip.notes || '';
            default:
              return '';
          }
        });
      });

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
    }

    // Driver Performance
    if (selectedSections.includes('drivers')) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Driver Performance', 14, yPos);
      yPos += 8;

      const driverStats = drivers.map(driver => {
        const driverTrips = filteredTrips.filter(t => t.driverId === driver.id);
        const completed = driverTrips.filter(t => t.status === 'completed').length;
        const revenue = driverTrips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.fare, 0);
        return [
          driver.name,
          driverTrips.length.toString(),
          completed.toString(),
          `$${revenue.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Driver', 'Total Trips', 'Completed', 'Revenue']],
        body: driverStats,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
      });
    }

    // Contractor Summary
    if (selectedSections.includes('contractors')) {
      if ((doc as any).lastAutoTable) {
        yPos = (doc as any).lastAutoTable.finalY + 15;
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
      } else {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Contractor Summary', 14, yPos);
      yPos += 8;

      const contractorStats = clinics.map(clinic => {
        const clinicTrips = filteredTrips.filter(t => t.clinicId === clinic.id);
        const completed = clinicTrips.filter(t => t.status === 'completed').length;
        const revenue = clinicTrips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.fare, 0);
        return [
          clinic.name,
          clinicTrips.length.toString(),
          completed.toString(),
          `$${revenue.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Contractor', 'Total Trips', 'Completed', 'Revenue']],
        body: contractorStats,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
      });
    }

    // Save PDF
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${dateRange.start}_to_${dateRange.end}.pdf`;
    doc.save(filename);
  };

  const handleExportCSV = () => {
    let csvContent = '';

    // Title and metadata
    csvContent += `"${reportTitle}"\n`;
    csvContent += `"Report Period: ${dateRange.start} to ${dateRange.end}"\n`;
    csvContent += `"Generated: ${new Date().toLocaleString()}"\n\n`;

    // Billing Summary
    if (selectedSections.includes('billing')) {
      csvContent += '"BILLING SUMMARY"\n';
      csvContent += '"Metric","Count","Revenue"\n';
      csvContent += `"Total Trips","${analytics.totalTrips}","$${analytics.completedRevenue.toFixed(2)}"\n`;
      csvContent += `"Completed Trips","${analytics.completed}","$${analytics.completedRevenue.toFixed(2)}"\n`;
      csvContent += `"Cancelled Trips","${analytics.cancelled}","$${analytics.cancelledRevenue.toFixed(2)}"\n`;
      csvContent += `"No-Show Trips","${analytics.noShow}","$${analytics.noShowRevenue.toFixed(2)}"\n`;
      csvContent += `"Total Billable","","$${analytics.totalBillable.toFixed(2)}"\n\n`;
    }

    // Trip Details
    if (selectedSections.includes('trips') && filteredTrips.length > 0) {
      csvContent += '"TRIP DETAILS"\n';

      // Headers
      const headers = selectedColumns.map(colId => {
        const col = TRIP_COLUMNS.find(c => c.id === colId);
        return `"${col?.name || colId}"`;
      });
      csvContent += headers.join(',') + '\n';

      // Rows
      filteredTrips.forEach(trip => {
        const row = selectedColumns.map(colId => {
          let value = '';
          switch (colId) {
            case 'date':
              value = new Date(trip.scheduledTime).toLocaleDateString();
              break;
            case 'tripNumber':
              value = trip.tripNumber || trip.id.slice(0, 8);
              break;
            case 'patient':
              value = trip.customerName || 'Unknown';
              break;
            case 'phone':
              value = trip.customerPhone || '';
              break;
            case 'route':
              value = `${trip.pickupLocation} → ${trip.dropoffLocation}`;
              break;
            case 'driver':
              value = drivers.find(d => d.id === trip.driverId)?.name || 'Unassigned';
              break;
            case 'vehicle':
              value = trip.vehicleId || '';
              break;
            case 'mileage':
              value = trip.distance?.toString() || '0';
              break;
            case 'serviceLevel':
              value = trip.serviceLevel || '';
              break;
            case 'tripType':
              value = trip.tripType || '';
              break;
            case 'status':
              value = trip.status || '';
              break;
            case 'fare':
              value = `$${trip.fare.toFixed(2)}`;
              break;
            case 'appointmentTime':
              value = trip.appointmentTime ? new Date(trip.appointmentTime).toLocaleString() : '';
              break;
            case 'pickupTime':
              value = trip.actualPickupTime ? new Date(trip.actualPickupTime).toLocaleString() : '';
              break;
            case 'dropoffTime':
              value = trip.actualDropoffTime ? new Date(trip.actualDropoffTime).toLocaleString() : '';
              break;
            case 'notes':
              value = (trip.notes || '').replace(/"/g, '""');
              break;
          }
          return `"${value}"`;
        });
        csvContent += row.join(',') + '\n';
      });
      csvContent += '\n';
    }

    // Driver Performance
    if (selectedSections.includes('drivers')) {
      csvContent += '"DRIVER PERFORMANCE"\n';
      csvContent += '"Driver","Total Trips","Completed","Revenue"\n';
      drivers.forEach(driver => {
        const driverTrips = filteredTrips.filter(t => t.driverId === driver.id);
        const completed = driverTrips.filter(t => t.status === 'completed').length;
        const revenue = driverTrips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.fare, 0);
        csvContent += `"${driver.name}","${driverTrips.length}","${completed}","$${revenue.toFixed(2)}"\n`;
      });
      csvContent += '\n';
    }

    // Contractor Summary
    if (selectedSections.includes('contractors')) {
      csvContent += '"CONTRACTOR SUMMARY"\n';
      csvContent += '"Contractor","Total Trips","Completed","Revenue"\n';
      clinics.forEach(clinic => {
        const clinicTrips = filteredTrips.filter(t => t.clinicId === clinic.id);
        const completed = clinicTrips.filter(t => t.status === 'completed').length;
        const revenue = clinicTrips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.fare, 0);
        csvContent += `"${clinic.name}","${clinicTrips.length}","${completed}","$${revenue.toFixed(2)}"\n`;
      });
    }

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${dateRange.start}_to_${dateRange.end}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Custom Report Builder</h2>
              <p className="text-blue-100 text-sm">Select sections and customize your report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto print:hidden">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter report title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {isAdmin && clinics.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter by Contractors
                  </label>
                  <div className="space-y-2">
                    {clinics.filter(c => c.isActive).map(clinic => (
                      <button
                        key={clinic.id}
                        onClick={() => {
                          setSelectedContractors(prev =>
                            prev.includes(clinic.id)
                              ? prev.filter(id => id !== clinic.id)
                              : [...prev, clinic.id]
                          );
                        }}
                        className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedContractors.includes(clinic.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {selectedContractors.includes(clinic.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span className="flex-1 text-left truncate">{clinic.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Sections to Include
                </label>
                <div className="space-y-2">
                  {REPORT_SECTIONS.map(section => {
                    const Icon = section.icon;
                    const isSelected = selectedSections.includes(section.id);

                    return (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        className={`w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Icon className="w-4 h-4" />
                            <span className="font-semibold text-sm">{section.name}</span>
                          </div>
                          <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                            {section.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIncludeDetails(!includeDetails)}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                >
                  {includeDetails ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>Include detailed breakdowns</span>
                </button>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  <FileDown className="w-5 h-5" />
                  <span>Export as CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white p-8 overflow-y-auto print:p-0">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="text-center mb-8 print:mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-3xl">{reportTitle}</h1>
                <p className="text-gray-600">
                  Report Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Generated on {new Date().toLocaleString()}
                </p>
                {selectedContractors.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">
                    Filtered by: {selectedContractors.map(id => clinics.find(c => c.id === id)?.name).join(', ')}
                  </p>
                )}
              </div>

              {selectedSections.includes('billing') && (
                <section className="break-inside-avoid">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Billing Summary</h2>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-green-800 mb-1">Completed Trips</p>
                      <p className="text-3xl font-bold text-green-600">{analytics.completed}</p>
                      <p className="text-sm text-green-700 mt-1">${analytics.completedRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-orange-800 mb-1">No-Show Trips</p>
                      <p className="text-3xl font-bold text-orange-600">{analytics.noShow}</p>
                      <p className="text-sm text-orange-700 mt-1">${analytics.noShowRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-800 mb-1">Cancelled Trips</p>
                      <p className="text-3xl font-bold text-red-600">{analytics.cancelled}</p>
                      <p className="text-sm text-red-700 mt-1">${analytics.cancelledRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Total Billable</p>
                      <p className="text-3xl font-bold text-blue-600">${analytics.totalBillable.toFixed(2)}</p>
                      <p className="text-xs text-blue-700 mt-1">{analytics.completed + analytics.noShow} trips</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold mb-1">Billing Notes:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Completed trips: Full service provided, fully billable</li>
                          <li>No-show trips: Vehicle dispatched, driver en route - billable</li>
                          <li>Cancelled trips: Cancelled before dispatch - not billable</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {selectedSections.includes('trips') && (
                <section className="break-inside-avoid">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <Car className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Trip Details</h2>
                  </div>

                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Patient</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">From → To</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Driver</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Status</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-700">Fare</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrips.slice(0, includeDetails ? undefined : 20).map((trip, index) => {
                          const patient = patients.find(p => p.id === trip.patientId);
                          const driver = drivers.find(d => d.id === trip.driverId);

                          return (
                            <tr key={trip.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-2 px-3 text-gray-700 border-r border-gray-200">
                                {new Date(trip.scheduledTime).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-gray-700 border-r border-gray-200">{patient?.name || 'N/A'}</td>
                              <td className="py-2 px-3 text-gray-700 text-xs border-r border-gray-200">
                                <div className="max-w-xs truncate">{trip.pickup}</div>
                                <div className="max-w-xs truncate text-gray-500">→ {trip.dropoff}</div>
                              </td>
                              <td className="py-2 px-3 text-gray-700 border-r border-gray-200">{driver?.name || 'Unassigned'}</td>
                              <td className="py-2 px-3 border-r border-gray-200">
                                <StatusBadge status={trip.status} />
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                ${trip.fare.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                          <td colSpan={5} className="py-3 px-3 text-right border-r border-gray-300">Total:</td>
                          <td className="py-3 px-3 text-right text-blue-600">
                            ${filteredTrips.reduce((sum, t) => sum + t.fare, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {!includeDetails && filteredTrips.length > 20 && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Showing 20 of {filteredTrips.length} trips. Enable "Include detailed breakdowns" to show all.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {selectedSections.includes('drivers') && (
                <section className="break-inside-avoid">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Driver Performance</h2>
                  </div>

                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Driver Name</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Total Trips</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Completed</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Rating</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-700">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.filter(d => d.isActive).map((driver, index) => {
                          const driverTrips = filteredTrips.filter(t => t.driverId === driver.id);
                          const completedTrips = driverTrips.filter(t => t.status === 'completed');
                          const revenue = completedTrips.reduce((sum, t) => sum + t.fare, 0);

                          return (
                            <tr key={driver.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-2 px-3 text-gray-700 font-medium border-r border-gray-200">{driver.name}</td>
                              <td className="py-2 px-3 text-center text-gray-700 border-r border-gray-200">{driverTrips.length}</td>
                              <td className="py-2 px-3 text-center text-green-600 font-semibold border-r border-gray-200">{completedTrips.length}</td>
                              <td className="py-2 px-3 text-center text-yellow-600 font-semibold border-r border-gray-200">
                                ⭐ {driver.rating.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                ${revenue.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {selectedSections.includes('contractors') && isAdmin && (
                <section className="break-inside-avoid">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Contractor Summary</h2>
                  </div>

                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Contractor Name</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Total Trips</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Completed</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Cancelled</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">No-Show</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-700">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clinics.filter(c => c.isActive).map((clinic, index) => {
                          const clinicTrips = filteredTrips.filter(t => t.clinicId === clinic.id);
                          const completed = clinicTrips.filter(t => t.status === 'completed');
                          const cancelled = clinicTrips.filter(t => t.status === 'cancelled');
                          const noShow = clinicTrips.filter(t => t.status === 'no-show');
                          const revenue = completed.reduce((sum, t) => sum + t.fare, 0) +
                                         noShow.reduce((sum, t) => sum + t.fare, 0);

                          return (
                            <tr key={clinic.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-2 px-3 text-gray-700 font-medium border-r border-gray-200">{clinic.name}</td>
                              <td className="py-2 px-3 text-center text-gray-700 border-r border-gray-200">{clinicTrips.length}</td>
                              <td className="py-2 px-3 text-center text-green-600 font-semibold border-r border-gray-200">{completed.length}</td>
                              <td className="py-2 px-3 text-center text-red-600 border-r border-gray-200">{cancelled.length}</td>
                              <td className="py-2 px-3 text-center text-orange-600 border-r border-gray-200">{noShow.length}</td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                ${revenue.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {selectedSections.includes('analytics') && (
                <section className="break-inside-avoid space-y-6">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Analytics & Metrics</h2>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-600 mb-1">Completion Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {analytics.totalTrips > 0
                          ? ((analytics.completed / analytics.totalTrips) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-600 mb-1">Cancellation Rate</p>
                      <p className="text-3xl font-bold text-red-600">
                        {analytics.totalTrips > 0
                          ? ((analytics.cancelled / analytics.totalTrips) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-600 mb-1">No-Show Rate</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {analytics.totalTrips > 0
                          ? ((analytics.noShow / analytics.totalTrips) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Trip Status Distribution Chart */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Status Distribution</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Completed</span>
                          <span className="text-gray-900 font-semibold">{analytics.completed} trips</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                            style={{ width: `${analytics.totalTrips > 0 ? (analytics.completed / analytics.totalTrips * 100) : 0}%` }}
                          >
                            {analytics.totalTrips > 0 ? ((analytics.completed / analytics.totalTrips) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Cancelled</span>
                          <span className="text-gray-900 font-semibold">{analytics.cancelled} trips</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                            style={{ width: `${analytics.totalTrips > 0 ? (analytics.cancelled / analytics.totalTrips * 100) : 0}%` }}
                          >
                            {analytics.totalTrips > 0 ? ((analytics.cancelled / analytics.totalTrips) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">No-Show</span>
                          <span className="text-gray-900 font-semibold">{analytics.noShow} trips</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                            style={{ width: `${analytics.totalTrips > 0 ? (analytics.noShow / analytics.totalTrips * 100) : 0}%` }}
                          >
                            {analytics.totalTrips > 0 ? ((analytics.noShow / analytics.totalTrips) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Breakdown Chart */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Breakdown</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Completed Revenue</span>
                          <span className="text-green-600 font-bold">${analytics.completedRevenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                            style={{ width: `${analytics.totalBillable > 0 ? (analytics.completedRevenue / analytics.totalBillable * 100) : 0}%` }}
                          >
                            {analytics.totalBillable > 0 ? ((analytics.completedRevenue / analytics.totalBillable) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">No-Show Revenue</span>
                          <span className="text-orange-600 font-bold">${analytics.noShowRevenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                            style={{ width: `${analytics.totalBillable > 0 ? (analytics.noShowRevenue / analytics.totalBillable * 100) : 0}%` }}
                          >
                            {analytics.totalBillable > 0 ? ((analytics.noShowRevenue / analytics.totalBillable) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900">Total Billable</span>
                          <span className="text-blue-600 font-bold text-lg">${analytics.totalBillable.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {selectedSections.includes('patients') && (
                <section className="break-inside-avoid">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-blue-600">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Patient Summary</h2>
                  </div>

                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Patient Name</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Total Trips</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">Completed</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 border-r border-gray-300">No-Show</th>
                          <th className="text-left py-3 px-3 font-semibold text-gray-700">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.slice(0, includeDetails ? undefined : 20).map((patient, index) => {
                          const patientTrips = filteredTrips.filter(t => t.patientId === patient.id);
                          const completed = patientTrips.filter(t => t.status === 'completed');
                          const noShow = patientTrips.filter(t => t.status === 'no-show');

                          if (patientTrips.length === 0) return null;

                          return (
                            <tr key={patient.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-2 px-3 text-gray-700 font-medium border-r border-gray-200">{patient.name}</td>
                              <td className="py-2 px-3 text-center text-gray-700 border-r border-gray-200">{patientTrips.length}</td>
                              <td className="py-2 px-3 text-center text-green-600 font-semibold border-r border-gray-200">{completed.length}</td>
                              <td className="py-2 px-3 text-center text-orange-600 border-r border-gray-200">{noShow.length}</td>
                              <td className="py-2 px-3 text-gray-700">{patient.phone}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200 print:pt-4">
                <p>This report was generated by TransportHub Management Portal</p>
                <p className="text-xs mt-1">For questions or concerns, please contact support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5in;
          }

          body * {
            visibility: hidden;
          }

          .print\\:hidden {
            display: none !important;
          }

          .bg-white, [class*="bg-"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }

          tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px !important;
            text-align: left !important;
            vertical-align: top !important;
          }

          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
            border-bottom: 2px solid #9ca3af !important;
          }

          tr:nth-child(even) {
            background-color: #f9fafb !important;
          }

          section {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }

          .text-right {
            text-align: right !important;
          }

          .text-center {
            text-align: center !important;
          }

          .text-left {
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
};
