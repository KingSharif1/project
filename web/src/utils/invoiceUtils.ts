import jsPDF from 'jspdf';
import { Trip } from '../types';

export const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
};

export const isTripBillable = (trip: Trip): boolean => {
  // Completed trips are always billable
  if (trip.status === 'completed') return true;

  // No-show trips are billable (vehicle was dispatched, driver en route)
  if (trip.status === 'no-show') return true;

  // Cancelled trips are billable if cancelled on same day
  if (trip.status === 'cancelled') {
    const tripDate = new Date(trip.scheduledTime);
    const cancelDate = trip.cancelledAt ? new Date(trip.cancelledAt) : new Date();

    // Check if cancelled on same day as scheduled trip
    const isSameDay =
      tripDate.getFullYear() === cancelDate.getFullYear() &&
      tripDate.getMonth() === cancelDate.getMonth() &&
      tripDate.getDate() === cancelDate.getDate();

    return isSameDay;
  }

  return false;
};

export const getBillingReason = (trip: Trip): string => {
  if (trip.status === 'completed') {
    return 'Service completed';
  }

  if (trip.status === 'no-show') {
    return 'No-show - Vehicle dispatched, driver en route';
  }

  if (trip.status === 'cancelled') {
    const tripDate = new Date(trip.scheduledTime);
    const cancelDate = trip.cancelledAt ? new Date(trip.cancelledAt) : new Date();

    const isSameDay =
      tripDate.getFullYear() === cancelDate.getFullYear() &&
      tripDate.getMonth() === cancelDate.getMonth() &&
      tripDate.getDate() === cancelDate.getDate();

    if (isSameDay) {
      return 'Same-day cancellation';
    }
  }

  return '';
};

export const generateInvoicePDF = (trip: Trip, clinicName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title - Invoice
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice', 20, 20);

  // Invoice Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice number', 20, 32);
  doc.text('Date of issue', 20, 38);
  doc.text('Date due', 20, 44);

  doc.setFont('helvetica', 'normal');
  doc.text(trip.invoiceNumber || generateInvoiceNumber(), 60, 32);
  const issueDate = trip.invoiceDate ? new Date(trip.invoiceDate) : new Date();
  doc.text(issueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 60, 38);
  doc.text(issueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 60, 44);

  // Company Info (From Section)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fort Worth Non-Emergency Transportation', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('1008 Tulip Pl. Crowley, TX 76036', 20, 66);
  doc.text('Phone: 682-221-8746', 20, 71);

  // Bill To Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill to', pageWidth / 2, 60);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(trip.customerName, pageWidth / 2, 66);
  if (trip.billingAddress) {
    const lines = doc.splitTextToSize(trip.billingAddress, 80);
    let yPos = 71;
    lines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos);
      yPos += 5;
    });
  }
  if (trip.customerEmail) {
    doc.text(trip.customerEmail, pageWidth / 2, trip.billingAddress ? 81 : 71);
  }

  // Amount Due Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${trip.fare.toFixed(2)} USD due ${issueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 20, 100);

  // Service Details Section
  const tableY = 115;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, tableY, pageWidth - 20, tableY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, tableY + 7);
  doc.text('Qty', pageWidth - 80, tableY + 7);
  doc.text('Unit price', pageWidth - 60, tableY + 7);
  doc.text('Amount', pageWidth - 30, tableY + 7, { align: 'right' });

  // Table Rows
  doc.setFont('helvetica', 'normal');
  const rowY = tableY + 15;

  const pickupShort = trip.pickupLocation.length > 50 ? trip.pickupLocation.substring(0, 50) + '...' : trip.pickupLocation;
  const dropoffShort = trip.dropoffLocation.length > 50 ? trip.dropoffLocation.substring(0, 50) + '...' : trip.dropoffLocation;

  doc.text('Transportation Service', 20, rowY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`From: ${pickupShort}`, 20, rowY + 4);
  doc.text(`To: ${dropoffShort}`, 20, rowY + 8);

  // Add billing reason for no-show and cancelled trips
  const billingReason = getBillingReason(trip);
  if (billingReason && trip.status !== 'completed') {
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text(`Billing Reason: ${billingReason}`, 20, rowY + 12);
  }

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.text('1', pageWidth - 80, rowY);
  doc.text(`$${trip.fare.toFixed(2)}`, pageWidth - 60, rowY);
  doc.text(`$${trip.fare.toFixed(2)}`, pageWidth - 30, rowY, { align: 'right' });

  // Totals Section
  const totalY = rowY + 30;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, totalY, pageWidth - 20, totalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal', pageWidth - 80, totalY + 7);
  doc.text(`$${trip.fare.toFixed(2)}`, pageWidth - 30, totalY + 7, { align: 'right' });

  doc.text('Total', pageWidth - 80, totalY + 13);
  doc.text(`$${trip.fare.toFixed(2)}`, pageWidth - 30, totalY + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Amount due', pageWidth - 80, totalY + 20);
  doc.text(`$${trip.fare.toFixed(2)} USD`, pageWidth - 30, totalY + 20, { align: 'right' });

  // Payment Information (if paid)
  if (trip.paymentStatus === 'paid' && trip.paidAmount) {
    const paymentY = totalY + 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(20, paymentY, 40, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PAID', 40, paymentY + 5.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Notes
  if (trip.notes) {
    const notesY = totalY + 55;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(trip.notes, pageWidth - 40);
    doc.text(noteLines, 20, notesY + 6);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 7, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 12, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice-${trip.invoiceNumber || generateInvoiceNumber()}.pdf`);
};
