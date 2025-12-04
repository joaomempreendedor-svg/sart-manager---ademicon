import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { NewCandidate } from './pages/NewCandidate';
import { CandidateDetail } from './pages/CandidateDetail';
import { TemplateConfig } from './pages/TemplateConfig';
import { ChecklistConfig } from './pages/ChecklistConfig';
import { GoalsConfig } from './pages/GoalsConfig';
import { InterviewConfig } from './pages/InterviewConfig';
import { Commissions } from './pages/Commissions';
import { Materials } from './pages/Materials';
import { TeamConfig } from './pages/TeamConfig';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { CutoffConfig } from './pages/CutoffConfig';
import { Loader2 } from 'lucide-react';

const AppLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      <p className="text-gray-700 dark:text-gray-300 font-medium">Carregando SART Manager...</p>
    </div>
  </div>
);

const RequireAuth = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();

  if (isAuthLoading || (user && isDataLoading)) {
    return <AppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewCandidate />} />
          <Route path="candidate/:id" element={<CandidateDetail />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="materials" element={<Materials />} />
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
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;