import { useState, useEffect } from 'react';
import { MessageSquare, Send, Filter, Clock, CheckCircle, AlertCircle, XCircle, Building2 } from 'lucide-react';
import * as api from '../services/api';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  clinic: {
    id: string;
    name: string;
  };
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
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
  closed: { label: 'Closed', icon: XCircle, color: 'bg-gray-100 text-gray-800' }
};

export default function SuperadminSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const filters: any = {};
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterPriority !== 'all') filters.priority = filterPriority;
      
      const response = await api.getSupportTickets(filters);
      console.log('Superadmin tickets response:', response);
      setTickets(response.data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      alert(`Failed to load tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !responseMessage.trim()) return;

    setSendingResponse(true);
    try {
      await api.addTicketResponse(selectedTicket.id, responseMessage, isInternalNote);
      setResponseMessage('');
      setIsInternalNote(false);
      fetchTickets();
    } catch (error) {
      console.error('Error sending response:', error);
      alert(`Failed to send response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredTickets = tickets;

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading support tickets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-600 mt-1">Manage support requests from all companies</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Filter size={20} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <span className="text-sm text-gray-500">
          {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">All Tickets</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No tickets found
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
                      <div className="font-medium text-gray-900 line-clamp-1 flex-1">{ticket.subject}</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ml-2 ${PRIORITY_CONFIG[ticket.priority].color}`}>
                        {PRIORITY_CONFIG[ticket.priority].label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{ticket.clinic.name}</span>
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
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-700">{selectedTicket.clinic.name}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        {selectedTicket.creator.first_name} {selectedTicket.creator.last_name}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{selectedTicket.creator.email}</span>
                    </div>
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

                <div className="flex gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="text-sm text-gray-500 mb-2">
                    {selectedTicket.creator.first_name} {selectedTicket.creator.last_name} • {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">{selectedTicket.message}</div>
                </div>

                {selectedTicket.ticket_responses.map((response) => (
                  <div
                    key={response.id}
                    className={`rounded-lg p-4 ${
                      response.is_internal
                        ? 'bg-yellow-50 border border-yellow-200'
                        : response.user.role === 'superadmin'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm mb-2">
                      <span className={response.user.role === 'superadmin' ? 'font-semibold text-blue-700' : 'text-gray-700'}>
                        {response.user.first_name} {response.user.last_name}
                      </span>
                      {response.is_internal && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-yellow-200 text-yellow-800 rounded-full">
                          Internal Note
                        </span>
                      )}
                      <span className="text-gray-500"> • {new Date(response.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap">{response.message}</div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200">
                <form onSubmit={handleSendResponse} className="space-y-3">
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Internal note (not visible to customer)
                    </label>
                    <button
                      type="submit"
                      disabled={!responseMessage.trim() || sendingResponse}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <Send size={16} />
                      {sendingResponse ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-12 text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
                <p>Select a ticket to view and respond</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
