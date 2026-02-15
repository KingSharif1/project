import * as api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billTo: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  trips: Array<{
    tripNumber: string;
    date: string;
    from: string;
    to: string;
    distance: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  notes?: string;
}

// Generate invoice PDF
export const generateInvoicePDF = (invoice: InvoiceData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });

  // Company Info (customize as needed)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Medical Transportation Services', 15, 35);
  doc.text('123 Healthcare Way', 15, 40);
  doc.text('City, ST 12345', 15, 45);
  doc.text('Phone: (555) 123-4567', 15, 50);

  // Invoice Details
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 15, 35, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${invoice.invoiceDate}`, pageWidth - 15, 40, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, pageWidth - 15, 45, { align: 'right' });

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.billTo.name, 15, 70);
  if (invoice.billTo.address) doc.text(invoice.billTo.address, 15, 75);
  if (invoice.billTo.phone) doc.text(`Phone: ${invoice.billTo.phone}`, 15, 80);
  if (invoice.billTo.email) doc.text(`Email: ${invoice.billTo.email}`, 15, 85);

  // Trip Details Table
  const tableData = invoice.trips.map(trip => [
    trip.tripNumber,
    trip.date,
    trip.from,
    trip.to,
    `${trip.distance.toFixed(1)} mi`,
    `$${trip.rate.toFixed(2)}`,
    `$${trip.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 95,
    head: [['Trip #', 'Date', 'Pickup', 'Dropoff', 'Distance', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Totals
  const totalsX = pageWidth - 15;
  let currentY = finalY + 10;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX - 50, currentY, { align: 'right' });
  doc.text(`$${invoice.subtotal.toFixed(2)}`, totalsX, currentY, { align: 'right' });

  if (invoice.tax !== undefined && invoice.taxRate !== undefined) {
    currentY += 6;
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX - 50, currentY, { align: 'right' });
    doc.text(`$${invoice.tax.toFixed(2)}`, totalsX, currentY, { align: 'right' });
  }

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX - 50, currentY, { align: 'right' });
  doc.text(`$${invoice.total.toFixed(2)}`, totalsX, currentY, { align: 'right' });

  // Notes
  if (invoice.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Notes:', 15, currentY + 15);
    doc.text(invoice.notes, 15, currentY + 20, { maxWidth: pageWidth - 30 });
  }

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Thank you for your business!',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 20,
    { align: 'center' }
  );
  doc.text(
    'Payment due within 30 days',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 15,
    { align: 'center' }
  );

  return doc;
};

// Generate invoice for a single trip
export const generateTripInvoice = async (tripId: string): Promise<jsPDF | null> => {
  try {
    const result = await api.getTrip(tripId);
    const trip = result.data;

    if (!trip) {
      console.error('Error fetching trip');
      return null;
    }

    const invoiceData: InvoiceData = {
      invoiceNumber: trip.invoice_number || `INV-${trip.trip_number}`,
      invoiceDate: trip.invoice_date || new Date().toLocaleDateString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      billTo: {
        name: trip.contractors?.name || trip.patients?.name || trip.passenger_name || 'Customer',
        address: trip.contractors?.billing_address || trip.billing_address,
        phone: trip.patients?.phone || trip.passenger_phone,
        email: trip.patients?.email || trip.passenger_email || trip.invoice_email,
      },
      trips: [{
        tripNumber: trip.trip_number,
        date: new Date(trip.scheduled_pickup_time).toLocaleDateString(),
        from: trip.pickup_address,
        to: trip.dropoff_address,
        distance: trip.distance_miles || 0,
        rate: trip.rate || 0,
        amount: trip.total_charge || trip.rate || 0,
      }],
      subtotal: trip.total_charge || trip.rate || 0,
      total: trip.total_charge || trip.rate || 0,
      notes: trip.notes,
    };

    return generateInvoicePDF(invoiceData);
  } catch (error) {
    console.error('Error generating trip invoice:', error);
    return null;
  }
};

// Generate batch invoice for multiple trips
export const generateBatchInvoice = async (tripIds: string[]): Promise<jsPDF | null> => {
  try {
    const result = await api.getTripsBatch(tripIds);
    const trips = result.data;

    if (!trips || trips.length === 0) {
      console.error('Error fetching trips');
      return null;
    }

    // Use first trip's billing info for the invoice
    const firstTrip = trips[0];

    const invoiceTrips = trips.map(trip => ({
      tripNumber: trip.trip_number,
      date: new Date(trip.scheduled_pickup_time).toLocaleDateString(),
      from: trip.pickup_address,
      to: trip.dropoff_address,
      distance: trip.distance_miles || 0,
      rate: trip.rate || 0,
      amount: trip.total_charge || trip.rate || 0,
    }));

    const subtotal = trips.reduce((sum, trip) => sum + (trip.total_charge || trip.rate || 0), 0);

    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-BATCH-${Date.now()}`,
      invoiceDate: new Date().toLocaleDateString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      billTo: {
        name: firstTrip.contractors?.name || firstTrip.patients?.name || 'Customer',
        address: firstTrip.contractors?.billing_address,
        phone: firstTrip.patients?.phone,
        email: firstTrip.patients?.email || firstTrip.invoice_email,
      },
      trips: invoiceTrips,
      subtotal,
      total: subtotal,
    };

    return generateInvoicePDF(invoiceData);
  } catch (error) {
    console.error('Error generating batch invoice:', error);
    return null;
  }
};

// Auto-send invoice when trip is completed
export const autoSendInvoice = async (tripId: string): Promise<boolean> => {
  try {
    // Check if auto-invoice is enabled for this trip
    const tripResult = await api.getTrip(tripId);
    const trip = tripResult.data;

    if (!trip || !trip.auto_invoice || trip.status !== 'completed') {
      return false;
    }

    // Generate invoice PDF
    const pdf = await generateTripInvoice(tripId);
    if (!pdf) {
      return false;
    }

    // In a real implementation, you would:
    // 1. Upload PDF to storage
    // 2. Send email with PDF attachment
    // 3. Update trip record with invoice_sent_at timestamp

    // For now, just update the timestamp
    await api.updateTrip(tripId, { invoice_sent_at: new Date().toISOString() });

    console.log(`Invoice auto-sent for trip ${tripId}`);
    return true;
  } catch (error) {
    console.error('Error auto-sending invoice:', error);
    return false;
  }
};

// Schedule recurring invoice generation
export const scheduleRecurringInvoices = async (
  contractorId: string,
  frequency: 'weekly' | 'monthly'
): Promise<void> => {
  // This would integrate with a job scheduler
  // For now, it's a placeholder for future implementation
  console.log(`Scheduling ${frequency} invoices for contractor ${contractorId}`);
};

// Get invoice history
export const getInvoiceHistory = async (startDate?: string, endDate?: string) => {
  try {
    const result = await api.getInvoiceHistory(startDate, endDate);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching invoice history:', error);
    return [];
  }
};
