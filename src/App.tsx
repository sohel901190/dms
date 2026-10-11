import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { HelpSupportModal } from './components/HelpSupportModal';

import { AuthView } from './views/AuthView';
import { OnboardingWizard } from './views/OnboardingWizard';
import { DashboardView } from './views/DashboardView';
import { SalesView } from './views/SalesView';
import { ProductsView } from './views/ProductsView';
import { PurchasesView } from './views/PurchasesView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { AccountingView } from './views/AccountingView';
import { ReportsView } from './views/ReportsView';
import { ReturnsView } from './views/ReturnsView';
import { BusinessSettingsView } from './views/BusinessSettingsView';
import { FirebaseSetupView } from './views/FirebaseSetupView';
import { AuditLog } from './components/AuditLog';
import { testConnection } from './firebase/connection';

function MainApp() {
  const { currentUser, loading: authLoading } = useAuth();
  const { activeBusiness, loading: bizLoading, userBusinesses } = useBusiness();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Connection health probe
  useEffect(() => {
    testConnection().then((res) => {
      setIsOnline(res.online);
    });
  }, []);

  // Global loading
  if (authLoading || (currentUser && bizLoading)) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <img
            src="https://imgur.com/XjO7IJK.jpg"
            alt="DMS Solution"
            className="w-16 h-16 rounded-2xl p-1 border border-slate-200 bg-white shadow-xs object-contain animate-bounce"
          />
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
          <span>Loading DMS Solution...</span>
        </div>
      </div>
    );
  }

  // Not authenticated -> Landing & Auth view
  if (!currentUser) {
    return (
      <>
        <AuthView onOpenSupport={() => setIsSupportModalOpen(true)} />
        {isSupportModalOpen && <HelpSupportModal onClose={() => setIsSupportModalOpen(false)} />}
      </>
    );
  }

  // Authenticated, but no business created yet -> Onboarding Wizard
  if (!activeBusiness && userBusinesses.length === 0) {
    return <OnboardingWizard />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenSupport={() => setIsSupportModalOpen(true)}
        onOpenFirebaseSetup={() => setCurrentTab('firebase')}
        isOnline={isOnline}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'support') {
              setIsSupportModalOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 md:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'sales' && <SalesView />}
          {currentTab === 'products' && <ProductsView />}
          {currentTab === 'purchases' && <PurchasesView />}
          {currentTab === 'customers' && <CustomersView />}
          {currentTab === 'suppliers' && <SuppliersView />}
          {currentTab === 'accounting' && <AccountingView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'returns' && <ReturnsView />}
          {currentTab === 'audit' && <AuditLog />}
          {currentTab === 'settings' && <BusinessSettingsView />}
          {currentTab === 'firebase' && <FirebaseSetupView />}
        </main>
      </div>

      {/* Help & Support Modal */}
      {isSupportModalOpen && <HelpSupportModal onClose={() => setIsSupportModalOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <MainApp />
      </BusinessProvider>
    </AuthProvider>
  );
}
