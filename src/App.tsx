import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

// Layouts
import { GestorSidebar } from '@/components/GestorSidebar';
import { ConsultorLayout } from '@/components/ConsultorLayout';
import { Header } from '@/components/Header';

// Common Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { PublicOnboarding } from '@/pages/PublicOnboarding';
import { Home } from '@/pages/Home';
import { Loader2, RefreshCw } from 'lucide-react';
import { PendingApproval } from '@/pages/PendingApproval';

// Gestor Pages
import { Dashboard } from '@/pages/Dashboard';
import { CandidateDetail } from '@/pages/CandidateDetail';
import { TemplateConfig } from '@/pages/TemplateConfig';
import { ChecklistConfig } from '@/pages/ChecklistConfig';
import { GoalsConfig } from '@/pages/GoalsConfig';
import { InterviewConfig } from '@/pages/InterviewConfig';
import { Commissions } from '@/pages/Commissions';
import { Materials } from '@/pages/Materials';
import { ImportantLinks } from '@/pages/ImportantLinks';
import { TeamConfig } from '@/pages/TeamConfig';
import { CutoffConfig } from '@/pages/CutoffConfig';
import { Feedbacks } from '@/pages/Feedbacks';
import { OnlineOnboarding } from '@/pages/OnlineOnboarding';
import CrmConfigPage from '@/pages/gestor/CrmConfig';
import { DailyChecklistConfig } from '@/pages/gestor/DailyChecklistConfig';
import { DailyChecklistMonitoring } from '@/pages/gestor/DailyChecklistMonitoring';

// Consultor Pages
import ConsultorDashboard from '@/pages/consultor/Dashboard';
import CrmPage from '@/pages/consultor/Crm';
import { DailyChecklist } from '@/pages/consultor/DailyChecklist';

const AppLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
    <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
  </div>
);

const RequireAuth: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();

  const location = useLocation();

  if (isAuthLoading || isDataLoading) {
    return <AppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'CONSULTOR' && user.isActive === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // NOVO: Redirecionar para o perfil se a troca de senha for obrigatória
  if (user.needs_password_change && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const GestorLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <GestorSidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 md:ml-64 flex flex-col">
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding/:sessionId" element={<PublicOnboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      
      {/* Authenticated Routes */}
      <Route path="/" element={<Home />} />

      {/* Gestor Routes */}
      <Route element={<RequireAuth allowedRoles={['GESTOR', 'ADMIN']} />}>
        <Route path="/gestor" element={<GestorLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="candidate/:id" element={<CandidateDetail />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="materials" element={<Materials />} />
          <Route path="links" element={<ImportantLinks />} />
          <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="config-team" element={<TeamConfig />} />
          <Route path="config-templates" element={<TemplateConfig />} />
          <Route path="config-process" element={<ChecklistConfig />} />
          <Route path="config-goals" element={<GoalsConfig />} />
          <Route path="config-interview" element={<InterviewConfig />} />
          <Route path="config-cutoff" element={<CutoffConfig />} />
          <Route path="crm-config" element={<CrmConfigPage />} />
          <Route path="daily-checklist-config" element={<DailyChecklistConfig />} />
          <Route path="daily-checklist-monitoring" element={<DailyChecklistMonitoring />} />
          <Route path="*" element={<Navigate to="/gestor/dashboard" replace />} />
        </Route>
      </Route>

      {/* Consultor Routes */}
      <Route element={<RequireAuth allowedRoles={['CONSULTOR']} />}>
        <Route path="/consultor" element={<ConsultorLayout />}>
          <Route path="dashboard" element={<ConsultorDashboard />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="daily-checklist" element={<DailyChecklist />} />
          <Route path="*" element={<Navigate to="/consultor/dashboard" replace />} />
        </Route>
      </Route>
      
      {/* Common authenticated routes */}
      <Route element={<RequireAuth allowedRoles={['GESTOR', 'ADMIN', 'CONSULTOR']} />}>
         <Route element={<ConsultorLayout />}>
            <Route path="/profile" element={<Profile />} />
         </Route>
      </Route>

    </Routes>
  );
};

const App = () => (
  <HashRouter>
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </HashRouter>
);

export default App;