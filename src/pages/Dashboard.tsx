import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  ShieldCheck,
  UserSearch,
  Users,
} from 'lucide-react';

import { MetricCard } from '@/components/MetricCard';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { getCandidateStageKey } from '@/lib/hiringPipeline';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getDateKey = (value?: string) => String(value || '').slice(0, 10);

const Dashboard = () => {
  const { user } = useAuth();
  const {
    isDataLoading,
    candidates,
    financialEntries,
    formCadastros,
    teamMembers,
    hasPendingSecretariaTasks,
  } = useApp();
  const navigate = useNavigate();

  const analytics = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const isInCurrentMonth = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= monthStart && date <= monthEnd;
    };

    const candidatesByStage = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
      const stageKey = getCandidateStageKey(candidate);
      accumulator[stageKey] = (accumulator[stageKey] || 0) + 1;
      return accumulator;
    }, {});

    const pipelineCandidates = candidates.filter((candidate) => {
      const stageKey = getCandidateStageKey(candidate);
      return stageKey !== 'autorizado' && stageKey !== 'reprovado-gestor';
    }).length;

    const interviewsToday = candidates.filter(
      (candidate) => getDateKey(candidate.interviewDate) === todayKey || getDateKey(candidate.interviewScheduledDate) === todayKey,
    ).length;

    const awaitingManagerDecision = candidatesByStage['compareceu-entrevista'] || 0;
    const pendingSecretariaItems = candidates.filter((candidate) => hasPendingSecretariaTasks(candidate)).length;
    const pendingForms = formCadastros.filter((form) => !form.is_complete).length;
    const authorizedThisMonth = candidates.filter((candidate) => isInCurrentMonth(candidate.authorizedDate)).length;

    const totalIncome = financialEntries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpense = financialEntries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const activeTeamMembers = teamMembers.filter((member) => member.isActive).length;
    const activeSecretarias = teamMembers.filter(
      (member) => member.isActive && member.roles.includes('SECRETARIA'),
    ).length;

    return {
      pipelineCandidates,
      interviewsToday,
      awaitingManagerDecision,
      pendingSecretariaItems,
      pendingForms,
      authorizedThisMonth,
      activeTeamMembers,
      activeSecretarias,
      financialBalance: totalIncome - totalExpense,
      buckets: [
        {
          title: 'Triagem e contato',
          value:
            (candidatesByStage['candidatos'] || 0) +
            (candidatesByStage['contatados'] || 0) +
            (candidatesByStage['respondeu'] || 0),
          description: 'Entrada inicial e retorno dos candidatos.',
        },
        {
          title: 'Entrevistas em andamento',
          value:
            (candidatesByStage['entrevista-agendada'] || 0) +
            (candidatesByStage['compareceu-entrevista'] || 0),
          description: 'Agendados e aguardando decisão do gestor.',
        },
        {
          title: 'Pós-aprovação',
          value:
            (candidatesByStage['aprovacao-d1'] || 0) +
            (candidatesByStage['documentacao-nao-enviada'] || 0) +
            (candidatesByStage['documentacao-enviada'] || 0) +
            (candidatesByStage['previa-cadastrada'] || 0) +
            (candidatesByStage['onboarding-liberado'] || 0) +
            (candidatesByStage['onboarding-nao-finalizado'] || 0),
          description: 'Etapas depois da aprovação do gestor.',
        },
        {
          title: 'Integração e fechamento',
          value:
            (candidatesByStage['integracao-agendada'] || 0) +
            (candidatesByStage['integracao-compareceu'] || 0) +
            (candidatesByStage['integracao-finalizada'] || 0) +
            (candidatesByStage['candidato-em-previa'] || 0),
          description: 'Fase final antes da autorização.',
        },
      ],
    };
  }, [candidates, financialEntries, formCadastros, hasPendingSecretariaTasks, teamMembers]);

  if (isDataLoading) {
    return (
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Visão rápida do que precisa de atenção no time e no processo de contratação.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prioridades do dia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cards focados no que realmente movimenta a operação.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Pipeline em andamento"
            value={analytics.pipelineCandidates}
            icon={UserSearch}
            colorClass="bg-blue-600 text-white"
            subValue="Candidatos ainda em processo"
            onClick={() => navigate('/gestor/hiring-pipeline')}
          />
          <MetricCard
            title="Aguardando decisão do gestor"
            value={analytics.awaitingManagerDecision}
            icon={AlertCircle}
            colorClass="bg-violet-600 text-white"
            subValue="Compareceram e precisam de decisão"
            onClick={() => navigate('/gestor/hiring-pipeline')}
          />
          <MetricCard
            title="Entrevistas hoje"
            value={analytics.interviewsToday}
            icon={CalendarDays}
            colorClass="bg-orange-600 text-white"
            subValue="Agenda do dia no processo seletivo"
            onClick={() => navigate('/gestor/hiring-pipeline')}
          />
          <MetricCard
            title="Pendências da secretaria"
            value={analytics.pendingSecretariaItems}
            icon={ShieldCheck}
            colorClass="bg-rose-600 text-white"
            subValue="Candidatos com tarefas abertas"
            onClick={() => navigate('/gestor/hiring-pipeline')}
          />
          <MetricCard
            title="Formulários pendentes"
            value={analytics.pendingForms}
            icon={FileText}
            colorClass="bg-cyan-600 text-white"
            subValue="Envios ainda não concluídos"
            onClick={() => navigate('/gestor/form-cadastros')}
          />
          <MetricCard
            title="Autorizados no mês"
            value={analytics.authorizedThisMonth}
            icon={CheckCircle2}
            colorClass="bg-emerald-600 text-white"
            subValue="Fechamentos do mês atual"
            onClick={() => navigate('/gestor/hiring-metrics')}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fila operacional da contratação</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Onde os candidatos estão concentrados agora dentro do fluxo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {analytics.buckets.map((bucket) => (
              <button
                key={bucket.title}
                onClick={() => navigate('/gestor/hiring-pipeline')}
                className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{bucket.title}</p>
                <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{bucket.value}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{bucket.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resumo gerencial</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Indicadores enxutos do time e do caixa.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/gestor/team-config')}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Equipe ativa</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pessoas ativas no sistema</p>
                </div>
              </div>
              <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics.activeTeamMembers}</span>
            </button>

            <button
              onClick={() => navigate('/gestor/team-config')}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Secretarias ativas</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Responsáveis pela operação</p>
                </div>
              </div>
              <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics.activeSecretarias}</span>
            </button>

            <button
              onClick={() => navigate('/gestor/financial-panel')}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Saldo financeiro</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receitas menos despesas</p>
                </div>
              </div>
              <span className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(analytics.financialBalance)}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
