import { useState, useEffect } from 'react';
import { Mail, Plus, Send, X, Check, Clock, DollarSign, Building2 } from 'lucide-react';
import * as api from '../services/api';

interface PendingSignup {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  requested_tier: 'basic' | 'premium' | 'enterprise';
  status: 'pending' | 'payment_sent' | 'paid' | 'account_created' | 'canceled';
  notes: string | null;
  created_at: string;
  payment_sent_at: string | null;
  paid_at: string | null;
  account_created_at: string | null;
}

const TIER_INFO = {
  basic: { name: 'Basic', price: '$99/mo', color: 'bg-blue-100 text-blue-800' },
  premium: { name: 'Premium', price: '$299/mo', color: 'bg-purple-100 text-purple-800' },
  enterprise: { name: 'Enterprise', price: '$599/mo', color: 'bg-orange-100 text-orange-800' }
};

const STATUS_INFO = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  payment_sent: { label: 'Payment Sent', icon: Mail, color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', icon: DollarSign, color: 'bg-green-100 text-green-800' },
  account_created: { label: 'Account Created', icon: Check, color: 'bg-green-100 text-green-800' },
  canceled: { label: 'Canceled', icon: X, color: 'bg-red-100 text-red-800' }
};

export default function CompanyOnboarding() {
  const [signups, setSignups] = useState<PendingSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    requestedTier: 'basic' as 'basic' | 'premium' | 'enterprise',
    notes: ''
  });

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      const response = await api.getPendingSignups();
      setSignups(response.data || []);
    } catch (error) {
      console.error('Error fetching signups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.createPendingSignup(formData);
      setShowForm(false);
      setFormData({
        companyName: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        requestedTier: 'basic',
        notes: ''
      });
      fetchSignups();
      alert('Pending signup created successfully!');
    } catch (error) {
      console.error('Error creating signup:', error);
      alert(`Failed to create signup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendPayment = async (signupId: string) => {
    if (!confirm('Send payment link to this prospect?')) return;

    setSendingPayment(signupId);
    try {
      await api.sendPaymentLink(signupId);
      alert('Payment link sent successfully!');
      fetchSignups();
    } catch (error) {
      console.error('Error sending payment link:', error);
      alert(`Failed to send payment link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingPayment(null);
    }
  };

  const handleCancel = async (signupId: string) => {
    if (!confirm('Cancel this signup?')) return;

    try {
      await api.cancelPendingSignup(signupId);
      fetchSignups();
    } catch (error) {
      console.error('Error canceling signup:', error);
      alert(`Failed to cancel signup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Onboarding</h1>
          <p className="text-gray-600 mt-1">Manage pending company signups and payments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          New Signup
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Create Pending Signup</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Tier *
                </label>
                <select
                  required
                  value={formData.requestedTier}
                  onChange={(e) => setFormData({ ...formData, requestedTier: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="basic">Basic - $99/month</option>
                  <option value="premium">Premium - $299/month</option>
                  <option value="enterprise">Enterprise - $599/month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create Signup
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {signups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No pending signups yet. Click "New Signup" to create one.
                  </td>
                </tr>
              ) : (
                signups.map((signup) => {
                  const StatusIcon = STATUS_INFO[signup.status].icon;
                  const tierInfo = TIER_INFO[signup.requested_tier];

                  return (
                    <tr key={signup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{signup.company_name}</div>
                            {signup.notes && (
                              <div className="text-sm text-gray-500">{signup.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{signup.contact_name}</div>
                          <div className="text-gray-500">{signup.contact_email}</div>
                          {signup.contact_phone && (
                            <div className="text-gray-500">{signup.contact_phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierInfo.color}`}>
                          {tierInfo.name} - {tierInfo.price}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${STATUS_INFO[signup.status].color}`}>
                          <StatusIcon size={14} />
                          {STATUS_INFO[signup.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(signup.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {signup.status === 'pending' && (
                            <button
                              onClick={() => handleSendPayment(signup.id)}
                              disabled={sendingPayment === signup.id}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                              <Send size={14} />
                              {sendingPayment === signup.id ? 'Sending...' : 'Send Payment'}
                            </button>
                          )}
                          {signup.status === 'payment_sent' && (
                            <button
                              onClick={() => handleSendPayment(signup.id)}
                              disabled={sendingPayment === signup.id}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                            >
                              <Mail size={14} />
                              {sendingPayment === signup.id ? 'Sending...' : 'Resend Link'}
                            </button>
                          )}
                          {signup.status !== 'account_created' && signup.status !== 'canceled' && (
                            <button
                              onClick={() => handleCancel(signup.id)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
