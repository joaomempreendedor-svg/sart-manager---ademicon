import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Banknote, DollarSign, Star, FileText, Video, FileStack, UserSearch, Users } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Dashboard = () => {
  const { user } = useAuth();
  const {
    isDataLoading,
    candidates,
    commissions,
    financialEntries,
    processes,
    onboardingSessions,
    formCadastros,
    teamMembers,
  } = useApp();
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const activeCandidates = candidates.filter(
      (candidate) => candidate.status !== 'Reprovado' && candidate.status !== 'Desqualificado',
    ).length;

    const totalCommissions = commissions.reduce((sum, commission) => sum + (commission.netValue || 0), 0);

    const totalIncome = financialEntries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpense = financialEntries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const activeTeamMembers = teamMembers.filter((member) => member.isActive).length;
    const inactiveTeamMembers = teamMembers.length - activeTeamMembers;

    return {
      activeCandidates,
      totalCommissions,
      totalIncome,
      totalExpense,
      totalProcesses: processes.length,
      totalOnboarding: onboardingSessions.length,
      totalForms: formCadastros.length,
      totalTeamMembers: teamMembers.length,
      activeTeamMembers,
      inactiveTeamMembers,
    };
  }, [candidates, commissions, financialEntries, processes, onboardingSessions, formCadastros, teamMembers]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Este painel foi simplificado para os módulos que você está usando agora.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Resumo do sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Contratação"
            value={metrics.activeCandidates}
            icon={UserSearch}
            colorClass="bg-blue-600 text-white"
            subValue="Candidatos em andamento"
            onClick={() => navigate('/gestor/hiring-dashboard')}
          />
          <MetricCard
            title="Equipe"
            value={metrics.totalTeamMembers}
            icon={Users}
            colorClass="bg-indigo-600 text-white"
            subValue={`${metrics.activeTeamMembers} ativos • ${metrics.inactiveTeamMembers} inativos`}
            onClick={() => navigate('/gestor/team-config')}
          />
          <MetricCard
            title="Comissões"
            value={formatCurrency(metrics.totalCommissions)}
            icon={Banknote}
            colorClass="bg-green-600 text-white"
            subValue="Total registrado"
            onClick={() => navigate('/gestor/commissions')}
          />
          <MetricCard
            title="Financeiro"
            value={formatCurrency(metrics.totalIncome - metrics.totalExpense)}
            icon={DollarSign}
            colorClass="bg-emerald-700 text-white"
            subValue="Saldo atual"
            onClick={() => navigate('/gestor/financial-panel')}
          />
          <MetricCard
            title="Processos"
            value={metrics.totalProcesses}
            icon={FileText}
            colorClass="bg-purple-600 text-white"
            subValue="Itens cadastrados"
            onClick={() => navigate('/gestor/processos')}
          />
          <MetricCard
            title="Onboarding"
            value={metrics.totalOnboarding}
            icon={Video}
            colorClass="bg-orange-600 text-white"
            subValue="Sessões criadas"
            onClick={() => navigate('/gestor/onboarding-admin')}
          />
          <MetricCard
            title="Formulários"
            value={metrics.totalForms}
            icon={FileStack}
            colorClass="bg-cyan-600 text-white"
            subValue="Envios recebidos"
            onClick={() => navigate('/gestor/form-cadastros')}
          />
          <MetricCard
            title="Feedbacks"
            value={candidates.filter((candidate) => (candidate.feedbacks || []).length > 0).length}
            icon={Star}
            colorClass="bg-rose-600 text-white"
            subValue="Candidatos com feedback"
            onClick={() => navigate('/gestor/feedbacks')}
          />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;