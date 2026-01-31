import { supabase } from '../lib/supabase';

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
    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .order('submission_date', { ascending: false });

    if (error) throw error;
    return data as DocumentSubmission[];
  },

  async getByDriver(driverId: string) {
    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('driver_id', driverId)
      .order('submission_date', { ascending: false });

    if (error) throw error;
    return data as DocumentSubmission[];
  },

  async getByStatus(status: 'pending' | 'approved' | 'rejected') {
    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('status', status)
      .order('submission_date', { ascending: false });

    if (error) throw error;
    return data as DocumentSubmission[];
  },

  async create(submission: Omit<DocumentSubmission, 'id' | 'submission_date' | 'version'>) {
    const { data, error } = await supabase
      .from('document_submissions')
      .insert([submission])
      .select()
      .single();

    if (error) throw error;
    return data as DocumentSubmission;
  },

  async approve(submissionId: string, reviewerId: string, notes?: string) {
    const { data, error } = await supabase
      .from('document_submissions')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    // Log review
    await supabase
      .from('document_reviews')
      .insert([{
        submission_id: submissionId,
        reviewer_id: reviewerId,
        action: 'approved',
        notes: notes
      }]);

    return data as DocumentSubmission;
  },

  async reject(submissionId: string, reviewerId: string, reason: string) {
    const { data, error } = await supabase
      .from('document_submissions')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    // Log review
    await supabase
      .from('document_reviews')
      .insert([{
        submission_id: submissionId,
        reviewer_id: reviewerId,
        action: 'rejected',
        notes: reason
      }]);

    return data as DocumentSubmission;
  }
};

// System Settings Service
export const systemSettingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;
    return data as SystemSetting[];
  },

  async getByCategory(category: SystemSetting['category']) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', category);

    if (error) throw error;
    return data as SystemSetting[];
  },

  async getByKey(key: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) throw error;
    return data as SystemSetting | null;
  },

  async upsert(key: string, value: any, category: SystemSetting['category'], userId?: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        category: category,
        updated_by: userId
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (error) throw error;
    return data as SystemSetting;
  },

  async delete(key: string) {
    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', key);

    if (error) throw error;
  }
};

// Notification Settings Service
export const notificationSettingsService = {
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as NotificationSetting | null;
  },

  async getByDriver(driverId: string) {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (error) throw error;
    return data as NotificationSetting | null;
  },

  async upsert(settings: Partial<NotificationSetting>) {
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(settings)
      .select()
      .single();

    if (error) throw error;
    return data as NotificationSetting;
  }
};

// Reminder Schedule Service
export const reminderScheduleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('reminder_schedules')
      .select('*')
      .order('days_before_expiry', { ascending: false });

    if (error) throw error;
    return data as ReminderSchedule[];
  },

  async getEnabled() {
    const { data, error } = await supabase
      .from('reminder_schedules')
      .select('*')
      .eq('is_enabled', true)
      .order('days_before_expiry', { ascending: false });

    if (error) throw error;
    return data as ReminderSchedule[];
  },

  async create(schedule: Omit<ReminderSchedule, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('reminder_schedules')
      .insert([schedule])
      .select()
      .single();

    if (error) throw error;
    return data as ReminderSchedule;
  },

  async update(id: string, updates: Partial<ReminderSchedule>) {
    const { data, error } = await supabase
      .from('reminder_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ReminderSchedule;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('reminder_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Compliance Metrics Service
export const complianceMetricsService = {
  async getLatest() {
    const { data, error } = await supabase
      .from('compliance_metrics')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ComplianceMetric | null;
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('compliance_metrics')
      .select('*')
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return data as ComplianceMetric[];
  },

  async create(metric: Omit<ComplianceMetric, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('compliance_metrics')
      .insert([metric])
      .select()
      .single();

    if (error) throw error;
    return data as ComplianceMetric;
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
    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .select('*')
      .eq('alert_sent', false)
      .order('alert_date', { ascending: true });

    if (error) throw error;
    return data as DocumentExpiryAlert[];
  },

  async getByDriver(driverId: string) {
    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .select('*')
      .eq('driver_id', driverId)
      .order('alert_date', { ascending: false });

    if (error) throw error;
    return data as DocumentExpiryAlert[];
  },

  async create(alert: Omit<DocumentExpiryAlert, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .insert([alert])
      .select()
      .single();

    if (error) throw error;
    return data as DocumentExpiryAlert;
  },

  async markSent(alertId: string, channel: 'email' | 'sms' | 'push') {
    const updates: any = { alert_sent: true };
    if (channel === 'email') updates.email_sent = true;
    if (channel === 'sms') updates.sms_sent = true;
    if (channel === 'push') updates.push_sent = true;

    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data as DocumentExpiryAlert;
  },

  async acknowledge(alertId: string) {
    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data as DocumentExpiryAlert;
  },

  async snooze(alertId: string, days: number) {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    const { data, error } = await supabase
      .from('document_expiry_alerts')
      .update({
        snoozed_until: snoozeUntil.toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data as DocumentExpiryAlert;
  }
};

// Activity Log Service
export const activityLogService = {
  async getRecent(limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getByUser(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getByEntity(entityType: string, entityId: string) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
