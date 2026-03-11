import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Toaster } from '@/components/ui/sonner'; // Importar Sonner Toaster

// Layouts
import { ConsultorLayout } from '@/components/ConsultorLayout';
import { GestorLayout } from '@/components/GestorLayout'; // Importar GestorLayout
import { ProtectedLayout } from '@/layouts/ProtectedLayout'; // NOVO: Importar ProtectedLayout

// Common Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { PublicOnboarding } from '@/pages/PublicOnboarding';
import { Home } from '@/pages/Home';
import { Loader2 } from 'lucide-react';
import { PendingApproval } from '@/pages/PendingApproval';
import { PublicForm } from '@/pages/PublicForm';
import { PublicProcessView } from '@/pages/PublicProcessView'; // NOVO: Importar PublicProcessView

// Gestor Pages
import { Dashboard } from '@/pages/Dashboard';
import { CandidateDetail } from '@/pages/CandidateDetail';
import { TemplateConfig } from '@/pages/TemplateConfig';
import { ChecklistConfig } from '@/pages/ChecklistConfig';
import { GoalsConfig } from '@/pages/GoalsConfig';
import { InterviewConfig } from '@/pages/InterviewConfig';
import { Commissions } from '@/pages/Commissions';
import { Materials } from '@/pages/Materials';
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
import HiringDashboard from '@/pages/gestor/HiringDashboard'; 
import HiringOriginsReport from '@/pages/gestor/HiringOriginsReport';
import { OriginConfig } from '@/pages/OriginConfig';
import { FinancialPanel } from '@/pages/FinancialPanel';
import { FormCadastros } from '@/pages/gestor/FormSubmissions';
import TeamProductionGoals from '@/pages/gestor/TeamProductionGoals';
import GestorTasksPage from '@/pages/gestor/GestorTasksPage';
import ColdCallMetricsPage from '@/pages/gestor/ColdCallMetricsPage';
import { Processos } from '@/pages/gestor/Processos'; // NOVO

// Consultor Pages
import ConsultorDashboard from '@/pages/consultor/Dashboard';
import ConsultorCrmPage from '@/pages/consultor/Crm';
import { DailyChecklist } from '@/pages/consultor/DailyChecklist';
import ConsultorSalesReports from '@/pages/consultor/ConsultorSalesReports';
import ColdCallPage from '@/pages/consultor/ColdCallPage'; // NOVO: Importar ColdCallPage

// Secretaria Pages
import { SecretariaDashboard } from '@/pages/secretaria/SecretariaDashboard';
import { SecretariaDailyChecklist } from '@/pages/secretaria/SecretariaDailyChecklist'; // NOVO: Importar a página de checklist da secretaria

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding/:sessionId" element={<PublicOnboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/public-form" element={<PublicForm />} />
      <Route path="/public-process/:processId" element={<PublicProcessView />} /> {/* NOVO: Rota pública para processos */}
      
      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'CONSULTOR', 'SECRETARIA']} />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* Rotas para GESTOR, ADMIN e SECRETARIA que usam o MainLayout */}
      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'SECRETARIA']} />}>
        <Route path="/gestor" element={<GestorLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="candidate/:id" element={<CandidateDetail />} /> {/* Agora acessível por Gestor, Admin e Secretaria */}
          <Route path="commissions" element={<Commissions />} />
          <Route path="financial-panel" element={<FinancialPanel />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="materials" element={<Materials />} />
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
          <Route path="hiring-dashboard" element={<HiringDashboard />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="hiring-origins-report" element={<HiringOriginsReport />} />
          <Route path="crm-sales-reports" element={<CrmSalesReports />} />
          <Route path="config-origins" element={<OriginConfig />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
          <Route path="team-production-goals" element={<TeamProductionGoals />} />
          <Route path="my-tasks" element={<GestorTasksPage />} />
          <Route path="cold-call-metrics" element={<ColdCallMetricsPage />} />
          <Route path="processos" element={<Processos />} /> {/* NOVO */}
        </Route>

        <Route path="/secretaria" element={<GestorLayout />}> {/* Secretaria também usa GestorLayout */}
          <Route path="dashboard" element={<SecretariaDashboard />} />
          <Route path="hiring-dashboard" element={<HiringDashboard />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="hiring-origins-report" element={<HiringOriginsReport />} />
          <Route path="daily-checklist" element={<SecretariaDailyChecklist />} />
          <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
          <Route path="config-origins" element={<OriginConfig />} />
        </Route>
      </Route>

      {/* Rotas para CONSULTOR que usam o ConsultorLayout */}
      <Route element={<ProtectedLayout allowedRoles={['CONSULTOR']} />}>
        <Route path="/consultor" element={<ConsultorLayout />}>
          <Route path="dashboard" element={<ConsultorDashboard />} />
          <Route path="crm" element={<ConsultorCrmPage />} />
          <Route path="cold-call" element={<ColdCallPage />} /> {/* NOVO: Rota para Cold Call */}
          <Route path="daily-checklist" element={<DailyChecklist />} />
          <Route path="materials" element={<Materials />} />
          <Route path="sales-reports" element={<ConsultorSalesReports />} />
        </Route>
      </Route>
      
      {/* Página de Perfil, acessível por todos os usuários autenticados, usando ConsultorLayout */}
      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'CONSULTOR', 'SECRETARIA']} />}>
        <Route path="/profile" element={<ConsultorLayout />}>
          <Route index element={<Profile />} />
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