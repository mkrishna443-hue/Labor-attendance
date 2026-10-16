import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteProvider } from './contexts/SiteContext';
import { PhoneLogin } from './components/auth/PhoneLogin';
import { Header } from './components/layout/Header';
import { BottomNav, TabType } from './components/layout/BottomNav';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { InstallPwaPrompt } from './components/common/InstallPwaPrompt';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { AttendanceTab } from './components/attendance/AttendanceTab';
import { LaborersTab } from './components/laborers/LaborersTab';
import { ReportsTab } from './components/reports/ReportsTab';
import { SiteManagementModal } from './components/sites/SiteManagementModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { HardHat } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    description?: string
  ) => {
    const id = `${Date.now()}_${Math.random()}`;
    const newToast: ToastMessage = { id, type, title, description };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xl animate-pulse mb-4">
          <HardHat className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">LaborTrack</h1>
        <p className="text-xs text-slate-400 mt-1">Starting construction attendance engine...</p>
      </div>
    );
  }

  if (!user) {
    return <PhoneLogin />;
  }

  return (
    <SiteProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* PWA Add to Home Screen Prompt */}
        <InstallPwaPrompt />

        {/* Mobile Header with Site Picker */}
        <Header onOpenSiteManagement={() => setIsSiteModalOpen(true)} />

        {/* Offline / Pending Sync Alert Banner */}
        <OfflineBanner />

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Main Tab Content Area */}
        <main className="flex-1 max-w-lg w-full mx-auto px-4">
          {activeTab === 'home' && (
            <DashboardTab
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenSiteManagement={() => setIsSiteModalOpen(true)}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceTab onShowToast={addToast} />
          )}

          {activeTab === 'laborers' && (
            <LaborersTab onShowToast={addToast} />
          )}

          {activeTab === 'reports' && (
            <ReportsTab />
          )}
        </main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Site Management Modal */}
        <SiteManagementModal
          isOpen={isSiteModalOpen}
          onClose={() => setIsSiteModalOpen(false)}
        />
      </div>
    </SiteProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
