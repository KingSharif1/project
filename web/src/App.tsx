import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Car, Users, BarChart3, Menu, X, UserCog, Activity, LogOut, Shield, CircleUser as UserCircle, Truck, DollarSign, Building2, TrendingUp, Settings as SettingsIcon, ChevronDown, ChevronRight, Bell, Calendar as CalendarIcon, MapPin, PanelLeftClose, PanelLeftOpen, Map as MapIcon } from 'lucide-react';
import { subscribeToNotifications, startNotificationProcessor } from './utils/notificationProcessor';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { TripManagement } from './components/TripManagement';
import { DriverManagement } from './components/DriverManagement';
import { VehicleManagement } from './components/VehicleManagement';
import { ContractorManagement } from './components/ContractorManagement';
import { RiderManagement } from './components/RiderManagement';
import { Reports } from './components/Reports';
import { DriverPayouts } from './components/DriverPayouts';
import { UserManagement } from './components/UserManagement';
import { ActivityTracker } from './components/ActivityTracker';
import { SessionWarningModal } from './components/SessionWarningModal';
// import { HIPAACompliance } from './components/HIPAACompliance';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { Settings } from './components/Settings';
import { RealtimeTracking } from './components/RealtimeTracking';
import { UpcomingReminders } from './components/UpcomingReminders';
import { CalendarSchedulingView } from './components/CalendarSchedulingView';
import { NotificationCenter } from './components/NotificationCenter';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';


type View = 'dashboard' | 'trips' | 'calendar' | 'tracking' | 'drivers' | 'riders' | 'vehicles' | 'facilities' | 'users' | 'reports' | 'payouts' | 'analytics' | 'activity' | 'hipaa' | 'settings' | 'reminders' | 'superadmin';

