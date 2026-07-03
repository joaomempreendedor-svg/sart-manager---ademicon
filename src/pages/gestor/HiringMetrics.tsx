Aqui está o arquivo completo com as alterações:

```tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Loader2,
  MapPin,
  PieChart,
  RotateCcw,
  Search,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react';

import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Candidate, HiringPipelineColumn, HiringPipelineStageKey, TeamMember } from '@/types';
import { buildCandidateTimeline, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type MetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';
type MetricsSection = 'funnel' | 'withdrawals' | 'origins' | 'indications' | 'timeline';

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
  tone: 'blue' | 'green' | 'red' | 'rose' | 'purple' | 'orange';
};

type StageWithdrawalNote = {
  label: string;
  count: number;
  helperText: string;
  onOpen: () => void;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

const WITHDRAWAL_ALLOWED_STAGE_KEYS: HiringPipelineStageKey[] = [
  'aprovado-gestor',
  'aprovacao-d1',
  'documentacao-enviada',
  'previa-cadastrada',
  'previa-retificada',
  'onboarding-liberado',
  'onboarding-finalizado',
  'onboarding-nao-finalizado',
  'integracao-agendada',
  'integracao-compareceu',
  'integracao-nao-compareceu',
  'integracao-finalizada',
  'assinatura-contrato',
  'contrato-assinado',
  'contrato-nao-assinado',
  'autorizado',
];

const STAGES_WITH_INLINE_WITHDRAWAL_NOTE: HiringPipelineStageKey[] = [
  'respondeu',
  'compareceu-entrevista',
  'aprovado-gestor',
  'previa-cadastrada',
  'integracao-finalizada',
  'candidato-em-previa',
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
  { type: 'stage', stageKey: 'candidato-em-previa', description: 'Candidato está na etapa final de prévia.' },
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
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STAGE_CARD_STYLES: Record<HiringPipelineColumn['color'], { border: string; bg: string; text: string; iconBg: string; badge: string; progress: string }> = {
  gray: { border: 'border-gray-200 dark:border-slate-600', bg: 'bg-white dark:bg-slate-800', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-950/30', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300', progress: 'bg-blue-500' },
  blue: { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-white dark:bg-slate-800', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-950/30', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300', progress: 'bg-blue-500' },
  purple: { border: 'border-purple-200 dark:border-purple-800', bg: 'bg-white dark:bg-slate-800', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-950/30', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300', progress: 'bg-purple-500' },
  yellow: { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-white dark:bg-slate-800', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-950/30', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300', progress: 'bg-amber-500' },
  green: { border: 'border-green-200 dark:border-green-800', bg: 'bg-white dark:bg-slate-800', text: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50 dark:bg-green-950/30', badge: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300', progress: 'bg-green-500' },
  red: { border: 'border-red-200 dark:border-red-800', bg: 'bg-white dark:bg-slate-800', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-50 dark:bg-red-950/30', badge: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300', progress: 'bg-red-500' },
  orange: { border: 'border-cyan-200 dark:border-cyan-800', bg: 'bg-white dark:bg-slate-800', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-50 dark:bg-cyan-950/30', badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300', progress: 'bg-cyan-500' },
};

const SECTION_BUTTON_STYLES: Record<MetricsSection, string> = {
  funnel: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-300',
  withdrawals: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300',
  origins: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300',
  indications: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300',
  timeline: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const getStageIcon = (color: HiringPipelineColumn['color']) => {
  switch (color) {
    case 'green':
      return CheckCircle2;
    case 'purple':
      return UserCheck;
    case 'yellow':
      return TrendingUp;
    case 'red':
      return XCircle;
    case 'orange':
      return Briefcase;
    default:
      return Users;
  }
};

const BreakdownRow: React.FC<{ row: BranchBreakdownRow }> = ({ row }) => {
  const toneClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
    rose: 'text-rose-700 dark:text-rose-300',
    purple: 'text-purple-700 dark:text-purple-300',
    orange: 'text-amber-700 dark:text-amber-300',
  };

  return (
    <button
      onClick={row.onOpen}
      className="flex w-full items-center justify-between py-1 text-left transition hover:opacity-80"
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] text-slate-600 dark:text-slate-300">{row.label}</div>
        {row.helperText && <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{row.helperText}</div>}
      </div>
      <span className={`ml-2 flex-shrink-0 text-[13px] font-black ${toneClasses[row.tone]}`}>{row.count}</span>
    </button>
  );
};

interface SummaryMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  icon: React.ElementType;
}

const SummaryMetricCard: React.FC<SummaryMetricCardProps> = ({ title, value, subtitle, color, icon: Icon }) => {
  const styles = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${styles[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className={`mt-2 text-sm font-semibold ${styles[color].split(' ')[0]} ${styles[color].split(' ')[1]}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

