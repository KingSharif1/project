import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, Calendar, User, Clock, MapPin, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface ActivityLogProps {
  entityType?: string;
  entityId?: string;
  userId?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ entityType, entityId, userId }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadLogs();
  }, [entityType, entityId, userId]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);

      // Load user names
      const uniqueUserIds = [...new Set(data?.map(l => l.user_id).filter(Boolean))];
      if (uniqueUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', uniqueUserIds);

        const names: { [key: string]: string } = {};
        users?.forEach(u => {
          names[u.id] = u.full_name;
        });
        setUserNames(names);
      }
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        log.action.toLowerCase().includes(search) ||
        log.entity_type.toLowerCase().includes(search) ||
        log.entity_id.toLowerCase().includes(search) ||
        userNames[log.user_id]?.toLowerCase().includes(search);

      if (!matchesSearch) return false;
    }

    // Action filter
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false;
    }

    // Entity filter
    if (filterEntity !== 'all' && log.entity_type !== filterEntity) {
      return false;
    }

    // Date filters
    if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) {
      return false;
    }

    if (dateTo && new Date(log.created_at) > new Date(dateTo)) {
      return false;
    }

    return true;
  });

  const exportToExcel = () => {
    const data = filteredLogs.map(log => ({
      'Timestamp': new Date(log.created_at).toLocaleString(),
      'User': userNames[log.user_id] || 'Unknown',
      'Action': log.action,
      'Entity Type': log.entity_type,
      'Entity ID': log.entity_id,
      'IP Address': log.ip_address || 'N/A',
      'Browser': getBrowserFromUserAgent(log.user_agent),
      'Changes': Object.keys(log.new_values || {}).length
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Log');
    XLSX.writeFile(wb, `activity_log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getBrowserFromUserAgent = (userAgent: string) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700';
      case 'updated':
        return 'bg-blue-100 text-blue-700';
      case 'deleted':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '+';
      case 'updated':
        return '✓';
      case 'deleted':
        return '×';
      default:
        return '•';
    }
  };

  const formatEntityType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getChangedFields = (log: ActivityLogEntry) => {
    if (!log.old_values || !log.new_values) return [];

    const changes: Array<{ field: string; old: any; new: any }> = [];

    Object.keys(log.new_values).forEach(key => {
      if (JSON.stringify(log.old_values[key]) !== JSON.stringify(log.new_values[key])) {
        changes.push({
          field: key,
          old: log.old_values[key],
          new: log.new_values[key]
        });
      }
    });

    return changes;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
    return String(value);
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-blue-600" />
            Activity Log
          </h1>
          <p className="text-gray-600 mt-1">Complete audit trail of all system changes</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export to Excel</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{logs.length}</div>
          <div className="text-blue-100">Total Events</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">
            {logs.filter(l => l.action === 'created').length}
          </div>
          <div className="text-green-100">Created</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">
            {logs.filter(l => l.action === 'updated').length}
          </div>
          <div className="text-amber-100">Updated</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">
            {logs.filter(l => l.action === 'deleted').length}
          </div>
          <div className="text-red-100">Deleted</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-5 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user, action, entity..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>
                  {formatEntityType(entity)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="col-span-5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || filterAction !== 'all' || filterEntity !== 'all' || dateFrom || dateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAction('all');
                setFilterEntity('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Activity Timeline
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'})
            </span>
          </h2>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" />
              <p>Loading activity log...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity found</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const changes = getChangedFields(log);
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div
                    className="flex items-start space-x-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    {/* Action Badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {formatEntityType(log.entity_type)}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {userNames[log.user_id] || 'System'}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.ip_address && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {log.ip_address}
                          </span>
                        )}
                        {log.user_agent && (
                          <span className="flex items-center">
                            <Monitor className="w-4 h-4 mr-1" />
                            {getBrowserFromUserAgent(log.user_agent)}
                          </span>
                        )}
                      </div>

                      {/* Entity ID */}
                      <div className="mt-2 text-sm text-gray-500">
                        ID: <code className="px-2 py-0.5 bg-gray-100 rounded">{log.entity_id.substring(0, 8)}...</code>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {/* Changes */}
                          {changes.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Changes Made ({changes.length})</h4>
                              <div className="space-y-2">
                                {changes.map((change, index) => (
                                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                                    <div className="font-medium text-gray-900 mb-1">
                                      {change.field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <div className="text-red-600 font-medium mb-1">Old Value:</div>
                                        <pre className="bg-white p-2 rounded border border-red-200 overflow-x-auto">
                                          {formatValue(change.old)}
                                        </pre>
                                      </div>
                                      <div>
                                        <div className="text-green-600 font-medium mb-1">New Value:</div>
                                        <pre className="bg-white p-2 rounded border border-green-200 overflow-x-auto">
                                          {formatValue(change.new)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full User Agent */}
                          {log.user_agent && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">User Agent</h4>
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {log.user_agent}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
