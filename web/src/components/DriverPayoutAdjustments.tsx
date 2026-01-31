import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DriverPayoutAdjustment {
  id?: string;
  driverId: string;
  adjustmentType: 'bonus' | 'deduction' | 'loan' | 'loan_payment' | 'advance' | 'reimbursement' | 'penalty' | 'tip' | 'other';
  amount: number;
  description: string;
  referenceTripId?: string;
  referenceNumber?: string;
  appliedDate: string;
  periodStart?: string;
  periodEnd?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DriverPayoutAdjustmentsProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export const DriverPayoutAdjustments: React.FC<DriverPayoutAdjustmentsProps> = ({ driverId, driverName, onClose }) => {
  const [adjustments, setAdjustments] = useState<DriverPayoutAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState<Partial<DriverPayoutAdjustment>>({
    adjustmentType: 'bonus',
    amount: 0,
    description: '',
    appliedDate: new Date().toISOString().split('T')[0],
    status: 'approved',
    isRecurring: false
  });

  useEffect(() => {
    loadAdjustments();
  }, [driverId]);

  const loadAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_payout_adjustments')
        .select('*')
        .eq('driver_id', driverId)
        .order('applied_date', { ascending: false });

      if (error) throw error;

      const formattedAdjustments = (data || []).map(adj => ({
        id: adj.id,
        driverId: adj.driver_id,
        adjustmentType: adj.adjustment_type,
        amount: Number(adj.amount),
        description: adj.description,
        referenceTripId: adj.reference_trip_id,
        referenceNumber: adj.reference_number,
        appliedDate: adj.applied_date,
        periodStart: adj.period_start,
        periodEnd: adj.period_end,
        isRecurring: adj.is_recurring,
        recurringFrequency: adj.recurring_frequency,
        status: adj.status,
        notes: adj.notes,
        createdAt: adj.created_at,
        updatedAt: adj.updated_at
      }));

      setAdjustments(formattedAdjustments);
    } catch (error) {
      console.error('Error loading adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdjustment = async () => {
    try {
      if (!newAdjustment.description || !newAdjustment.amount) {
        alert('Please fill in all required fields');
        return;
      }

      const { error } = await supabase
        .from('driver_payout_adjustments')
        .insert({
          driver_id: driverId,
          adjustment_type: newAdjustment.adjustmentType,
          amount: newAdjustment.amount,
          description: newAdjustment.description,
          reference_trip_id: newAdjustment.referenceTripId || null,
          reference_number: newAdjustment.referenceNumber || null,
          applied_date: newAdjustment.appliedDate,
          period_start: newAdjustment.periodStart || null,
          period_end: newAdjustment.periodEnd || null,
          is_recurring: newAdjustment.isRecurring || false,
          recurring_frequency: newAdjustment.recurringFrequency || null,
          status: newAdjustment.status || 'approved',
          notes: newAdjustment.notes || null
        });

      if (error) throw error;

      alert('Adjustment added successfully!');
      setShowAddForm(false);
      setNewAdjustment({
        adjustmentType: 'bonus',
        amount: 0,
        description: '',
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'approved',
        isRecurring: false
      });
      loadAdjustments();
    } catch (error) {
      console.error('Error adding adjustment:', error);
      alert('Failed to add adjustment. Please try again.');
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adjustment?')) return;

    try {
      const { error } = await supabase
        .from('driver_payout_adjustments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadAdjustments();
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      alert('Failed to delete adjustment. Please try again.');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('driver_payout_adjustments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      loadAdjustments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const calculateTotals = () => {
    const approved = adjustments.filter(a => a.status === 'approved' || a.status === 'paid');
    const bonuses = approved.filter(a => ['bonus', 'tip', 'reimbursement'].includes(a.adjustmentType)).reduce((sum, a) => sum + a.amount, 0);
    const deductions = approved.filter(a => ['deduction', 'loan', 'penalty', 'advance'].includes(a.adjustmentType)).reduce((sum, a) => sum + a.amount, 0);
    const loanPayments = approved.filter(a => a.adjustmentType === 'loan_payment').reduce((sum, a) => sum + a.amount, 0);

    return {
      totalBonuses: bonuses,
      totalDeductions: deductions,
      loanPayments,
      netAdjustment: bonuses - deductions + loanPayments
    };
  };

  const totals = calculateTotals();

  const getAdjustmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bonus: 'Bonus',
      deduction: 'Deduction',
      loan: 'Loan Given',
      loan_payment: 'Loan Payment',
      advance: 'Advance',
      reimbursement: 'Reimbursement',
      penalty: 'Penalty',
      tip: 'Tip',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getAdjustmentTypeColor = (type: string) => {
    if (['bonus', 'tip', 'reimbursement', 'loan_payment'].includes(type)) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-h-[85vh] overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payout Adjustments: {driverName}</h2>
        <p className="text-sm text-gray-600">
          Manage bonuses, deductions, loans, and other adjustments to driver payouts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Bonuses</p>
              <p className="text-2xl font-bold text-green-700">${totals.totalBonuses.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Deductions</p>
              <p className="text-2xl font-bold text-red-700">${totals.totalDeductions.toFixed(2)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Loan Payments</p>
              <p className="text-2xl font-bold text-blue-700">${totals.loanPayments.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`${totals.netAdjustment >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${totals.netAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Adjustment</p>
              <p className={`text-2xl font-bold ${totals.netAdjustment >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${Math.abs(totals.netAdjustment).toFixed(2)}
              </p>
            </div>
            <DollarSign className={`w-8 h-8 ${totals.netAdjustment >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Add New Adjustment Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-4 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Adjustment</span>
        </button>
      )}

      {/* Add Adjustment Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">New Adjustment</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
              <select
                value={newAdjustment.adjustmentType}
                onChange={e => setNewAdjustment({ ...newAdjustment, adjustmentType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bonus">Bonus</option>
                <option value="tip">Tip</option>
                <option value="reimbursement">Reimbursement</option>
                <option value="deduction">Deduction</option>
                <option value="penalty">Penalty</option>
                <option value="loan">Loan Given</option>
                <option value="loan_payment">Loan Payment Received</option>
                <option value="advance">Advance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount * ($)</label>
              <input
                type="number"
                step="0.01"
                value={newAdjustment.amount}
                onChange={e => setNewAdjustment({ ...newAdjustment, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <input
                type="text"
                value={newAdjustment.description}
                onChange={e => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Performance bonus for excellent service"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Applied Date</label>
              <input
                type="date"
                value={newAdjustment.appliedDate}
                onChange={e => setNewAdjustment({ ...newAdjustment, appliedDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Number</label>
              <input
                type="text"
                value={newAdjustment.referenceNumber || ''}
                onChange={e => setNewAdjustment({ ...newAdjustment, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional reference/invoice #"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={newAdjustment.notes || ''}
                onChange={e => setNewAdjustment({ ...newAdjustment, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Additional notes"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleAddAdjustment}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Adjustment</span>
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Adjustments List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No adjustments found. Add your first adjustment above.
                  </td>
                </tr>
              ) : (
                adjustments.map(adj => (
                  <tr key={adj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(adj.appliedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAdjustmentTypeColor(adj.adjustmentType)}`}>
                        {getAdjustmentTypeLabel(adj.adjustmentType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>{adj.description}</div>
                      {adj.referenceNumber && (
                        <div className="text-xs text-gray-500">Ref: {adj.referenceNumber}</div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${
                      ['bonus', 'tip', 'reimbursement', 'loan_payment'].includes(adj.adjustmentType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {['bonus', 'tip', 'reimbursement', 'loan_payment'].includes(adj.adjustmentType) ? '+' : '-'}
                      ${adj.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={adj.status}
                        onChange={e => handleUpdateStatus(adj.id!, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteAdjustment(adj.id!)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-6 border-t">
        <button
          onClick={onClose}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
