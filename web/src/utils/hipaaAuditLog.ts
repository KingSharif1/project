import { supabase } from '../lib/supabase';

export type AuditEventType =
  | 'patient_viewed'
  | 'patient_created'
  | 'patient_updated'
  | 'patient_deleted'
  | 'trip_viewed'
  | 'trip_created'
  | 'trip_updated'
  | 'trip_cancelled'
  | 'report_generated'
  | 'report_exported'
  | 'user_login'
  | 'user_logout'
  | 'user_failed_login'
  | 'password_changed'
  | 'permission_changed'
  | 'data_exported'
  | 'phi_accessed'
  | 'consent_viewed'
  | 'consent_updated'
  | 'unauthorized_access_attempt';

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  user_role: string;
  event_type: AuditEventType;
  resource_type: string;
  resource_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  details?: Record<string, any>;
  phi_accessed?: boolean;
}

class HIPAAAuditLogger {
  private static instance: HIPAAAuditLogger;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: number = 5000;
  private maxBufferSize: number = 50;

  private constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  public static getInstance(): HIPAAAuditLogger {
    if (!HIPAAAuditLogger.instance) {
      HIPAAAuditLogger.instance = new HIPAAAuditLogger();
    }
    return HIPAAAuditLogger.instance;
  }

  public async log(entry: Omit<AuditLogEntry, 'timestamp' | 'ip_address' | 'user_agent'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    this.buffer.push(auditEntry);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }

    console.log('[HIPAA Audit]', auditEntry);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(entriesToFlush);

      if (error) {
        console.error('Failed to flush audit logs:', error);
        this.buffer.unshift(...entriesToFlush);
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      this.buffer.unshift(...entriesToFlush);
    }
  }

  public async logPatientAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    patientId: string,
    action: 'view' | 'create' | 'update' | 'delete'
  ): Promise<void> {
    const eventTypeMap = {
      view: 'patient_viewed' as const,
      create: 'patient_created' as const,
      update: 'patient_updated' as const,
      delete: 'patient_deleted' as const,
    };

    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: eventTypeMap[action],
      resource_type: 'patient',
      resource_id: patientId,
      action: action,
      success: true,
      phi_accessed: true,
    });
  }

  public async logTripAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    tripId: string,
    action: 'view' | 'create' | 'update' | 'cancel'
  ): Promise<void> {
    const eventTypeMap = {
      view: 'trip_viewed' as const,
      create: 'trip_created' as const,
      update: 'trip_updated' as const,
      cancel: 'trip_cancelled' as const,
    };

    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: eventTypeMap[action],
      resource_type: 'trip',
      resource_id: tripId,
      action: action,
      success: true,
      phi_accessed: true,
    });
  }

  public async logReportAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    reportType: string,
    action: 'generate' | 'export',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: action === 'generate' ? 'report_generated' : 'report_exported',
      resource_type: 'report',
      resource_id: reportType,
      action: action,
      success: true,
      phi_accessed: true,
      details,
    });
  }

  public async logLogin(
    userId: string,
    userEmail: string,
    userRole: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: success ? 'user_login' : 'user_failed_login',
      resource_type: 'auth',
      resource_id: userId,
      action: 'login',
      success,
    });
  }

  public async logLogout(
    userId: string,
    userEmail: string,
    userRole: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: 'user_logout',
      resource_type: 'auth',
      resource_id: userId,
      action: 'logout',
      success: true,
    });
  }

  public async logUnauthorizedAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    attemptedAction: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      event_type: 'unauthorized_access_attempt',
      resource_type: resourceType,
      resource_id: resourceId,
      action: attemptedAction,
      success: false,
      details: {
        reason: 'Insufficient permissions',
      },
    });
  }

  public async getAuditLogs(filters?: {
    userId?: string;
    eventType?: AuditEventType;
    startDate?: string;
    endDate?: string;
    phiOnly?: boolean;
  }): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }

    if (filters?.phiOnly) {
      query = query.eq('phi_accessed', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data || [];
  }
}

export const auditLogger = HIPAAAuditLogger.getInstance();
