import { useState, useEffect } from 'react';
import { Mail, Phone, Building2, User, MessageSquare, CheckCircle, XCircle, Clock, ArrowRight, Filter } from 'lucide-react';

interface ContactSubmission {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'rejected';
  notes: string | null;
  converted_to_signup_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-800', icon: MessageSquare },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function ContactLeads() {
  const [leads, setLeads] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ContactSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'premium' | 'enterprise'>('premium');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [filterStatus]);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('transportHub_token');
      const url = filterStatus === 'all' 
        ? 'http://localhost:3000/api/admin/contact-submissions'
        : `http://localhost:3000/api/admin/contact-submissions?status=${filterStatus}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch leads');

      const result = await response.json();
      setLeads(result.data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (id: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('transportHub_token');
      const response = await fetch(`http://localhost:3000/api/admin/contact-submissions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (!response.ok) throw new Error('Failed to update lead');

      await fetchLeads();
      if (selectedLead?.id === id) {
        const result = await response.json();
        setSelectedLead(result.data);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead status');
    }
  };

  const convertToSignup = async () => {
    if (!selectedLead) return;

    setConverting(true);
    try {
      const token = localStorage.getItem('transportHub_token');
      const response = await fetch(`http://localhost:3000/api/admin/contact-submissions/${selectedLead.id}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier: selectedTier })
      });

      if (!response.ok) throw new Error('Failed to convert lead');

      alert(`Successfully converted to ${selectedTier} pending signup!`);
      setShowConvertModal(false);
      await fetchLeads();
      setSelectedLead(null);
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Failed to convert lead to signup');
    } finally {
      setConverting(false);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact submission?')) return;

    try {
      const token = localStorage.getItem('transportHub_token');
      const response = await fetch(`http://localhost:3000/api/admin/contact-submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete lead');

      await fetchLeads();
      if (selectedLead?.id === id) {
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    }
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Leads</h1>
        <p className="text-gray-600">Manage inquiries from the pricing page</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Leads</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-blue-600 mb-1">New</div>
          <div className="text-2xl font-bold text-blue-900">{stats.new}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600 mb-1">Contacted</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.contacted}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600 mb-1">Converted</div>
          <div className="text-2xl font-bold text-green-900">{stats.converted}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={20} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        >
          <option value="all">All Leads</option>
          <option value="new">New Only</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-gray-500">{leads.length} results</span>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leads List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No leads found</div>
          ) : (
            leads.map((lead) => {
              const StatusIcon = STATUS_CONFIG[lead.status].icon;
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition ${
                    selectedLead?.id === lead.id ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-gray-900">{lead.company_name}</div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CONFIG[lead.status].color}`}>
                      {STATUS_CONFIG[lead.status].label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{lead.contact_name}</div>
                  <div className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</div>
                </button>
              );
            })
          )}
        </div>

        {/* Lead Details */}
        <div className="lg:col-span-2">
          {selectedLead ? (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedLead.company_name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[selectedLead.status].color}`}>
                      {STATUS_CONFIG[selectedLead.status].label}
                    </span>
                    <span className="text-sm text-gray-500">
                      Submitted {new Date(selectedLead.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="text-gray-400" size={20} />
                  <div>
                    <div className="text-xs text-gray-500">Contact Name</div>
                    <div className="font-medium text-gray-900">{selectedLead.contact_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="text-gray-400" size={20} />
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <a href={`mailto:${selectedLead.email}`} className="font-medium text-blue-600 hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                </div>
                {selectedLead.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="text-gray-400" size={20} />
                    <div>
                      <div className="text-xs text-gray-500">Phone</div>
                      <a href={`tel:${selectedLead.phone}`} className="font-medium text-blue-600 hover:underline">
                        {selectedLead.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Message</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {selectedLead.message}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedLead.status !== 'converted' && (
                <div className="flex flex-wrap gap-3">
                  {selectedLead.status === 'new' && (
                    <button
                      onClick={() => updateLeadStatus(selectedLead.id, 'contacted')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Mark as Contacted
                    </button>
                  )}
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <ArrowRight size={16} />
                    Convert to Signup
                  </button>
                  <button
                    onClick={() => updateLeadStatus(selectedLead.id, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => deleteLead(selectedLead.id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Delete
                  </button>
                </div>
              )}

              {selectedLead.status === 'converted' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Converted to Pending Signup</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      This lead has been converted. Check the Company Signups tab to send payment link.
                    </p>
                  </div>
                  <button
                    onClick={() => deleteLead(selectedLead.id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Delete Lead
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              Select a lead to view details
            </div>
          )}
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Convert to Pending Signup</h3>
            <p className="text-gray-600 mb-6">
              Select a subscription tier for <strong>{selectedLead.company_name}</strong>
            </p>

            <div className="space-y-3 mb-6">
              {[
                { value: 'basic', name: 'Basic', price: '$99/mo', desc: '10 drivers, 50 trips/day' },
                { value: 'premium', name: 'Premium', price: '$299/mo', desc: '50 drivers, 200 trips/day' },
                { value: 'enterprise', name: 'Enterprise', price: '$599/mo', desc: 'Unlimited drivers & trips' },
              ].map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setSelectedTier(tier.value as any)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition ${
                    selectedTier === tier.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{tier.name}</span>
                    <span className="font-bold text-blue-600">{tier.price}</span>
                  </div>
                  <div className="text-sm text-gray-600">{tier.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={convertToSignup}
                disabled={converting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {converting ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
