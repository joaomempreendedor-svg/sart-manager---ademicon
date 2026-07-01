import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  History,
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
import { buildCandidateTimeline, getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type MetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';
type SectionKey = 'funnel' | 'withdrawals' | 'origins' | 'indications' | 'timeline';

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

type BranchBreakdownRow = {
  label: string;
  helperText?: string;
  count: number;
  onOpen: () => void;
  tone: 'blue' | 'green' | 'red' | 'rose';
};

const SECTION_OPTIONS: Array<{ key: SectionKey; title: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'funnel', title: 'Funil histórico', icon: BarChart3 },
  { key: 'timeline', title: 'Linha do Tempo', icon: History },
  { key: 'withdrawals', title: 'Ranking de desistência', icon: UserMinus },
  { key: 'origins', title: 'Origens', icon: MapPin },
  { key: 'indications', title: 'Consultores que mais indicam', icon: UserPlus },
];

const FUNNEL_LAYOUT: FunnelConfig[] = [
  { type: 'stage', stageKey: 'candidatos', description: 'Entrada de candidatos no processo.' },
  { type: 'stage', stageKey: 'contatados', description: 'Receberam o primeiro contato.' },
  { type: 'stage', stageKey: 'respondeu', description: 'Responderam ao contato.' },
  {
    type: 'branch',
    parentStageKey: 'entrevista-agendada',
    title: 'Entrevista Agendada',
    description: 'Depois do agendamento, o processo se divide entre quem compareceu e quem faltou.',
    positiveStageKey: 'compareceu-entrevista',
    negativeStageKey: 'faltou-entrevista',
  },
  {
    type: 'branch',
    parentStageKey: 'compareceu-entrevista',
    title: 'Compareceu',
    description: 'Dos que compareceram, parte é aprovada e parte é reprovada.',
    positiveStageKey: 'aprovado-gestor',
    negativeStageKey: 'reprovado-gestor',
  },
  {
    type: 'branch',
    parentStageKey: 'aprovacao-d1',
    title: 'Aprovação D+1',
    description: 'Após D+1, o processo se divide entre quem enviou e quem não enviou a documentação.',
    positiveStageKey: 'documentacao-enviada',
    negativeStageKey: 'documentacao-nao-enviada',
  },
  { type: 'stage', stageKey: 'previa-cadastrada', description: 'Prévia cadastrada no processo.' },
  { type: 'stage', stageKey: 'previa-retificada', description: 'Prévia precisou ser retificada e recadastrada.' },
  {
    type: 'branch',
    parentStageKey: 'onboarding-liberado',
    title: 'Onboarding Liberado',
    description: 'Após liberação do onboarding, parte conclui e parte não conclui.',
    positiveStageKey: 'onboarding-finalizado',
    negativeStageKey: 'onboarding-nao-finalizado',
  },
  {
    type: 'branch',
    parentStageKey: 'integracao-agendada',
    title: 'Integração Agendada',
    description: 'Depois do agendamento da integração, o processo se divide entre quem compareceu e quem não compareceu.',
    positiveStageKey: 'integracao-compareceu',
    negativeStageKey: 'integracao-nao-compareceu',
  },
  { type: 'stage', stageKey: 'integracao-finalizada', description: 'Integração concluída.' },
  {
    type: 'branch',
    parentStageKey: 'assinatura-contrato',
    title: 'Assinatura do Contrato',
    description: 'Do contrato enviado, parte assina e parte não assina.',
    positiveStageKey: 'contrato-assinado',
    negativeStageKey: 'contrato-nao-assinado',
  },
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

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STAGE_CARD_STYLES: Record<HiringPipelineColumn['color'], { border: string; bg: string; text: string; iconBg: string }> = {
  gray: { border: 'border-gray-200 dark:border-slate-600', bg: 'bg-white dark:bg-slate-800/60', text: 'text-gray-700 dark:text-gray-200', iconBg: 'bg-gray-100 dark:bg-slate-700' },
  blue: { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/40 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', iconBg: 'bg-blue-100/80 dark:bg-blue-900/40' },
  purple: { border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50/40 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', iconBg: 'bg-purple-100/80 dark:bg-purple-900/40' },
  yellow: { border: 'border-yellow-200 dark:border-yellow-800', bg: 'bg-yellow-50/50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', iconBg: 'bg-yellow-100/80 dark:bg-yellow-900/40' },
  green: { border: 'border-green-200 dark:border-green-800', bg: 'bg-green-50/40 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', iconBg: 'bg-green-100/80 dark:bg-green-900/40' },
  red: { border: 'border-red-200 dark:border-red-800', bg: 'bg-red-50/40 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', iconBg: 'bg-red-100/80 dark:bg-red-900/40' },
  orange: { border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50/40 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', iconBg: 'bg-orange-100/80 dark:bg-orange-900/40' },
};

interface FunnelStageCardProps {
  title: string;
  color: HiringPipelineColumn['color'];
  count: number;
  parentCount: number;
  totalCount: number;
  onOpen: () => void;
  breakdownRows?: BranchBreakdownRow[];
}

const BreakdownRow: React.FC<{ row: BranchBreakdownRow }> = ({ row }) => {
  const toneClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
    rose: 'text-rose-700 dark:text-rose-300',
  };

  const toneBorders = {
    blue: 'border-white/80 bg-white dark:border-slate-600 dark:bg-black/20',
    green: 'border-white/80 bg-white dark:border-slate-600 dark:bg-black/20',
    red: 'border-white/80 bg-white dark:border-slate-600 dark:bg-black/20',
    rose: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/30',
  };

  return (
    <button
      onClick={row.onOpen}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left shadow-sm transition hover:opacity-90 ${toneBorders[row.tone]}`}
    >
      <div className="min-w-0">
        <div className={`truncate text-[11px] font-bold ${toneClasses[row.tone]}`}>{row.label}</div>
        {row.helperText && (
          <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{row.helperText}</div>
        )}
      </div>
      <span className={`ml-3 flex-shrink-0 text-sm font-black ${toneClasses[row.tone]}`}>{row.count}</span>
    </button>
  );
};

const FunnelStageCard: React.FC<FunnelStageCardProps> = ({
  title, color, count, parentCount, totalCount, onOpen, breakdownRows,
}) => {
  const style = STAGE_CARD_STYLES[color] || STAGE_CARD_STYLES.gray;
  const percentOfTotal = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

  return (
    <div className={`flex h-full w-full flex-col justify-between rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm`}>
      <div>
        <button onClick={onOpen} className="w-full text-left">
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${style.iconBg}`}>
              <BarChart3 className={`h-3.5 w-3.5 ${style.text}`} />
            </span>
            <h3 className={`text-sm font-bold leading-tight ${style.text}`}>{title}</h3>
          </div>
          <div className="mt-3 mb-2 rounded-xl border border-white/70 bg-white px-3 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-900/40">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Total nesta etapa
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black leading-none ${style.text}`}>{count}</span>
              {parentCount > 0 && <span className="pb-1 text-[10px] font-bold text-gray-400">dos {parentCount}</span>}
            </div>
          </div>
        </button>

        {breakdownRows && breakdownRows.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-dashed border-gray-200 bg-white/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-600 dark:bg-slate-900/30 dark:text-gray-400">
              Como esse total está dividido
            </div>
            {breakdownRows.map((row) => (
              <BreakdownRow key={row.label} row={row} />
            ))}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              As linhas abaixo somam exatamente o total mostrado no topo.
            </div>
          </div>
        )}
      </div>

      <div className={`mt-3 border-t pt-2 text-[10px] font-bold uppercase ${style.border} ${style.text} opacity-70`}>
        {percentOfTotal}% do funil
      </div>
    </div>
  );
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
  const [timelineSearchTerm, setTimelineSearchTerm] = useState('');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

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

  const cohortCandidates = useMemo(() => {
    return searchFilteredCandidates.filter((candidate) =>
      isDateInRange(candidate.createdAt, filterStartDate, filterEndDate),
    );
  }, [searchFilteredCandidates, filterStartDate, filterEndDate]);

  const analytics = useMemo(() => {
    const candidatesCreatedInPeriod = cohortCandidates;
    const columnsByKey = new Map(normalizedColumns.map((column) => [column.stageKey, column]));

    function candidateHasReachedStage(candidate: Candidate, stageKey: HiringPipelineStageKey): boolean {
      switch (stageKey) {
        case 'candidatos': return true;
        case 'contatados': return !!candidate.contactedDate;
        case 'respondeu': return !!candidate.respondedDate;
        case 'entrevista-agendada': return !!candidate.interviewScheduledDate;
        case 'compareceu-entrevista': return !!candidate.interviewAttendedDate || !!candidate.interviewConductedDate;
        case 'faltou-entrevista': return !!candidate.interviewNoShowDate || !!candidate.faltouDate;
        case 'aprovado-gestor': return !!candidate.managerApprovedDate;
        case 'reprovado-gestor': return !!candidate.managerRejectedDate;
        case 'aprovacao-d1': return !!candidate.d1ApprovalDate;
        case 'documentacao-enviada': return !!candidate.documentationSentDate;
        case 'documentacao-nao-enviada': return !!candidate.documentationNotSentDate;
        case 'previa-cadastrada': return !!candidate.previewRegisteredDate;
        case 'previa-retificada': return !!candidate.previewRectifiedDate;
        case 'onboarding-liberado': return !!candidate.onboardingReleasedDate || !!candidate.onboardingOnlineDate;
        case 'onboarding-finalizado': return !!candidate.onboardingFinishedDate;
        case 'onboarding-nao-finalizado': return !!candidate.onboardingNotFinishedDate;
        case 'integracao-agendada': return !!candidate.integrationScheduledDate || !!candidate.integrationPresencialDate;
        case 'integracao-compareceu': return !!candidate.integrationAttendedDate;
        case 'integracao-nao-compareceu': return !!candidate.integrationNoShowDate;
        case 'integracao-finalizada': return !!candidate.integrationFinishedDate;
        case 'assinatura-contrato': return !!candidate.contractSignatureDate;
        case 'contrato-assinado': return !!candidate.contractSignedDate;
        case 'contrato-nao-assinado': return !!candidate.contractNotSignedDate;
        case 'candidato-em-previa': return !!candidate.awaitingPreviewDate;
        case 'autorizado': return !!candidate.authorizedDate;
        default: return false;
      }
    }

    const buildCohortStageMetric = (stageKey: HiringPipelineStageKey): StageMetric => {
      const column = columnsByKey.get(stageKey);
      const stageCandidates = candidatesCreatedInPeriod.filter((candidate) => candidateHasReachedStage(candidate, stageKey));
      return {
        stageKey,
        title: column?.title || getHiringStageLabel(stageKey),
        color: column?.color || 'gray',
        count: stageCandidates.length,
        candidates: stageCandidates,
      };
    };

    const isWithdrawnCandidate = (candidate: Candidate) => {
      return !!candidate.withdrawalStageKey || !!candidate.reprovadoDate || !!candidate.withdrawalReason || !!candidate.withdrawalReasonOption;
    };

    const buildWithdrawnAtStage = (stageKey: HiringPipelineStageKey) => {
      return candidatesCreatedInPeriod.filter((candidate) => {
        if (!isWithdrawnCandidate(candidate)) return false;
        return candidate.withdrawalStageKey === stageKey;
      });
    };

    const processFunnelBlocks = FUNNEL_LAYOUT.map((item) => {
      if (item.type === 'stage') {
        const metric = buildCohortStageMetric(item.stageKey);
        return {
          type: 'stage' as const,
          stageKey: item.stageKey,
          title: item.title || metric.title,
          color: metric.color,
          count: metric.count,
          candidates: metric.candidates,
        };
      }

      const parentMetric = buildCohortStageMetric(item.parentStageKey);
      const parentColumn = columnsByKey.get(item.parentStageKey);
      const withdrawnAtParent = buildWithdrawnAtStage(item.parentStageKey);

      const withdrawnIds = new Set(withdrawnAtParent.map((candidate) => candidate.id));
      const currentCandidates: Candidate[] = [];
      const positiveCandidates: Candidate[] = [];
      const negativeCandidates: Candidate[] = [];

      parentMetric.candidates.forEach((candidate) => {
        if (withdrawnIds.has(candidate.id)) {
          return;
        }

        const currentStageKey = getCandidateStageKey(candidate);

        if (currentStageKey === item.parentStageKey) {
          currentCandidates.push(candidate);
          return;
        }

        if (candidateHasReachedStage(candidate, item.positiveStageKey)) {
          positiveCandidates.push(candidate);
          return;
        }

        if (candidateHasReachedStage(candidate, item.negativeStageKey)) {
          negativeCandidates.push(candidate);
          return;
        }

        currentCandidates.push(candidate);
      });

      return {
        type: 'branch' as const,
        parentStageKey: item.parentStageKey,
        title: item.title,
        color: parentColumn?.color || 'gray',
        count: parentMetric.count,
        candidates: parentMetric.candidates,
        current: {
          label: 'Ainda nesta etapa',
          count: currentCandidates.length,
          candidates: currentCandidates,
        },
        positive: {
          label: getHiringStageLabel(item.positiveStageKey),
          count: positiveCandidates.length,
          candidates: positiveCandidates,
        },
        withdrawn: {
          label: 'Desistiu aqui',
          count: withdrawnAtParent.length,
          candidates: withdrawnAtParent,
        },
        negative: {
          label: getHiringStageLabel(item.negativeStageKey),
          count: negativeCandidates.length,
          candidates: negativeCandidates,
        },
      };
    });

    const withdrawalCandidates = searchFilteredCandidates.filter((candidate) => isWithdrawnCandidate(candidate));

    const withdrawalStageMap = new Map<string, { name: string; count: number; candidates: Candidate[] }>();
    withdrawalCandidates.forEach((candidate) => {
      const stageKey = candidate.withdrawalStageKey || getCandidateStageKey(candidate);
      const stageName = getHiringStageLabel(stageKey);
      const current = withdrawalStageMap.get(stageName);
      if (current) {
        current.count += 1;
        current.candidates.push(candidate);
        return;
      }
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
      current.count += 1;
      current.candidates.push(candidate);
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
      if (current) {
        current.count += 1;
        current.candidates.push(candidate);
        return;
      }
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
      processFunnelBlocks,
      withdrawalStageRanking,
      candidatesByOrigin,
      topIndications,
    };
  }, [cohortCandidates, searchFilteredCandidates, hiringOrigins, normalizedColumns, teamMembers]);

  const periodLabel = useMemo(() => {
    if (filterStartDate && filterEndDate) return `${filterStartDate} até ${filterEndDate}`;
    if (filterStartDate) return `a partir de ${filterStartDate}`;
    if (filterEndDate) return `até ${filterEndDate}`;
    return 'histórico completo';
  }, [filterEndDate, filterStartDate]);

  const timelineCandidates = useMemo(() => {
    const base = filterStartDate || filterEndDate ? cohortCandidates : searchFilteredCandidates;
    if (!timelineSearchTerm.trim()) return base;
    const lower = timelineSearchTerm.trim().toLowerCase();
    return base.filter((candidate) => String(candidate.name || '').toLowerCase().includes(lower));
  }, [cohortCandidates, searchFilteredCandidates, timelineSearchTerm, filterStartDate, filterEndDate]);

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

  const totalCohort = analytics.candidatesCreatedInPeriod.length;

  return (
    <div className="min-h-screen max-w-7xl bg-gray-50 p-4 dark:bg-slate-900 sm:mx-auto sm:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <PieChart className="h-7 w-7 text-brand-500" />
            Métricas de Contratação
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Escolha a visão que quer analisar: funil histórico, linha do tempo, desistências, origens ou consultores que mais indicam.
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No funil, o período filtra pela data de <strong>cadastro</strong> do candidato. Nos cards com divisão, o número grande mostra o total da etapa e as linhas abaixo explicam exatamente como esse total foi distribuído.
            </p>
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
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Cadastrado de</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(event) => setFilterStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Cadastrado até</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {SECTION_OPTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;
          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.title}
            </button>
          );
        })}
      </div>

      {activeSection === 'funnel' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Funil de Contratação</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalCohort} candidatos cadastrados {periodLabel} — cada etapa mostra quantos já passaram por ela.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          {totalCohort === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
              Nenhum candidato encontrado para o período selecionado.
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50/80 p-4 dark:bg-slate-900/30">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {analytics.processFunnelBlocks.map((block, index) => (
                  block.type === 'stage' ? (
                    <FunnelStageCard
                      key={`${block.type}-${index}`}
                      title={block.title}
                      color={block.color}
                      count={block.count}
                      parentCount={index === 0 ? 0 : totalCohort}
                      totalCount={totalCohort}
                      onOpen={() => handleOpenCandidatesDetailModal(block.title, block.candidates, 'total')}
                    />
                  ) : (
                    <FunnelStageCard
                      key={`${block.type}-${index}`}
                      title={block.title}
                      color={block.color}
                      count={block.count}
                      parentCount={totalCohort}
                      totalCount={totalCohort}
                      onOpen={() => handleOpenCandidatesDetailModal(block.title, block.candidates, 'total')}
                      breakdownRows={[
                        {
                          label: 'Ainda nesta etapa',
                          helperText: `Continuam em ${block.title}`,
                          count: block.current.count,
                          onOpen: () => handleOpenCandidatesDetailModal(`${block.title} · Ainda nesta etapa`, block.current.candidates, 'total'),
                          tone: 'blue',
                        },
                        {
                          label: block.positive.label,
                          helperText: 'Avançaram para este caminho',
                          count: block.positive.count,
                          onOpen: () => handleOpenCandidatesDetailModal(block.positive.label, block.positive.candidates, 'total'),
                          tone: 'green',
                        },
                        {
                          label: 'Desistiu aqui',
                          helperText: `Saíram durante ${block.title}`,
                          count: block.withdrawn.count,
                          onOpen: () => handleOpenCandidatesDetailModal(`Desistiu em "${block.title}"`, block.withdrawn.candidates, 'withdrawn'),
                          tone: 'rose',
                        },
                        {
                          label: block.negative.label,
                          helperText: 'Seguiram para este caminho',
                          count: block.negative.count,
                          onOpen: () => handleOpenCandidatesDetailModal(block.negative.label, block.negative.candidates, 'total'),
                          tone: 'red',
                        },
                      ]}
                    />
                  )
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'timeline' && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                <History className="h-5 w-5 text-indigo-500" />
                Linha do Tempo dos Candidatos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Veja o caminho completo de cada candidato no pipeline, em ordem cronológica.
              </p>
            </div>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar candidato pelo nome..."
              value={timelineSearchTerm}
              onChange={(event) => setTimelineSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {timelineCandidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
              Nenhum candidato encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {timelineCandidates.map((candidate) => {
                const isExpanded = expandedTimelineId === candidate.id;
                const events = isExpanded ? buildCandidateTimeline(candidate) : [];
                return (
                  <div key={candidate.id} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => setExpandedTimelineId((prev) => (prev === candidate.id ? null : candidate.id))}
                      className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:bg-slate-700/40 dark:hover:bg-slate-700"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{candidate.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getHiringStageLabel(candidate.withdrawalStageKey || getCandidateStageKey(candidate))}
                        </p>
                      </div>
                      <History className={`h-4 w-4 text-gray-400 transition ${isExpanded ? 'text-brand-500' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="bg-white p-4 dark:bg-slate-800">
                        {events.length === 0 ? (
                          <p className="text-xs text-gray-400">Nenhum evento registrado ainda.</p>
                        ) : (
                          <ol className="relative ml-2 space-y-4 border-l-2 border-gray-200 pl-4 dark:border-slate-600">
                            {events.map((event) => (
                              <li key={event.key} className="relative">
                                <span
                                  className={`absolute -left-[21px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${
                                    event.isNegative
                                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                      : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'
                                  }`}
                                >
                                  {event.isNegative ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                                </span>
                                <p className={`text-sm font-semibold ${event.isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                  {event.label}
                                </p>
                                <p className="text-xs text-gray-400">{formatDateTime(event.date)}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
                        <button
                          onClick={() => handleOpenCandidatesDetailModal(`Desistências em ${stage.name}`, stage.candidates, 'withdrawn')}
                          className="font-bold text-rose-600 transition hover:text-rose-700 dark:text-rose-400"
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
                        <button
                          onClick={() => handleOpenCandidatesDetailModal(`Origem: ${origin.name}`, origin.candidates, 'total')}
                          className="font-bold text-gray-900 transition hover:text-brand-600 dark:text-white"
                        >
                          {origin.name}
                        </button>
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
                        <button
                          onClick={() => handleOpenCandidatesDetailModal(`Indicações de ${consultant.name}`, consultant.candidates, 'total')}
                          className="font-bold text-gray-900 transition hover:text-indigo-600 dark:text-white"
                        >
                          {consultant.name}
                        </button>
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