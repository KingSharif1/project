import * as api from './api';

export interface DocumentSubmission {
  id: string;
  driver_id: string;
  document_type: 'license' | 'insurance' | 'registration' | 'medical_cert' | 'background_check';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  expiry_date: string;
  submission_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  version: number;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: 'company' | 'notifications' | 'documents' | 'billing' | 'users' | 'integrations';
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  id: string;
  user_id?: string;
  driver_id?: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  trip_reminders: boolean;
  document_expiry: boolean;
  driver_updates: boolean;
  system_alerts: boolean;
}

export interface ReminderSchedule {
  id: string;
  days_before_expiry: number;
  label: string;
  is_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_template_subject?: string;
  email_template_body?: string;
  sms_template?: string;
  priority: number;
}

export interface ComplianceMetric {
  id: string;
  metric_date: string;
  total_drivers: number;
  total_documents: number;
  compliant_documents: number;
  expired_documents: number;
  expiring_soon_documents: number;
  not_set_documents: number;
  compliance_rate: number;
  avg_days_to_renewal?: number;
  estimated_non_compliance_cost?: number;
}

export interface DocumentExpiryAlert {
  id: string;
  driver_id: string;
  document_type: string;
  expiry_date: string;
  alert_date: string;
  days_until_expiry: number;
  alert_sent: boolean;
  email_sent: boolean;
  sms_sent: boolean;
  push_sent: boolean;
  acknowledged: boolean;
  acknowledged_at?: string;
  snoozed_until?: string;
}

// Document Submission Service
export const documentSubmissionService = {
  async getAll() {
    const result = await api.getDocumentSubmissions();
    return (result.data || []) as DocumentSubmission[];
  },

  async getByDriver(driverId: string) {
    const result = await api.getDocumentSubmissions(driverId);
    return (result.data || []) as DocumentSubmission[];
  },

  async getByStatus(status: 'pending' | 'approved' | 'rejected') {
    const result = await api.getDocumentSubmissions(undefined, status);
    return (result.data || []) as DocumentSubmission[];
  },

  async create(submission: Omit<DocumentSubmission, 'id' | 'submission_date' | 'version'>) {
    const result = await api.createDocumentSubmission(submission);
    return result.data as DocumentSubmission;
  },

  async approve(submissionId: string, reviewerId: string, notes?: string) {
    const result = await api.approveDocumentSubmission(submissionId, reviewerId, notes);
    return result.data as DocumentSubmission;
  },

  async reject(submissionId: string, reviewerId: string, reason: string) {
    const result = await api.rejectDocumentSubmission(submissionId, reviewerId, reason);
    return result.data as DocumentSubmission;
  }
};

// System Settings Service
export const systemSettingsService = {
  async getAll() {
    const result = await api.getSystemSettings();
    return (Array.isArray(result.data) ? result.data : []) as SystemSetting[];
  },

  async getByCategory(category: SystemSetting['category']) {
    const result = await api.getSystemSettings(category);
    return (Array.isArray(result.data) ? result.data : []) as SystemSetting[];
  },

  async getByKey(key: string) {
    const result = await api.getSystemSettings(undefined, key);
    return (result.data || null) as SystemSetting | null;
  },

  async upsert(key: string, value: any, category: SystemSetting['category'], userId?: string) {
    const result = await api.upsertSystemSetting(key, value, category, userId);
    return result.data as SystemSetting;
  },

  async delete(key: string) {
    await api.deleteSystemSetting(key);
  }
};

// Notification Settings Service
export const notificationSettingsService = {
  async getByUser(userId: string) {
    const result = await api.getNotificationSettings(userId);
    return (result.data || null) as NotificationSetting | null;
  },

  async getByDriver(driverId: string) {
    const result = await api.getNotificationSettings(undefined, driverId);
    return (result.data || null) as NotificationSetting | null;
  },

  async upsert(settings: Partial<NotificationSetting>) {
    const result = await api.upsertNotificationSettings(settings as Record<string, any>);
    return result.data as NotificationSetting;
  }
};

