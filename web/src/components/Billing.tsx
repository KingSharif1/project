import React, { useState, useMemo } from 'react';
import { DollarSign, Download, Mail, Users, TrendingUp, Check, X, Calendar, Building2, Send, Settings, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { generateInvoicePDF } from '../utils/invoiceUtils';
import { DriverEarningsDashboard } from './DriverEarningsDashboard';
import { DriverPayoutAdjustments } from './DriverPayoutAdjustments';
import { Modal } from './Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type BillingTab = 'invoicing' | 'payouts' | 'clinic';

const AVAILABLE_INVOICE_COLUMNS = [
  { id: 'tripNumber', label: 'Trip #', enabled: true },
  { id: 'date', label: 'Date', enabled: true },
  { id: 'passengerName', label: 'Passenger Name', enabled: false },
  { id: 'pickupLocation', label: 'Pickup Location', enabled: false },
  { id: 'dropoffLocation', label: 'Dropoff Location', enabled: false },
  { id: 'serviceType', label: 'Service Type', enabled: true },
  { id: 'status', label: 'Status', enabled: true },
  { id: 'driver', label: 'Driver', enabled: true },
  { id: 'distance', label: 'Distance (mi)', enabled: false },
  { id: 'contractedRate', label: 'Contracted Rate', enabled: true },
  { id: 'driverPay', label: 'Driver Pay', enabled: true },
];

export const Billing: React.FC = () => {
  const { trips, drivers, clinics } = useApp();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<BillingTab>('clinic');

  // Helper function to format date without timezone conversion
  const formatDateWithoutTimezone = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [datePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    return `${month}/${day}/${year}`;
  };

  // Calculate the billable amount for a trip based on status
  const calculateBillableAmount = (trip: any) => {
    const clinic = clinics.find(c => c.id === trip.clinicId);
    if (!clinic) return trip.fare || 0;

    // For cancelled trips, use clinic's cancellation rate
    if (trip.status === 'cancelled') {
      return parseFloat(clinic.cancellationRate || '0');
    }

    // For no-show trips, use clinic's no-show rate
    if (trip.status === 'no-show') {
      return parseFloat(clinic.noShowRate || '0');
    }

    // For all other statuses (completed, pending, assigned, in-progress), use full rate
    return trip.fare || 0;
  };
  const [selectedDriverForAdjustments, setSelectedDriverForAdjustments] = useState<{ id: string; name: string } | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedClinic, setSelectedClinic] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [clinicDateRange, setClinicDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [invoiceColumns, setInvoiceColumns] = useState(AVAILABLE_INVOICE_COLUMNS);
  const [showDownloadMenu, setShowDownloadMenu] = useState<string | null>(null);

  const privateTrips = trips.filter(t => t.tripType === 'private');

  const filteredInvoices = privateTrips.filter(trip => {
    if (selectedPassenger && trip.customerName !== selectedPassenger) return false;

    const now = new Date();
    const tripDate = new Date(trip.scheduledTime);

    switch (dateFilter) {
      case 'today':
        return tripDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return tripDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return tripDate >= monthAgo;
      default:
        return true;
    }
  });

  const calculateDriverPayout = (trip: any) => {
    const driver = drivers.find(d => d.id === trip.driverId);
    if (!driver) return 0;

    // Check for cancelled trips - use driver's cancellation rate
    if (trip.status === 'cancelled') {
      return driver.cancellationRate !== undefined && driver.cancellationRate !== null
        ? driver.cancellationRate
        : 0;
    }

    // Check for no-show trips - use driver's no-show rate
    if (trip.status === 'no-show') {
      return driver.noShowRate !== undefined && driver.noShowRate !== null
        ? driver.noShowRate
        : 0;
    }

    // If driverPayout is already set, use it
    if (trip.driverPayout !== undefined && trip.driverPayout !== null && trip.driverPayout > 0) {
      return trip.driverPayout;
    }

    // Calculate payout based on service level and distance using driver's rates
    const distance = trip.distance || 0;
    const roundedMiles = Math.round(distance);

    const serviceLevel = trip.serviceLevel || 'ambulatory';

    // Get driver's rate configuration for the service level
    let baseRate = 0;
    let baseMiles = 5;
    let additionalMileRate = 0;

    switch (serviceLevel) {
      case 'ambulatory':
        baseRate = driver.ambulatoryRate || 0;
        baseMiles = driver.ambulatoryBaseMiles || 5;
        additionalMileRate = driver.ambulatoryAdditionalMileRate || 0;
        break;
      case 'wheelchair':
        baseRate = driver.wheelchairRate || 0;
        baseMiles = driver.wheelchairBaseMiles || 5;
        additionalMileRate = driver.wheelchairAdditionalMileRate || 0;
        break;
      case 'stretcher':
        baseRate = driver.stretcherRate || 0;
        baseMiles = driver.stretcherBaseMiles || 5;
        additionalMileRate = driver.stretcherAdditionalMileRate || 0;
        break;
    }

    // If no rate configured, return 0
    if (baseRate === 0) return 0;

    let payout = baseRate;

    // Add additional miles charge if distance exceeds base miles
    if (roundedMiles > baseMiles) {
      const additionalMiles = roundedMiles - baseMiles;
      payout += additionalMiles * additionalMileRate;
    }

    return Math.round(payout * 100) / 100;
  };

  const driverPayouts = trips
    .filter(t => t.driverId && (t.status === 'completed' || t.status === 'cancelled' || t.status === 'no-show'))
    .filter(trip => {
      if (selectedDriver && trip.driverId !== selectedDriver) return false;

      const now = new Date();
      const tripDate = new Date(trip.scheduledTime);

      switch (dateFilter) {
        case 'today':
          return tripDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return tripDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return tripDate >= monthAgo;
        default:
          return true;
      }
    })
    .map(trip => ({
      ...trip,
      payout: calculateDriverPayout(trip),
      driverName: drivers.find(d => d.id === trip.driverId)?.name || 'Unknown',
    }));

  const groupedPayouts = driverPayouts.reduce((acc, trip) => {
    if (!acc[trip.driverId!]) {
      acc[trip.driverId!] = {
        driverName: trip.driverName,
        trips: [],
        totalPayout: 0,
      };
    }
    acc[trip.driverId!].trips.push(trip);
    acc[trip.driverId!].totalPayout += trip.payout;
    return acc;
  }, {} as Record<string, any>);

  const clinicBillingData = useMemo(() => {
    return clinics.map(clinic => {
      // Get ALL trips for this clinic in the date range, regardless of status
      const clinicTrips = trips.filter(trip => {
        if (trip.clinicId !== clinic.id) return false;

        // Determine which date to use for billing:
        // 1. For completed trips: use actual pickup/dropoff time (when service was provided)
        // 2. For will-call trips with 00:00:00 time: use scheduled date (it's set correctly now)
        // 3. For old will-call trips (year < 2020): use created date (legacy)
        // 4. For scheduled trips: use scheduled time
        let tripDateStr: string;

        if (trip.status === 'completed' && trip.actualPickupTime) {
          // Use actual service date for completed trips
          tripDateStr = trip.actualPickupTime.split('T')[0];
          console.log(`[BILLING] Trip ${trip.tripNumber} - Completed - Using actualPickupTime: ${tripDateStr}`);
        } else if (!trip.scheduledTime || new Date(trip.scheduledTime).getFullYear() < 2020) {
          // Legacy will-call trip with year 2000 date, use created date
          tripDateStr = trip.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
          console.log(`[BILLING] Trip ${trip.tripNumber} - Legacy Will-call - Using createdAt: ${tripDateStr}`);
        } else {
          // Normal scheduled trip OR will-call trip with correct date (00:00:00 time)
          tripDateStr = trip.scheduledTime.includes('T')
            ? trip.scheduledTime.split('T')[0]
            : new Date(trip.scheduledTime).toISOString().split('T')[0];
          console.log(`[BILLING] Trip ${trip.tripNumber} - Scheduled/Will-call - Using scheduledTime: ${tripDateStr}`);
        }

        const startDateStr = clinicDateRange.start;
        const endDateStr = clinicDateRange.end;
        const inRange = tripDateStr >= startDateStr && tripDateStr <= endDateStr;

        console.log(`[BILLING] Trip ${trip.tripNumber} - Date: ${tripDateStr}, Range: ${startDateStr} to ${endDateStr}, InRange: ${inRange}`);

        return inRange;
      });

      // Count ALL trips by service level (including pending, assigned, in-progress, will-call)
      const ambulatoryTrips = clinicTrips.filter(t => t.serviceLevel === 'ambulatory');
      const wheelchairTrips = clinicTrips.filter(t => t.serviceLevel === 'wheelchair');
      const stretcherTrips = clinicTrips.filter(t => t.serviceLevel === 'stretcher');

      // Calculate totals from ALL trips using correct rates based on status
      const ambulatoryTotal = ambulatoryTrips
        .reduce((sum, trip) => sum + calculateBillableAmount(trip), 0);
      const wheelchairTotal = wheelchairTrips
        .reduce((sum, trip) => sum + calculateBillableAmount(trip), 0);
      const stretcherTotal = stretcherTrips
        .reduce((sum, trip) => sum + calculateBillableAmount(trip), 0);
      const totalAmount = ambulatoryTotal + wheelchairTotal + stretcherTotal;

      return {
        clinic,
        trips: clinicTrips,
        ambulatoryCount: ambulatoryTrips.length,
        wheelchairCount: wheelchairTrips.length,
        stretcherCount: stretcherTrips.length,
        ambulatoryTotal,
        wheelchairTotal,
        stretcherTotal,
        totalAmount
      };
    }).filter(data => selectedClinic === 'all' || data.clinic.id === selectedClinic);
  }, [trips, clinics, selectedClinic, clinicDateRange]);

  const generateClinicInvoicePDF = (data: typeof clinicBillingData[0]) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Generate FW invoice number with 4-5 digits
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `FW${randomDigits}`;

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + parseInt(data.clinic.paymentTerms || '30'));

    // Calculate trip statistics for ALL statuses
    const completedTrips = data.trips.filter(t => t.status === 'completed').length;
    const cancelledTrips = data.trips.filter(t => t.status === 'cancelled').length;
    const noShowTrips = data.trips.filter(t => t.status === 'no-show').length;
    const pendingTrips = data.trips.filter(t => t.status === 'pending').length;
    const assignedTrips = data.trips.filter(t => t.status === 'assigned').length;
    const inProgressTrips = data.trips.filter(t => t.status === 'in-progress').length;
    const willCallTrips = data.trips.filter(t => t.status === 'will-call').length;

    // Header with company branding
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 297, 25, 'F');

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 148.5, 15, { align: 'center' });

    // Company Information
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Fort Worth Non-Emergency Transportation', 20, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('1008 Tulip Pl. Crowley, TX 76036', 20, 40);
    doc.text('Phone: 682-221-8746', 20, 45);
    doc.text('Email: billing@fwnet.com', 20, 50);

    // Invoice Details Box
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.rect(180, 32, 97, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNumber}`, 185, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Invoice Date: ${today.toLocaleDateString()}`, 185, 43);
    doc.text(`Due Date: ${dueDate.toLocaleDateString()}`, 185, 48);
    doc.text(`Terms: Net ${data.clinic.paymentTerms || '30'} Days`, 185, 53);

    // Bill To Section
    doc.setFillColor(243, 244, 246);
    doc.rect(20, 58, 120, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILL TO:', 25, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(data.clinic.name, 25, 69);
    doc.text(data.clinic.address || '', 25, 74);
    if (data.clinic.billingContact) {
      doc.text(`Contact: ${data.clinic.billingContact}`, 25, 79);
    }

    // Period and Trip Statistics Box
    doc.setFillColor(243, 244, 246);
    doc.rect(150, 58, 127, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILLING PERIOD & SUMMARY', 155, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const formatDateForDisplay = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}/${year}`;
    };
    doc.text(`Period: ${formatDateForDisplay(clinicDateRange.start)} - ${formatDateForDisplay(clinicDateRange.end)}`, 155, 69);
    doc.setTextColor(34, 197, 94);
    doc.text(`✓ Completed: ${completedTrips}`, 155, 74);
    doc.setTextColor(239, 68, 68);
    doc.text(`✗ Cancelled: ${cancelledTrips}`, 195, 74);
    doc.setTextColor(234, 179, 8);
    doc.text(`⊘ No-Show: ${noShowTrips}`, 235, 74);
    doc.setTextColor(0, 0, 0);
    const otherTrips = pendingTrips + assignedTrips + inProgressTrips + willCallTrips;
    doc.text(`Total Trips: ${data.trips.length} (${otherTrips} pending/in-progress)`, 155, 79);
    doc.setTextColor(0, 0, 0);

    // Service Summary Table - show ALL trips
    const billableAmbulatory = data.trips.filter(t => t.serviceLevel === 'ambulatory');
    const billableWheelchair = data.trips.filter(t => t.serviceLevel === 'wheelchair');
    const billableStretcher = data.trips.filter(t => t.serviceLevel === 'stretcher');

    const tableData = [];
    if (billableAmbulatory.length > 0) {
      const avgRate = data.ambulatoryTotal / billableAmbulatory.length;
      tableData.push([
        'Ambulatory Transport Services',
        billableAmbulatory.length.toString(),
        `$${avgRate.toFixed(2)}`,
        `$${data.ambulatoryTotal.toFixed(2)}`
      ]);
    }
    if (billableWheelchair.length > 0) {
      const avgRate = data.wheelchairTotal / billableWheelchair.length;
      tableData.push([
        'Wheelchair Transport Services',
        billableWheelchair.length.toString(),
        `$${avgRate.toFixed(2)}`,
        `$${data.wheelchairTotal.toFixed(2)}`
      ]);
    }
    if (billableStretcher.length > 0) {
      const avgRate = data.stretcherTotal / billableStretcher.length;
      tableData.push([
        'Stretcher Transport Services',
        billableStretcher.length.toString(),
        `$${avgRate.toFixed(2)}`,
        `$${data.stretcherTotal.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      startY: 88,
      head: [['Service Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Add detailed trip breakdown with custom columns
    doc.setFillColor(59, 130, 246);
    doc.rect(20, finalY, 257, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DETAILED TRIP BREAKDOWN', 148.5, finalY + 5.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    finalY += 10;

    // Get enabled columns
    const enabledColumns = invoiceColumns.filter(col => col.enabled);
    const headers = enabledColumns.map(col => col.label);

    // Create detailed trip table with custom columns and status colors - show ALL trips
    const detailedTripData = data.trips
      .map(trip => {
        const driver = drivers.find(d => d.id === trip.driverId);
        const row: any = [];

        enabledColumns.forEach(col => {
          switch(col.id) {
            case 'tripNumber':
              row.push(trip.tripNumber || 'N/A');
              break;
            case 'date':
              // Show the actual service date for billing
              let displayDate = trip.scheduledTime;
              if (trip.status === 'completed' && trip.actualPickupTime) {
                displayDate = trip.actualPickupTime;
              } else if (!trip.scheduledTime || new Date(trip.scheduledTime).getFullYear() < 2020) {
                displayDate = trip.createdAt || trip.scheduledTime;
              }
              row.push(formatDateWithoutTimezone(displayDate));
              break;
            case 'passengerName':
              row.push(`${trip.firstName || ''} ${trip.lastName || ''}`.trim() || 'N/A');
              break;
            case 'pickupLocation':
              row.push(trip.pickupLocation?.substring(0, 30) || 'N/A');
              break;
            case 'dropoffLocation':
              row.push(trip.dropoffLocation?.substring(0, 30) || 'N/A');
              break;
            case 'serviceType':
              row.push(trip.serviceLevel === 'ambulatory' ? 'Ambulatory' : trip.serviceLevel === 'wheelchair' ? 'Wheelchair' : 'Stretcher');
              break;
            case 'status':
              row.push(trip.status.toUpperCase());
              break;
            case 'driver':
              row.push(driver?.name?.substring(0, 20) || 'Unassigned');
              break;
            case 'distance':
              row.push(`${(trip.distance || 0).toFixed(1)} mi`);
              break;
            case 'contractedRate':
              row.push(`$${calculateBillableAmount(trip).toFixed(2)}`);
              break;
            case 'driverPay':
              row.push(`$${calculateDriverPayout(trip).toFixed(2)}`);
              break;
          }
        });

        row._status = trip.status;
        return row;
      });

    autoTable(doc, {
      startY: finalY,
      head: [headers],
      body: detailedTripData,
      theme: 'grid',
      headStyles: {
        fillColor: [55, 65, 81],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 20, right: 20 },
      didParseCell: function(data: any) {
        if (data.section === 'body') {
          const rowData = detailedTripData[data.row.index];
          if (rowData._status === 'cancelled') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [127, 29, 29];
          } else if (rowData._status === 'no-show') {
            data.cell.styles.fillColor = [254, 249, 195];
            data.cell.styles.textColor = [113, 63, 18];
          } else if (rowData._status === 'completed') {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [20, 83, 45];
          } else if (rowData._status === 'pending' || rowData._status === 'assigned' || rowData._status === 'in-progress' || rowData._status === 'will-call') {
            data.cell.styles.fillColor = [224, 242, 254];
            data.cell.styles.textColor = [30, 58, 138];
          }
        }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 8;

    // Total Due Box
    doc.setFillColor(37, 99, 235);
    doc.rect(190, finalY - 5, 87, 15, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL DUE:', 195, finalY + 2);
    doc.setFontSize(18);
    doc.text(`$${data.totalAmount.toFixed(2)}`, 272, finalY + 2, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    finalY += 18;

    // Payment Instructions Box
    doc.setFillColor(243, 244, 246);
    doc.rect(20, finalY, 125, 28, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INSTRUCTIONS', 25, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('• Make checks payable to: Fort Worth Non-Emergency Transportation', 25, finalY + 12);
    doc.text('• Mail to: 1008 Tulip Pl. Crowley, TX 76036', 25, finalY + 17);
    doc.text('• Wire Transfer & ACH: Contact 682-221-8746 for banking details', 25, finalY + 22);
    doc.text('• Questions? Email: billing@fwnet.com', 25, finalY + 27);

    // Invoice Notes
    doc.setFillColor(254, 249, 195);
    doc.rect(155, finalY, 122, 28, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT NOTES', 160, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('• Payment is due within ' + (data.clinic.paymentTerms || '30') + ' days of invoice date', 160, finalY + 12);
    doc.text('• Late payments may incur a 1.5% monthly interest charge', 160, finalY + 17);
    doc.text('• Please include invoice number on all payments', 160, finalY + 22);
    doc.text('• Contact us immediately if you have billing questions', 160, finalY + 27);

    finalY += 35;

    // Footer
    doc.setFillColor(37, 99, 235);
    doc.rect(0, finalY, 297, 15, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Thank you for choosing Fort Worth Non-Emergency Transportation!', 148.5, finalY + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Providing Safe, Reliable, and Professional Transportation Services', 148.5, finalY + 11, { align: 'center' });

    doc.save(`Invoice_${invoiceNumber}_${data.clinic.name.replace(/\s+/g, '_')}_${today.toISOString().split('T')[0]}.pdf`);
  };

  const generateClinicInvoiceCSV = (data: typeof clinicBillingData[0]) => {
    const enabledColumns = invoiceColumns.filter(col => col.enabled);
    const headers = enabledColumns.map(col => col.label);

    const rows = data.trips
      .map(trip => {
        const driver = drivers.find(d => d.id === trip.driverId);
        const row: any = {};

        enabledColumns.forEach(col => {
          switch(col.id) {
            case 'tripNumber':
              row[col.label] = trip.tripNumber || 'N/A';
              break;
            case 'date':
              row[col.label] = new Date(trip.scheduledTime).toLocaleDateString();
              break;
            case 'passengerName':
              row[col.label] = `${trip.firstName || ''} ${trip.lastName || ''}`.trim() || 'N/A';
              break;
            case 'pickupLocation':
              row[col.label] = trip.pickupLocation || 'N/A';
              break;
            case 'dropoffLocation':
              row[col.label] = trip.dropoffLocation || 'N/A';
              break;
            case 'serviceType':
              row[col.label] = trip.serviceLevel === 'ambulatory' ? 'Ambulatory' : trip.serviceLevel === 'wheelchair' ? 'Wheelchair' : 'Stretcher';
              break;
            case 'status':
              row[col.label] = trip.status;
              break;
            case 'driver':
              row[col.label] = driver?.name || 'N/A';
              break;
            case 'distance':
              row[col.label] = (trip.distance || 0).toFixed(1);
              break;
            case 'contractedRate':
              row[col.label] = calculateBillableAmount(trip).toFixed(2);
              break;
            case 'driverPay':
              row[col.label] = calculateDriverPayout(trip).toFixed(2);
              break;
          }
        });

        return row;
      });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

    const today = new Date();
    XLSX.writeFile(workbook, `Invoice_${data.clinic.name.replace(/\s+/g, '_')}_${today.toISOString().split('T')[0]}.csv`);
  };

  const sendClinicInvoiceEmail = (data: typeof clinicBillingData[0]) => {
    alert(`Invoice email functionality would send to: ${data.clinic.billingEmail || data.clinic.email}\n\nTotal Amount: $${data.totalAmount.toFixed(2)}\n\nThis would integrate with your email service (SendGrid, AWS SES, etc.)`);
  };

  const handleDownloadInvoice = (trip: any) => {
    const clinic = clinics.find(c => c.id === trip.clinicId);
    generateInvoicePDF(trip, clinic?.name || 'TransportHub');
  };

  const uniquePassengers = Array.from(new Set(privateTrips.map(t => t.customerName)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Management</h1>
        <p className="text-gray-600">Manage invoices, driver payouts, and facility revenue</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 p-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clinic')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'clinic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>Clinic Invoicing</span>
          </button>
          <button
            onClick={() => setActiveTab('invoicing')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'invoicing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Passenger Invoicing</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'payouts'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Driver Payouts</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'clinic' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Clinic Invoice Generator</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Facility/Clinic
                    </label>
                    <select
                      value={selectedClinic}
                      onChange={e => setSelectedClinic(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Facilities</option>
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={clinicDateRange.start}
                      onChange={e => setClinicDateRange({ ...clinicDateRange, start: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={clinicDateRange.end}
                      onChange={e => setClinicDateRange({ ...clinicDateRange, end: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {clinicBillingData.map(data => (
                  <div key={data.clinic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold mb-1">{data.clinic.name}</h2>
                          <p className="text-blue-100">{data.clinic.address}</p>
                          {data.clinic.billingContact && (
                            <p className="text-sm text-blue-100 mt-2">Billing Contact: {data.clinic.billingContact}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">${data.totalAmount.toFixed(2)}</div>
                          <div className="text-blue-100 text-sm">Total Amount Due</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {data.ambulatoryCount > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Ambulatory</span>
                              <span className="text-lg font-bold text-gray-900">{data.ambulatoryCount}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: ${data.ambulatoryTotal.toFixed(2)}
                            </div>
                          </div>
                        )}

                        {data.wheelchairCount > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Wheelchair</span>
                              <span className="text-lg font-bold text-gray-900">{data.wheelchairCount}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: ${data.wheelchairTotal.toFixed(2)}
                            </div>
                          </div>
                        )}

                        {data.stretcherCount > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Stretcher</span>
                              <span className="text-lg font-bold text-gray-900">{data.stretcherCount}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: ${data.stretcherTotal.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Trip Details</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {invoiceColumns.filter(col => col.enabled).map(col => (
                                  <th key={col.id} className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {data.trips.map(trip => {
                                const driver = drivers.find(d => d.id === trip.driverId);
                                return (
                                  <tr key={trip.id} className="hover:bg-gray-50">
                                    {invoiceColumns.filter(col => col.enabled).map(col => {
                                      let cellContent;
                                      switch(col.id) {
                                        case 'tripNumber':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm font-medium text-gray-900">{trip.tripNumber || 'N/A'}</td>;
                                          break;
                                        case 'date':
                                          // Show the actual service date for billing
                                          let displayDate = trip.scheduledTime;
                                          if (trip.status === 'completed' && trip.actualPickupTime) {
                                            displayDate = trip.actualPickupTime;
                                          } else if (!trip.scheduledTime || new Date(trip.scheduledTime).getFullYear() < 2020) {
                                            displayDate = trip.createdAt || trip.scheduledTime;
                                          }
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">{formatDateWithoutTimezone(displayDate)}</td>;
                                          break;
                                        case 'passengerName':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">{`${trip.firstName || ''} ${trip.lastName || ''}`.trim() || 'N/A'}</td>;
                                          break;
                                        case 'pickupLocation':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">{trip.pickupLocation || 'N/A'}</td>;
                                          break;
                                        case 'dropoffLocation':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">{trip.dropoffLocation || 'N/A'}</td>;
                                          break;
                                        case 'serviceType':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">{trip.serviceLevel === 'ambulatory' ? 'Ambulatory' : trip.serviceLevel === 'wheelchair' ? 'Wheelchair' : 'Stretcher'}</td>;
                                          break;
                                        case 'status':
                                          cellContent = (
                                            <td key={col.id} className="px-3 py-2 text-sm">
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                trip.status === 'no-show' ? 'bg-yellow-100 text-yellow-800' :
                                                trip.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                trip.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                                                trip.status === 'will-call' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'
                                              }`}>
                                                {trip.status}
                                              </span>
                                            </td>
                                          );
                                          break;
                                        case 'driver':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">{driver?.name || 'Unassigned'}</td>;
                                          break;
                                        case 'distance':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">{(trip.distance || 0).toFixed(1)} mi</td>;
                                          break;
                                        case 'contractedRate':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">${calculateBillableAmount(trip).toFixed(2)}</td>;
                                          break;
                                        case 'driverPay':
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm font-semibold text-green-600 text-right">${calculateDriverPayout(trip).toFixed(2)}</td>;
                                          break;
                                        default:
                                          cellContent = <td key={col.id} className="px-3 py-2 text-sm text-gray-600">-</td>;
                                      }
                                      return cellContent;
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-6">
                        <div className="text-sm text-gray-600">
                          <div>Period: {formatDateWithoutTimezone(clinicDateRange.start)} - {formatDateWithoutTimezone(clinicDateRange.end)}</div>
                          <div>Payment Terms: Net {data.clinic.paymentTerms || '30'} Days</div>
                          <div>Total Trips: {data.trips.length}</div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={() => setShowColumnSettings(true)}
                            className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                          >
                            <Settings className="w-5 h-5" />
                            <span>Customize Columns</span>
                          </button>

                          <div className="relative z-10">
                            <button
                              onClick={() => setShowDownloadMenu(showDownloadMenu === data.clinic.id ? null : data.clinic.id)}
                              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                              disabled={data.totalAmount === 0}
                            >
                              <Download className="w-5 h-5" />
                              <span>Download Invoice</span>
                              <ChevronDown className="w-4 h-4" />
                            </button>

                            {showDownloadMenu === data.clinic.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowDownloadMenu(null)}
                                />
                                <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-lg shadow-2xl border-2 border-blue-500 z-50">
                                  <button
                                    onClick={() => {
                                      generateClinicInvoicePDF(data);
                                      setShowDownloadMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-blue-50 text-sm font-medium text-gray-700 first:rounded-t-lg flex items-center space-x-2 transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-blue-600" />
                                    <span>Download as PDF</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      generateClinicInvoiceCSV(data);
                                      setShowDownloadMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-blue-50 text-sm font-medium text-gray-700 last:rounded-b-lg border-t border-gray-200 flex items-center space-x-2 transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-green-600" />
                                    <span>Download as CSV</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => sendClinicInvoiceEmail(data)}
                            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                            disabled={data.totalAmount === 0 || !data.clinic.billingEmail}
                          >
                            <Send className="w-5 h-5" />
                            <span>Send Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {clinicBillingData.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No billing data found for the selected period</p>
                </div>
              )}

              {showColumnSettings && (
                <Modal isOpen={showColumnSettings} onClose={() => setShowColumnSettings(false)} title="Customize Invoice Columns">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Select which columns to include in your invoice exports (PDF and CSV)
                    </p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {invoiceColumns.map((column, index) => (
                        <label
                          key={column.id}
                          className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={column.enabled}
                            onChange={(e) => {
                              const newColumns = [...invoiceColumns];
                              newColumns[index].enabled = e.target.checked;
                              setInvoiceColumns(newColumns);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-700">{column.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          const resetColumns = invoiceColumns.map(col => ({
                            ...col,
                            enabled: AVAILABLE_INVOICE_COLUMNS.find(c => c.id === col.id)?.enabled || false
                          }));
                          setInvoiceColumns(resetColumns);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Reset to Default
                      </button>
                      <button
                        onClick={() => setShowColumnSettings(false)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {activeTab === 'invoicing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Passenger</label>
                  <select
                    value={selectedPassenger}
                    onChange={e => setSelectedPassenger(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a passenger</option>
                    {uniquePassengers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Date</label>
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              {selectedPassenger ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Trip #</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">From</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInvoices.map(trip => (
                          <tr key={trip.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {trip.invoiceNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {new Date(trip.scheduledTime).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {trip.pickupLocation}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {trip.dropoffLocation}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                trip.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                trip.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {trip.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              ${trip.fare.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => handleDownloadInvoice(trip)}
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-900">Total Revenue</span>
                      <span className="text-2xl font-bold text-blue-900">
                        ${filteredInvoices.reduce((sum, t) => sum + t.fare, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Please select a passenger to see their trips
                </div>
              )}
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {selectedDriver ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedDriver('')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Driver List
                  </button>
                  {drivers.find(d => d.id === selectedDriver) ? (
                    <DriverEarningsDashboard driverId={selectedDriver} isDriverView={false} />
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                      <p className="text-yellow-800 font-semibold">Driver not found</p>
                      <p className="text-yellow-600 text-sm mt-2">The selected driver could not be loaded</p>
                      <button
                        onClick={() => setSelectedDriver('')}
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                      >
                        Back to Driver List
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Driver</label>
                    <select
                      value={selectedDriver}
                      onChange={e => setSelectedDriver(e.target.value)}
                      className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a driver...</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drivers.map(driver => {
                      const driverTrips = trips.filter(t => t.driverId === driver.id && t.status === 'completed');
                      const totalPayout = driverTrips.reduce((sum, trip) => sum + calculateDriverPayout(trip), 0);

                      return (
                        <button
                          key={driver.id}
                          onClick={() => setSelectedDriver(driver.id)}
                          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-500 transition-all text-left"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Completed Trips:</span>
                              <span className="font-semibold text-gray-900">{driverTrips.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Earnings:</span>
                              <span className="font-bold text-green-600">${totalPayout.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriverForAdjustments({ id: driver.id, name: driver.name });
                              }}
                              className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              <span>Adjustments</span>
                            </button>
                            <div className="text-sm text-blue-600 font-medium">
                              View Details →
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Driver Adjustments Modal */}
      {selectedDriverForAdjustments && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDriverForAdjustments(null)}
          title=""
        >
          <DriverPayoutAdjustments
            driverId={selectedDriverForAdjustments.id}
            driverName={selectedDriverForAdjustments.name}
            onClose={() => setSelectedDriverForAdjustments(null)}
          />
        </Modal>
      )}
    </div>
  );
};
