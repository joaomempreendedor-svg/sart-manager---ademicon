import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

// Layouts
import { GestorSidebar } from '@/components/GestorSidebar';
import { ConsultorLayout } from '@/components/ConsultorLayout';
import { Header } from '@/components/Header';
import { SecretariaLayout } from '@/components/SecretariaLayout'; // NOVO: Importar o novo layout da Secretaria
import { SecretariaSidebar } from '@/components/SecretariaSidebar'; // NOVO: Importar o novo sidebar da Secretaria

// Common Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { PublicOnboarding } from '@/pages/PublicOnboarding';
import { Home } from '@/pages/Home';
import { Loader2, RefreshCw } from 'lucide-react';
import { PendingApproval } from '@/pages/PendingApproval';
import { PublicForm } from '@/pages/PublicForm';


// Gestor Pages
import { Dashboard } from '@/pages/Dashboard';
import { CandidateDetail } from '@/pages/CandidateDetail';
import { TemplateConfig } from '@/pages/TemplateConfig';
import { ChecklistConfig } from '@/pages/ChecklistConfig';
import { GoalsConfig } from '@/pages/GoalsConfig';
import { InterviewConfig } from '@/pages/InterviewConfig';
import { Commissions } from '@/pages/Commissions';
import { Materials } from '@/pages/Materials';
// import { ImportantLinks } from '@/pages/ImportantLinks'; // REMOVED
import { TeamConfig } from '@/pages/TeamConfig';
import { CutoffConfig } from '@/pages/CutoffConfig';
import { Feedbacks } from '@/pages/Feedbacks';
import { OnlineOnboarding } from '@/pages/OnlineOnboarding';
import CrmConfigPage from '@/pages/gestor/CrmConfig';
import CrmOverviewPage from '@/pages/gestor/CrmOverview';
import { DailyChecklistConfig } from '@/pages/gestor/DailyChecklistConfig';
import { DailyChecklistMonitoring } from '@/pages/gestor/DailyChecklistMonitoring';
import HiringPipeline from '@/pages/gestor/HiringPipeline';
import CrmSalesReports from '@/pages/gestor/CrmSalesReports';
import HiringReports from '@/pages/gestor/HiringReports';
import { OriginConfig } from '@/pages/OriginConfig';
import { FinancialPanel } from '@/pages/FinancialPanel';
import { FormCadastros } from '@/pages/gestor/FormSubmissions';
import CandidateScreening from '@/pages/gestor/CandidateScreening';
import TeamProductionGoals from '@/pages/gestor/TeamProductionGoals';
import { AllCandidates } from '@/pages/gestor/AllCandidates';
import GestorTasksPage from '@/pages/gestor/GestorTasksPage'; // NOVO: Importar a nova página

// Consultor Pages
import ConsultorDashboard from '@/pages/consultor/Dashboard';
import ConsultorCrmPage from '@/pages/consultor/Crm';
import { DailyChecklist } from '@/pages/consultor/DailyChecklist';
import ConsultorSalesReports from '@/pages/consultor/ConsultorSalesReports';

// Secretaria Pages
import { SecretariaDashboard } from '@/pages/secretaria/SecretariaDashboard';


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
    // Se o usuário está logado mas não tem a role permitida para a rota atual,
    // redireciona para a rota base da sua role (ou para o login se não tiver role válida)
    if (user.role === 'GESTOR' || user.role === 'ADMIN') {
      return <Navigate to="/gestor/dashboard" replace />;
    }
    if (user.role === 'CONSULTOR') {
      return <Navigate to="/consultor/dashboard" replace />;
    }
    if (user.role === 'SECRETARIA') {
      return <Navigate to="/secretaria/dashboard" replace />;
    }
    return <Navigate to="/login" replace />; // Fallback
  }

  return <Outlet />;
};

const GestorLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <GestorSidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebarCollapse={toggleSidebarCollapse} 
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} user={user} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};


const AppRoutes = () => {
  const { isLoading } = useAuth();
  const location = useLocation();


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
      <Route path="/public-form" element={<PublicForm />} />
      
      {/* Authenticated Routes - ALL authenticated routes should be nested under RequireAuth */}
      <Route element={<RequireAuth allowedRoles={['GESTOR', 'ADMIN', 'CONSULTOR', 'SECRETARIA']} />}>
        <Route path="/" element={<Home />} />

        {/* Gestor Routes */}
        <Route path="/gestor" element={<GestorLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="candidate/:id" element={<CandidateDetail />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="financial-panel" element={<FinancialPanel />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="materials" element={<Materials />} />
          {/* <Route path="links" element={<ImportantLinks />} /> REMOVED */}
          <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="config-team" element={<TeamConfig />} />
          <Route path="config-templates" element={<TemplateConfig />} />
          <Route path="config-process" element={<ChecklistConfig />} />
          <Route path="config-goals" element={<GoalsConfig />} />
          <Route path="config-interview" element={<InterviewConfig />} />
          <Route path="config-cutoff" element={<CutoffConfig />} />
          <Route path="crm-config" element={<CrmConfigPage />} />
          <Route path="crm" element={<CrmOverviewPage />} />
          <Route path="daily-checklist-config" element={<DailyChecklistConfig />} />
          <Route path="daily-checklist-monitoring" element={<DailyChecklistMonitoring />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="crm-sales-reports" element={<CrmSalesReports />} />
          <Route path="hiring-reports" element={<HiringReports />} />
          <Route path="config-origins" element={<OriginConfig />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
          <Route path="candidate-screening" element={<CandidateScreening />} />
          <Route path="team-production-goals" element={<TeamProductionGoals />} />
          <Route path="all-candidates" element={<AllCandidates />} />
          <Route path="my-tasks" element={<GestorTasksPage />} />
          <Route path="*" element={<Navigate to="/gestor/dashboard" replace />} />
        </Route>

        {/* Consultor Routes */}
        <Route path="/consultor" element={<ConsultorLayout />}>
          <Route path="dashboard" element={<ConsultorDashboard />} />
          
          <Route path="crm" element={<ConsultorCrmPage />} />
          <Route path="daily-checklist" element={<DailyChecklist />} />
          <Route path="materials" element={<Materials />} />
          <Route path="sales-reports" element={<ConsultorSalesReports />} />
          {/* <Route path="links" element={<ImportantLinks />} /> REMOVIDO */}
          <Route path="*" element={<Navigate to="/consultor/dashboard" replace />} />
        </Route>

        {/* NOVO: Rotas para Secretaria */}
        <Route path="/secretaria" element={<SecretariaLayout />}> {/* Usar o novo SecretariaLayout */}
          <Route path="dashboard" element={<SecretariaDashboard />} />
          {/* As rotas abaixo foram removidas do sidebar da Secretaria, mas mantidas aqui caso precise reativá-las no futuro */}
          {/* <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="candidate-screening" element={<CandidateScreening />} />
          <Route path="all-candidates" element={<AllCandidates />} />
          <Route path="hiring-reports" element={<HiringReports />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
          <Route path="config-origins" element={<OriginConfig />} /> */}
          <Route path="*" element={<Navigate to="/secretaria/dashboard" replace />} />
        </Route>
        
        {/* Common authenticated routes */}
        <Route element={<ConsultorLayout />}>
            <Route path="/profile" element={<Profile />} />
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