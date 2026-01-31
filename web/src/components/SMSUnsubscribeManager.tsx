import React, { useState, useEffect } from 'react';
import { PhoneOff, PhoneCall, Trash2, RefreshCw, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateUS, formatTimeUS } from '../utils/dateFormatter';

interface UnsubscribedNumber {
  id: string;
  phone_number: string;
  is_unsubscribed: boolean;
  unsubscribed_at: string | null;
  resubscribed_at: string | null;
  notes: string | null;
  created_at: string;
}

export const SMSUnsubscribeManager: React.FC = () => {
  const [unsubscribedNumbers, setUnsubscribedNumbers] = useState<UnsubscribedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchUnsubscribedNumbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_unsubscribed')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnsubscribedNumbers(data || []);
    } catch (error) {
      console.error('Error fetching unsubscribed numbers:', error);
      setErrorMessage('Failed to load unsubscribed numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnsubscribedNumbers();
  }, []);

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      cleaned = `+${cleaned}`;
    }
    return cleaned;
  };

  const handleAddUnsubscribed = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPhone) {
      setErrorMessage('Phone number is required');
      return;
    }

    try {
      const formattedPhone = formatPhoneNumber(newPhone);

      const { error } = await supabase
        .from('sms_unsubscribed')
        .insert({
          phone_number: formattedPhone,
          is_unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
          notes: newNotes || 'Manually added',
        });

      if (error) throw error;

      setSuccessMessage('Phone number added to unsubscribe list');
      setNewPhone('');
      setNewNotes('');
      setShowAddForm(false);
      fetchUnsubscribedNumbers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      if (error.code === '23505') {
        setErrorMessage('This phone number is already in the list');
      } else {
        setErrorMessage('Failed to add phone number');
      }
    }
  };

  const handleResubscribe = async (id: string, phone: string) => {
    if (!confirm(`Allow SMS notifications to ${phone} again?`)) return;

    try {
      const { error } = await supabase
        .from('sms_unsubscribed')
        .update({
          is_unsubscribed: false,
          resubscribed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setSuccessMessage('Phone number re-subscribed successfully');
      fetchUnsubscribedNumbers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to re-subscribe phone number');
    }
  };

  const handleDelete = async (id: string, phone: string) => {
    if (!confirm(`Delete ${phone} from the list?`)) return;

    try {
      const { error } = await supabase
        .from('sms_unsubscribed')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMessage('Phone number removed from list');
      fetchUnsubscribedNumbers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to delete phone number');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  const activeUnsubscribed = unsubscribedNumbers.filter(n => n.is_unsubscribed);
  const resubscribed = unsubscribedNumbers.filter(n => !n.is_unsubscribed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">SMS Opt-Out Management</h3>
          <p className="text-sm text-gray-600 mt-1">Manage phone numbers that have opted out of SMS notifications</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUnsubscribedNumbers}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Number</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{errorMessage}</span>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Add Unsubscribed Number</h4>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddUnsubscribed} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1234567890 or 234-567-8900"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Reason for unsubscribing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Number
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-semibold mb-1">Important Information</div>
            <ul className="list-disc ml-4 space-y-1">
              <li>Phone numbers on this list will NOT receive SMS notifications</li>
              <li>Patients can text "START" to your Twilio number to opt back in</li>
              <li>Attempting to send SMS to unsubscribed numbers will fail</li>
              <li>This list is automatically updated when Twilio reports opt-out errors</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center space-x-2">
            <PhoneOff className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-900">Opted Out ({activeUnsubscribed.length})</h4>
          </div>
          {activeUnsubscribed.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No phone numbers have opted out
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeUnsubscribed.map((number) => (
                <div key={number.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{number.phone_number}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Opted out: {formatDateUS(number.unsubscribed_at || number.created_at)} at {formatTimeUS(number.unsubscribed_at || number.created_at)}
                      </div>
                      {number.notes && (
                        <div className="text-sm text-gray-600 mt-1 italic">{number.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleResubscribe(number.id, number.phone_number)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded"
                        title="Allow SMS again"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Re-subscribe</span>
                      </button>
                      <button
                        onClick={() => handleDelete(number.id, number.phone_number)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {resubscribed.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center space-x-2">
              <PhoneCall className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Re-subscribed ({resubscribed.length})</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {resubscribed.map((number) => (
                <div key={number.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{number.phone_number}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Re-subscribed: {formatDateUS(number.resubscribed_at || number.created_at)} at {formatTimeUS(number.resubscribed_at || number.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(number.id, number.phone_number)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
