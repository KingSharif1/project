import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDateUS, formatTimeUS, formatDateTimeUS } from './dateFormatter';

interface TripData {
  id: string;
  tripNumber?: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupTime?: string;
  scheduledDropoffTime?: string;
  patientName?: string;
  patientPhone?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  serviceLevel?: string;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

interface StatusHistoryEntry {
  oldStatus: string;
  newStatus: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

interface SignatureData {
  signature_type: string;
  signature_data: string;
  signer_name?: string;
  signed_at: string;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface TripReportData {
  trip: TripData;
  statusHistory: StatusHistoryEntry[];
  patientSignature?: SignatureData;
  driverSignature?: string;
  driverName?: string;
  locationHistory: LocationPoint[];
  mapImageData?: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  assigned: 'Assigned',
  en_route_pickup: 'En Route to Pickup',
  arrived_pickup: 'Arrived at Pickup',
  patient_loaded: 'Patient Loaded',
  en_route_dropoff: 'En Route to Drop-off',
  arrived_dropoff: 'Arrived at Drop-off',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export async function generateTripReportPDF(data: TripReportData): Promise<void> {
  const doc = new jsPDF();
  const { trip, statusHistory, patientSignature, driverSignature, driverName, locationHistory } = data;
  
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Header
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIP REPORT', margin, 15);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Trip #${trip.tripNumber || trip.id.slice(0, 8)}`, margin, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 25, { align: 'right' });

  yPos = 45;
  doc.setTextColor(0, 0, 0);

  // Trip Information Section
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIP INFORMATION', margin + 2, yPos + 5.5);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const tripInfo = [
    ['Status:', STATUS_LABELS[trip.status] || trip.status],
    ['Service Level:', trip.serviceLevel || 'N/A'],
    ['Patient:', trip.patientName || 'N/A'],
    ['Patient Phone:', trip.patientPhone || 'N/A'],
    ['Driver:', trip.driverName || 'Unassigned'],
    ['Driver Phone:', trip.driverPhone || 'N/A'],
    ['Vehicle:', trip.vehicleInfo || 'N/A'],
  ];

  tripInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, yPos);
    yPos += 6;
  });

  yPos += 4;

