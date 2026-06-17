import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MapPin,
  PieChart,
  RotateCcw,
  Search,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Candidate, HiringPipelineColumn, HiringPipelineStageKey, TeamMember } from '@/types';
import { getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type MetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';
type SectionKey = 'funnel' | 'withdrawals' | 'origins' | 'indications';

type FunnelStageConfig = {
  type: 'stage';
  stageKey: HiringPipelineStageKey;
  title?: string;
  description?: string;
};

type FunnelBranchConfig = {
  type: 'branch';
  parentStageKey: HiringPipelineStageKey;
  title: string;
  description: string;
  positiveStageKey: HiringPipelineStageKey;
  negativeStageKey: HiringPipelineStageKey;
};

type FunnelConfig = FunnelStageConfig | FunnelBranchConfig;

type StageMetric = {
  stageKey: HiringPipelineStageKey;
  title: string;
  color: HiringPipelineColumn['color'];
  count: number;
  candidates: Candidate[];
};

const SECTION_OPTIONS: Array<{ key: SectionKey; title: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'funnel', title: 'Funil histórico', icon: BarChart3 },
  { key: 'withdrawals', title: 'Ranking de desistência', icon: UserMinus },
  { key: 'origins', title: 'Origens', icon: MapPin },
  { key: 'indications', title: 'Consultores que mais indicam', icon: UserPlus },
];

