import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip } from '../types';

interface PaymentStatementData {
  driverName: string;
  startDate: string;
  endDate: string;
  trips: Trip[];
  grossTotal: number;
  deductions: Array<{ label: string; amount: number }>;
  bonuses: Array<{ label: string; amount: number }>;
  netAmount: number;
}

export const generateDriverPaymentPDF = (data: PaymentStatementData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('Driver Summary Report', pageWidth / 2, 20, { align: 'center' });
  
  // Pay Period
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Pay Period from: ${data.startDate} to ${data.endDate}`, 20, 35);
  
  // Driver Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Driver Information', 20, 48);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const completedTrips = data.trips.filter(t => t.status === 'completed').length;
  const otherStatusTrips = data.trips.filter(t => t.status !== 'completed').length;
  
  doc.text(`Driver: ${data.driverName}`, 20, 56);
  doc.text(`Completed/Billed Trips: ${completedTrips}`, 20, 62);
  doc.text(`Other Status Trips: ${otherStatusTrips}`, 20, 68);
  doc.text(`Total Trips: ${data.trips.length}`, 20, 74);
  
  // Financial Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 20, 87);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 95;
  
  // Calculate percentage deduction
  const percentageDeduction = data.deductions.find(d => d.label.includes('Percentage') || d.label.includes('%'));
  const vehicleRental = data.deductions.find(d => d.label.includes('Vehicle') || d.label.includes('Rental'));
  const insurance = data.deductions.find(d => d.label.includes('Insurance'));
  
  if (percentageDeduction) {
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`${percentageDeduction.label}: -$${Math.abs(percentageDeduction.amount).toFixed(2)}`, 20, yPos);
    yPos += 6;
  }
  
  const subtotalAfterPercentage = data.grossTotal - (percentageDeduction?.amount || 0);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subtotal after Percentage Deduction: $${subtotalAfterPercentage.toFixed(2)}`, 20, yPos);
  yPos += 6;
  
  if (vehicleRental) {
    doc.setTextColor(220, 38, 38);
    doc.text(`${vehicleRental.label}: -$${Math.abs(vehicleRental.amount).toFixed(2)}`, 20, yPos);
    yPos += 6;
  }
  
  if (insurance) {
    doc.setTextColor(220, 38, 38);
    doc.text(`${insurance.label}: -$${Math.abs(insurance.amount).toFixed(2)}`, 20, yPos);
    yPos += 6;
  }
  
  const totalDeductions = data.deductions.reduce((sum, d) => sum + Math.abs(d.amount), 0);
  doc.setTextColor(220, 38, 38);
  doc.text(`Total Deductions: -$${totalDeductions.toFixed(2)}`, 20, yPos);
  yPos += 8;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Final Amount: $${data.netAmount.toFixed(2)}`, 20, yPos);
  
  // Trip Details Section
  yPos += 15;
  doc.setFontSize(14);
  doc.text('Trip Details', 20, yPos);
  
  // Prepare trip data for table
  const tripRows = data.trips
    .filter(t => t.status === 'completed')
    .map(trip => {
      const serviceLevel = trip.serviceLevel || 'ambulatory';
      const serviceLevelCode = serviceLevel.charAt(0).toUpperCase();
      
      return [
        trip.tripNumber || 'N/A',
        serviceLevelCode,
        'Billed',
        (trip.distance || 0).toFixed(0),
        `$${(trip.driverPayout || 0).toFixed(2)}`,
        new Date(trip.scheduledPickupTime || trip.scheduledTime || '').toLocaleDateString('en-US')
      ];
    });
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Trip #', 'Service Level', 'Status', 'Miles', 'Amount', 'Date']],
    body: tripRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'center' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Save the PDF
  const fileName = `Driver_Payment_${data.driverName.replace(/\s+/g, '_')}_${data.startDate.replace(/\//g, '-')}_to_${data.endDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};

export const generateDriverPaymentCSV = (data: PaymentStatementData): void => {
  const rows: string[][] = [];
  
  // Header information
  rows.push(['Driver Summary Report']);
  rows.push([`Pay Period: ${data.startDate} to ${data.endDate}`]);
  rows.push([]);
  
  // Driver Information
  rows.push(['Driver Information']);
  rows.push(['Driver:', data.driverName]);
  rows.push(['Completed/Billed Trips:', data.trips.filter(t => t.status === 'completed').length.toString()]);
  rows.push(['Other Status Trips:', data.trips.filter(t => t.status !== 'completed').length.toString()]);
  rows.push(['Total Trips:', data.trips.length.toString()]);
  rows.push([]);
  
  // Financial Summary
  rows.push(['Financial Summary']);
  rows.push(['Gross Total:', `$${data.grossTotal.toFixed(2)}`]);
  
  data.deductions.forEach(d => {
    rows.push([d.label, `-$${Math.abs(d.amount).toFixed(2)}`]);
  });
  
  rows.push(['Total Deductions:', `-$${data.deductions.reduce((sum, d) => sum + Math.abs(d.amount), 0).toFixed(2)}`]);
  
  data.bonuses.forEach(b => {
    rows.push([b.label, `$${b.amount.toFixed(2)}`]);
  });
  
  rows.push(['Final Amount:', `$${data.netAmount.toFixed(2)}`]);
  rows.push([]);
  
  // Trip Details
  rows.push(['Trip Details']);
  rows.push(['Trip #', 'Service Level', 'Status', 'Miles', 'Amount', 'Date']);
  
  data.trips
    .filter(t => t.status === 'completed')
    .forEach(trip => {
      const serviceLevel = trip.serviceLevel || 'ambulatory';
      const serviceLevelCode = serviceLevel.charAt(0).toUpperCase();
      
      rows.push([
        trip.tripNumber || 'N/A',
        serviceLevelCode,
        'Billed',
        (trip.distance || 0).toFixed(0),
        `$${(trip.driverPayout || 0).toFixed(2)}`,
        new Date(trip.scheduledPickupTime || trip.scheduledTime || '').toLocaleDateString('en-US')
      ]);
    });
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = cell.replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(',')
  ).join('\n');
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Driver_Payment_${data.driverName.replace(/\s+/g, '_')}_${data.startDate.replace(/\//g, '-')}_to_${data.endDate.replace(/\//g, '-')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
