import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, FileText, Shield, Car, Heart, Clipboard, Bell, X } from 'lucide-react';
import { checkDriverDocuments, checkAllDriversAndNotify, getDocumentExpirySummary, DriverDocumentStatus } from '../utils/documentExpiryMonitor';

interface DriverDocumentMonitorProps {
  drivers: any[];
  onUpdateDriver?: (driverId: string, updates: any) => void;
}

export const DriverDocumentMonitor: React.FC<DriverDocumentMonitorProps> = ({ drivers, onUpdateDriver }) => {
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<any>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [documentDates, setDocumentDates] = useState({
    license_expiry_date: '',
    insurance_expiry_date: '',
    registration_expiry_date: '',
    medical_cert_expiry_date: '',
    background_check_expiry_date: ''
  });

  useEffect(() => {
    loadSummary();
  }, [drivers]);

  const loadSummary = async () => {
    const summaryData = await getDocumentExpirySummary();
    setSummary(summaryData);
  };

  const handleSendNotifications = async () => {
    setIsNotifying(true);
    const result = await checkAllDriversAndNotify();
    if (result.success) {
      alert(`✅ Sent ${result.notificationsSent} notifications to drivers and admins!`);
    } else {
      alert(`❌ Error: ${result.error}`);
    }
    setIsNotifying(false);
  };

  const toggleDriver = (driverId: string) => {
    const newExpanded = new Set(expandedDrivers);
    if (newExpanded.has(driverId)) {
      newExpanded.delete(driverId);
    } else {
      newExpanded.add(driverId);
    }
    setExpandedDrivers(newExpanded);
  };

  const handleOpenEdit = (driver: any) => {
    setEditingDriver(driver);
    setDocumentDates({
      license_expiry_date: driver.license_expiry_date || '',
      insurance_expiry_date: driver.insurance_expiry_date || '',
      registration_expiry_date: driver.registration_expiry_date || '',
      medical_cert_expiry_date: driver.medical_cert_expiry_date || '',
      background_check_expiry_date: driver.background_check_expiry_date || ''
    });
  };

  const handleCloseEdit = () => {
    setEditingDriver(null);
    setDocumentDates({
      license_expiry_date: '',
      insurance_expiry_date: '',
      registration_expiry_date: '',
      medical_cert_expiry_date: '',
      background_check_expiry_date: ''
    });
  };

  const handleSaveDocuments = () => {
    if (editingDriver && onUpdateDriver) {
      onUpdateDriver(editingDriver.id, documentDates);
      handleCloseEdit();
      loadSummary();
    }
  };

  const getDocIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      license: <Shield className="w-5 h-5" />,
      insurance: <FileText className="w-5 h-5" />,
      registration: <Car className="w-5 h-5" />,
      medical_cert: <Heart className="w-5 h-5" />,
      background_check: <Clipboard className="w-5 h-5" />
    };
    return icons[type] || <FileText className="w-5 h-5" />;
  };

  const getSeverityBadge = (severity: string, status: string) => {
    if (severity === 'danger') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          {status === 'expired' ? 'EXPIRED' : 'CRITICAL'}
        </span>
      );
    }
    if (severity === 'warning') {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {status === 'not_set' ? 'NOT SET' : 'EXPIRING SOON'}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1">
        <CheckCircle className="w-4 h-4" />
        VALID
      </span>
    );
  };

  const getDriverStatusColor = (status: DriverDocumentStatus) => {
    if (status.hasExpiredDocs) return 'border-red-500 bg-red-50';
    if (status.hasExpiringSoon) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Document Expiry Monitor</h2>
            <p className="text-blue-100">Real-time tracking of driver document statuses</p>
          </div>
          <button
            onClick={handleSendNotifications}
            disabled={isNotifying}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Bell className="w-5 h-5" />
            {isNotifying ? 'Sending...' : 'Send Alerts'}
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-3xl font-bold">{summary.expiredCount}</div>
              <div className="text-sm text-blue-100">Expired Documents</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-3xl font-bold">{summary.expiringSoonCount}</div>
              <div className="text-sm text-blue-100">Expiring Soon</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-3xl font-bold">{summary.notSetCount}</div>
              <div className="text-sm text-blue-100">Not Set</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="text-3xl font-bold">{summary.validCount}</div>
              <div className="text-sm text-blue-100">All Valid</div>
            </div>
          </div>
        )}
      </div>

      {/* Driver List */}
      <div className="space-y-3">
        {drivers.map(driver => {
          const status = checkDriverDocuments(driver);
          const isExpanded = expandedDrivers.has(driver.id);
          const hasIssues = status.hasExpiredDocs || status.hasExpiringSoon;

          return (
            <div
              key={driver.id}
              className={`border-2 rounded-xl overflow-hidden transition-all ${getDriverStatusColor(status)}`}
            >
              {/* Driver Header */}
              <button
                onClick={() => toggleDriver(driver.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white hover:bg-opacity-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {driver.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">{driver.name}</div>
                    <div className="text-sm text-gray-600">
                      {hasIssues
                        ? `${status.documents.filter(d => d.status === 'expired' || d.status === 'expiring_soon').length} document(s) need attention`
                        : 'All documents valid'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {status.hasExpiredDocs && (
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                      EXPIRED
                    </span>
                  )}
                  {!status.hasExpiredDocs && status.hasExpiringSoon && (
                    <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-bold">
                      EXPIRING
                    </span>
                  )}
                  {!hasIssues && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  <Clock className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Document Details */}
              {isExpanded && (
                <div className="border-t-2 border-current p-4 bg-white space-y-3">
                  {status.documents.map(doc => (
                    <div
                      key={doc.type}
                      className={`p-4 rounded-lg border-2 ${
                        doc.severity === 'danger'
                          ? 'border-red-300 bg-red-50'
                          : doc.severity === 'warning'
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-green-300 bg-green-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            doc.severity === 'danger'
                              ? 'bg-red-100 text-red-600'
                              : doc.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {getDocIcon(doc.type)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 capitalize">
                              {doc.type.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-gray-600">{doc.message}</div>
                          </div>
                        </div>
                        {getSeverityBadge(doc.severity, doc.status)}
                      </div>

                      {doc.expiryDate && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Expiry Date:</span>{' '}
                          {doc.expiryDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenEdit(driver)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Update Document Dates
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Automated Alerts</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Documents expiring within 30 days trigger weekly alerts</li>
          <li>• Documents expiring within 7 days trigger daily alerts</li>
          <li>• Expired documents send urgent notifications immediately</li>
          <li>• Both drivers and admins receive notifications</li>
        </ul>
      </div>

      {/* Edit Document Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Update Document Dates</h2>
                <p className="text-sm text-gray-600 mt-1">{editingDriver.name}</p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Driver License Expiry Date
                </label>
                <input
                  type="date"
                  value={documentDates.license_expiry_date}
                  onChange={(e) => setDocumentDates({ ...documentDates, license_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Vehicle Insurance Expiry Date
                </label>
                <input
                  type="date"
                  value={documentDates.insurance_expiry_date}
                  onChange={(e) => setDocumentDates({ ...documentDates, insurance_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Car className="w-4 h-4 text-purple-600" />
                  Vehicle Registration Expiry Date
                </label>
                <input
                  type="date"
                  value={documentDates.registration_expiry_date}
                  onChange={(e) => setDocumentDates({ ...documentDates, registration_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-600" />
                  Medical Certification Expiry Date
                </label>
                <input
                  type="date"
                  value={documentDates.medical_cert_expiry_date}
                  onChange={(e) => setDocumentDates({ ...documentDates, medical_cert_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-amber-600" />
                  Background Check Expiry Date
                </label>
                <input
                  type="date"
                  value={documentDates.background_check_expiry_date}
                  onChange={(e) => setDocumentDates({ ...documentDates, background_check_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Tip:</span> Leave fields empty to clear the expiry date, or set future dates to update the documentation.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseEdit}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocuments}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
