import { supabase } from '../lib/supabase';

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
    // Get all active drivers with document expiry dates
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .neq('status', 'inactive');

    if (error) throw error;

    const notifications: any[] = [];

    for (const driver of drivers || []) {
      const status = checkDriverDocuments(driver);

      // Check each document
      for (const doc of status.documents) {
        if (doc.status === 'expired' || doc.status === 'expiring_soon') {
          const shouldNotify = await shouldSendNotification(
            driver.id,
            doc.type,
            driver[`${doc.type}_expiry_notified_at`]
          );

          if (shouldNotify) {
            // Create notification for driver
            notifications.push({
              user_id: driver.id,
              type: 'alert',
              title: doc.status === 'expired' ? 'Document Expired!' : 'Document Expiring Soon',
              message: doc.message,
              driver_id: driver.id,
              priority: doc.severity === 'danger' ? 'urgent' : 'high',
              metadata: { document_type: doc.type, expiry_date: doc.expiryDate }
            });

            // Create notification for admin
            notifications.push({
              user_id: 'admin',
              type: 'alert',
              title: `Driver Document ${doc.status === 'expired' ? 'Expired' : 'Expiring'}`,
              message: `${driver.name}: ${doc.message}`,
              driver_id: driver.id,
              priority: doc.severity === 'danger' ? 'urgent' : 'high',
              metadata: { document_type: doc.type, expiry_date: doc.expiryDate }
            });

            // Update notification timestamp
            await supabase
              .from('drivers')
              .update({ [`${doc.type}_expiry_notified_at`]: new Date().toISOString() })
              .eq('id', driver.id);
          }
        }
      }
    }

    // Insert all notifications at once
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return {
      success: true,
      notificationsSent: notifications.length,
      driversChecked: drivers?.length || 0
    };
  } catch (error) {
    console.error('Error checking driver documents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Determine if we should send a notification
 * Don't spam - send once per week for expiring, daily for expired
 */
async function shouldSendNotification(
  driverId: string,
  docType: string,
  lastNotifiedAt: string | null
): Promise<boolean> {
  if (!lastNotifiedAt) return true;

  const lastNotified = new Date(lastNotifiedAt);
  const now = new Date();
  const hoursSince = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

  // Get the document expiry date to determine urgency
  const { data: driver } = await supabase
    .from('drivers')
    .select(`${docType}_expiry_date`)
    .eq('id', driverId)
    .single();

  if (!driver || !driver[`${docType}_expiry_date`]) return false;

  const expiryDate = new Date(driver[`${docType}_expiry_date`]);
  const days = daysUntil(expiryDate);

  if (days === null) return false;

  // If expired or expiring within 7 days, notify daily
  if (days <= 7) {
    return hoursSince >= 24;
  }

  // If expiring within 30 days, notify weekly
  if (days <= 30) {
    return hoursSince >= 168; // 7 days
  }

  return false;
}

/**
 * Get summary of all document expiries
 */
export async function getDocumentExpirySummary() {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const summary = {
      totalDrivers: drivers?.length || 0,
      expiredCount: 0,
      expiringSoonCount: 0,
      validCount: 0,
      notSetCount: 0,
      details: [] as DriverDocumentStatus[]
    };

    for (const driver of drivers || []) {
      const status = checkDriverDocuments(driver);
      summary.details.push(status);

      if (status.hasExpiredDocs) {
        summary.expiredCount++;
      } else if (status.hasExpiringSoon) {
        summary.expiringSoonCount++;
      } else {
        const hasNotSet = status.documents.some(d => d.status === 'not_set');
        if (hasNotSet) {
          summary.notSetCount++;
        } else {
          summary.validCount++;
        }
      }
    }

    return summary;
  } catch (error) {
    console.error('Error getting document expiry summary:', error);
    return null;
  }
}
