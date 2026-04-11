import { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, DollarSign, CreditCard, AlertCircle, CheckCircle, XCircle, Search, Filter, Zap, Trash2 } from 'lucide-react';
import * as api from '../services/api';

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  subscription: Subscription | null;
  admins: User[];
  createdAt: string;
}

interface Subscription {
  id: string;
  tier: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface CompanyDetails extends Company {
  stats: {
    totalDrivers: number;
    tripsLast30Days: number;
  };
  payment_history: PaymentHistory[];
  deactivation_reason?: string | null;
  deactivated_at?: string | null;
}

interface PaymentHistory {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  receipt_url: string | null;
}

const TIER_INFO = {
  basic: { name: 'Basic', price: '$99/mo', color: 'bg-blue-100 text-blue-800' },
  premium: { name: 'Premium', price: '$299/mo', color: 'bg-purple-100 text-purple-800' },
  enterprise: { name: 'Enterprise', price: '$599/mo', color: 'bg-orange-100 text-orange-800' }
};

const STATUS_CONFIG = {
  active: { label: 'Active', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  past_due: { label: 'Past Due', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-100' },
  canceled: { label: 'Canceled', icon: XCircle, color: 'text-red-600 bg-red-100' },
  trialing: { label: 'Trial', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' }
};

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.getCompanies();
      console.log('Companies API response:', response);
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      alert(`Failed to load companies: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure you're logged in as superadmin.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    setDetailsLoading(true);
    try {
      const response = await api.getCompanyDetails(companyId);
      console.log('Company details response:', response);
      setSelectedCompany(response.data);
    } catch (error) {
      console.error('Error fetching company details:', error);
      alert(`Failed to load company details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeactivateCompany = async (companyId: string) => {
    const reason = prompt('Enter deactivation reason (e.g., "Payment failed", "Policy violation"):');
    if (!confirm('Deactivate this company? All users will be blocked from login.')) return;
    
    try {
      await api.deactivateCompany(companyId, reason || undefined);
      alert('Company deactivated successfully. All users have been blocked from login.');
      fetchCompanies();
      setSelectedCompany(null);
    } catch (error) {
      alert(`Failed to deactivate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleActivateCompany = async (companyId: string) => {
    if (!confirm('Reactivate this company? All users will be able to login again.')) return;
    
    try {
      await api.activateCompany(companyId);
      alert('Company reactivated successfully. All users can now login.');
      fetchCompanies();
      fetchCompanyDetails(companyId);
    } catch (error) {
      alert(`Failed to reactivate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('⚠️ PERMANENTLY DELETE this company and ALL data? This CANNOT be undone!')) return;
    if (!confirm('Are you ABSOLUTELY SURE? This will delete all trips, drivers, patients, users, subscriptions, and payment history!')) return;
    
    try {
      await api.deleteCompany(companyId);
      alert('Company permanently deleted');
      fetchCompanies();
      setSelectedCompany(null);
    } catch (error) {
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchQuery || 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'no_subscription' && !company.subscription) ||
      company.subscription?.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.subscription?.status === 'active').length,
    trial: companies.filter(c => c.subscription?.status === 'trialing').length,
    revenue: companies.reduce((sum, c) => {
      if (c.subscription?.status === 'active') {
        const prices = { basic: 99, premium: 299, enterprise: 599 };
        return sum + (prices[c.subscription.tier] || 0);
      }
      return sum;
    }, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-600 mt-1">Monitor all companies and their subscriptions</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg">
          <Building2 size={20} />
          <span className="font-semibold">{companies.length} Companies</span>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="text-blue-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Companies</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.active}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Active Subscriptions</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="text-purple-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">{stats.trial}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Trial Accounts</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-emerald-600" size={24} />
            <span className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600 font-medium">Monthly Revenue</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search companies..."
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
            <option value="all">All Companies</option>
            <option value="active">Active Subscriptions</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="trialing">Trial</option>
            <option value="no_subscription">No Subscription</option>
          </select>
          <span className="text-sm text-gray-500 ml-2">
            {filteredCompanies.length} results
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No companies found
            </div>
          ) : (
            filteredCompanies.map((company) => {
              const subscription = company.subscription;
              const StatusIcon = subscription ? STATUS_CONFIG[subscription.status].icon : AlertCircle;

              return (
                <button
                  key={company.id}
                  onClick={() => fetchCompanyDetails(company.id)}
                  className={`w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition ${
                    selectedCompany?.id === company.id ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-gray-400" />
                      <div className="font-semibold text-gray-900">{company.name}</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">{company.email}</div>

                  <div className="space-y-2">
                    {/* Login Access Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16">Access:</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        company.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.isActive ? 'Can Login' : 'Blocked'}
                      </span>
                    </div>
                    
                    {/* Subscription Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16">Plan:</span>
                      {subscription ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${TIER_INFO[subscription.tier].color}`}>
                            {TIER_INFO[subscription.tier].name}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CONFIG[subscription.status].color}`}>
                            <StatusIcon size={12} />
                            {STATUS_CONFIG[subscription.status].label}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                          Not Subscribed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {company.admins.length} admin{company.admins.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {detailsLoading ? (
            <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
              <div className="text-gray-500">Loading details...</div>
            </div>
          ) : selectedCompany ? (
            <div className="space-y-6">
              {!selectedCompany.isActive && selectedCompany.deactivation_reason && (
                <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Account Deactivated</h3>
                      <p className="text-sm text-red-800">{selectedCompany.deactivation_reason}</p>
                      {selectedCompany.deactivated_at && (
                        <p className="text-xs text-red-700 mt-1">
                          Deactivated on {new Date(selectedCompany.deactivated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="mb-3">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCompany.name}</h2>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Login Access:</span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            selectedCompany.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedCompany.isActive ? 'Allowed' : 'Blocked'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Subscription:</span>
                          {selectedCompany.subscription ? (
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${TIER_INFO[selectedCompany.subscription.tier].color}`}>
                              {TIER_INFO[selectedCompany.subscription.tier].name} - {STATUS_CONFIG[selectedCompany.subscription.status].label}
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Not Subscribed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-600">{selectedCompany.email}</div>
                    {selectedCompany.phone && (
                      <div className="text-gray-600">{selectedCompany.phone}</div>
                    )}
                    {selectedCompany.address && (
                      <div className="text-sm text-gray-500 mt-2">
                        {selectedCompany.address}
                        {selectedCompany.city && `, ${selectedCompany.city}`}
                        {selectedCompany.state && `, ${selectedCompany.state}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedCompany.isActive ? (
                      <button
                        onClick={() => handleDeactivateCompany(selectedCompany.id)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                        title="Block all users from logging in (preserves data)"
                      >
                        <XCircle size={16} />
                        Block Login Access
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateCompany(selectedCompany.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                        title="Allow users to login again"
                      >
                        <CheckCircle size={16} />
                        Allow Login Access
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCompany(selectedCompany.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                      title="Permanently delete company and all data (cannot be undone)"
                    >
                      <Trash2 size={16} />
                      Delete Permanently
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="text-blue-600" size={20} />
                      <div className="text-sm text-gray-600">Total Drivers</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{selectedCompany.stats.totalDrivers}</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-green-600" size={20} />
                      <div className="text-sm text-gray-600">Trips (30 days)</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{selectedCompany.stats.tripsLast30Days}</div>
                  </div>
                </div>
              </div>

              {selectedCompany.subscription && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard size={20} />
                    Subscription Details
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Plan</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${TIER_INFO[selectedCompany.subscription.tier].color}`}>
                        {TIER_INFO[selectedCompany.subscription.tier].name} - {TIER_INFO[selectedCompany.subscription.tier].price}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_CONFIG[selectedCompany.subscription.status].color}`}>
                        {STATUS_CONFIG[selectedCompany.subscription.status].label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Period</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedCompany.subscription.current_period_start).toLocaleDateString()} - {new Date(selectedCompany.subscription.current_period_end).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Stripe Customer ID</span>
                      <span className="font-mono text-sm text-gray-600">{selectedCompany.subscription.stripe_customer_id}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Stripe Subscription ID</span>
                      <span className="font-mono text-sm text-gray-600">{selectedCompany.subscription.stripe_subscription_id}</span>
                    </div>

                    {selectedCompany.subscription.cancel_at_period_end && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-sm text-yellow-800">
                            Subscription will cancel at end of period ({new Date(selectedCompany.subscription.current_period_end).toLocaleDateString()})
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Administrators
                </h3>

                {selectedCompany.admins.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No administrators</div>
                ) : (
                  <div className="space-y-2">
                    {selectedCompany.admins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {admin.first_name} {admin.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{admin.email}</div>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                          {admin.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCompany.payment_history && selectedCompany.payment_history.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign size={20} />
                    Recent Payments
                  </h3>

                  <div className="space-y-2">
                    {selectedCompany.payment_history.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            ${(payment.amount_cents / 100).toFixed(2)} {payment.currency.toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                          {payment.receipt_url && (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Building2 size={48} className="mx-auto mb-4 text-gray-400" />
                <p>Select a company to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
