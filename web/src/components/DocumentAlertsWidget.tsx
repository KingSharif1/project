import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import { getDocumentExpirySummary } from '../utils/documentExpiryMonitor';

interface DocumentAlertsWidgetProps {
  drivers: any[];
  onNavigateToMonitor?: () => void;
}

export const DocumentAlertsWidget: React.FC<DocumentAlertsWidgetProps> = ({
  drivers,
  onNavigateToMonitor
}) => {
  const [summary, setSummary] = useState<any>(null);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [drivers]);

  const loadData = () => {
    const summaryData = getDocumentExpirySummary(drivers);
    setSummary(summaryData);

    // Get recent document updates (last 3)
    const updates: any[] = [];
    drivers.forEach(driver => {
      const dates = [
        { type: 'License', date: driver.license_expiry_date, driver: driver.name },
        { type: 'Insurance', date: driver.insurance_expiry_date, driver: driver.name },
        { type: 'Registration', date: driver.registration_expiry_date, driver: driver.name },
        { type: 'Medical Cert', date: driver.medical_cert_expiry_date, driver: driver.name },
        { type: 'Background Check', date: driver.background_check_expiry_date, driver: driver.name }
      ];

      dates.forEach(doc => {
        if (doc.date) {
          updates.push({
            ...doc,
            updatedAt: new Date(doc.date)
          });
        }
      });
    });

    // Sort by date and take most recent 3
    updates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    setRecentUpdates(updates.slice(0, 3));
  };

  if (!summary) return null;

  const hasAlerts = summary.expired > 0 || summary.expiringSoon > 0;
  const alertLevel = summary.expired > 0 ? 'critical' : summary.expiringSoon > 0 ? 'warning' : 'good';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${
        alertLevel === 'critical'
          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200'
          : alertLevel === 'warning'
          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200'
          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {alertLevel === 'critical' ? (
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            ) : alertLevel === 'warning' ? (
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            ) : (
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900">Document Alerts</h3>
              <p className="text-sm text-gray-600">
                {hasAlerts ? 'Action required' : 'All documents valid'}
              </p>
            </div>
          </div>
          {onNavigateToMonitor && (
            <button
              onClick={onNavigateToMonitor}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 divide-x divide-gray-200">
        <div className="p-4 text-center">
          <div className={`text-2xl font-bold mb-1 ${
            summary.expired > 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {summary.expired}
          </div>
          <div className="text-xs text-gray-600 font-medium">Expired</div>
        </div>

        <div className="p-4 text-center">
          <div className={`text-2xl font-bold mb-1 ${
            summary.expiringSoon > 0 ? 'text-amber-600' : 'text-gray-900'
          }`}>
            {summary.expiringSoon}
          </div>
          <div className="text-xs text-gray-600 font-medium">Next 7 Days</div>
        </div>

        <div className="p-4 text-center">
          <div className={`text-2xl font-bold mb-1 ${
            summary.notSet > 0 ? 'text-orange-600' : 'text-gray-900'
          }`}>
            {summary.notSet}
          </div>
          <div className="text-xs text-gray-600 font-medium">Not Set</div>
        </div>

        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {summary.allValid}
          </div>
          <div className="text-xs text-gray-600 font-medium">All Valid</div>
        </div>
      </div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Recent Updates
          </h4>
          <div className="space-y-2">
            {recentUpdates.map((update, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-900 font-medium">{update.driver}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-600">{update.type}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {update.updatedAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {hasAlerts && onNavigateToMonitor && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-t border-blue-100">
          <button
            onClick={onNavigateToMonitor}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>View Document Monitor</span>
          </button>
        </div>
      )}
    </div>
  );
};
