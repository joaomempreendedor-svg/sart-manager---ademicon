import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, Banknote, DollarSign, Star, FileText, Video, FileStack,
  UserSearch, Users, TrendingUp, TrendingDown, CheckCircle2, Clock,
  UserCheck, UserX, ArrowUpRight, BarChart3, Calendar, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  const metrics = useMemo(() => {
    // Candidatos
    const activeCandidates = candidates.filter(c => !c.reprovadoDate).length;
    const withdrawnCandidates = candidates.filter(c => !!c.reprovadoDate).length;
    const authorizedCandidates = candidates.filter(c => c.authorizedDate).length;
    const interviewsToday = candidates.filter(c => {
      if (!c.interviewDate) return false;
      const d = new Date(c.interviewDate + 'T00:00:00');
      return d.getDate() === now.getDate() && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const pendingInterview = candidates.filter(c => c.pipelineStageKey === 'entrevista-agendada').length;

    // Funil do mês
    const thisMonthCandidates = candidates.filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Comissões
    const totalCommissions = commissions.reduce((sum, c) => sum + (c.netValue || 0), 0);
    const paidCommissions = commissions.reduce((sum, c) => {
      const installments = c.installmentDetails || {};
      return sum + Object.values(installments).filter((i: any) => i.status === 'Pago').length;
    }, 0);
    const pendingCommissions = commissions.reduce((sum, c) => {
      const installments = c.installmentDetails || {};
      return sum + Object.values(installments).filter((i: any) => i.status === 'Pendente').length;
    }, 0);

    // Financeiro
    const totalIncome = financialEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = financialEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalIncome - totalExpense;

    const thisMonthIncome = financialEntries
      .filter(e => e.type === 'income' && new Date(e.entry_date).getMonth() === currentMonth && new Date(e.entry_date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);
    const thisMonthExpense = financialEntries
      .filter(e => e.type === 'expense' && new Date(e.entry_date).getMonth() === currentMonth && new Date(e.entry_date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);

    // Equipe
    const activeTeamMembers = teamMembers.filter(m => m.isActive).length;
    const inactiveTeamMembers = teamMembers.length - activeTeamMembers;
    const consultors = teamMembers.filter(m => m.isActive && m.roles.includes('CONSULTOR')).length;

    // Onboarding
    const completedOnboarding = onboardingSessions.filter(s =>
      s.videos && s.videos.length > 0 && s.videos.every((v: any) => v.is_completed)
    ).length;
    const pendingOnboarding = onboardingSessions.length - completedOnboarding;

    // Taxa de contratação
    const hiringRate = candidates.length > 0 ? (authorizedCandidates / candidates.length) * 100 : 0;

    return {
      activeCandidates, withdrawnCandidates, authorizedCandidates, interviewsToday,
      pendingInterview, thisMonthCandidates, totalCommissions, paidCommissions,
      pendingCommissions, totalIncome, totalExpense, balance, thisMonthIncome,
      thisMonthExpense, activeTeamMembers, inactiveTeamMembers, consultors,
      completedOnboarding, pendingOnboarding, hiringRate,
      totalProcesses: processes.length,
      totalOnboarding: onboardingSessions.length,
      totalForms: formCadastros.length,
      totalTeamMembers: teamMembers.length,
      totalCandidates: candidates.length,
    };
  }, [candidates, commissions, financialEntries, processes, onboardingSessions, formCadastros, teamMembers]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              {greeting}, {user?.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Alertas do dia */}
        {(metrics.interviewsToday > 0 || metrics.pendingInterview > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.interviewsToday > 0 && (
              <button
                onClick={() => navigate('/gestor/hiring-pipeline')}
                className="flex items-center gap-4 bg-brand-500 text-white rounded-2xl p-4 text-left hover:bg-brand-600 transition"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-lg">{metrics.interviewsToday} entrevista{metrics.interviewsToday > 1 ? 's' : ''} hoje</p>
                  <p className="text-brand-100 text-sm">Clique para ver o pipeline</p>
                </div>
                <ArrowUpRight className="w-5 h-5 ml-auto opacity-70" />
              </button>
            )}
            {metrics.pendingInterview > 0 && (
              <button
                onClick={() => navigate('/gestor/hiring-pipeline')}
                className="flex items-center gap-4 bg-amber-500 text-white rounded-2xl p-4 text-left hover:bg-amber-600 transition"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-lg">{metrics.pendingInterview} aguardando entrevista</p>
                  <p className="text-amber-100 text-sm">Candidatos agendados</p>
                </div>
                <ArrowUpRight className="w-5 h-5 ml-auto opacity-70" />
              </button>
            )}
          </div>
        )}

        {/* Contratação */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <UserSearch className="w-5 h-5 text-blue-500" />
              Contratação
            </h2>
            <button
              onClick={() => navigate('/gestor/hiring-pipeline')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
            >
              Ver pipeline <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Total de candidatos</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.totalCandidates}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-bold">{metrics.thisMonthCandidates} este mês</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Em processo</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.activeCandidates}</p>
              <p className="text-xs text-gray-400 mt-1">{metrics.withdrawnCandidates} desistiram</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-green-200 dark:border-green-900 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Autorizados</p>
              <p className="text-3xl font-black text-green-600 dark:text-green-400">{metrics.authorizedCandidates}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-bold">Taxa: {formatPercent(metrics.hiringRate)}</p>
            </div>
            <div
              onClick={() => navigate('/gestor/hiring-dashboard')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 cursor-pointer hover:border-brand-300 transition"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Ver métricas</p>
              <div className="flex items-center gap-2 mt-3">
                <BarChart3 className="w-8 h-8 text-brand-500" />
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Dashboard completo</p>
            </div>
          </div>
        </section>

        {/* Equipe */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Equipe
            </h2>
            <button
              onClick={() => navigate('/gestor/config-team')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
            >
              Gerenciar <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Total na equipe</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.totalTeamMembers}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                  <UserCheck className="w-3 h-3" />{metrics.activeTeamMembers} ativos
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <UserX className="w-3 h-3" />{metrics.inactiveTeamMembers} inativos
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Consultores ativos</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{metrics.consultors}</p>
              <p className="text-xs text-gray-400 mt-1">de {metrics.activeTeamMembers} membros ativos</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Onboarding</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.totalOnboarding}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-green-600 font-bold">{metrics.completedOnboarding} concluídos</span>
                <span className="text-xs text-amber-500 font-bold">{metrics.pendingOnboarding} pendentes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Financeiro e Comissões */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Financeiro
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Financeiro */}
            <div
              onClick={() => navigate('/gestor/financial-panel')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 cursor-pointer hover:border-green-300 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-700 dark:text-gray-300">Painel Financeiro</p>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-4">{formatCurrency(metrics.balance)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Entradas</span>
                  </div>
                  <p className="font-black text-green-700 dark:text-green-300">{formatCurrency(metrics.totalIncome)}</p>
                  <p className="text-[10px] text-green-600 mt-0.5">{formatCurrency(metrics.thisMonthIncome)} este mês</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Saídas</span>
                  </div>
                  <p className="font-black text-red-700 dark:text-red-300">{formatCurrency(metrics.totalExpense)}</p>
                  <p className="text-[10px] text-red-600 mt-0.5">{formatCurrency(metrics.thisMonthExpense)} este mês</p>
                </div>
              </div>
            </div>

            {/* Comissões */}
            <div
              onClick={() => navigate('/gestor/commissions')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 cursor-pointer hover:border-emerald-300 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-700 dark:text-gray-300">Comissões</p>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-4">{formatCurrency(metrics.totalCommissions)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Pagas</span>
                  </div>
                  <p className="font-black text-green-700 dark:text-green-300 text-xl">{metrics.paidCommissions}</p>
                  <p className="text-[10px] text-green-600 mt-0.5">parcelas pagas</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Pendentes</span>
                  </div>
                  <p className="font-black text-amber-700 dark:text-amber-300 text-xl">{metrics.pendingCommissions}</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">parcelas pendentes</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Outros módulos */}
        <section>
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-purple-500" />
            Outros módulos
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/gestor/processos')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 text-left hover:border-purple-300 transition group"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{metrics.totalProcesses}</p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Processos</p>
            </button>

            <button
              onClick={() => navigate('/gestor/onboarding-admin')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 text-left hover:border-orange-300 transition group"
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center mb-3">
                <Video className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{metrics.totalOnboarding}</p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Onboarding</p>
            </button>

            <button
              onClick={() => navigate('/gestor/form-cadastros')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 text-left hover:border-cyan-300 transition group"
            >
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/40 rounded-xl flex items-center justify-center mb-3">
                <FileStack className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{metrics.totalForms}</p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Formulários</p>
            </button>

            <button
              onClick={() => navigate('/gestor/feedbacks')}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 text-left hover:border-rose-300 transition group"
            >
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center mb-3">
                <Star className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {teamMembers.filter(m => (m.feedbacks || []).length > 0).length}
              </p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Feedbacks</p>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;