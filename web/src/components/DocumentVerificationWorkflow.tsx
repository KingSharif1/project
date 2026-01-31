import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, FileText, Download, Eye, MessageSquare, X, AlertTriangle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DocumentVerificationWorkflowProps {
  drivers: any[];
  onApprove: (driverId: string, documentType: string, notes: string) => void;
  onReject: (driverId: string, documentType: string, reason: string) => void;
  onClose: () => void;
}

export const DocumentVerificationWorkflow: React.FC<DocumentVerificationWorkflowProps> = ({
  drivers,
  onApprove,
  onReject,
  onClose
}) => {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const documentTypes = [
    { key: 'license', label: 'Driver License', expiryKey: 'license_expiry_date' },
    { key: 'insurance', label: 'Vehicle Insurance', expiryKey: 'insurance_expiry_date' },
    { key: 'registration', label: 'Vehicle Registration', expiryKey: 'registration_expiry_date' },
    { key: 'medical', label: 'Medical Certification', expiryKey: 'medical_cert_expiry_date' },
    { key: 'background', label: 'Background Check', expiryKey: 'background_check_expiry_date' }
  ];

  // Mock document submissions - in real app, this would come from database
  const pendingDocuments = drivers.flatMap(driver =>
    documentTypes.map(type => ({
      id: `${driver.id}-${type.key}`,
      driver: driver,
      documentType: type.key,
      documentLabel: type.label,
      expiryDate: (driver as any)[type.expiryKey],
      uploadedDate: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
      reviewedBy: null,
      reviewedAt: null,
      notes: '',
      fileUrl: '#' // Mock file URL
    }))
  ).filter(doc => doc.expiryDate); // Only show documents that have been uploaded

  const filteredDocuments = pendingDocuments.filter(doc => {
    if (filterStatus === 'all') return true;
    return doc.status === filterStatus;
  });

  const handleApprove = () => {
    if (selectedDocument) {
      onApprove(selectedDocument.driver.id, selectedDocument.documentType, reviewNotes);
      setSelectedDocument(null);
      setReviewNotes('');
    }
  };

  const handleReject = () => {
    if (selectedDocument && rejectionReason) {
      onReject(selectedDocument.driver.id, selectedDocument.documentType, rejectionReason);
      setSelectedDocument(null);
      setRejectionReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  const stats = {
    pending: pendingDocuments.filter(d => d.status === 'pending').length,
    approved: pendingDocuments.filter(d => d.status === 'approved').length,
    rejected: pendingDocuments.filter(d => d.status === 'rejected').length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Document Verification Workflow</h2>
              <p className="text-blue-100 mt-1">Review and approve driver document submissions</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-blue-100">Pending Review</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">{stats.approved}</div>
              <div className="text-sm text-blue-100">Approved</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <div className="text-sm text-blue-100">Rejected</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Documents
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Document List */}
            <div className="space-y-3">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documents to review</p>
                </div>
              ) : (
                filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDocument?.id === doc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{doc.driver.name}</h4>
                        <p className="text-sm text-gray-600">{doc.documentLabel}</p>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
                      <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                      <span>Uploaded: {new Date(doc.uploadedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Document Preview & Review */}
            <div className="sticky top-0">
              {selectedDocument ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <h3 className="font-bold text-gray-900">{selectedDocument.documentLabel}</h3>
                    <p className="text-sm text-gray-600">{selectedDocument.driver.name}</p>
                  </div>

                  {/* Document Preview */}
                  <div className="p-6">
                    <div className="bg-gray-100 rounded-lg p-12 mb-4 text-center">
                      <FileText className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 mb-4">Document Preview</p>
                      <button className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        <Eye className="w-4 h-4" />
                        <span>View Full Document</span>
                      </button>
                    </div>

                    {/* Document Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Driver ID:</span>
                        <span className="font-semibold">{selectedDocument.driver.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Document Type:</span>
                        <span className="font-semibold">{selectedDocument.documentLabel}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Expiry Date:</span>
                        <span className="font-semibold">{new Date(selectedDocument.expiryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Upload Date:</span>
                        <span className="font-semibold">{new Date(selectedDocument.uploadedDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(selectedDocument.status)}
                      </div>
                    </div>

                    {/* Review Actions */}
                    {selectedDocument.status === 'pending' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Review Notes (Optional)
                          </label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            placeholder="Add any notes or comments..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={handleApprove}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                setRejectionReason(reason);
                                handleReject();
                              }
                            }}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Approved/Rejected Info */}
                    {selectedDocument.status !== 'pending' && (
                      <div className={`p-4 rounded-lg ${
                        selectedDocument.status === 'approved'
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-start space-x-3">
                          {selectedDocument.status === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {selectedDocument.status === 'approved' ? 'Approved' : 'Rejected'}
                            </h4>
                            {selectedDocument.notes && (
                              <p className="text-sm text-gray-700">{selectedDocument.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">Select a document to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
