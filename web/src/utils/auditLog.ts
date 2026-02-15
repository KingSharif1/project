import * as api from '../services/api';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'export'
  | 'print'
  | 'assign_driver'
  | 'cancel_trip'
  | 'complete_trip';

export type EntityType =
  | 'trip'
  | 'patient'
  | 'driver'
  | 'vehicle'
  | 'contractor'
  | 'user'
  | 'invoice'
  | 'auth';

interface AuditLogEntry {
  userId?: string;
  clinicId?: string; // Company/tenant ID for multi-tenant filtering
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

export async function logAudit({
  userId,
  clinicId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: AuditLogEntry): Promise<void> {
  try {
    // Skip audit logging if userId is not a valid UUID
    // This happens with mock users like "admin-1"
    if (userId && !isValidUUID(userId)) {
      console.log('Skipping audit log for non-UUID user:', userId);
      return;
    }

    const logEntry = {
      user_id: userId || null,
      clinic_id: clinicId || null, // Company/tenant ID
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
      ip_address: ipAddress || null,
    };

    const result = await api.insertActivityLog(logEntry);
    if (result.success) {
      console.log('Audit log created:', result.data);
    } else {
      console.error('Audit log error');
      console.error('Failed entry:', logEntry);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function getAuditLogs(filters?: {
  userId?: string;
  clinicId?: string; // Filter by company/tenant
  entityType?: EntityType;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  action?: AuditAction;
}) {
  try {
    const result = await api.getActivityLogs(filters);
    const data = result.data || [];
    
    console.log('Fetched audit logs from database:', data.length, 'entries');
    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

export async function exportAuditLogs(startDate: string, endDate: string) {
  const logs = await getAuditLogs({ startDate, endDate });

  const csvContent = [
    ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details'].join(','),
    ...logs.map((log: any) => [
      new Date(log.created_at).toISOString(),
      log.user_id || 'N/A',
      log.action,
      log.entity_type,
      log.entity_id || 'N/A',
      log.ip_address || 'N/A',
      JSON.stringify(log.details || {}).replace(/,/g, ';'),
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
