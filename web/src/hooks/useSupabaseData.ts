import { useState, useEffect } from 'react';
import {
  documentSubmissionService,
  systemSettingsService,
  notificationSettingsService,
  reminderScheduleService,
  complianceMetricsService,
  documentExpiryAlertsService,
  type DocumentSubmission,
  type SystemSetting,
  type NotificationSetting,
  type ReminderSchedule,
  type ComplianceMetric,
  type DocumentExpiryAlert
} from '../services/supabaseService';

export const useDocumentSubmissions = () => {
  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await documentSubmissionService.getAll();
      setSubmissions(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const approve = async (submissionId: string, reviewerId: string, notes?: string) => {
    try {
      await documentSubmissionService.approve(submissionId, reviewerId, notes);
      await loadSubmissions();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const reject = async (submissionId: string, reviewerId: string, reason: string) => {
    try {
      await documentSubmissionService.reject(submissionId, reviewerId, reason);
      await loadSubmissions();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { submissions, loading, error, reload: loadSubmissions, approve, reject };
};

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await systemSettingsService.getAll();
      setSettings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key);
  };

  const updateSetting = async (key: string, value: any, category: SystemSetting['category'], userId?: string) => {
    try {
      await systemSettingsService.upsert(key, value, category, userId);
      await loadSettings();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { settings, loading, error, getSetting, updateSetting, reload: loadSettings };
};

export const useNotificationSettings = (userId?: string, driverId?: string) => {
  const [settings, setSettings] = useState<NotificationSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      let data: NotificationSetting | null = null;

      if (userId) {
        data = await notificationSettingsService.getByUser(userId);
      } else if (driverId) {
        data = await notificationSettingsService.getByDriver(driverId);
      }

      setSettings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId || driverId) {
      loadSettings();
    }
  }, [userId, driverId]);

  const updateSettings = async (updates: Partial<NotificationSetting>) => {
    try {
      const data = await notificationSettingsService.upsert(updates);
      setSettings(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings, reload: loadSettings };
};

export const useReminderSchedules = () => {
  const [schedules, setSchedules] = useState<ReminderSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await reminderScheduleService.getAll();
      setSchedules(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const createSchedule = async (schedule: Omit<ReminderSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await reminderScheduleService.create(schedule);
      await loadSchedules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<ReminderSchedule>) => {
    try {
      await reminderScheduleService.update(id, updates);
      await loadSchedules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await reminderScheduleService.delete(id);
      await loadSchedules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { schedules, loading, error, createSchedule, updateSchedule, deleteSchedule, reload: loadSchedules };
};

export const useComplianceMetrics = (startDate?: string, endDate?: string) => {
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [latest, setLatest] = useState<ComplianceMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      if (startDate && endDate) {
        const data = await complianceMetricsService.getByDateRange(startDate, endDate);
        setMetrics(data);
      }

      const latestData = await complianceMetricsService.getLatest();
      setLatest(latestData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [startDate, endDate]);

  const calculate = async (date: string, drivers: any[]) => {
    try {
      await complianceMetricsService.calculateAndStore(date, drivers);
      await loadMetrics();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { metrics, latest, loading, error, calculate, reload: loadMetrics };
};

export const useDocumentExpiryAlerts = (driverId?: string) => {
  const [alerts, setAlerts] = useState<DocumentExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);

      if (driverId) {
        const data = await documentExpiryAlertsService.getByDriver(driverId);
        setAlerts(data);
      } else {
        const data = await documentExpiryAlertsService.getActive();
        setAlerts(data);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [driverId]);

  const createAlert = async (alert: Omit<DocumentExpiryAlert, 'id' | 'created_at'>) => {
    try {
      await documentExpiryAlertsService.create(alert);
      await loadAlerts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const markSent = async (alertId: string, channel: 'email' | 'sms' | 'push') => {
    try {
      await documentExpiryAlertsService.markSent(alertId, channel);
      await loadAlerts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const acknowledge = async (alertId: string) => {
    try {
      await documentExpiryAlertsService.acknowledge(alertId);
      await loadAlerts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const snooze = async (alertId: string, days: number) => {
    try {
      await documentExpiryAlertsService.snooze(alertId, days);
      await loadAlerts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { alerts, loading, error, createAlert, markSent, acknowledge, snooze, reload: loadAlerts };
};