interface FunnelStageCardProps {
  index: number;
  title: string;
  color: HiringPipelineColumn['color'];
  count: number;
  parentCount: number;
  totalCount: number;
  onOpen: () => void;
  breakdownRows?: BranchBreakdownRow[];
  withdrawalNote?: StageWithdrawalNote;
}

const FunnelStageCard: React.FC<FunnelStageCardProps> = ({
  index,
  title,
  color,
  count,
  parentCount,
  totalCount,
  onOpen,
  breakdownRows,
  withdrawalNote,
}) => {
  const style = STAGE_CARD_STYLES[color] || STAGE_CARD_STYLES.gray;
  const Icon = getStageIcon(color);
  const percentOfTotal = totalCount > 0 ? (count / totalCount) * 100 : 0;
  const conversionRate = parentCount > 0 ? (count / parentCount) * 100 : 100;

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm transition hover:shadow-md`}>
      <button onClick={onOpen} className="w-full text-left">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`rounded-xl px-3 py-1 text-sm font-black ${style.badge}`}>
              {String(index).padStart(2, '0')}
            </span>
            <div>
              <h3 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{title}</h3>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-slate-300" />
        </div>

        <div className="mb-5 flex flex-col items-center text-center">
          <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${style.iconBg}`}>
            <Icon className={`h-9 w-9 ${style.text}`} />
          </div>
          <div className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">{count}</div>
          <div className="mt-1 text-xl font-bold text-slate-500 dark:text-slate-400">
            {percentOfTotal.toFixed(2)}%
          </div>
        </div>
      </button>

      <div className="border-t border-gray-100 pt-4 dark:border-slate-700">
        {breakdownRows && breakdownRows.length > 0 ? (
          <div className="space-y-1">
            {breakdownRows.map((row) => (
              <BreakdownRow key={row.label} row={row} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <BreakdownRow
              row={{
                label: 'Total nesta etapa',
                count,
                onOpen,
                tone: color === 'red' ? 'red' : color === 'green' ? 'green' : color === 'purple' ? 'purple' : color === 'yellow' ? 'orange' : 'blue',
              }}
            />
            {withdrawalNote && withdrawalNote.count > 0 && (
              <BreakdownRow
                row={{
                  label: 'Desistências',
                  helperText: withdrawalNote.helperText,
                  count: withdrawalNote.count,
                  onOpen: withdrawalNote.onOpen,
                  tone: 'red',
                }}
              />
            )}
            <BreakdownRow
              row={{
                label: 'Seguem para próxima',
                count: count - (withdrawalNote?.count || 0),
                onOpen,
                tone: color === 'red' ? 'red' : color === 'green' ? 'green' : color === 'purple' ? 'purple' : color === 'yellow' ? 'orange' : 'blue',
              }}
            />
          </div>
        )}

        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Taxa de Conversão</span>
            <span className={`${style.text}`}>{conversionRate.toFixed(2)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-3 rounded-full ${style.progress}`}
              style={{ width: `${Math.min(100, conversionRate)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const RankingTable = ({
  title,
  subtitle,
  icon,
  rows,
  emptyMessage,
  colorClass,
  onOpen,
  countLabel,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: Array<{ name: string; count: number; percentage: number; candidates: Candidate[] }>;
  emptyMessage: string;
  colorClass: string;
  onOpen: (title: string, candidates: Candidate[]) => void;
  countLabel: string;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
          {icon}
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-700/30 dark:text-gray-400">
          <tr>
            <th className="px-5 py-3">Nome</th>
            <th className="px-5 py-3">Quantidade</th>
            <th className="px-5 py-3">Participação</th>
            <th className="px-5 py-3">Barra</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                <td className="px-5 py-4">
                  <button
                    onClick={() => onOpen(`${title}: ${row.name}`, row.candidates)}
                    className="font-bold text-gray-900 transition hover:text-brand-600 dark:text-white"
                  >
                    {row.name}
                  </button>
                </td>
                <td className="px-5 py-4 font-black text-gray-900 dark:text-white">
                  {row.count} {countLabel}
                </td>
                <td className={`px-5 py-4 font-bold ${colorClass}`}>{row.percentage.toFixed(1)}%</td>
                <td className="w-1/3 px-5 py-4">
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                    <div className={`h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, row.percentage)}%` }} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const HiringMetrics = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, isDataLoading, hiringOrigins, hiringPipelineColumns } = useApp();

  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(currentMonthRange.start);
  const [filterEndDate, setFilterEndDate] = useState(currentMonthRange.end);
  const [activeSection, setActiveSection] = useState<MetricsSection>('funnel');
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
    return searchFilteredCandidates.filter((candidate) => isDateInRange(candidate.createdAt, filterStartDate, filterEndDate));
  }, [searchFilteredCandidates, filterStartDate, filterEndDate]);

  const analytics = useMemo(() => {
    const candidatesCreatedInPeriod = cohortCandidates;
    const columnsByKey = new Map(normalizedColumns.map((column) => [column.stageKey, column]));

    const isWithdrawnCandidate = (candidate: Candidate) => {
      return !!candidate.reprovadoDate && !!candidate.withdrawalStageKey && WITHDRAWAL_ALLOWED_STAGE_KEYS.includes(candidate.withdrawalStageKey);
    };

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

    const buildWithdrawnAtStage = (stageKey: HiringPipelineStageKey) => {
      return candidatesCreatedInPeriod.filter((candidate) => {
        if (!isWithdrawnCandidate(candidate)) return false;
        return candidate.withdrawalStageKey === stageKey;
      });
    };

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

    const processFunnelBlocks = FUNNEL_LAYOUT.map((item) => {
      if (item.type === 'stage') {
        const metric = buildCohortStageMetric(item.stageKey);
        const withdrawnAtStage = buildWithdrawnAtStage(item.stageKey);
        const showWithdrawalNote = STAGES_WITH_INLINE_WITHDRAWAL_NOTE.includes(item.stageKey);

        return {
          type: 'stage' as const,
          stageKey: item.stageKey,
          title: item.title || metric.title,
          color: metric.color,
          count: metric.count,
          candidates: metric.candidates,
          withdrawalNote: showWithdrawalNote
            ? {
                label: `Porém ${withdrawnAtStage.length} desistiram`,
                count: withdrawnAtStage.length,
                candidates: withdrawnAtStage,
              }
            : null,
        };
      }

      const parentMetric = buildCohortStageMetric(item.parentStageKey);
      const parentColumn = columnsByKey.get(item.parentStageKey);

      const currentCandidates: Candidate[] = [];
      const positiveCandidates: Candidate[] = [];
      const negativeCandidates: Candidate[] = [];

      parentMetric.candidates.forEach((candidate) => {
        const currentStageKey = candidate.withdrawalStageKey || null;

        if (!currentStageKey && candidateHasReachedStage(candidate, item.positiveStageKey)) {
          positiveCandidates.push(candidate);
          return;
        }

        if (!currentStageKey && candidateHasReachedStage(candidate, item.negativeStageKey)) {
          negativeCandidates.push(candidate);
          return;
        }

        if (!currentStageKey) {
          currentCandidates.push(candidate);
          return;
        }

        if (currentStageKey === item.parentStageKey) {
          currentCandidates.push(candidate);
          return;
        }

        if (currentStageKey === item.positiveStageKey) {
          positiveCandidates.push(candidate);
          return;
        }

        if (currentStageKey === item.negativeStageKey) {
          negativeCandidates.push(candidate);
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

      const uniqueById = (list: Candidate[]) => {
        const seen = new Set<string>();
        return list.filter((candidate) => {
          const key = candidate.db_id || candidate.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const uniquePositiveCandidates = uniqueById(positiveCandidates);
      const positiveWithdrawals = uniquePositiveCandidates.filter(
        (candidate) => isWithdrawnCandidate(candidate) && candidate.withdrawalStageKey === item.positiveStageKey,
      );
      const showPositiveWithdrawalNote = STAGES_WITH_INLINE_WITHDRAWAL_NOTE.includes(item.positiveStageKey);

      return {
        type: 'branch' as const,
        parentStageKey: item.parentStageKey,
        title: item.title,
        color: parentColumn?.color || 'gray',
        count: parentMetric.count,
        candidates: parentMetric.candidates,
        current: {
          label: 'Novos nesta etapa',
          count: uniqueById(currentCandidates).length,
          candidates: uniqueById(currentCandidates),
        },
        positive: {
          label: item.positiveStageKey === 'compareceu-entrevista'
            ? 'Compareceram'
            : item.positiveStageKey === 'aprovado-gestor'
            ? 'Aprovados'
            : item.positiveStageKey === 'documentacao-enviada'
            ? 'Enviadas'
            : item.positiveStageKey === 'onboarding-finalizado'
            ? 'Finalizados'
            : item.positiveStageKey === 'integracao-compareceu'
            ? 'Compareceram'
            : item.positiveStageKey === 'contrato-assinado'
            ? 'Contratados'
            : getHiringStageLabel(item.positiveStageKey),
          count: uniquePositiveCandidates.length,
          candidates: uniquePositiveCandidates,
          withdrawalNote: showPositiveWithdrawalNote
            ? {
                label: `Porém ${positiveWithdrawals.length} desistiram`,
                count: positiveWithdrawals.length,
                candidates: positiveWithdrawals,
              }
            : null,
        },
        negative: {
          label: item.negativeStageKey === 'faltou-entrevista'
            ? 'Desistências'
            : item.negativeStageKey === 'reprovado-gestor'
            ? 'Reprovados'
            : item.negativeStageKey === 'documentacao-nao-enviada'
            ? 'Recusadas'
            : item.negativeStageKey === 'onboarding-nao-finalizado'
            ? 'Não concluíram'
            : item.negativeStageKey === 'integracao-nao-compareceu'
            ? 'Faltaram'
            : item.negativeStageKey === 'contrato-nao-assinado'
            ? 'Desistências'
            : getHiringStageLabel(item.negativeStageKey),
          count: uniqueById(negativeCandidates).length,
          candidates: uniqueById(negativeCandidates),
        },
      };
    });

    const withdrawalCandidates = searchFilteredCandidates.filter((candidate) => isWithdrawnCandidate(candidate));

    const withdrawalStageMap = new Map<string, { name: string; count: number; candidates: Candidate[] }>();
    withdrawalCandidates.forEach((candidate) => {
      const stageKey = candidate.withdrawalStageKey as HiringPipelineStageKey;
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
      .map((item) => ({
        ...item,
        percentage: withdrawalCandidates.length > 0 ? (item.count / withdrawalCandidates.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    const originMap = new Map<string, { name: string; count: number; candidates: Candidate[] }>();
    hiringOrigins.forEach((origin) => {
      originMap.set(origin, { name: origin, count: 0, candidates: [] });
    });
    originMap.set('Não Informado', { name: 'Não Informado', count: 0, candidates: [] });

    candidatesCreatedInPeriod.forEach((candidate) => {
      const originName = candidate.origin || 'Não Informado';
      const current = originMap.get(originName) || { name: originName, count: 0, candidates: [] };
      current.count += 1;
      current.candidates.push(candidate);
      originMap.set(originName, current);
    });

    const candidatesByOrigin = Array.from(originMap.values())
      .map((item) => ({
        ...item,
        percentage: candidatesCreatedInPeriod.length > 0 ? (item.count / candidatesCreatedInPeriod.length) * 100 : 0,
      }))
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
        name: member.isActive ? member.name : `${member.name} (Inativo)`,
        count,
        percentage: totalIndications > 0 ? (count / totalIndications) * 100 : 0,
        candidates: attributedCandidates,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));

    const totalCandidates = candidatesCreatedInPeriod.length;
    const contractedCount = buildCohortStageMetric('autorizado').count;
    const contactedCount = buildCohortStageMetric('contatados').count;
    const withdrawnCount = withdrawalCandidates.length;
    const conversionRate = totalCandidates > 0 ? (contractedCount / totalCandidates) * 100 : 0;

    const timelineDates = candidatesCreatedInPeriod
      .flatMap((candidate) => buildCandidateTimeline(candidate).map((event) => event.date))
      .filter(Boolean)
      .map((date) => new Date(date as string).getTime())
      .filter((time) => !Number.isNaN(time));

    const averageProcessDays = timelineDates.length > 0
      ? Math.max(
          0,
          Math.round(
            candidatesCreatedInPeriod.reduce((sum, candidate) => {
              const start = new Date(candidate.createdAt).getTime();
              const end = candidate.authorizedDate
                ? new Date(candidate.authorizedDate).getTime()
                : new Date(candidate.lastUpdatedAt || candidate.createdAt).getTime();
              return sum + Math.max(0, end - start);
            }, 0) /
              Math.max(1, candidatesCreatedInPeriod.length) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      candidatesCreatedInPeriod,
      processFunnelBlocks,
      withdrawalStageRanking,
      candidatesByOrigin,
      topIndications,
      summary: {
        totalCandidates,
        contactedCount,
        contractedCount,
        withdrawnCount,
        conversionRate,
        averageProcessDays,
      },
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
    <div className="min-h-screen bg-[#f7f8fc] p-4 dark:bg-slate-900 sm:mx-auto sm:max-w-[1700px] sm:p-6">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Métricas de Contratação
              </h1>
              <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
                Visão geral do funil de recrutamento
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {filterStartDate || 'Início'} - {filterEndDate || 'Fim'}
            </div>
            <button
              onClick={() => navigate(`${baseRoute}/hiring-pipeline`)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Pipeline
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nome, telefone, email ou observação..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Cadastrado de</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filterStartDate}
                onChange={(event) => setFilterStartDate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">Cadastrado até</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filterEndDate}
                onChange={(event) => setFilterEndDate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Exibindo dados de <span className="font-bold text-gray-700 dark:text-gray-200">{periodLabel}</span>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStartDate(currentMonthRange.start);
              setFilterEndDate(currentMonthRange.end);
              setTimelineSearchTerm('');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Voltar para mês atual
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveSection('funnel')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${SECTION_BUTTON_STYLES.funnel}`}
          >
            Funil
          </button>
          <button
            onClick={() => setActiveSection('withdrawals')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${SECTION_BUTTON_STYLES.withdrawals}`}
          >
            Desistências
          </button>
          <button
            onClick={() => setActiveSection('origins')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${SECTION_BUTTON_STYLES.origins}`}
          >
            Origens
          </button>
          <button
            onClick={() => setActiveSection('indications')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${SECTION_BUTTON_STYLES.indications}`}
          >
            Consultores
          </button>
          <button
            onClick={() => setActiveSection('timeline')}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${SECTION_BUTTON_STYLES.timeline}`}
          >
            Linha do Tempo
          </button>
        </div>
      </div>

      {activeSection === 'funnel' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryMetricCard
              title="Total de Candidatos"
              value={String(analytics.summary.totalCandidates)}
              subtitle={`${analytics.summary.totalCandidates > 0 ? '100% do funil' : 'Sem dados no período'}`}
              color="blue"
              icon={Users}
            />
            <SummaryMetricCard
              title="Contatados"
              value={String(analytics.summary.contactedCount)}
              subtitle={`${analytics.summary.totalCandidates > 0 ? `${((analytics.summary.contactedCount / analytics.summary.totalCandidates) * 100).toFixed(2)}% do total` : 'Sem dados'}`}
              color="green"
              icon={Users}
            />
            <SummaryMetricCard
              title="Taxa de Conversão"
              value={`${analytics.summary.conversionRate.toFixed(2)}%`}
              subtitle="Do início ao fim"
              color="purple"
              icon={TrendingUp}
            />
            <SummaryMetricCard
              title="Tempo Médio do Processo"
              value={`${analytics.summary.averageProcessDays} dias`}
              subtitle="Do início à contratação"
              color="amber"
              icon={Clock3}
            />
            <SummaryMetricCard
              title="Desistências"
              value={String(analytics.summary.withdrawnCount)}
              subtitle={`${analytics.summary.totalCandidates > 0 ? `${((analytics.summary.withdrawnCount / analytics.summary.totalCandidates) * 100).toFixed(2)}% do total` : 'Sem dados'}`}
              color="red"
              icon={UserMinus}
            />
          </div>

          <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {totalCohort === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
                Nenhum candidato encontrado para o período selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
                {analytics.processFunnelBlocks.map((block, index) => {
                  if (block.type === 'stage') {
                    return (
                      <FunnelStageCard
                        key={`${block.type}-${index}`}
                        index={index + 1}
                        title={block.title}
                        color={block.color}
                        count={block.count}
                        parentCount={index === 0 ? totalCohort : totalCohort}
                        totalCount={totalCohort}
                        onOpen={() => handleOpenCandidatesDetailModal(block.title, block.candidates, 'total')}
                        withdrawalNote={
                          block.withdrawalNote
                            ? {
                                label: block.withdrawalNote.label,
                                count: block.withdrawalNote.count,
                                helperText: 'Foram aprovados nesta etapa, mas não seguiram o processo.',
                                onOpen: () =>
                                  handleOpenCandidatesDetailModal(
                                    `Desistências em "${block.title}"`,
                                    block.withdrawalNote?.candidates || [],
                                    'withdrawn',
                                  ),
                              }
                            : undefined
                        }
                      />
                    );
                  }

                  return (
                    <FunnelStageCard
                      key={`${block.type}-${index}`}
                      index={index + 1}
                      title={block.title}
                      color={block.color}
                      count={block.count}
                      parentCount={totalCohort}
                      totalCount={totalCohort}
                      onOpen={() => handleOpenCandidatesDetailModal(block.title, block.candidates, 'total')}
                      breakdownRows={[
                        {
                          label: block.current.label,
                          helperText: 'Ainda nesta etapa',
                          count: block.current.count,
                          onOpen: () => handleOpenCandidatesDetailModal(`${block.title} · Ainda nesta etapa`, block.current.candidates, 'total'),
                          tone: 'blue',
                        },
                        {
                          label: block.positive.label,
                          helperText: block.positive.withdrawalNote?.count
                            ? `${block.positive.count} aprovados, ${block.positive.withdrawalNote.count} desistiram`
                            : 'Seguem para próxima',
                          count: block.positive.count,
                          onOpen: () =>
                            handleOpenCandidatesDetailModal(
                              `${block.positive.label} · incluindo quem depois desistiu`,
                              block.positive.candidates,
                              'total',
                            ),
                          tone: block.color === 'purple' ? 'purple' : block.color === 'yellow' ? 'orange' : 'green',
                        },
                        ...(block.positive.withdrawalNote?.count
                          ? [
                              {
                                label: 'Desistiram',
                                helperText: `Dos ${block.positive.count} ${block.positive.label.toLowerCase()}`,
                                count: block.positive.withdrawalNote.count,
                                onOpen: () =>
                                  handleOpenCandidatesDetailModal(
                                    `Desistências em "${block.title}"`,
                                    block.positive.withdrawalNote?.candidates || [],
                                    'withdrawn',
                                  ),
                                tone: 'red' as const,
                              } as BranchBreakdownRow,
                            ]
                          : []),
                        {
                          label: block.negative.label,
                          helperText: 'Não avançaram',
                          count: block.negative.count,
                          onOpen: () => handleOpenCandidatesDetailModal(block.negative.label, block.negative.candidates, 'total'),
                          tone: 'red',
                        },
                      ]}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryMetricCard
              title="Total no Funil"
              value={String(analytics.summary.totalCandidates)}
              subtitle="Base analisada"
              color="blue"
              icon={Users}
            />
            <SummaryMetricCard
              title="Total Contratados"
              value={String(analytics.summary.contractedCount)}
              subtitle="Fechamento final"
              color="green"
              icon={CheckCircle2}
            />
            <SummaryMetricCard
              title="Conversão Geral"
              value={`${analytics.summary.conversionRate.toFixed(2)}%`}
              subtitle="Do início ao fim"
              color="purple"
              icon={TrendingUp}
            />
            <SummaryMetricCard
              title="Tempo Médio Total"
              value={`${analytics.summary.averageProcessDays} dias`}
              subtitle="Tempo médio"
              color="amber"
              icon={Clock3}
            />
            <SummaryMetricCard
              title="Total de Desistências"
              value={`${analytics.summary.withdrawnCount}`}
              subtitle={`${analytics.summary.totalCandidates > 0 ? `${((analytics.summary.withdrawnCount / analytics.summary.totalCandidates) * 100).toFixed(2)}%` : '0%'}`}
              color="red"
              icon={XCircle}
            />
          </div>
        </>
      )}

      {activeSection === 'withdrawals' && (
        <div className="mb-8">
          <RankingTable
            title="Ranking de desistência"
            subtitle="Mostra apenas quem foi aprovado e abandonou o processo depois."
            icon={<UserMinus className="h-5 w-5 text-rose-500" />}
            rows={analytics.withdrawalStageRanking}
            emptyMessage="Nenhuma desistência registrada no período."
            colorClass="text-rose-600 dark:text-rose-400"
            onOpen={(title, metricCandidates) => handleOpenCandidatesDetailModal(title, metricCandidates, 'withdrawn')}
            countLabel="desist."
          />
        </div>
      )}

      {activeSection === 'origins' && (
        <div className="mb-8">
          <RankingTable
            title="Origens"
            subtitle="Distribuição dos cadastros no período selecionado."
            icon={<MapPin className="h-5 w-5 text-brand-500" />}
            rows={analytics.candidatesByOrigin}
            emptyMessage="Nenhum cadastro encontrado para o período."
            colorClass="text-brand-600 dark:text-brand-400"
            onOpen={(title, metricCandidates) => handleOpenCandidatesDetailModal(title, metricCandidates, 'total')}
            countLabel="cand."
          />
        </div>
      )}

      {activeSection === 'indications' && (
        <div className="mb-8">
          <RankingTable
            title="Consultores que mais indicam"
            subtitle="Ranking dos consultores com mais candidatos atribuídos no período."
            icon={<Users className="h-5 w-5 text-indigo-500" />}
            rows={analytics.topIndications}
            emptyMessage="Nenhuma indicação atribuída no período."
            colorClass="text-indigo-600 dark:text-indigo-400"
            onOpen={(title, metricCandidates) => handleOpenCandidatesDetailModal(title, metricCandidates, 'total')}
            countLabel="ind."
          />
        </div>
      )}

      {activeSection === 'timeline' && (
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                <History className="h-5 w-5 text-indigo-500" />
                Linha do Tempo
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Veja rapidamente o caminho dos candidatos sem sair da tela.
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
              className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {timelineCandidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
              Nenhum candidato encontrado.
            </div>
          ) : (
            <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {timelineCandidates.slice(0, 12).map((candidate) => {
                const isExpanded = expandedTimelineId === candidate.id;
                const events = isExpanded ? buildCandidateTimeline(candidate) : [];

                return (
                  <div key={candidate.id} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => setExpandedTimelineId((prev) => (prev === candidate.id ? null : candidate.id))}
                      className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:bg-slate-700/40 dark:hover:bg-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900 dark:text-white">{candidate.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {candidate.withdrawalStageKey ? `${getHiringStageLabel(candidate.withdrawalStageKey)} · desistiu` : 'Em andamento'}
                        </p>
                      </div>
                      <History className={`h-4 w-4 flex-shrink-0 text-gray-400 transition ${isExpanded ? 'text-brand-500' : ''}`} />
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
```