  // Pickup & Dropoff Section
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PICKUP & DROPOFF', margin + 2, yPos + 5.5);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Pickup:', margin + 2, yPos);
  doc.setFont('helvetica', 'normal');
  const pickupLines = doc.splitTextToSize(trip.pickupAddress, contentWidth - 25);
  doc.text(pickupLines, margin + 20, yPos);
  yPos += (pickupLines.length * 5) + 3;

  if (trip.scheduledPickupTime) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Scheduled: ${formatDateTimeUS(trip.scheduledPickupTime)}`, margin + 20, yPos);
    yPos += 6;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Dropoff:', margin + 2, yPos);
  doc.setFont('helvetica', 'normal');
  const dropoffLines = doc.splitTextToSize(trip.dropoffAddress, contentWidth - 25);
  doc.text(dropoffLines, margin + 20, yPos);
  yPos += (dropoffLines.length * 5) + 3;

  if (trip.scheduledDropoffTime) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Scheduled: ${formatDateTimeUS(trip.scheduledDropoffTime)}`, margin + 20, yPos);
    yPos += 6;
  }

  yPos += 4;

  // Status Timeline Section
  if (statusHistory.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('STATUS TIMELINE', margin + 2, yPos + 5.5);
    yPos += 12;

    doc.setFontSize(9);
    statusHistory.forEach((entry, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const statusLabel = STATUS_LABELS[entry.newStatus] || entry.newStatus;
      const timestamp = formatDateTimeUS(entry.createdAt);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, margin + 2, yPos);
      doc.text(statusLabel, margin + 8, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(timestamp, margin + 60, yPos);
      
      if (entry.changedByName) {
        doc.text(`by ${entry.changedByName}`, margin + 120, yPos);
      }
      
      doc.setTextColor(0, 0, 0);
      yPos += 5;

      if (entry.reason) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const reasonLines = doc.splitTextToSize(entry.reason, contentWidth - 10);
        doc.text(reasonLines, margin + 8, yPos);
        yPos += (reasonLines.length * 4) + 2;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
      }
    });

    yPos += 4;
  }

  // GPS Breadcrumbs Section
  if (locationHistory.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GPS BREADCRUMB TRAIL', margin + 2, yPos + 5.5);
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total GPS Points Recorded: ${locationHistory.length}`, margin + 2, yPos);
    yPos += 6;

    const startTime = formatDateTimeUS(locationHistory[0].timestamp);
    const endTime = formatDateTimeUS(locationHistory[locationHistory.length - 1].timestamp);
    
    doc.text(`Start: ${startTime}`, margin + 2, yPos);
    yPos += 5;
    doc.text(`End: ${endTime}`, margin + 2, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('GPS coordinates tracked throughout the trip provide proof of service delivery.', margin + 2, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
  }

  // GPS Map Image
  if (locationHistory.length > 0 && data.mapImageData) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    try {
      const mapWidth = contentWidth;
      const mapHeight = 100; // Fixed height for map image
      
      doc.addImage(data.mapImageData, 'PNG', margin, yPos, mapWidth, mapHeight);
      yPos += mapHeight + 8;
    } catch (err) {
      console.error('Error adding map image to PDF:', err);
      doc.setFontSize(9);
      doc.setTextColor(200, 0, 0);
      doc.text('Map image unavailable', margin + 2, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
    }
  }

  // Patient Signature (Receipt Style - After Status Timeline)
  if (patientSignature) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 5;
    
    // Patient signature box (centered, like a stamp)
    const patStampWidth = 80;
    const patStampHeight = 35;
    const patStampX = (pageWidth - patStampWidth) / 2;
    
    doc.setDrawColor(147, 51, 234); // Purple
    doc.setLineWidth(1);
    doc.rect(patStampX, yPos, patStampWidth, patStampHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234);
    doc.text('PATIENT SIGNATURE', patStampX + patStampWidth / 2, yPos + 5, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (patientSignature.signer_name) {
      doc.text(patientSignature.signer_name, patStampX + patStampWidth / 2, yPos + 10, { align: 'center' });
    }
    doc.text(formatDateTimeUS(patientSignature.signed_at), patStampX + patStampWidth / 2, yPos + 14, { align: 'center' });
    
    try {
      doc.addImage(patientSignature.signature_data, 'PNG', patStampX + 5, yPos + 16, patStampWidth - 10, 16);
    } catch (err) {
      console.error('Error adding patient signature to PDF:', err);
      doc.setFontSize(7);
      doc.setTextColor(200, 0, 0);
      doc.text('Signature unavailable', patStampX + patStampWidth / 2, yPos + 22, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPos += patStampHeight + 8;
  }

  // Driver Signature Stamp at Bottom (Receipt Style)
  if (driverSignature) {
    // Check if we need a new page
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    // Line separator (like receipt tear-off)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Driver signature box (centered, like a stamp)
    const stampWidth = 80;
    const stampHeight = 35;
    const stampX = (pageWidth - stampWidth) / 2;
    
    doc.setDrawColor(37, 99, 235); // Blue
    doc.setLineWidth(1);
    doc.rect(stampX, yPos, stampWidth, stampHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('DRIVER SIGNATURE', stampX + stampWidth / 2, yPos + 5, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (driverName) {
      doc.text(driverName, stampX + stampWidth / 2, yPos + 10, { align: 'center' });
    }
    
    try {
      doc.addImage(driverSignature, 'PNG', stampX + 5, yPos + 12, stampWidth - 10, 18);
    } catch (err) {
      console.error('Error adding driver signature to PDF:', err);
      doc.setFontSize(7);
      doc.setTextColor(200, 0, 0);
      doc.text('Signature unavailable', stampX + stampWidth / 2, yPos + 22, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPos += stampHeight + 5;

    // Receipt footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for using our transportation service', pageWidth / 2, yPos, { align: 'center' });
  }

  // Save the PDF
  const fileName = `Trip_Report_${trip.tripNumber || trip.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