// Reminder Schedule Service
export const reminderScheduleService = {
  async getAll() {
    const result = await api.getReminderSchedules();
    return (result.data || []) as ReminderSchedule[];
  },

  async getEnabled() {
    const result = await api.getReminderSchedules(true);
    return (result.data || []) as ReminderSchedule[];
  },

  async create(schedule: Omit<ReminderSchedule, 'id' | 'created_at' | 'updated_at'>) {
    const result = await api.createReminderSchedule(schedule as Record<string, any>);
    return result.data as ReminderSchedule;
  },

  async update(id: string, updates: Partial<ReminderSchedule>) {
    const result = await api.updateReminderSchedule(id, updates as Record<string, any>);
    return result.data as ReminderSchedule;
  },

  async delete(id: string) {
    await api.deleteReminderSchedule(id);
  }
};

// Compliance Metrics Service
export const complianceMetricsService = {
  async getLatest() {
    const result = await api.getComplianceMetrics({ latest: true });
    return (result.data || null) as ComplianceMetric | null;
  },

  async getByDateRange(startDate: string, endDate: string) {
    const result = await api.getComplianceMetrics({ startDate, endDate });
    return (Array.isArray(result.data) ? result.data : []) as ComplianceMetric[];
  },

  async create(metric: Omit<ComplianceMetric, 'id' | 'created_at'>) {
    const result = await api.createComplianceMetric(metric as Record<string, any>);
    return result.data as ComplianceMetric;
  },

  async calculateAndStore(date: string, drivers: any[]) {
    let totalDocuments = 0;
    let compliantDocuments = 0;
    let expiredDocuments = 0;
    let expiringSoonDocuments = 0;
    let notSetDocuments = 0;

    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    drivers.forEach(driver => {
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      docs.forEach(doc => {
        totalDocuments++;
        if (!doc) {
          notSetDocuments++;
        } else {
          const expiryDate = new Date(doc);
          if (expiryDate < today) {
            expiredDocuments++;
          } else if (expiryDate <= sevenDaysFromNow) {
            expiringSoonDocuments++;
          } else {
            compliantDocuments++;
          }
        }
      });
    });

    const complianceRate = totalDocuments > 0
      ? (compliantDocuments / totalDocuments) * 100
      : 0;

    const estimatedCost = expiredDocuments * 500; // $500 per expired document

    return await this.create({
      metric_date: date,
      total_drivers: drivers.length,
      total_documents: totalDocuments,
      compliant_documents: compliantDocuments,
      expired_documents: expiredDocuments,
      expiring_soon_documents: expiringSoonDocuments,
      not_set_documents: notSetDocuments,
      compliance_rate: parseFloat(complianceRate.toFixed(2)),
      estimated_non_compliance_cost: estimatedCost
    });
  }
};

// Document Expiry Alerts Service
export const documentExpiryAlertsService = {
  async getActive() {
    const result = await api.getDocumentExpiryAlerts(undefined, true);
    return (result.data || []) as DocumentExpiryAlert[];
  },

  async getByDriver(driverId: string) {
    const result = await api.getDocumentExpiryAlerts(driverId);
    return (result.data || []) as DocumentExpiryAlert[];
  },

  async create(alert: Omit<DocumentExpiryAlert, 'id' | 'created_at'>) {
    const result = await api.createDocumentExpiryAlert(alert as Record<string, any>);
    return result.data as DocumentExpiryAlert;
  },

  async markSent(alertId: string, channel: 'email' | 'sms' | 'push') {
    const updates: any = { alert_sent: true };
    if (channel === 'email') updates.email_sent = true;
    if (channel === 'sms') updates.sms_sent = true;
    if (channel === 'push') updates.push_sent = true;
    const result = await api.updateDocumentExpiryAlert(alertId, updates);
    return result.data as DocumentExpiryAlert;
  },

  async acknowledge(alertId: string) {
    const result = await api.updateDocumentExpiryAlert(alertId, {
      acknowledged: true,
      acknowledged_at: new Date().toISOString()
    });
    return result.data as DocumentExpiryAlert;
  },

  async snooze(alertId: string, days: number) {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);
    const result = await api.updateDocumentExpiryAlert(alertId, {
      snoozed_until: snoozeUntil.toISOString()
    });
    return result.data as DocumentExpiryAlert;
  }
};

// Activity Log Service
export const activityLogService = {
  async getRecent(_limit: number = 50) {
    const result = await api.getActivityLogs();
    return result.data || [];
  },

  async getByUser(userId: string, _limit: number = 50) {
    const result = await api.getActivityLogs({ userId });
    return result.data || [];
  },

  async getByEntity(entityType: string, entityId: string) {
    const result = await api.getActivityLogs({ entityType, entityId });
    return result.data || [];
  }
};
