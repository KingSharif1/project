import { useState, useEffect } from 'react';
import { MessageSquare, Send, Plus, X, Clock, CheckCircle, AlertCircle, Filter, Search } from 'lucide-react';
import * as api from '../services/api';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  ticket_responses: TicketResponse[];
}

interface TicketResponse {
  id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' }
};

const STATUS_CONFIG = {
  open: { label: 'Open', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' }
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.getSupportTickets();
      setTickets(response.data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.createSupportTicket(newTicket);
      setShowNewTicket(false);
      setNewTicket({ subject: '', message: '', priority: 'normal' });
      fetchTickets();
      alert('Support ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert(`Failed to create ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !responseMessage.trim()) return;

    setSendingResponse(true);
    try {
      await api.addTicketResponse(selectedTicket.id, responseMessage);
      setResponseMessage('');
      fetchTickets();
    } catch (error) {
      console.error('Error sending response:', error);
      alert(`Failed to send response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingResponse(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch = !searchQuery || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading support tickets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600 mt-1">Get help from our support team</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
        >
          <Plus size={20} />
          New Ticket
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="text-blue-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Tickets</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="text-yellow-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.open}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Open</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-purple-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.inProgress}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">In Progress</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.resolved}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Create Support Ticket</h2>
              <button
                onClick={() => setShowNewTicket(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your issue in detail..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={18} />
              Your Tickets ({filteredTickets.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No tickets yet. Click "New Ticket" to create one.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const StatusIcon = STATUS_CONFIG[ticket.status].icon;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${PRIORITY_CONFIG[ticket.priority].color}`}>
                        {PRIORITY_CONFIG[ticket.priority].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CONFIG[ticket.status].color}`}>
                        <StatusIcon size={12} />
                        {STATUS_CONFIG[ticket.status].label}
                      </span>
                      <span className="text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[selectedTicket.status].color}`}>
                        {STATUS_CONFIG[selectedTicket.status].label}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_CONFIG[selectedTicket.priority].color}`}>
                        {PRIORITY_CONFIG[selectedTicket.priority].label}
                      </span>
                      <span className="text-sm text-gray-500">
                        Created {new Date(selectedTicket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-2">
                    You • {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">{selectedTicket.message}</div>
                </div>

                {selectedTicket.ticket_responses.map((response) => (
                  <div
                    key={response.id}
                    className={`rounded-lg p-4 ${
                      response.user.role === 'superadmin'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      {response.user.role === 'superadmin' ? (
                        <span className="font-semibold text-blue-700">Support Team</span>
                      ) : (
                        <span>{response.user.first_name} {response.user.last_name}</span>
                      )}
                      {' • '}
                      {new Date(response.created_at).toLocaleString()}
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap">{response.message}</div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="p-6 border-t border-gray-200">
                  <form onSubmit={handleSendResponse} className="space-y-3">
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!responseMessage.trim() || sendingResponse}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <Send size={16} />
                      {sendingResponse ? 'Sending...' : 'Send Response'}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-12 text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
                <p>Select a ticket to view the conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
