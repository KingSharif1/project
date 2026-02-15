import * as api from '../services/api';

export interface DocumentStatus {
  type: 'license' | 'insurance' | 'registration' | 'medical_cert' | 'background_check';
  expiryDate: Date | null;
  daysUntilExpiry: number | null;
  status: 'valid' | 'expiring_soon' | 'expired' | 'not_set';
  severity: 'none' | 'warning' | 'danger';
  message: string;
}

export interface DriverDocumentStatus {
  driverId: string;
  driverName: string;
  documents: DocumentStatus[];
  hasExpiredDocs: boolean;
  hasExpiringSoon: boolean;
}

/**
 * Calculate days until a date
 */
function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diff = targetDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get document status based on days until expiry
 */
function getDocumentStatus(expiryDate: Date | null, type: string): DocumentStatus {
  const days = daysUntil(expiryDate);

  const docNames: Record<string, string> = {
    license: 'Driver License',
    insurance: 'Vehicle Insurance',
    registration: 'Vehicle Registration',
    medical_cert: 'Medical Certification',
    background_check: 'Background Check'
  };

  const docName = docNames[type] || type;

  if (!expiryDate || days === null) {
    return {
      type: type as DocumentStatus['type'],
      expiryDate: null,
      daysUntilExpiry: null,
      status: 'not_set',
      severity: 'warning',
      message: `${docName} expiry date not set`
    };
  }

  if (days < 0) {
    return {
      type: type as DocumentStatus['type'],
      expiryDate,
      daysUntilExpiry: days,
      status: 'expired',
      severity: 'danger',
      message: `${docName} expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
    };
  }

  if (days === 0) {
    return {
      type: type as DocumentStatus['type'],
      expiryDate,
      daysUntilExpiry: days,
      status: 'expired',
      severity: 'danger',
      message: `${docName} expires today!`
    };
  }

  if (days <= 7) {
    return {
      type: type as DocumentStatus['type'],
      expiryDate,
      daysUntilExpiry: days,
      status: 'expiring_soon',
      severity: 'danger',
      message: `${docName} expires in ${days} day${days !== 1 ? 's' : ''}!`
    };
  }

  if (days <= 30) {
    return {
      type: type as DocumentStatus['type'],
      expiryDate,
      daysUntilExpiry: days,
      status: 'expiring_soon',
      severity: 'warning',
      message: `${docName} expires in ${days} days`
    };
  }

  return {
    type: type as DocumentStatus['type'],
    expiryDate,
    daysUntilExpiry: days,
    status: 'valid',
    severity: 'none',
    message: `${docName} valid for ${days} days`
  };
}

/**
 * Check all document statuses for a driver
 */
export function checkDriverDocuments(driver: any): DriverDocumentStatus {
  const documents: DocumentStatus[] = [
    getDocumentStatus(driver.license_expiry_date ? new Date(driver.license_expiry_date) : null, 'license'),
    getDocumentStatus(driver.insurance_expiry_date ? new Date(driver.insurance_expiry_date) : null, 'insurance'),
    getDocumentStatus(driver.registration_expiry_date ? new Date(driver.registration_expiry_date) : null, 'registration'),
    getDocumentStatus(driver.medical_cert_expiry_date ? new Date(driver.medical_cert_expiry_date) : null, 'medical_cert'),
    getDocumentStatus(driver.background_check_expiry_date ? new Date(driver.background_check_expiry_date) : null, 'background_check')
  ];

  return {
    driverId: driver.id,
    driverName: driver.name,
    documents,
    hasExpiredDocs: documents.some(d => d.status === 'expired'),
    hasExpiringSoon: documents.some(d => d.status === 'expiring_soon')
  };
}

/**
 * Check all drivers and send notifications for expiring documents
 */
export async function checkAllDriversAndNotify() {
  try {
    // Delegate to backend API which handles driver queries, throttling, and notification inserts
    const result = await api.checkAllDriverDocuments();
    return result;
  } catch (error) {
    console.error('Error checking driver documents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get summary of all document expiries
 */
export async function getDocumentExpirySummary() {
  try {
    // Delegate to backend API
    const result = await api.getDocumentExpirySummary();
    return result.data || null;
  } catch (error) {
    console.error('Error getting document expiry summary:', error);
    return null;
  }
}
