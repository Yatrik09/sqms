import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthPage } from './pages/AuthPage';

const CustomerPortal = React.lazy(() => import('./pages/CustomerPortal').then(m => ({ default: m.CustomerPortal })));
const ManagerPortal = React.lazy(() => import('./pages/ManagerPortal').then(m => ({ default: m.ManagerPortal })));
const OwnerPortal = React.lazy(() => import('./pages/OwnerPortal').then(m => ({ default: m.OwnerPortal })));
const AdminPortal = React.lazy(() => import('./pages/AdminPortal').then(m => ({ default: m.AdminPortal })));
const MLManagementPortal = React.lazy(() => import('./pages/MLManagementPortal').then(m => ({ default: m.MLManagementPortal })));
const AboutUsPage = React.lazy(() => import('./pages/AboutUsPage').then(m => ({ default: m.AboutUsPage })));
const WorkshopFloorMobile = React.lazy(() => import('./pages/WorkshopFloorMobile').then(m => ({ default: m.WorkshopFloorMobile })));

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold tracking-wider text-slate-400">Loading Workspace...</span>
  </div>
);

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('active-service');
  const [inspectedBranchId, setInspectedBranchId] = useState<number | undefined>(undefined);

  // Sync default tab with authenticated user role
  useEffect(() => {
    if (!user) return;
    if (user.role === 'customer') {
      setCurrentTab('active-service');
    } else if (user.role === 'technician') {
      setCurrentTab('floor-mobile');
    } else if (user.role === 'branch_manager') {
      setCurrentTab('manager-queue');
    } else if (user.role === 'franchise_owner') {
      setCurrentTab('owner-overview');
    } else if (user.role === 'super_admin') {
      setCurrentTab('admin-dashboard');
    }
  }, [user?.id, user?.role]);

  // Loading state (only while verifying an existing stored session)
  if (isLoading && !user && localStorage.getItem('sqms_token')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading Smart Q Session...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Render dedicated Login / Registration screen
  if (!user) {
    return <AuthPage />;
  }

  // Strict Role-Based Content Rendering
  const renderContent = () => {
    if (currentTab === 'about-us') {
      return <AboutUsPage onNavigateTab={setCurrentTab} />;
    }

    if (currentTab === 'floor-mobile' || user.role === 'technician') {
      return <WorkshopFloorMobile onSwitchToDesktop={() => setCurrentTab(user.role === 'branch_manager' ? 'manager-queue' : 'owner-overview')} />;
    }

    switch (user.role) {
      case 'customer':
        return <CustomerPortal activeTab={currentTab} />;

      case 'branch_manager':
        return <ManagerPortal activeTab={currentTab} onTabChange={setCurrentTab} />;

      case 'franchise_owner':
        if (currentTab === 'manager-queue' || currentTab === 'manager-analytics') {
          return (
            <ManagerPortal
              activeTab={currentTab}
              onTabChange={setCurrentTab}
              inspectedCenterId={inspectedBranchId}
            />
          );
        }
        return (
          <OwnerPortal
            activeTab={currentTab}
            onTabChange={setCurrentTab}
            onInspectBranch={(branchId) => {
              setInspectedBranchId(branchId);
              setCurrentTab('manager-queue');
            }}
          />
        );

      case 'super_admin':
        if (currentTab === 'admin-ml') {
          return <MLManagementPortal />;
        }
        return (
          <AdminPortal
            initialTab={
              currentTab === 'admin-audit'
                ? 'audit'
                : currentTab === 'admin-centers'
                ? 'centers'
                : 'overview'
            }
          />
        );

      default:
        return <CustomerPortal activeTab="active-service" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[50rem] h-[50rem] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[40rem] h-[40rem] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <main className="flex-1 pb-16">
        <Suspense fallback={<PageLoader />}>
          {renderContent()}
        </Suspense>
      </main>

      {/* Modern Footer with Workshop Plans Integration */}
      <Footer onNavigateTab={setCurrentTab} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
