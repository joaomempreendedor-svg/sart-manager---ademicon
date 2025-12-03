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

// Protected Route Wrapper - VERSÃO ANTI-LOOP
const RequireAuth = () => {
  const auth = useAuth();
  const { isDataLoading } = useApp();
  
  // Estado local para controle preciso
  const [loadState, setLoadState] = useState<'checking' | 'loading' | 'ready' | 'timeout' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);
  
  // Efeito principal com timeout AGGRESSIVO
  useEffect(() => {
    console.log(`🔄 RequireAuth State: auth=${auth.isLoading}, data=${isDataLoading}, loadState=${loadState}`);
    
    // SE já tem usuário e dados não estão carregando → PRONTO
    if (auth.user && !isDataLoading) {
      console.log('✅ Tudo carregado, liberando acesso');
      setLoadState('ready');
      return;
    }
    
    // SE não tem usuário mas auth não está carregando → IR PARA LOGIN
    if (!auth.user && !auth.isLoading) {
      console.log('🔒 Nenhum usuário, redirecionando para login');
      setLoadState('ready'); // Vai redirecionar no render
      return;
    }
    
    // SE está preso no loading → TIMEOUT RÁPIDO (8 segundos)
    const timeout = setTimeout(() => {
      console.error('⏰ TIMEOUT RÁPIDO: Carregamento preso há 8 segundos');
      setLoadState('timeout');
      
      // Limpar tokens problemáticos
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, [auth.user, auth.isLoading, isDataLoading, loadState]);
  
  // Botão de retry
  const handleForceRetry = () => {
    console.log('🔄 Retry forçado pelo usuário');
    setRetryCount(prev => prev + 1);
    setLoadState('checking');
    
    // Limpar completamente
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    
    // Recarregar
    setTimeout(() => window.location.reload(), 500);
  };
  
  // Botão de login manual
  const handleGoToLogin = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // RENDER STATES
  if (loadState === 'timeout') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-red-200 dark:border-red-800 shadow-lg max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tempo de Carregamento Excedido</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            O sistema detectou um problema ao carregar seus dados. Isso geralmente ocorre com conexões instáveis ou sessões expiradas.
          </p>
          <div className="space-y-3">
            <button 
              onClick={handleForceRetry}
              className="w-full py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition"
            >
              🔄 Tentar Novamente
            </button>
            <button 
              onClick={handleGoToLogin}
              className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              🔑 Fazer Login Novamente
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              ↻ Recarregar Página
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            Tentativa #{retryCount + 1} • ID: {auth.user?.id?.substring(0, 8) || 'none'}
          </p>
        </div>
      </div>
    );
  }
  
  // Loading normal
  if (auth.isLoading || isDataLoading || loadState === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
            <div className="absolute inset-0 border-4 border-transparent border-t-brand-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300 font-medium">Carregando SART Manager</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {auth.isLoading ? 'Verificando autenticação...' : 'Carregando seus dados...'}
            </p>
          </div>
          {/* Progress bar animada */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 animate-pulse" style={{ width: '65%' }}></div>
          </div>
          {/* Timer discreto */}
          <p className="text-xs text-gray-400">Tentativa automática em: <span className="font-mono">8s</span></p>
        </div>
      </div>
    );
  }
  
  // Se não tem usuário → login
  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }
  
  // Tudo OK!
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