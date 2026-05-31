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
import { Candidate, HiringPipelineColumn } from '@/types';
import { getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type MetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';

type FunnelStepDefinition = {
  id: string;
  title: string;
  description: string;
  metricType: MetricType;
  matches: (candidate: Candidate) => boolean;
};

const getDateKey = (value?: string) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const isDateInRange = (value: string | undefined, startDate: string, endDate: string) => {
  const dateKey = getDateKey(value);
  if (!dateKey) return false;
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
  return true;
};

const getStageDateValues = (candidate: Candidate, stageKey: HiringPipelineColumn['stageKey']) => {
  switch (stageKey) {
    case 'candidatos':
      return [candidate.createdAt];
    case 'contatados':
      return [candidate.contactedDate];
    case 'respondeu':
      return [candidate.respondedDate];
    case 'entrevista-agendada':
      return [candidate.interviewScheduledDate];
    case 'compareceu-entrevista':
      return [candidate.interviewAttendedDate, candidate.interviewConductedDate];
    case 'faltou-entrevista':
      return [candidate.interviewNoShowDate, candidate.faltouDate];
    case 'aprovado-gestor':
      return [candidate.managerApprovedDate, candidate.awaitingPreviewDate];
    case 'reprovado-gestor':
      return [candidate.managerRejectedDate, candidate.disqualifiedDate, candidate.reprovadoDate];
    case 'aprovacao-d1':
      return [candidate.d1ApprovalDate];
    case 'documentacao-enviada':
      return [candidate.documentationSentDate];
    case 'documentacao-nao-enviada':
      return [candidate.documentationNotSentDate];
    case 'previa-cadastrada':
      return [candidate.previewRegisteredDate];
    case 'onboarding-liberado':
      return [candidate.onboardingReleasedDate, candidate.onboardingOnlineDate];
    case 'onboarding-finalizado':
      return [candidate.onboardingFinishedDate];
    case 'onboarding-nao-finalizado':
      return [candidate.onboardingNotFinishedDate];
    case 'integracao-agendada':
      return [candidate.integrationScheduledDate, candidate.integrationPresencialDate];
    case 'integracao-nao-compareceu':
      return [candidate.integrationNoShowDate];
    case 'integracao-compareceu':
      return [candidate.integrationAttendedDate];
    case 'integracao-finalizada':
      return [candidate.integrationFinishedDate];
    case 'candidato-em-previa':
      return [candidate.awaitingPreviewDate];
    case 'autorizado':
      return [candidate.authorizedDate];
    default:
      return [];
  }
};

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

const HISTORICAL_MOVEMENT_STEPS: FunnelStepDefinition[] = [
  {
    id: 'created',
    title: 'Novos candidatos',
    description: 'Cadastros criados no período.',
    metricType: 'newCandidates',
    matches: (candidate) => !!candidate.createdAt,
  },
  {
    id: 'contacted',
    title: 'Mensagens enviadas',
    description: 'Quem recebeu primeiro contato.',
    metricType: 'contacted',
    matches: (candidate) => !!candidate.contactedDate,
  },
  {
    id: 'responded',
    title: 'Responderam',
    description: 'Retorno recebido após a mensagem.',
    metricType: 'contacted',
    matches: (candidate) => !!candidate.respondedDate,
  },
  {
    id: 'scheduled',
    title: 'Entrevistas marcadas',
    description: 'Entrevistas agendadas no período.',
    metricType: 'scheduled',
    matches: (candidate) => !!candidate.interviewScheduledDate,
  },
  {
    id: 'attended',
    title: 'Compareceram',
    description: 'Chegaram à entrevista.',
    metricType: 'conducted',
    matches: (candidate) => !!candidate.interviewAttendedDate || !!candidate.interviewConductedDate,
  },
  {
    id: 'approved',
    title: 'Aprovados pelo gestor',
    description: 'Passaram da validação do gestor.',
    metricType: 'awaitingPreview',
    matches: (candidate) => !!candidate.managerApprovedDate || !!candidate.awaitingPreviewDate,
  },
  {
    id: 'authorized',
    title: 'Autorizados',
    description: 'Fechamento final do funil.',
    metricType: 'hired',
    matches: (candidate) => !!candidate.authorizedDate,
  },
];

const COHORT_CONVERSION_STEPS: FunnelStepDefinition[] = [
  {
    id: 'contacted',
    title: 'Mensagens enviadas',
    description: 'Base escolhida para a análise.',
    metricType: 'contacted',
    matches: (candidate) => !!candidate.contactedDate,
  },
  {
    id: 'responded',
    title: 'Responderam',
    description: 'Dos contatados, quantos deram retorno.',
    metricType: 'contacted',
    matches: (candidate) => !!candidate.respondedDate,
  },
  {
    id: 'scheduled',
    title: 'Marcaram entrevista',
    description: 'Dos que responderam, quantos avançaram para agendamento.',
    metricType: 'scheduled',
    matches: (candidate) => !!candidate.interviewScheduledDate,
  },
  {
    id: 'attended',
    title: 'Compareceram',
    description: 'Dos agendados, quantos realmente participaram.',
    metricType: 'conducted',
    matches: (candidate) => !!candidate.interviewAttendedDate || !!candidate.interviewConductedDate,
  },
  {
    id: 'approved',
    title: 'Aprovados pelo gestor',
    description: 'Dos que compareceram, quantos foram aprovados.',
    metricType: 'awaitingPreview',
    matches: (candidate) => !!candidate.managerApprovedDate || !!candidate.awaitingPreviewDate,
  },
  {
    id: 'authorized',
    title: 'Autorizados',
    description: 'Resultado final da mesma base contatada.',
    metricType: 'hired',
    matches: (candidate) => !!candidate.authorizedDate,
  },
];

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
  const [candidatesMetricType, setCandidatesMetricType] = useState<MetricType>('total');

  const baseRoute = user?.role === 'SECRETARIA' ? '/secretaria' : '/gestor';
  const normalizedColumns = useMemo(() => normalizeHiringPipelineColumns(hiringPipelineColumns), [hiringPipelineColumns]);

  const searchFilteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates.filter(Boolean);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return candidates.filter(
      (candidate) =>
        String(candidate.name || '').toLowerCase().includes(normalizedSearch) ||
        String(candidate.phone || '').toLowerCase().includes(normalizedSearch) ||
        String(candidate.email || '').toLowerCase().includes(normalizedSearch) ||
        String(candidate.notes || '').toLowerCase().includes(normalizedSearch),
    );
  }, [candidates, searchTerm]);

  const analytics = useMemo(() => {
    const candidatesCreatedInPeriod = searchFilteredCandidates.filter((candidate) =>
      isDateInRange(candidate.createdAt, filterStartDate, filterEndDate),
    );

    const contactedCohort = searchFilteredCandidates.filter((candidate) =>
      isDateInRange(candidate.contactedDate, filterStartDate, filterEndDate),
    );

    const conversionSteps = COHORT_CONVERSION_STEPS.map((step, index) => {
      const stepCandidates = index === 0 ? contactedCohort : contactedCohort.filter(step.matches);
      const previousCount = index === 0 ? contactedCohort.length : undefined;
      const priorStepCount = index > 0 ? contactedCohort.filter(COHORT_CONVERSION_STEPS[index - 1].matches).length : contactedCohort.length;
      const count = stepCandidates.length;
      const overallRate = contactedCohort.length > 0 ? (count / contactedCohort.length) * 100 : 0;
      const previousRate = index === 0 ? 100 : priorStepCount > 0 ? (count / priorStepCount) * 100 : 0;

      return {
        ...step,
        count,
        overallRate,
        previousRate,
        previousCount,
        candidates: stepCandidates,
      };
    });

    const historicalMovements = HISTORICAL_MOVEMENT_STEPS.map((step) => {
      const stepCandidates = searchFilteredCandidates.filter((candidate) => {
        switch (step.id) {
          case 'created':
            return isDateInRange(candidate.createdAt, filterStartDate, filterEndDate);
          case 'contacted':
            return isDateInRange(candidate.contactedDate, filterStartDate, filterEndDate);
          case 'responded':
            return isDateInRange(candidate.respondedDate, filterStartDate, filterEndDate);
          case 'scheduled':
            return isDateInRange(candidate.interviewScheduledDate, filterStartDate, filterEndDate);
          case 'attended':
            return (
              isDateInRange(candidate.interviewAttendedDate, filterStartDate, filterEndDate) ||
              isDateInRange(candidate.interviewConductedDate, filterStartDate, filterEndDate)
            );
          case 'approved':
            return (
              isDateInRange(candidate.managerApprovedDate, filterStartDate, filterEndDate) ||
              isDateInRange(candidate.awaitingPreviewDate, filterStartDate, filterEndDate)
            );
          case 'authorized':
            return isDateInRange(candidate.authorizedDate, filterStartDate, filterEndDate);
          default:
            return false;
        }
      });

      return {
        ...step,
        count: stepCandidates.length,
        candidates: stepCandidates,
      };
    });

    const losses = {
      noResponse: contactedCohort.filter((candidate) => !!candidate.noResponseDate || candidate.screeningStatus === 'No Response'),
      noShow: contactedCohort.filter((candidate) => !!candidate.interviewNoShowDate || !!candidate.faltouDate),
      disqualified: contactedCohort.filter(
        (candidate) =>
          !!candidate.managerRejectedDate ||
          !!candidate.disqualifiedDate ||
          !!candidate.reprovadoDate ||
          getCandidateStageKey(candidate) === 'reprovado-gestor',
      ),
    };

    const withdrawalCandidates = searchFilteredCandidates.filter(
      (candidate) =>
        isDateInRange(candidate.reprovadoDate, filterStartDate, filterEndDate) ||
        isDateInRange(candidate.disqualifiedDate, filterStartDate, filterEndDate) ||
        isDateInRange(candidate.managerRejectedDate, filterStartDate, filterEndDate),
    );

    const withdrawalStageMap = new Map<string, { name: string; count: number; candidates: Candidate[] }>();

    withdrawalCandidates.forEach((candidate) => {
      const stageKey = candidate.withdrawalStageKey || getCandidateStageKey(candidate);
      const stageName = candidate.withdrawalStageKey ? getHiringStageLabel(candidate.withdrawalStageKey) : getHiringStageLabel(stageKey);
      const current = withdrawalStageMap.get(stageName);

      if (current) {
        current.count += 1;
        current.candidates.push(candidate);
        return;
      }

      withdrawalStageMap.set(stageName, {
        name: stageName,
        count: 1,
        candidates: [candidate],
      });
    });

    const withdrawalStageRanking = Array.from(withdrawalStageMap.values())
      .map((item) => ({
        ...item,
        percentage: withdrawalCandidates.length > 0 ? (item.count / withdrawalCandidates.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    const stageMetrics = normalizedColumns.map((column) => {
      const stageCandidates = searchFilteredCandidates.filter((candidate) =>
        getStageDateValues(candidate, column.stageKey).some((value) => isDateInRange(value, filterStartDate, filterEndDate)),
      );

      return {
        ...column,
        count: stageCandidates.length,
        percentage: candidatesCreatedInPeriod.length > 0 ? (stageCandidates.length / candidatesCreatedInPeriod.length) * 100 : 0,
        candidates: stageCandidates,
      };
    });

    const processFunnelSteps = stageMetrics.map((stage, index) => {
      const previousCount = index === 0 ? stage.count : stageMetrics[index - 1].count;
      return {
        ...stage,
        overallRate: candidatesCreatedInPeriod.length > 0 ? (stage.count / candidatesCreatedInPeriod.length) * 100 : 0,
        previousRate: index === 0 ? 100 : previousCount > 0 ? (stage.count / previousCount) * 100 : 0,
      };
    });

    const originCounts: Record<string, number> = {};

    hiringOrigins.forEach((origin) => {
      originCounts[origin] = 0;
    });
    originCounts['Não Informado'] = 0;

    candidatesCreatedInPeriod.forEach((candidate) => {
      const origin = candidate.origin || 'Não Informado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });

    const candidatesByOrigin = Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: candidatesCreatedInPeriod.length > 0 ? (count / candidatesCreatedInPeriod.length) * 100 : 0,
      }))
      .filter((origin) => origin.count > 0 || hiringOrigins.includes(origin.name))
      .sort((a, b) => b.count - a.count);

    const responseRate = contactedCohort.length > 0 ? (conversionSteps[1].count / contactedCohort.length) * 100 : 0;
    const schedulingRate = conversionSteps[1].count > 0 ? (conversionSteps[2].count / conversionSteps[1].count) * 100 : 0;
    const authorizationRate = contactedCohort.length > 0 ? (conversionSteps[5].count / contactedCohort.length) * 100 : 0;

    return {
      candidatesCreatedInPeriod,
      contactedCohort,
      conversionSteps,
      historicalMovements,
      losses,
      withdrawalCandidates,
      withdrawalStageRanking,
      stageMetrics,
      processFunnelSteps,
      candidatesByOrigin,
      responseRate,
      schedulingRate,
      authorizationRate,
    };

  }, [filterEndDate, filterStartDate, hiringOrigins, normalizedColumns, searchFilteredCandidates]);

  const periodLabel = useMemo(() => {
    if (filterStartDate && filterEndDate) return `${filterStartDate} até ${filterEndDate}`;
    if (filterStartDate) return `a partir de ${filterStartDate}`;
    if (filterEndDate) return `até ${filterEndDate}`;
    return 'histórico completo';
  }, [filterEndDate, filterStartDate]);

  const handleOpenCandidatesDetailModal = (title: string, metricCandidates: Candidate[], metricType: MetricType = 'total') => {
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
            Agora a leitura foca em histórico salvo do funil: quem foi contatado, quem respondeu, quem marcou entrevista e quem virou autorizado.
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
        <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h3 className="flex items-center text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              <BarChart3 className="mr-2 h-4 w-4" />
              Filtros da análise
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              O período usa as datas salvas em cada etapa. Mesmo que o candidato avance no pipeline, o histórico continua aparecendo aqui.
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
              Limpar filtros
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
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Período de</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(event) => setFilterStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Período até</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-300" />
          <div>
            <h2 className="font-bold text-blue-900 dark:text-blue-100">Leitura principal do período</h2>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
              A base desta análise são os candidatos <strong>contatados em {periodLabel}</strong>. A partir dela, você vê a conversão real do funil sem depender apenas da coluna atual do pipeline.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Mensagens enviadas"
          value={analytics.contactedCohort.length}
          icon={Users}
          colorClass="bg-indigo-600 text-white"
          subValue="Base da análise"
          onClick={() => handleOpenCandidatesDetailModal('Base contatada', analytics.contactedCohort, 'contacted')}
        />
        <MetricCard
          title="Taxa de resposta"
          value={`${analytics.responseRate.toFixed(1)}%`}
          icon={TrendingUp}
          colorClass="bg-blue-600 text-white"
          subValue={`${analytics.conversionSteps[1].count} responderam`}
          onClick={() => handleOpenCandidatesDetailModal('Responderam', analytics.conversionSteps[1].candidates, 'contacted')}
        />
        <MetricCard
          title="Taxa de agendamento"
          value={`${analytics.schedulingRate.toFixed(1)}%`}
          icon={UserPlus}
          colorClass="bg-emerald-600 text-white"
          subValue={`${analytics.conversionSteps[2].count} entrevistas marcadas`}
          onClick={() => handleOpenCandidatesDetailModal('Entrevistas marcadas', analytics.conversionSteps[2].candidates, 'scheduled')}
        />
        <MetricCard
          title="Taxa final de autorização"
          value={`${analytics.authorizationRate.toFixed(1)}%`}
          icon={Percent}
          colorClass="bg-slate-800 text-white dark:bg-slate-700"
          subValue={`${analytics.conversionSteps[5].count} autorizados`}
          onClick={() => handleOpenCandidatesDetailModal('Autorizados da base contatada', analytics.conversionSteps[5].candidates, 'hired')}
        />
      </div>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Funil histórico do processo inteiro</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visão completa do processo no período, desde a entrada em candidatos até as etapas finais do pipeline.
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        {analytics.candidatesCreatedInPeriod.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
            Nenhum candidato entrou no processo nesse período. Ajuste a data para montar o funil histórico.
          </div>
        ) : (
          <div className="space-y-3">
            {analytics.processFunnelSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleOpenCandidatesDetailModal(step.title, step.candidates, 'total')}
                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{step.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {step.count} candidatos passaram por esta etapa no período filtrado.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-2.5 rounded-full bg-brand-500"
                        style={{ width: `${Math.min(100, step.overallRate)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid min-w-[220px] grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:text-right">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quantidade</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{step.count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Taxa da etapa</p>
                      <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{step.previousRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Taxa sobre a base</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{step.overallRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <Calendar className="h-5 w-5 text-brand-500" />
                Movimentações registradas no período
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quantos eventos realmente aconteceram em {periodLabel}.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {analytics.historicalMovements.map((movement) => (
              <button
                key={movement.id}
                onClick={() => handleOpenCandidatesDetailModal(movement.title, movement.candidates, movement.metricType)}
                className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-brand-700"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Histórico salvo</p>
                <h3 className="mt-1 font-bold text-gray-900 dark:text-white">{movement.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{movement.description}</p>
                <p className="mt-4 text-3xl font-black text-brand-600 dark:text-brand-400">{movement.count}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <UserMinus className="h-5 w-5 text-rose-500" />
                Perdas da base contatada
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Onde a mesma base perde força antes de virar contratação.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <button
              onClick={() => handleOpenCandidatesDetailModal('Sem resposta', analytics.losses.noResponse, 'noResponse')}
              className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-rose-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-rose-700"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Perda</p>
              <h3 className="mt-1 font-bold text-gray-900 dark:text-white">Sem resposta</h3>
              <p className="mt-3 text-3xl font-black text-rose-600 dark:text-rose-400">{analytics.losses.noResponse.length}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {analytics.contactedCohort.length > 0 ? ((analytics.losses.noResponse.length / analytics.contactedCohort.length) * 100).toFixed(1) : '0.0'}% da base
              </p>
            </button>

            <button
              onClick={() => handleOpenCandidatesDetailModal('Faltaram na entrevista', analytics.losses.noShow, 'noShow')}
              className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-amber-300 hover:shadow-sm dark:border-slate-700 dark:hover:border-amber-700"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Perda</p>
              <h3 className="mt-1 font-bold text-gray-900 dark:text-white">Faltaram</h3>
              <p className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">{analytics.losses.noShow.length}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {analytics.contactedCohort.length > 0 ? ((analytics.losses.noShow.length / analytics.contactedCohort.length) * 100).toFixed(1) : '0.0'}% da base
              </p>
            </button>

            <button
              onClick={() => handleOpenCandidatesDetailModal('Reprovados', analytics.losses.disqualified, 'disqualified')}
              className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-slate-400 hover:shadow-sm dark:border-slate-700 dark:hover:border-slate-500"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Perda</p>
              <h3 className="mt-1 font-bold text-gray-900 dark:text-white">Reprovados</h3>
              <p className="mt-3 text-3xl font-black text-slate-700 dark:text-slate-200">{analytics.losses.disqualified.length}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {analytics.contactedCohort.length > 0 ? ((analytics.losses.disqualified.length / analytics.contactedCohort.length) * 100).toFixed(1) : '0.0'}% da base
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <BarChart3 className="h-5 w-5 text-brand-500" />
                Métricas do pipeline inteiro por etapa
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aqui você vê cada etapa do pipeline com histórico salvo no período, sem repetir a foto atual do funil.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Etapa</th>
                  <th className="px-6 py-3">Entraram na etapa</th>
                  <th className="px-6 py-3">% sobre novos candidatos</th>
                  <th className="px-6 py-3">Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.stageMetrics.map((stage) => (
                  <tr key={stage.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleOpenCandidatesDetailModal(stage.title, stage.candidates, 'total')}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition hover:opacity-90 ${getColumnColorClasses(stage.color)}`}
                      >
                        {stage.title}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{stage.count}</td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{stage.percentage.toFixed(1)}%</td>
                    <td className="w-1/3 px-6 py-4">
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, stage.percentage)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <UserMinus className="h-5 w-5 text-rose-500" />
                Ranking de desistência por etapa
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostra em qual etapa do pipeline mais acontece saída no período filtrado.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Etapa da saída</th>
                  <th className="px-6 py-3">Desistências</th>
                  <th className="px-6 py-3">Participação</th>
                  <th className="px-6 py-3">Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.withdrawalStageRanking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      Nenhuma desistência registrada no período.
                    </td>
                  </tr>
                ) : (
                  analytics.withdrawalStageRanking.map((stage) => (
                    <tr key={stage.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenCandidatesDetailModal(`Desistências em ${stage.name}`, stage.candidates, 'withdrawn')}
                          className="font-bold text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        >
                          {stage.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{stage.count}</td>
                      <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">{stage.percentage.toFixed(1)}%</td>
                      <td className="w-1/3 px-6 py-4">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-2 rounded-full bg-rose-500" style={{ width: `${Math.min(100, stage.percentage)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <MapPin className="h-5 w-5 text-brand-500" />
              Origem dos candidatos criados
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Distribuição dos cadastros em {periodLabel}.
            </p>
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
                    Nenhum cadastro encontrado para o período.
                  </td>
                </tr>
              ) : (
                analytics.candidatesByOrigin.map((origin) => (
                  <tr key={origin.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{origin.name}</td>
                    <td className="px-6 py-4">{origin.count}</td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{origin.percentage.toFixed(1)}%</td>
                    <td className="w-1/3 px-6 py-4">
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
      </section>

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
