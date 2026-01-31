import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, XCircle, AlertCircle, User, Clock, MessageSquare, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface DocumentReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  action: 'approved' | 'rejected' | 'requested_changes';
  notes: string;
  created_at: string;
  reviewer?: {
    full_name: string;
    email: string;
  };
  submission?: {
    document_type: string;
    driver_id: string;
    expiry_date: string;
    driver?: {
      name: string;
    };
  };
}

interface DocumentReviewHistoryProps {
  submissionId?: string;
  driverId?: string;
  reviewerId?: string;
}

export const DocumentReviewHistory: React.FC<DocumentReviewHistoryProps> = ({
  submissionId,
  driverId,
  reviewerId
}) => {
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    requested_changes: 0
  });

  useEffect(() => {
    loadReviews();
  }, [submissionId, driverId, reviewerId]);

  const loadReviews = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('document_reviews')
        .select(`
          *,
          reviewer:users!reviewer_id(full_name, email),
          submission:document_submissions!submission_id(
            document_type,
            driver_id,
            expiry_date,
            driver:drivers!driver_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (submissionId) {
        query = query.eq('submission_id', submissionId);
      }

      if (reviewerId) {
        query = query.eq('reviewer_id', reviewerId);
      }

      if (driverId) {
        // Need to join through submissions to filter by driver
        const { data: submissions } = await supabase
          .from('document_submissions')
          .select('id')
          .eq('driver_id', driverId);

        if (submissions && submissions.length > 0) {
          query = query.in('submission_id', submissions.map(s => s.id));
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setReviews(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const approved = data?.filter(r => r.action === 'approved').length || 0;
      const rejected = data?.filter(r => r.action === 'rejected').length || 0;
      const requested_changes = data?.filter(r => r.action === 'requested_changes').length || 0;

      setStats({ total, approved, rejected, requested_changes });
    } catch (error) {
      console.error('Error loading document reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filterAction === 'all') return true;
    return review.action === filterAction;
  });

  const exportToExcel = () => {
    const data = filteredReviews.map(review => ({
      'Timestamp': new Date(review.created_at).toLocaleString(),
      'Reviewer': review.reviewer?.full_name || 'Unknown',
      'Driver': review.submission?.driver?.name || 'Unknown',
      'Document Type': review.submission?.document_type || 'Unknown',
      'Action': review.action,
      'Notes': review.notes || 'N/A',
      'Expiry Date': review.submission?.expiry_date ?
        new Date(review.submission.expiry_date).toLocaleDateString() : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Document Reviews');
    XLSX.writeFile(wb, `document_reviews_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'requested_changes':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <FileCheck className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'requested_changes':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDocumentType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileCheck className="w-8 h-8 mr-3 text-purple-600" />
            Document Review History
          </h1>
          <p className="text-gray-600 mt-1">Immutable audit trail of all document reviews</p>
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
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-purple-100">Total Reviews</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.approved}</div>
          <div className="text-green-100">Approved</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.rejected}</div>
          <div className="text-red-100">Rejected</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.requested_changes}</div>
          <div className="text-amber-100">Changes Requested</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="requested_changes">Changes Requested</option>
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredReviews.length} of {reviews.length} reviews
          </span>
        </div>
      </div>

      {/* Review Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Review Timeline</h2>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" />
              <p>Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reviews found</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Action Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${getActionColor(review.action)}`}>
                    {getActionIcon(review.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {getActionLabel(review.action)}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getActionColor(review.action)}`}>
                          {review.action}
                        </span>
                      </div>
                      <span className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(review.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Reviewer */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span className="font-medium">{review.reviewer?.full_name || 'Unknown Reviewer'}</span>
                      </span>
                      {review.reviewer?.email && (
                        <span className="text-gray-500">{review.reviewer.email}</span>
                      )}
                    </div>

                    {/* Document Info */}
                    {review.submission && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 mb-1">Driver</div>
                            <div className="font-semibold text-gray-900">
                              {review.submission.driver?.name || 'Unknown'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">Document Type</div>
                            <div className="font-semibold text-gray-900">
                              {formatDocumentType(review.submission.document_type)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">Expiry Date</div>
                            <div className="font-semibold text-gray-900">
                              {new Date(review.submission.expiry_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Review Notes */}
                    {review.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-blue-900 mb-1">Review Notes</div>
                            <p className="text-gray-700">{review.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Immutable Badge */}
                    <div className="mt-3 text-xs text-gray-500 flex items-center">
                      <span className="px-2 py-1 bg-gray-100 rounded-full font-medium">
                        🔒 Immutable Record
                      </span>
                      <span className="ml-2">This entry cannot be modified or deleted</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