const FUNNEL_STAGES: Array<{
  stageKey: HiringPipelineStageKey;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
}> = [
  { stageKey: 'candidatos', label: 'Candidatos', color: 'bg-gray-100 dark:bg-slate-700', textColor: 'text-gray-700 dark:text-gray-200', borderColor: 'border-gray-300 dark:border-slate-600' },
  { stageKey: 'contatados', label: 'Contatados', color: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
  { stageKey: 'respondeu', label: 'Respondeu', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
  { stageKey: 'entrevista-agendada', label: 'Entrevista Agendada', color: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
  { stageKey: 'compareceu-entrevista', label: 'Compareceu', color: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-700 dark:text-purple-300', borderColor: 'border-purple-200 dark:border-purple-800' },
  { stageKey: 'faltou-entrevista', label: 'Faltou', color: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-300', borderColor: 'border-red-200 dark:border-red-800' },
  { stageKey: 'aprovado-gestor', label: 'Aprovado Gestor', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
  { stageKey: 'reprovado-gestor', label: 'Reprovado Gestor', color: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-300', borderColor: 'border-red-200 dark:border-red-800' },
  { stageKey: 'aprovacao-d1', label: 'Aprovação D+1', color: 'bg-yellow-50 dark:bg-yellow-900/20', textColor: 'text-yellow-700 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { stageKey: 'documentacao-enviada', label: 'Doc. Enviada', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
  { stageKey: 'documentacao-nao-enviada', label: 'Doc. Não Enviada', color: 'bg-orange-50 dark:bg-orange-900/20', textColor: 'text-orange-700 dark:text-orange-300', borderColor: 'border-orange-200 dark:border-orange-800' },
  { stageKey: 'previa-cadastrada', label: 'Prévia Cadastrada', color: 'bg-yellow-50 dark:bg-yellow-900/20', textColor: 'text-yellow-700 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { stageKey: 'candidato-em-previa', label: 'Em Prévia', color: 'bg-yellow-50 dark:bg-yellow-900/20', textColor: 'text-yellow-700 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { stageKey: 'onboarding-liberado', label: 'Onboarding Liberado', color: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
  { stageKey: 'onboarding-finalizado', label: 'Onboarding Finalizado', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
  { stageKey: 'onboarding-nao-finalizado', label: 'Onboarding Pendente', color: 'bg-orange-50 dark:bg-orange-900/20', textColor: 'text-orange-700 dark:text-orange-300', borderColor: 'border-orange-200 dark:border-orange-800' },
  { stageKey: 'integracao-agendada', label: 'Integração Agendada', color: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
  { stageKey: 'integracao-compareceu', label: 'Integração OK', color: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-700 dark:text-purple-300', borderColor: 'border-purple-200 dark:border-purple-800' },
  { stageKey: 'integracao-nao-compareceu', label: 'Integração Faltou', color: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-300', borderColor: 'border-red-200 dark:border-red-800' },
  { stageKey: 'integracao-finalizada', label: 'Integração Finalizada', color: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
  { stageKey: 'autorizado', label: 'Autorizado ✓', color: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-300', borderColor: 'border-emerald-300 dark:border-emerald-700' },
];

const FUNNEL_LAYOUT: FunnelConfig[] = [
  { type: 'stage', stageKey: 'candidatos', description: 'Entrada de candidatos no processo.' },
  { type: 'stage', stageKey: 'contatados', description: 'Receberam o primeiro contato.' },
  { type: 'stage', stageKey: 'respondeu', description: 'Responderam ao contato.' },
  {
    type: 'branch',
    parentStageKey: 'entrevista-agendada',
    title: 'Entrevista agendada',
    description: 'Depois do agendamento, o processo se divide entre quem compareceu e quem faltou.',
    positiveStageKey: 'compareceu-entrevista',
    negativeStageKey: 'faltou-entrevista',
  },
  {
    type: 'branch',
    parentStageKey: 'compareceu-entrevista',
    title: 'Avaliação do gestor',
    description: 'Dos que compareceram, parte segue e parte é reprovada.',
    positiveStageKey: 'aprovado-gestor',
    negativeStageKey: 'reprovado-gestor',
  },
  { type: 'stage', stageKey: 'aprovacao-d1', description: 'Aprovados que passaram por D+1.' },
  {
    type: 'branch',
    parentStageKey: 'aprovacao-d1',
    title: 'Envio de documentação',
    description: 'Após D+1, o processo se divide entre quem enviou e quem não enviou a documentação.',
    positiveStageKey: 'documentacao-enviada',
    negativeStageKey: 'documentacao-nao-enviada',
  },
  { type: 'stage', stageKey: 'previa-cadastrada', description: 'Prévia cadastrada no processo.' },
  {
    type: 'branch',
    parentStageKey: 'onboarding-liberado',
    title: 'Resultado do onboarding',
    description: 'Após liberação do onboarding, parte conclui e parte não conclui.',
    positiveStageKey: 'onboarding-finalizado',
    negativeStageKey: 'onboarding-nao-finalizado',
  },
  {
    type: 'branch',
    parentStageKey: 'integracao-agendada',
    title: 'Resultado da integração',
    description: 'Depois do agendamento da integração, o processo se divide entre quem compareceu e quem não compareceu.',
    positiveStageKey: 'integracao-compareceu',
    negativeStageKey: 'integracao-nao-compareceu',
  },
  { type: 'stage', stageKey: 'integracao-finalizada', description: 'Integração concluída.' },
  { type: 'stage', stageKey: 'candidato-em-previa', description: 'Candidato em prévia.' },
  { type: 'stage', stageKey: 'autorizado', description: 'Fechamento final do processo.' },
];

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

const getStageDateValues = (candidate: Candidate, stageKey: HiringPipelineStageKey) => {
  switch (stageKey) {
    case 'candidatos': return [candidate.createdAt];
    case 'contatados': return [candidate.contactedDate];
    case 'respondeu': return [candidate.respondedDate];
    case 'entrevista-agendada': return [candidate.interviewScheduledDate];
    case 'compareceu-entrevista': return [candidate.interviewAttendedDate, candidate.interviewConductedDate];
    case 'faltou-entrevista': return [candidate.interviewNoShowDate, candidate.faltouDate];
    case 'aprovado-gestor': return [candidate.managerApprovedDate, candidate.awaitingPreviewDate];
    case 'reprovado-gestor': return [candidate.managerRejectedDate, candidate.disqualifiedDate, candidate.reprovadoDate];
    case 'aprovacao-d1': return [candidate.d1ApprovalDate];
    case 'documentacao-enviada': return [candidate.documentationSentDate];
    case 'documentacao-nao-enviada': return [candidate.documentationNotSentDate];
    case 'previa-cadastrada': return [candidate.previewRegisteredDate];
    case 'onboarding-liberado': return [candidate.onboardingReleasedDate, candidate.onboardingOnlineDate];
    case 'onboarding-finalizado': return [candidate.onboardingFinishedDate];
    case 'onboarding-nao-finalizado': return [candidate.onboardingNotFinishedDate];
    case 'integracao-agendada': return [candidate.integrationScheduledDate, candidate.integrationPresencialDate];
    case 'integracao-nao-compareceu': return [candidate.integrationNoShowDate];
    case 'integracao-compareceu': return [candidate.integrationAttendedDate];
    case 'integracao-finalizada': return [candidate.integrationFinishedDate];
    case 'candidato-em-previa': return [candidate.awaitingPreviewDate];
    case 'autorizado': return [candidate.authorizedDate];
    default: return [];
  }
};

const getColumnColorClasses = (color: HiringPipelineColumn['color']) => {
  switch (color) {
    case 'blue': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    case 'purple': return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 text-purple-700 dark:text-purple-300';
    case 'yellow': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
    case 'green': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300';
    case 'red': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300';
    case 'orange': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    default: return 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300';
  }
};

const HiringMetrics = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, isDataLoading, hiringOrigins, hiringPipelineColumns } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('funnel');
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

    const columnsByKey = new Map(normalizedColumns.map((column) => [column.stageKey, column]));

    const buildStageMetric = (stageKey: HiringPipelineStageKey): StageMetric => {
      const column = columnsByKey.get(stageKey);
      const stageCandidates = searchFilteredCandidates.filter((candidate) =>
        getStageDateValues(candidate, stageKey).some((value) => isDateInRange(value, filterStartDate, filterEndDate)),
      );
      return {
        stageKey,
        title: column?.title || getHiringStageLabel(stageKey),
        color: column?.color || 'gray',
        count: stageCandidates.length,
        candidates: stageCandidates,
      };
    };

    // Grid metrics — todas as etapas como quadradinhos
    const gridMetrics = FUNNEL_STAGES.map((stage) => {
      const metric = buildStageMetric(stage.stageKey);
      return {
        ...stage,
        count: metric.count,
        candidates: metric.candidates,
        baseRate: candidatesCreatedInPeriod.length > 0 ? (metric.count / candidatesCreatedInPeriod.length) * 100 : 0,
      };
    });

    // Quadradinho extra: Reagendados
    const reagendados = candidatesCreatedInPeriod.filter(c => (c.rescheduledCount || 0) > 0);
    gridMetrics.push({
      stageKey: 'faltou-entrevista',
      label: 'Reagendados',
      color: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800',
      count: reagendados.length,
      candidates: reagendados,
      baseRate: candidatesCreatedInPeriod.length > 0 ? (reagendados.length / candidatesCreatedInPeriod.length) * 100 : 0,
    });

    const processFunnelBlocks = FUNNEL_LAYOUT.map((item) => {
      if (item.type === 'stage') {
        const metric = buildStageMetric(item.stageKey);
        return {
          type: 'stage' as const,
          stageKey: item.stageKey,
          title: item.title || metric.title,
          description: item.description || '',
          color: metric.color,
          count: metric.count,
          candidates: metric.candidates,
          baseRate: candidatesCreatedInPeriod.length > 0 ? (metric.count / candidatesCreatedInPeriod.length) * 100 : 0,
        };
      }

      const parentMetric = buildStageMetric(item.parentStageKey);
      const positiveMetric = buildStageMetric(item.positiveStageKey);
      const negativeMetric = buildStageMetric(item.negativeStageKey);

      return {
        type: 'branch' as const,
        parentStageKey: item.parentStageKey,
        title: item.title,
        description: item.description,
        count: parentMetric.count,
        candidates: parentMetric.candidates,
        baseRate: candidatesCreatedInPeriod.length > 0 ? (parentMetric.count / candidatesCreatedInPeriod.length) * 100 : 0,
        positive: {
          ...positiveMetric,
          stageRate: parentMetric.count > 0 ? (positiveMetric.count / parentMetric.count) * 100 : 0,
          baseRate: candidatesCreatedInPeriod.length > 0 ? (positiveMetric.count / candidatesCreatedInPeriod.length) * 100 : 0,
        },
        negative: {
          ...negativeMetric,
          stageRate: parentMetric.count > 0 ? (negativeMetric.count / parentMetric.count) * 100 : 0,
          baseRate: candidatesCreatedInPeriod.length > 0 ? (negativeMetric.count / candidatesCreatedInPeriod.length) * 100 : 0,
        },
      };
    });

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
      if (current) { current.count += 1; current.candidates.push(candidate); return; }
      withdrawalStageMap.set(stageName, { name: stageName, count: 1, candidates: [candidate] });
    });

    const withdrawalStageRanking = Array.from(withdrawalStageMap.values())
      .map((item) => ({ ...item, percentage: withdrawalCandidates.length > 0 ? (item.count / withdrawalCandidates.length) * 100 : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    const originMap = new Map<string, { name: string; count: number; candidates: Candidate[] }>();
    hiringOrigins.forEach((origin) => { originMap.set(origin, { name: origin, count: 0, candidates: [] }); });
    originMap.set('Não Informado', { name: 'Não Informado', count: 0, candidates: [] });
    candidatesCreatedInPeriod.forEach((candidate) => {
      const originName = candidate.origin || 'Não Informado';
      const current = originMap.get(originName) || { name: originName, count: 0, candidates: [] };
      current.count += 1; current.candidates.push(candidate);
      originMap.set(originName, current);
    });

    const candidatesByOrigin = Array.from(originMap.values())
      .map((item) => ({ ...item, percentage: candidatesCreatedInPeriod.length > 0 ? (item.count / candidatesCreatedInPeriod.length) * 100 : 0 }))
      .filter((item) => item.count > 0 || hiringOrigins.includes(item.name))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    const findMember = (reference?: string) => {
      if (!reference) return undefined;
      return teamMembers.find((member) => member.id === reference || member.authUserId === reference);
    };

    const indicationMap = new Map<string, { member: TeamMember; count: number; candidates: Candidate[] }>();
    candidatesCreatedInPeriod.forEach((candidate) => {
      const attributedMember = findMember(candidate.responsibleUserId) || findMember(candidate.createdBy);
      if (!attributedMember) return;
      const current = indicationMap.get(attributedMember.id);
      if (current) { current.count += 1; current.candidates.push(candidate); return; }
      indicationMap.set(attributedMember.id, { member: attributedMember, count: 1, candidates: [candidate] });
    });

    const totalIndications = Array.from(indicationMap.values()).reduce((sum, item) => sum + item.count, 0);
    const topIndications = Array.from(indicationMap.values())
      .map(({ member, count, candidates: attributedCandidates }) => ({
        id: member.id,
        name: member.isActive ? member.name : `${member.name} (Inativo)`,
        count,
        percentage: totalIndications > 0 ? (count / totalIndications) * 100 : 0,
        candidates: attributedCandidates,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    return {
      candidatesCreatedInPeriod,
      gridMetrics,
      processFunnelBlocks,
      withdrawalStageRanking,
      candidatesByOrigin,
      topIndications,
    };
  }, [filterEndDate, filterStartDate, hiringOrigins, normalizedColumns, searchFilteredCandidates, teamMembers]);

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
            Escolha a visão que quer analisar: funil histórico, desistências, origens ou consultores que mais indicam.
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
              <BarChart3 className="mr-2 h-4 w-4" />Filtros da análise
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">O período usa as datas salvas em cada etapa do processo.</p>
          </div>
          {(searchTerm || filterStartDate || filterEndDate) && (
            <button onClick={() => { setSearchTerm(''); setFilterStartDate(''); setFilterEndDate(''); }}
              className="flex items-center text-xs text-red-500 transition hover:text-red-700">
              <RotateCcw className="mr-1 h-3 w-3" />Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Nome, telefone ou email..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Período de</label>
            <input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Período até</label>
            <input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {SECTION_OPTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;
          return (
            <button key={section.key} onClick={() => setActiveSection(section.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
              }`}>
              <Icon className="h-4 w-4" />{section.title}
            </button>
          );
        })}
      </div>

      {activeSection === 'funnel' && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Funil de Contratação</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {analytics.candidatesCreatedInPeriod.length} candidatos em {periodLabel} — clique em qualquer etapa para ver os candidatos.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          {analytics.candidatesCreatedInPeriod.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
              Nenhum candidato encontrado para o período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
              {analytics.gridMetrics.map((stage, index) => (
                <button
                  key={`${stage.stageKey}-${index}`}
                  onClick={() => handleOpenCandidatesDetailModal(stage.label, stage.candidates, 'total')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition hover:shadow-md hover:scale-105 ${stage.color} ${stage.borderColor}`}
                >
                  <span className={`text-3xl font-black ${stage.textColor}`}>{stage.count}</span>
                  <span className={`mt-1 text-[10px] font-bold leading-tight ${stage.textColor} opacity-80`}>{stage.label}</span>
                  {analytics.candidatesCreatedInPeriod.length > 0 && (
                    <span className={`mt-1.5 text-[9px] font-bold ${stage.textColor} opacity-60`}>
                      {stage.baseRate.toFixed(0)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeSection === 'withdrawals' && (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <UserMinus className="h-5 w-5 text-rose-500" />Ranking de desistência por etapa
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mostra em qual etapa do pipeline mais acontece saída no período filtrado.</p>
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
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Nenhuma desistência registrada no período.</td></tr>
                ) : (
                  analytics.withdrawalStageRanking.map((stage) => (
                    <tr key={stage.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4">
                        <button onClick={() => handleOpenCandidatesDetailModal(`Desistências em ${stage.name}`, stage.candidates, 'withdrawn')}
                          className="font-bold text-rose-600 transition hover:text-rose-700 dark:text-rose-400">{stage.name}</button>
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
      )}

      {activeSection === 'origins' && (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <MapPin className="h-5 w-5 text-brand-500" />Origem dos candidatos criados
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Distribuição dos cadastros em {periodLabel}.</p>
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
                  <th className="px-6 py-3">Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.candidatesByOrigin.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Nenhum cadastro encontrado para o período.</td></tr>
                ) : (
                  analytics.candidatesByOrigin.map((origin) => (
                    <tr key={origin.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4">
                        <button onClick={() => handleOpenCandidatesDetailModal(`Origem: ${origin.name}`, origin.candidates, 'total')}
                          className="font-bold text-gray-900 transition hover:text-brand-600 dark:text-white">{origin.name}</button>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{origin.count}</td>
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
      )}

      {activeSection === 'indications' && (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <Users className="h-5 w-5 text-indigo-500" />Consultores que mais indicam
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ranking dos consultores com mais candidatos atribuídos no período.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Consultor</th>
                  <th className="px-6 py-3">Indicações</th>
                  <th className="px-6 py-3">Participação</th>
                  <th className="px-6 py-3">Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {analytics.topIndications.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Nenhuma indicação atribuída no período.</td></tr>
                ) : (
                  analytics.topIndications.map((consultant) => (
                    <tr key={consultant.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4">
                        <button onClick={() => handleOpenCandidatesDetailModal(`Indicações de ${consultant.name}`, consultant.candidates, 'total')}
                          className="font-bold text-gray-900 transition hover:text-indigo-600 dark:text-white">{consultant.name}</button>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{consultant.count}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{consultant.percentage.toFixed(1)}%</td>
                      <td className="w-1/3 px-6 py-4">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${consultant.percentage}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

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