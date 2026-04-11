import { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle, XCircle, TrendingUp, Users, Car, BarChart3, Download, ExternalLink, Zap, Shield, Clock } from 'lucide-react';
import * as api from '../services/api';

interface Subscription {
  id: string;
  tier: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

interface PaymentHistory {
  id: string;
  amount_cents: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  paid_at: string | null;
  failed_at: string | null;
  receipt_url: string | null;
  invoice_pdf_url: string | null;
}

const TIER_FEATURES = {
  basic: {
    name: 'Basic',
    price: '$99',
    features: [
      'Up to 10 drivers',
      '50 trips per day',
      'Basic reporting',
      'Email support',
      '30-day data retention'
    ]
  },
  premium: {
    name: 'Premium',
    price: '$299',
    features: [
      'Up to 50 drivers',
      '200 trips per day',
      'Advanced analytics',
      'SMS notifications',
      'Priority email support',
      '90-day data retention',
      'Custom branding'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: '$599',
    features: [
      'Unlimited drivers',
      'Unlimited trips',
      'Advanced analytics & reporting',
      'SMS & email notifications',
      'Priority phone support',
      'Unlimited data retention',
      'Custom branding',
      'API access',
      'Dedicated account manager'
    ]
  }
};

const STATUS_CONFIG = {
  active: { label: 'Active', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  past_due: { label: 'Past Due', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  trialing: { label: 'Trial', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' }
};

export default function SubscriptionSettings() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [usageStats, setUsageStats] = useState({
    drivers: 0,
    tripsToday: 0,
    tripsThisMonth: 0,
    activeUsers: 0
  });

  useEffect(() => {
    fetchSubscription();
    fetchPayments();
    fetchUsageStats();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.getSubscription();
      setSubscription(response.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await api.getPaymentHistory();
      setPayments(response.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const [driversRes, tripsRes, usersRes] = await Promise.all([
        api.getDrivers(),
        api.getTrips(),
        api.getUsers()
      ]);

      const drivers = driversRes.data || [];
      const trips = tripsRes.data || [];
      const users = usersRes.data || [];

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);

      setUsageStats({
        drivers: Array.isArray(drivers) ? drivers.length : 0,
        tripsToday: Array.isArray(trips) ? trips.filter((t: any) => t.date?.startsWith(today)).length : 0,
        tripsThisMonth: Array.isArray(trips) ? trips.filter((t: any) => t.date?.startsWith(thisMonth)).length : 0,
        activeUsers: Array.isArray(users) ? users.filter((u: any) => u.status === 'active').length : 0
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const handleUpgrade = async (tier: 'basic' | 'premium' | 'enterprise') => {
    if (!confirm(`Upgrade to ${TIER_FEATURES[tier].name} plan for ${TIER_FEATURES[tier].price}/month?`)) {
      return;
    }

    setUpgrading(true);
    try {
      const response = await api.createCheckoutSession(tier);
      window.location.href = response.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      await api.cancelSubscription();
      alert('Subscription canceled. You will retain access until the end of your billing period.');
      fetchSubscription();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading subscription details...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-600" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-600 mb-4">
            You don't have an active subscription. Contact your administrator to set up a subscription.
          </p>
        </div>
      </div>
    );
  }

  const currentTier = TIER_FEATURES[subscription.tier];
  const statusConfig = STATUS_CONFIG[subscription.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription & Billing</h1>
          <p className="text-gray-600 mt-1">Manage your subscription plan and monitor usage</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg">
          <Zap size={20} />
          <span className="font-semibold">{currentTier.name} Plan</span>
        </div>
      </div>

      {/* Usage Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usageStats.drivers}</div>
          <div className="text-sm text-gray-600 mt-1">Total Drivers</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-600 rounded-lg">
              <Car className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded-full">Today</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usageStats.tripsToday}</div>
          <div className="text-sm text-gray-600 mt-1">Trips Today</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-600 rounded-lg">
              <BarChart3 className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">Month</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usageStats.tripsThisMonth}</div>
          <div className="text-sm text-gray-600 mt-1">Trips This Month</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-orange-600 rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">Users</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usageStats.activeUsers}</div>
          <div className="text-sm text-gray-600 mt-1">Active Users</div>
        </div>
      </div>

      {/* Subscription Details Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <CreditCard className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{currentTier.name} Plan</h2>
                <p className="text-blue-100 text-sm">Professional transportation management</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{currentTier.price}</div>
              <div className="text-blue-100 text-sm">per month</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Banner */}
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${statusConfig.bg} border-2 ${statusConfig.bg.replace('bg-', 'border-')}`}>
            <StatusIcon className={statusConfig.color} size={24} />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Status: {statusConfig.label}</div>
              <div className="text-sm text-gray-600">
                {subscription.cancel_at_period_end 
                  ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing Period</div>
                <div className="font-semibold text-gray-900 mt-1">
                  {new Date(subscription.current_period_start).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">to {new Date(subscription.current_period_end).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="text-green-600 mt-1" size={20} />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Billing</div>
                <div className="font-semibold text-gray-900 mt-1">
                  {subscription.cancel_at_period_end 
                    ? 'Canceled' 
                    : new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">
                  {subscription.cancel_at_period_end ? 'No renewal' : currentTier.price}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <DollarSign className="text-purple-600 mt-1" size={20} />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</div>
                <div className="font-semibold text-gray-900 mt-1">Stripe</div>
                <div className="text-sm text-gray-600">Auto-renewal enabled</div>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Your Plan Includes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentTier.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

        {subscription.status === 'active' && !subscription.cancel_at_period_end && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {subscription.tier !== 'premium' && (
              <button
                onClick={() => handleUpgrade('premium')}
                disabled={upgrading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Premium'}
              </button>
            )}
            {subscription.tier !== 'enterprise' && (
              <button
                onClick={() => handleUpgrade('enterprise')}
                disabled={upgrading}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Enterprise'}
              </button>
            )}
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-semibold text-yellow-900">Subscription Canceled</div>
                <div className="text-sm text-yellow-700">
                  Your subscription will remain active until {new Date(subscription.current_period_end).toLocaleDateString()}.
                  After that, you will lose access to the platform.
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="text-green-600" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No payment history available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {payment.paid_at 
                          ? new Date(payment.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : payment.failed_at 
                          ? new Date(payment.failed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'Pending'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      ${(payment.amount_cents / 100).toFixed(2)} <span className="text-gray-500 font-normal">{payment.currency.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full ${
                        payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status === 'succeeded' && <CheckCircle size={14} />}
                        {payment.status === 'failed' && <XCircle size={14} />}
                        {payment.status === 'pending' && <Clock size={14} />}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {payment.receipt_url && (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition"
                          >
                            <ExternalLink size={14} />
                            Receipt
                          </a>
                        )}
                        {payment.invoice_pdf_url && (
                          <a
                            href={payment.invoice_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm font-medium transition"
                          >
                            <Download size={14} />
                            Invoice
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
