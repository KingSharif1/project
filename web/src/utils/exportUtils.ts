import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Trip, Driver, Clinic } from '../types';

export const exportToPDF = (
  trips: Trip[],
  drivers: Driver[],
  stats: any,
  timeRange: string,
  clinicName?: string,
  clinics?: Clinic[],
  visibleColumns?: Set<string>
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text('Fort Worth Non-Emergency Transportation', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text('1008 Tulip Pl. Crowley, TX 76036', pageWidth / 2, 22, { align: 'center' });
  doc.text('Phone: 682-221-8746', pageWidth / 2, 27, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Trip Details', 14, 42);

  const allColumns = [
    { id: 'tripNumber', label: 'Trip #', getter: (trip: Trip) => trip.tripNumber || '-' },
    { id: 'customerName', label: 'Passenger', getter: (trip: Trip) => trip.customerName },
    { id: 'scheduledTime', label: 'Date', getter: (trip: Trip) => new Date(trip.scheduledTime).toLocaleDateString() },
    { id: 'clinic', label: 'Clinic', getter: (trip: Trip) => clinics ? clinics.find(c => c.id === trip.clinicId)?.name || '-' : '-' },
    { id: 'clinicNote', label: 'Note', getter: (trip: Trip) => trip.clinicNote ? trip.clinicNote.substring(0, 15) : '-' },
    { id: 'status', label: 'Status', getter: (trip: Trip) => trip.status },
    { id: 'serviceLevel', label: 'Service', getter: (trip: Trip) => trip.serviceLevel },
    { id: 'driverId', label: 'Driver', getter: (trip: Trip) => drivers.find(d => d.id === trip.driverId)?.name || '-' },
    { id: 'pickupLocation', label: 'Pickup', getter: (trip: Trip) => trip.pickupLocation.substring(0, 20) },
    { id: 'dropoffLocation', label: 'Dropoff', getter: (trip: Trip) => trip.dropoffLocation.substring(0, 20) },
    { id: 'distance', label: 'Miles', getter: (trip: Trip) => Math.ceil(trip.distance || 0).toString() },
    { id: 'fare', label: 'Charge', getter: (trip: Trip) => `$${trip.fare.toFixed(2)}` },
  ];

  const columnsToExport = visibleColumns
    ? allColumns.filter(col => visibleColumns.has(col.id))
    : allColumns;

  autoTable(doc, {
    startY: 47,
    head: [columnsToExport.map(col => col.label)],
    body: trips.map(trip => columnsToExport.map(col => col.getter(trip))),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 7 },
  });

  doc.save(`trip-report-${Date.now()}.pdf`);
};

export const exportToCSV = (
  trips: Trip[],
  drivers: Driver[],
  stats: any,
  timeRange: string,
  clinics?: Clinic[],
  visibleColumns?: Set<string>
) => {
  const allColumns = [
    { id: 'tripNumber', label: 'Trip Number', getter: (trip: Trip) => trip.tripNumber || '-' },
    { id: 'customerName', label: 'Passenger Name', getter: (trip: Trip) => trip.customerName },
    { id: 'scheduledTime', label: 'Trip Date', getter: (trip: Trip) => new Date(trip.scheduledTime).toLocaleDateString() },
    { id: 'clinic', label: 'Clinic Name', getter: (trip: Trip) => clinics ? clinics.find(c => c.id === trip.clinicId)?.name || '-' : '-' },
    { id: 'clinicNote', label: 'Clinic Note', getter: (trip: Trip) => trip.clinicNote || '-' },
    { id: 'status', label: 'Status', getter: (trip: Trip) => trip.status },
    { id: 'serviceLevel', label: 'Service Level', getter: (trip: Trip) => trip.serviceLevel },
    { id: 'driverId', label: 'Driver Name', getter: (trip: Trip) => drivers.find(d => d.id === trip.driverId)?.name || '-' },
    { id: 'appointmentTime', label: 'Appointment Time', getter: (trip: Trip) => trip.appointmentTime ? new Date(trip.appointmentTime).toLocaleString() : '-' },
    { id: 'actualPickupTime', label: 'Actual Pickup', getter: (trip: Trip) => trip.actualPickupTime ? new Date(trip.actualPickupTime).toLocaleString() : '-' },
    { id: 'actualDropoffTime', label: 'Actual Dropoff', getter: (trip: Trip) => trip.actualDropoffTime ? new Date(trip.actualDropoffTime).toLocaleString() : '-' },
    { id: 'pickupLocation', label: 'Pickup Address', getter: (trip: Trip) => trip.pickupLocation },
    { id: 'dropoffLocation', label: 'Drop-off Address', getter: (trip: Trip) => trip.dropoffLocation },
    { id: 'distance', label: 'Mileage', getter: (trip: Trip) => Math.ceil(trip.distance || 0).toString() },
    { id: 'fare', label: 'Charge', getter: (trip: Trip) => `$${trip.fare.toFixed(2)}` },
  ];

  const columnsToExport = visibleColumns
    ? allColumns.filter(col => visibleColumns.has(col.id))
    : allColumns;

  const headerData = [
    ['Fort Worth Non-Emergency Transportation'],
    ['1008 Tulip Pl. Crowley, TX 76036'],
    ['Phone: 682-221-8746'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    columnsToExport.map(col => col.label),
    ...trips.map(trip => columnsToExport.map(col => col.getter(trip))),
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trips');
  XLSX.writeFile(wb, `trip-report-${Date.now()}.csv`, { bookType: 'csv' });
};

export const exportDriverPayoutToCSV = (
  driverId: string,
  driverName: string,
  trips: Trip[],
  startDate: string,
  endDate: string
) => {
  const driverTrips = trips.filter(
    t => t.driverId === driverId &&
    t.status === 'completed' &&
    new Date(t.scheduledTime) >= new Date(startDate) &&
    new Date(t.scheduledTime) <= new Date(endDate)
  );

  const totalPayout = driverTrips.reduce((sum, trip) => sum + (trip.driverPayout || 0), 0);

  const csvData = [
    ['Fort Worth Non-Emergency Transportation - Driver Payout Report'],
    [''],
    [`Driver Name:,${driverName}`],
    [`Period:,${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
    [`Total Trips:,${driverTrips.length}`],
    [`Total Payout:,$${totalPayout.toFixed(2)}`],
    [`Generated:,${new Date().toLocaleString()}`],
    [''],
    ['Date', 'Trip #', 'Passenger', 'Pickup', 'Dropoff', 'Type', 'Payout Amount'],
    ...driverTrips.map(trip => [
      new Date(trip.scheduledTime).toLocaleDateString(),
      trip.tripNumber || '',
      trip.customerName,
      trip.pickupLocation,
      trip.dropoffLocation,
      trip.serviceLevel,
      `$${(trip.driverPayout || 0).toFixed(2)}`
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(csvData);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 30 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Driver Payout');
  XLSX.writeFile(wb, `driver-payout-${driverName.replace(/\s/g, '-')}-${Date.now()}.csv`, { bookType: 'csv' });
};

export const exportDriverPayoutToPDF = (
  driverId: string,
  driverName: string,
  trips: Trip[],
  startDate: string,
  endDate: string
) => {
  const driverTrips = trips.filter(
    t => t.driverId === driverId &&
    t.status === 'completed' &&
    new Date(t.scheduledTime) >= new Date(startDate) &&
    new Date(t.scheduledTime) <= new Date(endDate)
  );

  const totalPayout = driverTrips.reduce((sum, trip) => sum + (trip.driverPayout || 0), 0);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text('Fort Worth Non-Emergency Transportation', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Driver Payout Report', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Driver: ${driverName}`, 14, 35);
  doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 42);
  doc.text(`Total Trips: ${driverTrips.length}`, 14, 49);
  doc.text(`Total Payout: $${totalPayout.toFixed(2)}`, 14, 56);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 63);

  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Trip #', 'Passenger', 'Service Level', 'Payout']],
    body: driverTrips.map(trip => [
      new Date(trip.scheduledTime).toLocaleDateString(),
      trip.tripNumber || '-',
      trip.customerName,
      trip.serviceLevel,
      `$${(trip.driverPayout || 0).toFixed(2)}`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 },
    foot: [['', '', '', 'Total:', `$${totalPayout.toFixed(2)}`]],
    footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' }
  });

  doc.save(`driver-payout-${driverName.replace(/\s/g, '-')}-${Date.now()}.pdf`);
};
