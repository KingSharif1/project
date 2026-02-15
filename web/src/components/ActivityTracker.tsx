import React, { useState, useEffect } from 'react';
import { Activity, Users, Car, FileText, Clock, Download, Shield, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActivityLog } from '../types';
import { getAuditLogs, exportAuditLogs } from '../utils/auditLog';

export const ActivityTracker: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [user, isAdmin, filterType]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      
      // Multi-tenant filtering: each company only sees their own logs
      // Admin sees all logs for their company, dispatchers see only their own
      if (user?.clinicId) {
        filters.clinicId = user.clinicId;
      }
      
      // Non-admin users only see their own activity
      if (!isAdmin && user?.id) {
        filters.userId = user.id;
      }
      
      if (filterType !== 'all') {
        filters.entityType = filterType;
      }

      console.log('Loading audit logs with filters:', filters);
      const logs = await getAuditLogs(filters);
      console.log('Audit logs loaded:', logs.length, 'entries');
      setActivities(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const end = dateRange.end || new Date().toISOString().split('T')[0];
    const start = dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    exportAuditLogs(start, end);
  };

  const getUserName = (userId: string) => {
    // User ID is displayed directly since we don't have a users list here
    return userId ? `User ${userId.slice(0, 8)}...` : 'System';
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getIcon = (entityType: string, action?: string) => {
    if (action === 'login') return <LogIn className="w-5 h-5 text-green-600" />;
    if (action === 'logout') return <LogOut className="w-5 h-5 text-gray-600" />;
    if (action === 'login_failed') return <Shield className="w-5 h-5 text-red-600" />;

    switch (entityType) {
      case 'trip':
        return <Car className="w-5 h-5 text-blue-600" />;
      case 'driver':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'user':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'auth':
        return <Shield className="w-5 h-5 text-gray-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getIconColor = (entityType: string) => {
    switch (entityType) {
      case 'trip':
        return 'bg-blue-100 text-blue-600';
      case 'driver':
        return 'bg-green-100 text-green-600';
      case 'user':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredActivities = activities;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Log</h1>
          <p className="text-gray-600">
            {isAdmin ? 'HIPAA Compliant Audit Trail - All system activities are logged' : 'Track your recent activities'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Logs</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {['all', 'trip', 'driver', 'user', 'auth', 'patient', 'vehicle', 'contractor'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audit logs...</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {filteredActivities.map((activity, index) => (
                <div key={activity.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${getIconColor(activity.entity_type)}`}>
                      {getIcon(activity.entity_type, activity.action)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {activity.action.replace('_', ' ')} {activity.entity_type}
                          </p>
                          {isAdmin && activity.user_id && (
                            <p className="text-sm text-gray-600 mt-1">
                              User ID: {activity.user_id.slice(0, 8)}...
                            </p>
                          )}
                          {activity.ip_address && (
                            <p className="text-xs text-gray-500 mt-1">
                              IP: {activity.ip_address}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 whitespace-nowrap ml-4">
                          <Clock className="w-4 h-4" />
                          <span>{getTimeAgo(activity.created_at)}</span>
                        </div>
                      </div>

                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No activities found</p>
                <p className="text-sm">Activities will appear here as actions are performed</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
