import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
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
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { CutoffConfig } from '@/pages/CutoffConfig';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { Feedbacks } from '@/pages/Feedbacks';
import { Loader2, RefreshCw } from 'lucide-react';

const AppLoader = () => {
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowReload(true);
    }, 8000); // Show reload button after 8 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleReload = () => {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col items-center space-y-4 text-center">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">Carregando SART Manager...</p>
        {showReload && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg animate-fade-in">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">Está demorando muito?</p>
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium flex items-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Forçar Recarregamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProtectedContent = () => {
  const { isDataLoading } = useApp();
  if (isDataLoading) {
    return <AppLoader />;
  }
  return <Outlet />;
};

const RequireAuth = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <ProtectedContent />;
};

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="candidate/:id" element={<CandidateDetail />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="materials" element={<Materials />} />
          <Route path="links" element={<ImportantLinks />} />
          <Route path="profile" element={<Profile />} />
          <Route path="config-team" element={<TeamConfig />} />
          <Route path="config-templates" element={<TemplateConfig />} />
          <Route path="config-process" element={<ChecklistConfig />} />
          <Route path="config-goals" element={<GoalsConfig />} />
          <Route path="config-interview" element={<InterviewConfig />} />
          <Route path="config-cutoff" element={<CutoffConfig />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;