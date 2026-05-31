import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Loader2,
  MapPin,
  Percent,
  PieChart,
  RotateCcw,
  Search,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import { MetricCard } from '@/components/MetricCard';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Candidate, HiringPipelineColumn, TeamMember } from '@/types';
import { getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type CandidateMetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';

const getColumnColorClasses = (color: HiringPipelineColumn['color']) => {
  switch (color) {
    case 'blue':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    case 'purple':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 text-purple-700 dark:text-purple-300';
    case 'yellow':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
    case 'green':
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300';
    case 'red':
      return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300';
    case 'orange':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    default:
      return 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300';
  }
};

const getCandidateMetricType = (stageKey: string): CandidateMetricType => {
  switch (stageKey) {
    case 'respondeu':
      return 'contacted';
    case 'entrevista-agendada':
      return 'scheduled';
    case 'compareceu-entrevista':
      return 'conducted';
    case 'candidato-em-previa':
    case 'aprovado-gestor':
    case 'aprovacao-d1':
    case 'documentacao-enviada':
    case 'documentacao-nao-enviada':
    case 'previa-cadastrada':
    case 'onboarding-liberado':
    case 'onboarding-finalizado':
    case 'onboarding-nao-finalizado':
    case 'integracao-agendada':
    case 'integracao-nao-compareceu':
    case 'integracao-compareceu':
    case 'integracao-finalizada':
      return 'awaitingPreview';
    case 'autorizado':
      return 'hired';
    case 'faltou-entrevista':
      return 'noShow';
    case 'reprovado-gestor':
      return 'disqualified';
    default:
      return 'total';
  }
};

const HiringMetrics = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, isDataLoading, hiringOrigins, hiringPipelineColumns } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false);
  const [candidatesModalTitle, setCandidatesModalTitle] = useState('');
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]);
  const [candidatesMetricType, setCandidatesMetricType] = useState<CandidateMetricType>('total');

  const baseRoute = user?.role === 'SECRETARIA' ? '/secretaria' : '/gestor';
  const normalizedColumns = useMemo(() => normalizeHiringPipelineColumns(hiringPipelineColumns), [hiringPipelineColumns]);

  const filteredCandidates = useMemo(() => {
    let currentCandidates = candidates.filter(Boolean);

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      currentCandidates = currentCandidates.filter(
        (candidate) =>
          String(candidate.name || '').toLowerCase().includes(lowerSearch) ||
          String(candidate.phone || '').toLowerCase().includes(lowerSearch) ||
          String(candidate.email || '').toLowerCase().includes(lowerSearch) ||
          String(candidate.notes || '').toLowerCase().includes(lowerSearch),
      );
    }

    if (filterStartDate) {
      const start = new Date(`${filterStartDate}T00:00:00`);
      currentCandidates = currentCandidates.filter((candidate) => new Date(candidate.createdAt) >= start);
    }

    if (filterEndDate) {
      const end = new Date(`${filterEndDate}T23:59:59`);
      currentCandidates = currentCandidates.filter((candidate) => new Date(candidate.createdAt) <= end);
    }

    return currentCandidates;
  }, [candidates, filterEndDate, filterStartDate, searchTerm]);

  const analytics = useMemo(() => {
    const activePipelineCandidates = filteredCandidates.filter((candidate) => !candidate.reprovadoDate);
    const authorizedList = filteredCandidates.filter(
      (candidate) => candidate.status === 'Autorizado' || !!candidate.authorizedDate || getCandidateStageKey(candidate) === 'autorizado',
    );
    const withdrawalList = filteredCandidates.filter((candidate) => !!candidate.reprovadoDate);

    const pipelineStages = normalizedColumns.map((column) => ({
      ...column,
      list: activePipelineCandidates.filter((candidate) => getCandidateStageKey(candidate) === column.stageKey),
    }));

    const originCounts: Record<string, number> = {};
    hiringOrigins.forEach((origin) => {
      originCounts[origin] = 0;
    });
    originCounts['Não Informado'] = 0;

    filteredCandidates.forEach((candidate) => {
      const origin = candidate.origin || 'Não Informado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });

    const candidatesByOrigin = Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: filteredCandidates.length > 0 ? (count / filteredCandidates.length) * 100 : 0,
      }))
      .filter((origin) => origin.count > 0 || hiringOrigins.includes(origin.name))
      .sort((a, b) => b.count - a.count);

    const withdrawalReasonCounts: Record<string, number> = {};
    withdrawalList.forEach((candidate) => {
      const reason = candidate.withdrawalReasonOption || candidate.withdrawalReason || 'Não Informado';
      withdrawalReasonCounts[reason] = (withdrawalReasonCounts[reason] || 0) + 1;
    });

    const withdrawalReasonsRanking = Object.entries(withdrawalReasonCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: withdrawalList.length > 0 ? (count / withdrawalList.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const withdrawalStageCounts: Record<string, number> = {};
    withdrawalList.forEach((candidate) => {
      const stageName = candidate.withdrawalStageKey ? getHiringStageLabel(candidate.withdrawalStageKey) : 'Etapa não informada';
      withdrawalStageCounts[stageName] = (withdrawalStageCounts[stageName] || 0) + 1;
    });

    const withdrawalStagesRanking = Object.entries(withdrawalStageCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: withdrawalList.length > 0 ? (count / withdrawalList.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const findMember = (reference?: string) => {
      if (!reference) return undefined;
      return teamMembers.find((member) => member.id === reference || member.authUserId === reference);
    };

    const indicationMap = new Map<string, { member: TeamMember; count: number }>();

    filteredCandidates.forEach((candidate) => {
      const attributedMember = findMember(candidate.responsibleUserId) || findMember(candidate.createdBy);
      if (!attributedMember) return;

      const isConsultantOrManager =
        attributedMember.roles.includes('CONSULTOR') || attributedMember.roles.includes('GESTOR');

      if (!isConsultantOrManager) return;

      const current = indicationMap.get(attributedMember.id);
      if (current) {
        indicationMap.set(attributedMember.id, { ...current, count: current.count + 1 });
        return;
      }

      indicationMap.set(attributedMember.id, { member: attributedMember, count: 1 });
    });

    const totalAttributedIndications = Array.from(indicationMap.values()).reduce((sum, item) => sum + item.count, 0);

    const topIndications = Array.from(indicationMap.values())
      .map(({ member, count }) => ({
        id: member.id,
        name: member.name,
        roles: member.roles,
        count,
        percentage: totalAttributedIndications > 0 ? (count / totalAttributedIndications) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    return {
      totalCandidates: filteredCandidates.length,
      activePipelineCount: activePipelineCandidates.length,
      authorizedList,
      authorizationRate: filteredCandidates.length > 0 ? (authorizedList.length / filteredCandidates.length) * 100 : 0,
      pipelineStages,
      candidatesByOrigin,
      withdrawalReasonsRanking,
      withdrawalStagesRanking,
      topIndications,
      filteredCandidates,
    };
  }, [filteredCandidates, hiringOrigins, normalizedColumns, teamMembers]);

  const handleOpenCandidatesDetailModal = (
    title: string,
    metricCandidates: Candidate[],
    metricType: CandidateMetricType = 'total',
  ) => {
    setCandidatesModalTitle(title);
    setCandidatesForModal(metricCandidates);
    setCandidatesMetricType(metricType);
    setIsCandidatesDetailModalOpen(true);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl bg-gray-50 p-4 dark:bg-slate-900 sm:mx-auto sm:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <PieChart className="h-7 w-7 text-brand-500" />
            Métricas de Contratação
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visão analítica do pipeline, com etapas, origens, desistências e ranking de indicações.
          </p>
        </div>

        <button
          onClick={() => navigate(`${baseRoute}/hiring-pipeline`)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 font-bold text-white transition hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar ao Pipeline
        </button>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div>
            <h3 className="flex items-center text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              <BarChart3 className="mr-2 h-4 w-4" />
              Filtros das métricas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Os relatórios abaixo seguem os filtros aplicados.
            </p>
          </div>

          {(searchTerm || filterStartDate || filterEndDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="flex items-center text-xs text-red-500 transition hover:text-red-700"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nome, telefone ou email..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Criado de</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(event) => setFilterStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Criado até</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Candidatos"
          value={analytics.totalCandidates}
          icon={Users}
          colorClass="bg-indigo-600 text-white"
          subValue="Total no filtro"
          onClick={() => handleOpenCandidatesDetailModal('Candidatos do período', analytics.filteredCandidates, 'total')}
        />
        <MetricCard
          title="Em andamento"
          value={analytics.activePipelineCount}
          icon={TrendingUp}
          colorClass="bg-blue-600 text-white"
          subValue="Ainda no pipeline"
        />
        <MetricCard
          title="Autorizados"
          value={analytics.authorizedList.length}
          icon={UserCheck}
          colorClass="bg-emerald-600 text-white"
          subValue="Etapa final"
          onClick={() => handleOpenCandidatesDetailModal('Autorizados', analytics.authorizedList, 'hired')}
        />
        <MetricCard
          title="Taxa de autorização"
          value={`${analytics.authorizationRate.toFixed(1)}%`}
          icon={Percent}
          colorClass="bg-slate-800 text-white dark:bg-slate-700"
          subValue="Autorizados / candidatos"
        />
      </div>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Métricas por etapa do pipeline</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quantidade de candidatos em cada etapa atual do fluxo.
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7">
          {analytics.pipelineStages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => handleOpenCandidatesDetailModal(stage.title, stage.list, getCandidateMetricType(stage.stageKey))}
              className={`rounded-xl border p-4 text-left transition hover:shadow-md ${getColumnColorClasses(stage.color)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Etapa</p>
                  <h3 className="mt-1 text-sm font-bold leading-tight">{stage.title}</h3>
                </div>
                <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-black dark:bg-black/20">{stage.list.length}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <MapPin className="h-5 w-5 text-brand-500" />
                Candidaturas por origem
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Origem dos currículos no período filtrado.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Origem</th>
                  <th className="px-6 py-3">Quantidade</th>
                  <th className="px-6 py-3">Participação</th>
                  <th className="px-6 py-3">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.candidatesByOrigin.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      Nenhuma candidatura encontrada.
                    </td>
                  </tr>
                ) : (
                  analytics.candidatesByOrigin.map((origin) => (
                    <tr key={origin.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{origin.name}</td>
                      <td className="px-6 py-4">{origin.count}</td>
                      <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{origin.percentage.toFixed(1)}%</td>
                      <td className="px-6 py-4 w-1/3">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${origin.percentage}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                Quem mais indica para contratação
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ranking de consultores e gestores com mais candidatos atribuídos.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Perfil</th>
                  <th className="px-6 py-3">Indicações</th>
                  <th className="px-6 py-3">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.topIndications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      Nenhuma indicação atribuída a consultor ou gestor neste filtro.
                    </td>
                  </tr>
                ) : (
                  analytics.topIndications.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                          {item.roles.includes('GESTOR') ? 'Gestor' : 'Consultor'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.count}</td>
                      <td className="px-6 py-4">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <UserMinus className="h-5 w-5 text-rose-500" />
                Ranking de motivos de desistência
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Principais motivos registrados nas saídas do processo.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Motivo</th>
                  <th className="px-6 py-3">Quantidade</th>
                  <th className="px-6 py-3">Participação</th>
                  <th className="px-6 py-3">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.withdrawalReasonsRanking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      Nenhuma desistência registrada.
                    </td>
                  </tr>
                ) : (
                  analytics.withdrawalReasonsRanking.map((reason) => (
                    <tr key={reason.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{reason.name}</td>
                      <td className="px-6 py-4">{reason.count}</td>
                      <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">{reason.percentage.toFixed(1)}%</td>
                      <td className="px-6 py-4 w-1/3">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-2 rounded-full bg-rose-500" style={{ width: `${reason.percentage}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Etapas onde mais desistem
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Em qual etapa do pipeline acontecem mais saídas.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Etapa</th>
                  <th className="px-6 py-3">Quantidade</th>
                  <th className="px-6 py-3">Participação</th>
                  <th className="px-6 py-3">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.withdrawalStagesRanking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      Nenhuma etapa com desistência registrada.
                    </td>
                  </tr>
                ) : (
                  analytics.withdrawalStagesRanking.map((stage) => (
                    <tr key={stage.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{stage.name}</td>
                      <td className="px-6 py-4">{stage.count}</td>
                      <td className="px-6 py-4 font-bold text-amber-600 dark:text-amber-400">{stage.percentage.toFixed(1)}%</td>
                      <td className="px-6 py-4 w-1/3">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-2 rounded-full bg-amber-500" style={{ width: `${stage.percentage}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CandidatesDetailModal
        isOpen={isCandidatesDetailModalOpen}
        onClose={() => setIsCandidatesDetailModalOpen(false)}
        title={candidatesModalTitle}
        candidates={candidatesForModal}
        teamMembers={teamMembers}
        metricType={candidatesMetricType}
      />
    </div>
  );
};

export default HiringMetrics;