const MainApp: React.FC = () => {
  const { 
    user, 
    logout, 
    isAdmin, 
    isRegularDispatcher,
    showSessionWarning, 
    extendSession,
    canManageUsers,
    canManageDrivers,
  } = useAuth();
  const [currentView, setCurrentView] = useState<View>('trips');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'password'>('profile');
  const [operationsExpanded, setOperationsExpanded] = useState(true);
  const [managementExpanded, setManagementExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Start notification processor when app loads
  useEffect(() => {
    //console.log('Starting automated notification system...');

    // Start background processor
    const stopProcessor = startNotificationProcessor();

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications();

    // Cleanup on unmount
    return () => {
      stopProcessor();
      unsubscribe();
    };
  }, []);

  // Navigation sections with permission-based visibility
  // Admin: Full access to their company
  // Regular Dispatcher: Most features except user management, contractor creation, financial reports
  // Contractor Dispatcher: Limited to trips, riders, and their contractor info
  // Note: Super Admin has a completely separate interface (see AppContent)
  const navigationSections = [
    {
      title: 'Dashboard',
      expanded: true,
      setExpanded: () => { }, // Always expanded
      items: [
        { id: 'dashboard' as View, name: 'Dashboard', icon: LayoutDashboard, visible: isAdmin },
      ]
    },
    {
      title: 'Operations',
      expanded: operationsExpanded,
      setExpanded: setOperationsExpanded,
      items: [
        { id: 'trips' as View, name: 'Trip Management', icon: Car, visible: true }, // All roles
        { id: 'calendar' as View, name: 'Calendar View', icon: CalendarIcon, visible: true }, // All roles
        { id: 'tracking' as View, name: 'Live Tracking', icon: MapPin, visible: isAdmin || isRegularDispatcher }, // Not for contractor dispatcher
        { id: 'reminders' as View, name: 'Reminders', icon: Bell, visible: true }, // All roles
      ]
    },
    {
      title: 'Management',
      expanded: managementExpanded,
      setExpanded: setManagementExpanded,
      items: [
        { id: 'users' as View, name: 'User Management', icon: UserCog, visible: canManageUsers },
        { id: 'drivers' as View, name: 'Drivers', icon: Users, visible: canManageDrivers },
        { id: 'vehicles' as View, name: 'Vehicles', icon: Truck, visible: canManageDrivers }, // Same as drivers
        { id: 'riders' as View, name: 'Riders', icon: UserCircle, visible: true }, // All roles
        { id: 'facilities' as View, name: 'Contractors', icon: Building2, visible: isAdmin || isRegularDispatcher }, // View for regular, create for admin
      ]
    },
    {
      title: 'Reports & Analytics',
      expanded: reportsExpanded,
      setExpanded: setReportsExpanded,
      items: [
        { id: 'reports' as View, name: 'Reports', icon: BarChart3, visible: isAdmin || isRegularDispatcher }, // Not for contractor dispatcher
        { id: 'analytics' as View, name: 'Analytics', icon: TrendingUp, visible: isAdmin }, // Admin only
      ]
    },
    {
      title: 'System',
      expanded: systemExpanded,
      setExpanded: setSystemExpanded,
      items: [
        { id: 'activity' as View, name: 'Activity Log', icon: Activity, visible: isAdmin },
        { id: 'hipaa' as View, name: 'HIPAA', icon: Shield, visible: isAdmin },
      ]
    },
  ];

  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => item.visible)
  })).filter(section => section.items.length > 0);

  const renderView = () => {
    switch (currentView) {
      case 'superadmin':
        return <SuperAdminDashboard />;
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'trips':
        return <TripManagement />;
      case 'calendar':
        return <CalendarSchedulingView />;
      case 'reminders':
        return <UpcomingReminders hoursAhead={72} />;
      case 'tracking':
        return <RealtimeTracking />;

      case 'drivers':
        return <DriverManagement />;
      case 'riders':
        return <RiderManagement />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'facilities':
        return <ContractorManagement />;
      case 'reports':
        return <Reports />;
      case 'payouts':
        return <DriverPayouts />;
      case 'analytics':
        return <AdvancedAnalytics />;
      // case 'hipaa':
      //   return <HIPAACompliance />;
      case 'users':
        return <UserManagement />;
      case 'activity':
        return <ActivityTracker />;
      case 'settings':
        return <Settings initialTab={settingsTab} />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <AppProvider>
      <SessionWarningModal
        isOpen={showSessionWarning}
        onExtend={extendSession}
        onLogout={logout}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TransportHub</h1>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationCenter />
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          onClick={() => setSidebarOpen(false)}
        />

        {isAdmin ? (
          <>
            <aside
              className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
                }`}
            >
              <div className="h-full flex flex-col">
                <div className="h-20 flex items-center px-4 border-b border-gray-200/40 shrink-0">
                  <div className="flex justify-center gap-3 w-full overflow-hidden">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                      <Car className="w-6 h-6" />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-lg tracking-tight text-gray-900 truncate">TransportHub</span>
                        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Management Portal</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-600 transition-colors shadow-sm z-10 focus:outline-none hidden lg:flex"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 rotate-90" />}
                </button>

                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 space-y-6">
                  {filteredSections.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="space-y-1">
                      {!sidebarCollapsed ? (
                        <button
                          onClick={() => section.setExpanded(!section.expanded)}
                          className="w-full px-3 mb-2 flex items-center justify-between group hover:bg-gray-50 rounded-lg py-1 transition-colors"
                        >
                          <h3 className="text-[10px] font-bold text-gray-500/70 uppercase tracking-widest">
                            {section.title}
                          </h3>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${section.expanded ? '' : '-rotate-90'
                            }`} />
                        </button>
                      ) : (
                        <div className="h-px w-8 bg-gray-200 mx-auto mb-4 mt-2 first:mt-0" />
                      )}

                      {(sidebarCollapsed || section.expanded) && (
                        <div className="space-y-1">
                          {section.items.map(item => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;

                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setCurrentView(item.id);
                                  setSidebarOpen(false);
                                }}
                                className={`group flex items-center relative rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2.5 w-full'
                                  } ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                  }`}
                                title={sidebarCollapsed ? item.name : undefined}
                              >
                                <Icon
                                  className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive && !sidebarCollapsed ? 'scale-105' : 'group-hover:scale-110'
                                    }`}
                                  strokeWidth={isActive ? 2.5 : 2}
                                />

                                {!sidebarCollapsed && (
                                  <span className="ml-3 truncate text-sm">{item.name}</span>
                                )}

                                {sidebarCollapsed && isActive && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full -ml-4" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                <div className="mt-auto">
                  <div className={`p-4 transition-all duration-300 ${sidebarCollapsed ? 'px-2' : 'px-4'
                    }`}>
                    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 group ${sidebarCollapsed
                      ? 'bg-transparent border-transparent'
                      : 'bg-gray-50/50 border-gray-200 hover:border-blue-200 hover:bg-gray-50 p-3'
                      }`}>
                      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center flex-col gap-2' : 'gap-3'
                        }`}>
                        <div className="relative">
                          <div className={`rounded-xl object-cover ring-2 ring-white shadow-sm transition-all duration-300 bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center ${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'
                            }`}>
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>

                        {!sidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Shield className="w-3 h-3 text-blue-600" />
                              <p className="text-xs font-medium text-gray-600">{user?.role}</p>
                            </div>
                          </div>
                        )}

                        {!sidebarCollapsed && (
                          <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {userMenuOpen && !sidebarCollapsed && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                          <button
                            onClick={() => {
                              setSettingsTab('profile');
                              setCurrentView('settings');
                              setUserMenuOpen(false);
                              setSidebarOpen(false);
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                          >
                            <UserCircle className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Profile</span>
                          </button>
                          <button
                            onClick={() => {
                              setSettingsTab('password');
                              setCurrentView('settings');
                              setUserMenuOpen(false);
                              setSidebarOpen(false);
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                          >
                            <SettingsIcon className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Settings</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
                    <button
                      onClick={logout}
                      className={`flex items-center transition-all duration-200 rounded-xl group w-full ${sidebarCollapsed
                        ? 'justify-center aspect-square bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                        : 'px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                        }`}
                      title="Sign Out"
                    >
                      <LogOut
                        className={`transition-transform duration-300 ${sidebarCollapsed ? 'w-5 h-5 group-hover:scale-110' : 'w-[18px] h-[18px] mr-3'
                          }`}
                        strokeWidth={2.5}
                      />
                      {!sidebarCollapsed && (
                        <span className="font-semibold text-sm">Log Out</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <main className={`pt-16 lg:pt-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
              }`}>
              <div className="p-6 lg:p-8">{renderView()}</div>
            </main>
          </>
        ) : (
          <>
            <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                      <Car className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">TransportHub</h1>
                      <p className="text-sm text-gray-600">Dispatcher Portal</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <NotificationCenter />
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <button
                          onClick={() => setUserMenuOpen(!userMenuOpen)}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                            <UserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                            <p className="text-xs text-gray-600 uppercase">{user?.role}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {userMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                            <button
                              onClick={() => {
                                setSettingsTab('profile');
                                setCurrentView('settings');
                                setUserMenuOpen(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <UserCircle className="w-5 h-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Profile Information</span>
                            </button>
                            <button
                              onClick={() => {
                                setSettingsTab('password');
                                setCurrentView('settings');
                                setUserMenuOpen(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
                            >
                              <SettingsIcon className="w-5 h-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Change Password</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={logout}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
                <nav className="flex items-center space-x-2 overflow-x-auto">
                  {filteredSections.flatMap(section => section.items).map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </header>

            <main className="pt-40">
              <div className="p-6 lg:p-8">{renderView()}</div>
            </main>
          </>
        )}
      </div>
    </AppProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const AppContent: React.FC = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (!user) {
    if (showLogin) {
      return <Login onBackToLanding={() => setShowLogin(false)} />;
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />;
  }

  // Super Admin gets a dedicated simple interface - no regular app features
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Platform Admin</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Company Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.fullName || user.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SuperAdminDashboard />
        </main>
      </div>
    );
  }

  return <MainApp />;
};

export default App;
