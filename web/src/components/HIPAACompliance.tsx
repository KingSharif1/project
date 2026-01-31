import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Lock,
  Eye,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auditLogger, AuditLogEntry, AuditEventType } from '../utils/hipaaAuditLog';

export const HIPAACompliance: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<AuditEventType | 'all'>('all');
  const [phiOnlyFilter, setPhiOnlyFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAuditLogs();
  }, [eventTypeFilter, phiOnlyFilter, dateRange]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await auditLogger.getAuditLogs({
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
        phiOnly: phiOnlyFilter,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        log.user_email.toLowerCase().includes(search) ||
        log.event_type.toLowerCase().includes(search) ||
        log.resource_type.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search)
      );
    });
  }, [auditLogs, searchTerm]);

  const stats = useMemo(() => {
    const phiAccesses = auditLogs.filter(log => log.phi_accessed).length;
    const failedAttempts = auditLogs.filter(log => !log.success).length;
    const uniqueUsers = new Set(auditLogs.map(log => log.user_id)).size;
    const recentLogins = auditLogs.filter(log => log.event_type === 'user_login').length;

    return {
      totalEvents: auditLogs.length,
      phiAccesses,
      failedAttempts,
      uniqueUsers,
      recentLogins,
    };
  }, [auditLogs]);

  const exportAuditLogs = () => {
    const csv = [
      ['Timestamp', 'User Email', 'Role', 'Event Type', 'Resource', 'Action', 'Success', 'PHI Accessed'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.user_email,
        log.user_role,
        log.event_type,
        log.resource_type,
        log.action,
        log.success ? 'Yes' : 'No',
        log.phi_accessed ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hipaa-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view HIPAA compliance data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HIPAA Compliance</h1>
          <p className="text-gray-600">Security audit logs and compliance monitoring</p>
        </div>
        <button
          onClick={exportAuditLogs}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-5 h-5" />
          <span>Export Audit Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Events</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
          <p className="text-sm text-gray-500 mt-1">Last 7 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">PHI Accesses</p>
          <p className="text-3xl font-bold text-gray-900">{stats.phiAccesses}</p>
          <p className="text-sm text-purple-600 mt-1">Protected data views</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Failed Attempts</p>
          <p className="text-3xl font-bold text-gray-900">{stats.failedAttempts}</p>
          <p className="text-sm text-red-600 mt-1">Security alerts</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-gray-900">{stats.uniqueUsers}</p>
          <p className="text-sm text-gray-500 mt-1">Unique users</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-xl">
              <Lock className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Login Events</p>
          <p className="text-3xl font-bold text-gray-900">{stats.recentLogins}</p>
          <p className="text-sm text-gray-500 mt-1">Authentication logs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Audit Log Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value as AuditEventType | 'all')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Events</option>
              <option value="patient_viewed">Patient Viewed</option>
              <option value="patient_created">Patient Created</option>
              <option value="patient_updated">Patient Updated</option>
              <option value="trip_viewed">Trip Viewed</option>
              <option value="trip_created">Trip Created</option>
              <option value="user_login">User Login</option>
              <option value="user_failed_login">Failed Login</option>
              <option value="report_exported">Report Exported</option>
              <option value="unauthorized_access_attempt">Unauthorized Access</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setPhiOnlyFilter(!phiOnlyFilter)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              phiOnlyFilter
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>PHI Access Only</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Audit Log Entries</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredLogs.length} of {auditLogs.length} events
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No audit logs found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Event</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Resource</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">PHI</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id || index}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      !log.success ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{log.user_email}</p>
                        <p className="text-xs text-gray-500">{log.user_role}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {log.resource_type}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 capitalize">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.phi_accessed && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                          <Eye className="w-3 h-3 mr-1" />
                          PHI
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start space-x-4">
          <Shield className="w-8 h-8 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">HIPAA Compliance Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Audit logging enabled and active</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">PHI access tracking operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Session timeout enforced (15 minutes)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Role-based access control active</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Data encryption at rest and in transit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
