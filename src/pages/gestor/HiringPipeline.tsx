import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Edit2,
  Filter,
  Loader2,
  MapPin,
  Percent,
  PieChart,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { MetricCard } from '@/components/MetricCard';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { EditScreeningCandidateModal } from '@/components/gestor/EditScreeningCandidateModal';
import { UpdateInterviewDateModal } from '@/components/gestor/UpdateInterviewDateModal';
import { ImportCandidatesModal } from '@/components/gestor/ImportCandidatesModal';
import { WithdrawalReasonModal, WithdrawalReasonSelection } from '@/components/gestor/WithdrawalReasonModal';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { highlightText } from '@/lib/utils';
import { Candidate, HiringPipelineColumn, TeamMember } from '@/types';
import { buildCandidateStageUpdates, getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

type CandidateMetricType = 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse';

const HiringPipeline = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    candidates,
    setCandidates,
    teamMembers,
    isDataLoading,
    updateCandidate,
    deleteCandidate,
    hasPendingSecretariaTasks,
    addCandidate,
    hiringOrigins,
    hiringPipelineColumns,
  } = useApp();

  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditCandidateModalOpen, setIsEditCandidateModalOpen] = useState(false);
  const [selectedCandidateToEdit, setSelectedCandidateToEdit] = useState<Candidate | null>(null);
  const [isUpdateDateModalOpen, setIsUpdateDateModalOpen] = useState(false);
  const [selectedCandidateForDate, setSelectedCandidateForDate] = useState<Candidate | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedCandidateForWithdrawal, setSelectedCandidateForWithdrawal] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false);
  const [candidatesModalTitle, setCandidatesModalTitle] = useState('');
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]);
  const [candidatesMetricType, setCandidatesMetricType] = useState<CandidateMetricType>('total');

  const todayStr = new Date().toISOString().split('T')[0];
  const baseRoute = user?.role === 'SECRETARIA' ? '/secretaria' : '/gestor';

  const normalizedColumns = useMemo(() => normalizeHiringPipelineColumns(hiringPipelineColumns), [hiringPipelineColumns]);

  const sortByRecentUpdate = (a: Candidate, b: Candidate) => {
    const dateA = new Date(a.lastUpdatedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastUpdatedAt || b.createdAt).getTime();
    return dateB - dateA;
  };

  const getResponsibleName = (responsibleUserId?: string) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find((item) => item.id === responsibleUserId || item.authUserId === responsibleUserId);
    return member?.name || 'Desconhecido';
  };

  const getCreatorName = (creatorId?: string) => {
    if (!creatorId) return 'Desconhecido';
    const member = teamMembers.find((item) => item.authUserId === creatorId);
    if (member) return member.name;
    if (user && creatorId === user.id) return user.name;
    return 'Desconhecido';
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

  const activePipelineCandidates = useMemo(
    () => filteredCandidates.filter((candidate) => !candidate.reprovadoDate),
    [filteredCandidates],
  );

  const pipelineStages = useMemo(() => {
    return normalizedColumns.map((column) => ({
      ...column,
      list: activePipelineCandidates
        .filter((candidate) => getCandidateStageKey(candidate) === column.stageKey)
        .sort(sortByRecentUpdate),
    }));
  }, [activePipelineCandidates, normalizedColumns]);

  const analytics = useMemo(() => {
    const totalCandidates = filteredCandidates.length;
    const authorizedList = filteredCandidates.filter(
      (candidate) => candidate.status === 'Autorizado' || !!candidate.authorizedDate || getCandidateStageKey(candidate) === 'autorizado',
    );
    const withdrawalList = filteredCandidates.filter((candidate) => !!candidate.reprovadoDate);

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
        percentage: totalCandidates > 0 ? (count / totalCandidates) * 100 : 0,
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
      totalCandidates,
      activePipelineCount: activePipelineCandidates.length,
      authorizedList,
      withdrawalList,
      authorizationRate: totalCandidates > 0 ? (authorizedList.length / totalCandidates) * 100 : 0,
      candidatesByOrigin,
      withdrawalReasonsRanking,
      withdrawalStagesRanking,
      topIndications,
    };
  }, [activePipelineCandidates.length, filteredCandidates, hiringOrigins, teamMembers]);

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

  const moveCandidateToStage = async (candidate: Candidate, column: HiringPipelineColumn, reason?: string) => {
    await updateCandidate(candidate.id, buildCandidateStageUpdates(candidate, column.stageKey, reason));
  };

  const handleDragStart = (event: React.DragEvent, candidateId: string) => {
    setDraggingCandidateId(candidateId);
    event.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (event: React.DragEvent, columnId: string) => {
    event.preventDefault();
    setDragOverColumn(columnId);
  };

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

  const openWithdrawalFlow = (event: React.MouseEvent, candidate: Candidate) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedCandidateForWithdrawal(candidate);
    setIsWithdrawalModalOpen(true);
  };

  const handleDrop = async (event: React.DragEvent, targetColumnId: string) => {
    event.preventDefault();
    setDragOverColumn(null);

    const candidateId = event.dataTransfer.getData('candidateId');
    if (!candidateId) return;

    const candidate = candidates.find((item) => item.id === candidateId);
    const targetColumn = normalizedColumns.find((column) => column.id === targetColumnId);

    if (!candidate || !targetColumn) return;

    try {
      await moveCandidateToStage(candidate, targetColumn);
      toast.success(`Candidato movido para ${targetColumn.title}`);
    } catch {
      toast.error('Erro ao mover candidato.');
    } finally {
      setDraggingCandidateId(null);
    }
  };

  const handleMoveToColumn = async (event: React.MouseEvent, candidate: Candidate, column: HiringPipelineColumn) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await moveCandidateToStage(candidate, column);
      toast.success(`Candidato movido para ${column.title}`);
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleConfirmWithdrawal = async (selection: WithdrawalReasonSelection) => {
    if (!selectedCandidateForWithdrawal) return;

    const withdrawalStageKey = getCandidateStageKey(selectedCandidateForWithdrawal);
    const now = new Date().toISOString();

    try {
      await updateCandidate(selectedCandidateForWithdrawal.id, {
        status: 'Reprovado',
        pipelineStageKey: withdrawalStageKey,
        withdrawalStageKey,
        withdrawalReasonOption: selection.reasonOption,
        withdrawalReason: selection.reasonText,
        reprovadoDate: now,
        lastUpdatedAt: now,
      });
      toast.success(`Desistência registrada em ${getHiringStageLabel(withdrawalStageKey)}`);
    } catch {
      toast.error('Erro ao registrar desistência.');
    }
  };

  const handleOpenUpdateDate = (event: React.MouseEvent, candidate: Candidate) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedCandidateForDate(candidate);
    setIsUpdateDateModalOpen(true);
  };

  const debouncedUpdateCandidateNotes = useDebouncedCallback(async (candidateId: string, notes: string) => {
    try {
      await updateCandidate(candidateId, { notes });
      toast.success('Observações salvas!');
    } catch {
      toast.error('Erro ao salvar observações.');
    }
  }, 1000);

  const handleNotesChange = (candidateId: string, newNotes: string) => {
    setCandidates((prev) => prev.map((candidate) => (candidate.id === candidateId ? { ...candidate, notes: newNotes } : candidate)));
    debouncedUpdateCandidateNotes(candidateId, newNotes);
  };

  const handleDeleteCandidatePermanently = async (event: React.MouseEvent, candidateDbId: string, candidateName: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm(`Tem certeza que deseja excluir permanentemente "${candidateName}"?`)) return;

    try {
      await deleteCandidate(candidateDbId);
      toast.success(`Candidato "${candidateName}" excluído.`);
    } catch (error: any) {
      toast.error(`Erro ao excluir candidato: ${error.message}`);
    }
  };

  const responsibleMembersForModal = useMemo(() => {
    return teamMembers.filter(
      (member) =>
        member.isActive &&
        (member.roles.includes('GESTOR') ||
          member.roles.includes('CONSULTOR') ||
          member.roles.includes('ANJO') ||
          member.roles.includes('SECRETARIA')),
    );
  }, [teamMembers]);

  const handleImportCandidates = async (newCandidates: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>[]) => {
    for (const candidateData of newCandidates) {
      await addCandidate(candidateData);
    }
  };

  const handleOpenEditCandidateModal = (event: React.MouseEvent, candidate: Candidate) => {
    event.stopPropagation();
    setSelectedCandidateToEdit(candidate);
    setIsEditCandidateModalOpen(true);
  };

  const getNextColumns = (currentColumnId: string) => {
    const currentIndex = normalizedColumns.findIndex((column) => column.id === currentColumnId);
    return normalizedColumns.slice(currentIndex + 1, currentIndex + 4);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full bg-gray-50 p-4 dark:bg-slate-900 sm:p-8">
      <div className="mb-4 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <PieChart className="h-7 w-7 text-brand-500" />
            Contratação
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tudo da contratação concentrado aqui: métricas, rankings, origens, indicações e o pipeline operacional.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
          <button
            onClick={() => navigate(`${baseRoute}/hiring-pipeline-config`)}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 font-bold text-white transition hover:bg-slate-800"
          >
            <Settings2 className="h-5 w-5" />
            <span>Editar Pipeline</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2.5 font-bold text-white transition hover:bg-gray-700"
          >
            <Plus className="h-5 w-5" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-bold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Candidato</span>
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div>
            <h3 className="flex items-center text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              <Filter className="mr-2 h-4 w-4" />
              Filtros da contratação
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              As métricas e o pipeline abaixo seguem os filtros aplicados.
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
          onClick={() => handleOpenCandidatesDetailModal('Candidatos do período', filteredCandidates, 'total')}
        />
        <MetricCard
          title="Em andamento"
          value={analytics.activePipelineCount}
          icon={TrendingUp}
          colorClass="bg-blue-600 text-white"
          subValue="Ainda no pipeline"
          onClick={() => handleOpenCandidatesDetailModal('Candidatos em andamento', activePipelineCandidates, 'awaitingPreview')}
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resumo por etapa do pipeline</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quantidade atual em cada etapa do fluxo de contratação.
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7">
          {pipelineStages.map((stage) => (
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

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
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

      <section className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pipeline operacional</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pipelineStages.reduce((total, column) => total + column.list.length, 0)} candidatos visíveis nas etapas atuais.
            </p>
          </div>
        </div>

        <div className="custom-scrollbar flex space-x-4 overflow-x-auto pb-6">
          {pipelineStages.map((stage) => {
            const nextColumns = getNextColumns(stage.id);

            return (
              <div
                key={stage.id}
                onDragOver={(event) => handleDragOver(event, stage.id)}
                onDrop={(event) => handleDrop(event, stage.id)}
                className={`w-80 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-100/50 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800/50 ${
                  dragOverColumn === stage.id ? 'border-transparent bg-brand-50/50 ring-2 ring-brand-500 dark:bg-brand-900/10' : ''
                }`}
              >
                <div className={`rounded-t-xl border-b p-4 ${getColumnColorClasses(stage.color)}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">{stage.title}</h3>
                    </div>
                    <span className="rounded bg-white/50 px-2 py-0.5 text-xs font-bold dark:bg-black/20">{stage.list.length}</span>
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-wide">
                    <span className="rounded-full bg-white/60 px-2 py-1 dark:bg-black/20">
                      {stage.ownerRole === 'GESTOR' ? 'Responsável: Gestor' : 'Responsável: Secretaria'}
                    </span>
                  </div>
                </div>

                <div className="min-h-[500px] space-y-3 p-3">
                  {stage.list.map((candidate) => {
                    const totalScore =
                      candidate.interviewScores.basicProfile +
                      candidate.interviewScores.commercialSkills +
                      candidate.interviewScores.behavioralProfile +
                      candidate.interviewScores.jobFit;

                    const isToday = candidate.interviewDate === todayStr;
                    const hasPendingSecretariaTasksForCandidate = hasPendingSecretariaTasks(candidate);

                    return (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, candidate.id)}
                        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-700 ${
                          isToday ? 'ring-2 ring-brand-500' : ''
                        } ${draggingCandidateId === candidate.id ? 'opacity-70' : ''}`}
                      >
                        {isToday && (
                          <div className="absolute right-0 top-0 rounded-bl-lg bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            HOJE
                          </div>
                        )}

                        {hasPendingSecretariaTasksForCandidate && (
                          <div
                            className="absolute left-0 top-0 flex items-center rounded-br-lg bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white"
                            title="Tarefas da Secretaria Pendentes"
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            SECRETARIA
                          </div>
                        )}

                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="leading-tight text-gray-900 dark:text-white">
                              <span className="font-bold">{highlightText(candidate.name, searchTerm)}</span>
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase text-gray-400">
                              {candidate.origin && <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-slate-800">{candidate.origin}</span>}
                              <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-slate-800">{stage.title}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
                            <button
                              onClick={(event) => handleOpenEditCandidateModal(event, candidate)}
                              className="p-1 text-gray-300 transition-colors hover:text-blue-500"
                              title="Editar Candidato"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(event) => handleDeleteCandidatePermanently(event, candidate.db_id || candidate.id, candidate.name)}
                              className="p-1 text-gray-300 transition-colors hover:text-red-500"
                              title="Excluir Candidato"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center text-[10px] font-bold uppercase text-gray-400">
                              <UserRound className="mr-1 h-3 w-3" />
                              {getResponsibleName(candidate.responsibleUserId)}
                            </span>

                            {totalScore > 0 && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                                  totalScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {totalScore} pts
                              </span>
                            )}
                          </div>

                          {candidate.createdBy && (
                            <div className="flex items-center text-[10px] uppercase text-gray-400">
                              <UserPlus className="mr-1 h-3 w-3" />
                              Adicionado por: {getCreatorName(candidate.createdBy)}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-[10px] text-gray-400 dark:border-slate-600">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {candidate.interviewDate
                                ? new Date(`${candidate.interviewDate}T00:00:00`).toLocaleDateString('pt-BR')
                                : 'Sem data'}
                            </span>
                          </div>

                          <div className="mt-3">
                            <Textarea
                              value={candidate.notes || ''}
                              onChange={(event) => handleNotesChange(candidate.id, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              placeholder="Adicionar observações rápidas..."
                              rows={2}
                              className="w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                            />
                          </div>

                          <div className="mt-1 border-t border-gray-50 pt-3 dark:border-slate-600">
                            <div className="grid grid-cols-1 gap-2">
                              {nextColumns.map((column) => (
                                <button
                                  key={column.id}
                                  onClick={(event) => handleMoveToColumn(event, candidate, column)}
                                  className="min-h-[30px] w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-left text-[10px] font-bold leading-snug text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                                  title={`Mover para ${column.title}`}
                                >
                                  {column.title}
                                </button>
                              ))}

                              <button
                                onClick={(event) => handleOpenUpdateDate(event, candidate)}
                                className="min-h-[30px] w-full rounded-lg bg-brand-600 px-2 py-1 text-left text-[10px] font-bold leading-snug text-white transition hover:bg-brand-700"
                                title="Agendar ou reagendar entrevista"
                              >
                                Agendar / Reagendar
                              </button>

                              <button
                                onClick={(event) => openWithdrawalFlow(event, candidate)}
                                className="flex min-h-[30px] w-full items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-left text-[10px] font-bold leading-snug text-white transition hover:bg-rose-700"
                                title="Registrar desistência nesta etapa"
                              >
                                <UserMinus className="h-3 w-3" />
                                Desistiu nesta etapa
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stage.list.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                      <UserRound className="mb-2 h-8 w-8" />
                      <p className="text-xs font-medium">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <EditScreeningCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        origins={hiringOrigins}
        responsibleMembers={responsibleMembersForModal}
      />

      <EditScreeningCandidateModal
        isOpen={isEditCandidateModalOpen}
        onClose={() => setIsEditCandidateModalOpen(false)}
        origins={hiringOrigins}
        responsibleMembers={responsibleMembersForModal}
        candidateToEdit={selectedCandidateToEdit}
      />

      <UpdateInterviewDateModal
        isOpen={isUpdateDateModalOpen}
        onClose={() => {
          setIsUpdateDateModalOpen(false);
          setSelectedCandidateForDate(null);
        }}
        candidate={selectedCandidateForDate}
      />

      <ImportCandidatesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        origins={hiringOrigins}
        responsibleMembers={responsibleMembersForModal}
        onImport={handleImportCandidates}
      />

      <WithdrawalReasonModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => {
          setIsWithdrawalModalOpen(false);
          setSelectedCandidateForWithdrawal(null);
        }}
        onConfirm={handleConfirmWithdrawal}
        candidateName={selectedCandidateForWithdrawal?.name || ''}
        stageName={selectedCandidateForWithdrawal ? getHiringStageLabel(getCandidateStageKey(selectedCandidateForWithdrawal)) : ''}
      />

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

export default HiringPipeline;
