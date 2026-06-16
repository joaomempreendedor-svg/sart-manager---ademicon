import React from 'react';
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

import { GestorLayout } from '@/components/GestorLayout';
import { ProtectedLayout } from '@/layouts/ProtectedLayout';
import { SecretariaLayout } from '@/layouts/SecretariaLayout';

import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { PublicOnboarding } from '@/pages/PublicOnboarding';
import { Home } from '@/pages/Home';
import { PendingApproval } from '@/pages/PendingApproval';
import { PublicForm } from '@/pages/PublicForm';
import { PublicProcessView } from '@/pages/PublicProcessView';

import { Dashboard } from '@/pages/Dashboard';
import { CandidateDetail } from '@/pages/CandidateDetail';
import { Commissions } from '@/pages/Commissions';
import { Feedbacks } from '@/pages/Feedbacks';
import { OnlineOnboarding } from '@/pages/OnlineOnboarding';
import { FinancialPanel } from '@/pages/FinancialPanel';
import { FormCadastros } from '@/pages/gestor/FormSubmissions';
import HiringMetrics from '@/pages/gestor/HiringMetrics';
import HiringPipeline from '@/pages/gestor/HiringPipeline';
import HiringPipelineConfig from '@/pages/gestor/HiringPipelineConfig';
import { Processos } from '@/pages/gestor/Processos';
import SecretariaTasksConfig from '@/pages/gestor/SecretariaTasksConfig';
import { TeamConfig } from '@/pages/TeamConfig';

import { SecretariaDashboard } from '@/pages/secretaria/SecretariaDashboard';
import { SecretariaDailyChecklist } from '@/pages/secretaria/SecretariaDailyChecklist';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding/:sessionId" element={<PublicOnboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/public-form" element={<PublicForm />} />
      <Route path="/public-process/:processId" element={<PublicProcessView />} />

      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'SECRETARIA']} />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'SECRETARIA']} />}>
        <Route path="/gestor" element={<GestorLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="candidate/:id" element={<CandidateDetail />} />
          <Route path="team-config" element={<TeamConfig />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="financial-panel" element={<FinancialPanel />} />
          <Route path="feedbacks" element={<Feedbacks />} />
          <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="secretaria-tasks" element={<SecretariaTasksConfig />} />
          <Route path="hiring-dashboard" element={<Navigate to="../hiring-metrics" replace />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="hiring-metrics" element={<HiringMetrics />} />
          <Route path="hiring-pipeline-config" element={<HiringPipelineConfig />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
          <Route path="processos" element={<Processos />} />
        </Route>

        <Route path="/secretaria" element={<SecretariaLayout />}>
          <Route path="dashboard" element={<SecretariaDashboard />} />
          <Route path="checklists" element={<SecretariaDailyChecklist />} />
          <Route path="hiring-dashboard" element={<Navigate to="../hiring-metrics" replace />} />
          <Route path="hiring-pipeline" element={<HiringPipeline />} />
          <Route path="hiring-metrics" element={<HiringMetrics />} />
          <Route path="onboarding-admin" element={<OnlineOnboarding />} />
          <Route path="form-cadastros" element={<FormCadastros />} />
        </Route>
      </Route>

      <Route element={<ProtectedLayout allowedRoles={['GESTOR', 'ADMIN', 'SECRETARIA']} />}>
        <Route path="/profile" element={<GestorLayout />}>
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
          <Toaster />
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;