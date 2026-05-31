import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Edit2,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound,
} from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { EditScreeningCandidateModal } from '@/components/gestor/EditScreeningCandidateModal';
import { UpdateInterviewDateModal } from '@/components/gestor/UpdateInterviewDateModal';
import { ImportCandidatesModal } from '@/components/gestor/ImportCandidatesModal';
import { WithdrawalReasonModal, WithdrawalReasonSelection } from '@/components/gestor/WithdrawalReasonModal';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { highlightText } from '@/lib/utils';
import { Candidate, HiringPipelineColumn } from '@/types';
import { buildCandidateStageUpdates, getCandidateStageKey, getHiringStageLabel, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

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

    return currentCandidates.filter((candidate) => !candidate.reprovadoDate);
  }, [candidates, filterEndDate, filterStartDate, searchTerm]);

  const pipelineStages = useMemo(() => {
    return normalizedColumns.map((column) => ({
      ...column,
      list: filteredCandidates
        .filter((candidate) => getCandidateStageKey(candidate) === column.stageKey)
        .sort(sortByRecentUpdate),
    }));
  }, [filteredCandidates, normalizedColumns]);

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
      <div className="sticky top-0 z-20 mb-6 pt-1">
        <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5 xl:inline-block xl:w-auto">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Abra o pipeline e já tenha acesso imediato às ações principais e aos filtros.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[520px]">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="order-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-extrabold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-700"
              >
                <Plus className="h-5 w-5" />
                <span>Novo Candidato</span>
              </button>

              <button
                onClick={() => navigate(`${baseRoute}/hiring-metrics`)}
                className="order-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Ver Métricas</span>
              </button>

              <button
                onClick={() => navigate(`${baseRoute}/hiring-pipeline-config`)}
                className="order-3 flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                <Settings2 className="h-5 w-5" />
                <span>Editar Pipeline</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="order-4 flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                <Plus className="h-5 w-5" />
                <span>Importar Planilha</span>
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros do pipeline
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pipelineStages.reduce((total, column) => total + column.list.length, 0)} candidatos visíveis nas etapas atuais.
                </p>
              </div>

              {(searchTerm || filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="inline-flex items-center text-xs font-bold text-red-500 transition hover:text-red-700"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.75fr)_minmax(180px,0.75fr)]">
              <div className="flex flex-col">
                <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Busca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome, telefone ou email..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 ml-1 text-[10px] font-bold uppercase text-gray-400">Criado até</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(event) => setFilterEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
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

                        <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
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
    </div>
  );
};

export default HiringPipeline;
