import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
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
import { Loader2 } from 'lucide-react';

// Protected Route Wrapper
const RequireAuth = () => {
  const auth = useAuth();
  const { isDataLoading } = useApp();
  
  const [timedOut, setTimedOut] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (auth.isLoading || isDataLoading) {
        console.error('⏰ Timeout no carregamento - limpando estado');
        setTimedOut(true);
        // Forçar logout se preso
        localStorage.removeItem('supabase.auth.token');
        window.location.reload();
      }
    }, 20000);
    
    return () => clearTimeout(timer);
  }, [auth.isLoading, isDataLoading]);

  if (timedOut) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-red-500 font-medium">⏰ Tempo de carregamento excedido</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  if (auth.isLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">
            Carregando dados...
          </p>
          <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Outlet />
      </div>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
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