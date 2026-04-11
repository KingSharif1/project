import { useState } from 'react';
import { Building2, Users, Ticket, CreditCard, Mail } from 'lucide-react';
import CompanyOnboarding from './CompanyOnboarding';
import CompanyManagement from './CompanyManagement';
import SuperadminSupportTickets from './SuperadminSupportTickets';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import ContactLeads from './ContactLeads';

type SuperAdminView = 'overview' | 'onboarding' | 'companies' | 'support' | 'legacy' | 'leads';

export default function SuperAdminPortal() {
  const [currentView, setCurrentView] = useState<SuperAdminView>('companies');

  const tabs = [
    { id: 'leads' as SuperAdminView, name: 'Contact Leads', icon: Mail },
    { id: 'onboarding' as SuperAdminView, name: 'Company Signups', icon: CreditCard },
    { id: 'companies' as SuperAdminView, name: 'Manage Companies', icon: Building2 },
    { id: 'support' as SuperAdminView, name: 'Support Tickets', icon: Ticket },
    { id: 'legacy' as SuperAdminView, name: 'Manual Setup', icon: Users },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'leads':
        return <ContactLeads />;
      case 'onboarding':
        return <CompanyOnboarding />;
      case 'companies':
        return <CompanyManagement />;
      case 'support':
        return <SuperadminSupportTickets />;
      case 'legacy':
        return <SuperAdminDashboard />;
      default:
        return <CompanyManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {renderView()}
      </div>
    </div>
  );
}
