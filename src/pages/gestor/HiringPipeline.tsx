import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, Plus, Trash2, Calendar, RotateCcw, Filter, ArrowRightCircle, ShieldCheck, UserRound, HelpCircle, UserPlus, Edit2, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EditScreeningCandidateModal } from '@/components/gestor/EditScreeningCandidateModal';
import { UpdateInterviewDateModal } from '@/components/gestor/UpdateInterviewDateModal';
import { highlightText } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Candidate, CandidateStatus, HiringPipelineColumn } from '@/types';
import { ImportCandidatesModal } from '@/components/gestor/ImportCandidatesModal';
import { WithdrawalReasonModal } from '@/components/gestor/WithdrawalReasonModal';

const HiringPipeline = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, setCandidates, teamMembers, isDataLoading, updateCandidate, deleteCandidate, hasPendingSecretariaTasks, addCandidate, hiringOrigins, hiringPipelineColumns } = useApp();
  const navigate = useNavigate();

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

  const sortByRecentUpdate = (a: Candidate, b: Candidate) => {
    const dateA = new Date(a.lastUpdatedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastUpdatedAt || b.createdAt).getTime();
    return dateB - dateA;
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find(m => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    return member?.name || 'Desconhecido';
  };

  const getCreatorName = (creatorId: string | undefined) => {
    if (!creatorId) return 'Desconhecido';
    const member = teamMembers.find(m => m.authUserId === creatorId);
    if (member) return member.name;
    if (user && creatorId === user.id) return user.name;
    return 'Desconhecido';
  };

  const pipelineStages = useMemo(() => {
    let filteredCandidates = candidates.filter(Boolean);

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredCandidates = filteredCandidates.filter(c =>
        (String(c.name || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.phone || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.email || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.notes || '').toLowerCase()).includes(lowerCaseSearchTerm)
      );
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      filteredCandidates = filteredCandidates.filter(c => new Date(c.createdAt) >= start);
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      filteredCandidates = filteredCandidates.filter(c => new Date(c.createdAt) <= end);
    }

    return hiringPipelineColumns.map((column) => {
      const list = filteredCandidates.filter((candidate) => {
        if (candidate.status !== column.candidateStatus) return false;
        if (column.screeningStatus && candidate.screeningStatus !== column.screeningStatus) return false;
        if (typeof column.interviewConducted === 'boolean' && candidate.interviewConducted !== column.interviewConducted) return false;
        return true;
      }).sort(sortByRecentUpdate);

      return { ...column, list };
    });
  }, [candidates, searchTerm, filterStartDate, filterEndDate, hiringPipelineColumns]);

  const getColumnColorClasses = (color: string) => {
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

  const buildUpdatesFromColumn = (column: HiringPipelineColumn): Partial<Candidate> => {
    const updates: Partial<Candidate> = {
      status: column.candidateStatus,
    };

    if (column.screeningStatus) updates.screeningStatus = column.screeningStatus;
    if (typeof column.interviewConducted === 'boolean') updates.interviewConducted = column.interviewConducted;

    if (column.id === 'contacted') updates.contactedDate = new Date().toISOString();
    if (column.id === 'noResponse') updates.noResponseDate = new Date().toISOString();
    if (column.id === 'scheduled') updates.interviewScheduledDate = new Date().toISOString();
    if (column.id === 'conducted') updates.interviewConductedDate = new Date().toISOString();
    if (column.id === 'awaitingPreview') updates.awaitingPreviewDate = new Date().toISOString();
    if (column.id === 'authorized') updates.authorizedDate = new Date().toISOString();
    if (column.id === 'disqualified') updates.disqualifiedDate = new Date().toISOString();
    if (column.id === 'noShow') updates.faltouDate = new Date().toISOString();

    return updates;
  };

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggingCandidateId(candidateId);
    e.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const candidateId = e.dataTransfer.getData('candidateId');
    if (!candidateId) return;

    const targetColumn = hiringPipelineColumns.find(column => column.id === targetColumnId);
    if (!targetColumn) return;

    if (targetColumn.candidateStatus === 'Reprovado') {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        setSelectedCandidateForWithdrawal(candidate);
        setIsWithdrawalModalOpen(true);
      }
      setDraggingCandidateId(null);
      return;
    }

    try {
      await updateCandidate(candidateId, buildUpdatesFromColumn(targetColumn));
      toast.success(`Candidato movido para ${targetColumn.title}`);
    } catch {
      toast.error('Erro ao mover candidato.');
    } finally {
      setDraggingCandidateId(null);
    }
  };

  const handleUpdateStatus = async (e: React.MouseEvent, candidateId: string, column: HiringPipelineColumn) => {
    e.preventDefault();
    e.stopPropagation();

    if (column.candidateStatus === 'Reprovado') {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        setSelectedCandidateForWithdrawal(candidate);
        setIsWithdrawalModalOpen(true);
      }
      return;
    }

    try {
      await updateCandidate(candidateId, buildUpdatesFromColumn(column));
      toast.success(`Candidato movido para<think>Initial files ranking:

src/pages/secretaria/SecretariaDashboard.tsx: 0.96

src/pages/secretaria/SecretariaDailyChecklist.tsx: 0.89

src/layouts/SecretariaLayout.tsx: 0.88

src/App.tsx: 0.88

src/pages/gestor/DailyChecklistConfig.tsx: 0.82

src/components/MetricCard.tsx: 0.75

src/components/consultor/DailyChecklistDisplay.tsx: 0.75

src/types.ts: 0.65

src/components/GestorLayout.tsx: 0.65

src/pages/gestor/DailyChecklistMonitoring.tsx: 0.62

src/data/checklistData.ts: 0.59

src/pages/ChecklistConfig.tsx: 0.59

src/pages/gestor/HiringDashboard.tsx: 0.59

src/context/AppContext.tsx: 0.56

src/components/ConsultorLayout.tsx: 0.56

src/layouts/ProtectedLayout.tsx: 0.56

src/components/Header.tsx: 0.53

src/components/gestor/CandidatesDetailModal.tsx: 0.53

src/pages/consultor/DailyChecklist.tsx: 0.50

public/favicon.svg: 0.47

supabase/functions/manage-daily-checklist-item/index.ts: 0.47

src/pages/gestor/HiringPipeline.tsx: 0.47

src/pages/gestor/FormSubmissions.tsx: 0.47

src/pages/Home.tsx: 0.41

src/assets/edit-comissao-sem-anjo.png: 0.41

src/components/ui/scroll-area.tsx: 0.38

metadata.json: 0.38

src/context/AuthContext.tsx: 0.38</think><think>Re-ranking the files. Please wait a moment...

Reasoning: undefined

</think><dyad-codebase-context files="src/types.ts,src/context/AppContext.tsx,src/pages/gestor/HiringPipeline.tsx,src/layouts/SecretariaLayout.tsx,src/pages/gestor/HiringDashboard.tsx,src/components/gestor/CandidatesDetailModal.tsx"></dyad-codebase-context><think>dyad-token-savings?original-tokens=381193.75&smart-context-tokens=45877.75</think>Vou continuar implementando a edição do pipeline com uma tela própria para criar colunas, definir responsável e reorganizar a ordem, além de finalizar o uso dessas colunas no pipeline visual.
<dyad-write path="src/pages/gestor/HiringPipeline.tsx" description="Finalizando o pipeline para usar colunas configuráveis e mostrar responsável por etapa.">
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  Calendar,
  RotateCcw,
  Filter,
  ArrowRightCircle,
  ShieldCheck,
  UserRound,
  HelpCircle,
  UserPlus,
  Edit2,
  Settings2,
  ChevronRight,
  Check,
  MessageSquare,
  UserX,
  UserCheck,
  Clock,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EditScreeningCandidateModal } from '@/components/gestor/EditScreeningCandidateModal';
import { UpdateInterviewDateModal } from '@/components/gestor/UpdateInterviewDateModal';
import { highlightText } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Candidate, HiringPipelineColumn } from '@/types';
import { ImportCandidatesModal } from '@/components/gestor/ImportCandidatesModal';
import { WithdrawalReasonModal } from '@/components/gestor/WithdrawalReasonModal';

const HiringPipeline = () => {
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
  const navigate = useNavigate();

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

  const sortByRecentUpdate = (a: Candidate, b: Candidate) => {
    const dateA = new Date(a.lastUpdatedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastUpdatedAt || b.createdAt).getTime();
    return dateB - dateA;
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find((m) => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    return member?.name || 'Desconhecido';
  };

  const getCreatorName = (creatorId: string | undefined) => {
    if (!creatorId) return 'Desconhecido';
    const member = teamMembers.find((m) => m.authUserId === creatorId);
    if (member) return member.name;
    if (user && creatorId === user.id) return user.name;
    return 'Desconhecido';
  };

  const pipelineStages = useMemo(() => {
    let filteredCandidates = candidates.filter(Boolean);

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredCandidates = filteredCandidates.filter(
        (c) =>
          String(c.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          String(c.phone || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          String(c.email || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          String(c.notes || '').toLowerCase().includes(lowerCaseSearchTerm),
      );
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      filteredCandidates = filteredCandidates.filter((c) => new Date(c.createdAt) >= start);
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      filteredCandidates = filteredCandidates.filter((c) => new Date(c.createdAt) <= end);
    }

    return hiringPipelineColumns.map((column) => {
      const list = filteredCandidates
        .filter((candidate) => {
          if (candidate.status !== column.candidateStatus) return false;
          if (column.screeningStatus && candidate.screeningStatus !== column.screeningStatus) return false;
          if (typeof column.interviewConducted === 'boolean' && candidate.interviewConducted !== column.interviewConducted) return false;
          return true;
        })
        .sort(sortByRecentUpdate);

      return { ...column, list };
    });
  }, [candidates, searchTerm, filterStartDate, filterEndDate, hiringPipelineColumns]);

  const getColumnColorClasses = (color: string) => {
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

  const getColumnActionIcon = (column: HiringPipelineColumn) => {
    if (column.screeningStatus === 'Contacted') return MessageSquare;
    if (column.screeningStatus === 'No Response') return HelpCircle;
    if (column.candidateStatus === 'Autorizado') return UserCheck;
    if (column.candidateStatus === 'Desqualificado' || column.candidateStatus === 'Reprovado' || column.candidateStatus === 'Faltou') return UserX;
    if (column.candidateStatus === 'Aguardando Prévia') return Clock;
    if (column.candidateStatus === 'Entrevista' && column.interviewConducted) return FileText;
    return ChevronRight;
  };

  const buildUpdatesFromColumn = (column: HiringPipelineColumn): Partial<Candidate> => {
    const updates: Partial<Candidate> = {
      status: column.candidateStatus,
    };

    if (column.screeningStatus) updates.screeningStatus = column.screeningStatus;
    if (typeof column.interviewConducted === 'boolean') updates.interviewConducted = column.interviewConducted;

    if (column.screeningStatus === 'Contacted') updates.contactedDate = new Date().toISOString();
    if (column.screeningStatus === 'No Response') updates.noResponseDate = new Date().toISOString();
    if (column.candidateStatus === 'Entrevista' && column.interviewConducted === false) updates.interviewScheduledDate = new Date().toISOString();
    if (column.candidateStatus === 'Entrevista' && column.interviewConducted === true) updates.interviewConductedDate = new Date().toISOString();
    if (column.candidateStatus === 'Aguardando Prévia') updates.awaitingPreviewDate = new Date().toISOString();
    if (column.candidateStatus === 'Autorizado') updates.authorizedDate = new Date().toISOString();
    if (column.candidateStatus === 'Desqualificado') updates.disqualifiedDate = new Date().toISOString();
    if (column.candidateStatus === 'Faltou') updates.faltouDate = new Date().toISOString();

    return updates;
  };

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggingCandidateId(candidateId);
    e.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const candidateId = e.dataTransfer.getData('candidateId');
    if (!candidateId) return;

    const targetColumn = hiringPipelineColumns.find((column) => column.id === targetColumnId);
    if (!targetColumn) return;

    if (targetColumn.candidateStatus === 'Reprovado') {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (candidate) {
        setSelectedCandidateForWithdrawal(candidate);
        setIsWithdrawalModalOpen(true);
      }
      setDraggingCandidateId(null);
      return;
    }

    try {
      await updateCandidate(candidateId, buildUpdatesFromColumn(targetColumn));
      toast.success(`Candidato movido para ${targetColumn.title}`);
    } catch {
      toast.error('Erro ao mover candidato.');
    } finally {
      setDraggingCandidateId(null);
    }
  };

  const handleMoveToColumn = async (e: React.MouseEvent, candidateId: string, column: HiringPipelineColumn) => {
    e.preventDefault();
    e.stopPropagation();

    if (column.candidateStatus === 'Reprovado') {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (candidate) {
        setSelectedCandidateForWithdrawal(candidate);
        setIsWithdrawalModalOpen(true);
      }
      return;
    }

    try {
      await updateCandidate(candidateId, buildUpdatesFromColumn(column));
      toast.success(`Candidato movido para ${column.title}`);
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleConfirmWithdrawal = async (reason: string) => {
    if (!selectedCandidateForWithdrawal) return;
    try {
      await updateCandidate(selectedCandidateForWithdrawal.id, {
        status: 'Reprovado',
        withdrawalReason: reason,
        reprovadoDate: new Date().toISOString(),
      });
      toast.success('Candidato movido para desistências');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleOpenUpdateDate = (e: React.MouseEvent, candidate: Candidate) => {
    e.preventDefault();
    e.stopPropagation();
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
    setCandidates((prev: Candidate[]) => prev.map((c: Candidate) => (c.id === candidateId ? { ...c, notes: newNotes } : c)));
    debouncedUpdateCandidateNotes(candidateId, newNotes);
  };

  const handleDeleteCandidatePermanently = async (e: React.MouseEvent, candidateDbId: string, candidateName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir permanentemente "${candidateName}"?`)) {
      try {
        await deleteCandidate(candidateDbId);
        toast.success(`Candidato "${candidateName}" excluído.`);
      } catch (error: any) {
        toast.error(`Erro ao excluir candidato: ${error.message}`);
      }
    }
  };

  const responsibleMembersForModal = useMemo(() => {
    return teamMembers.filter((m) => m.isActive && (m.roles.includes('GESTOR') || m.roles.includes('ANJO') || m.roles.includes('SECRETARIA')));
  }, [teamMembers]);

  const handleImportCandidates = async (newCandidates: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>[]) => {
    for (const candidateData of newCandidates) {
      await addCandidate(candidateData);
    }
  };

  const handleOpenEditCandidateModal = (e: React.MouseEvent, candidate: Candidate) => {
    e.stopPropagation();
    setSelectedCandidateToEdit(candidate);
    setIsEditCandidateModalOpen(true);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-full mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Acompanhe o fluxo de candidatos e organize as etapas por responsável.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
          <button
            onClick={() => navigate('/gestor/hiring-pipeline-config')}
            className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-800 text-white py-2.5 px-4 rounded-lg transition font-bold"
          >
            <Settings2 className="w-5 h-5" />
            <span>Editar Pipeline</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white py-2.5 px-4 rounded-lg transition font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-4 rounded-lg transition font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Candidato</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </h3>
          {(searchTerm || filterStartDate || filterEndDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="text-xs flex items-center text-red-500 hover:text-red-700 transition"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nome, telefone ou email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Criado de</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Criado até</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-6 space-x-4 custom-scrollbar">
        {pipelineStages.map((stage) => (
          <div
            key={stage.id}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
            className={`flex-shrink-0 w-80 bg-gray-100/50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all ${
              dragOverColumn === stage.id ? 'ring-2 ring-brand-500 border-transparent bg-brand-50/50 dark:bg-brand-900/10' : ''
            }`}
          >
            <div className={`p-4 border-b rounded-t-xl ${getColumnColorClasses(stage.color)}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <UserRound className="w-4 h-4" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">{stage.title}</h3>
                </div>
                <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-xs font-bold">{stage.list.length}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
                <span className="px-2 py-1 rounded-full bg-white/60 dark:bg-black/20">
                  {stage.ownerRole === 'GESTOR' ? 'Responsável: Gestor' : 'Responsável: Secretaria'}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[500px]">
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
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onClick={() => navigate(`/gestor/candidate/${candidate.id}`)}
                    className={`block bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer ${
                      isToday ? 'ring-2 ring-brand-500' : ''
                    }`}
                  >
                    {isToday && (
                      <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        HOJE
                      </div>
                    )}

                    {hasPendingSecretariaTasksForCandidate && (
                      <div
                        className="absolute top-0 left-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg flex items-center"
                        title="Tarefas da Secretaria Pendentes"
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        SECRETARIA
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900 dark:text-white leading-tight group-hover:text-brand-600 transition-colors">
                        {highlightText(candidate.name, searchTerm)}
                      </p>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditCandidateModal(e, candidate)}
                          className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                          title="Editar Candidato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCandidatePermanently(e, candidate.db_id || candidate.id, candidate.name)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          title="Excluir Candidato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                          <UserRound className="w-3 h-3 mr-1" />
                          {getResponsibleName(candidate.responsibleUserId)}
                        </span>

                        {totalScore > 0 && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              totalScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {totalScore} pts
                          </span>
                        )}
                      </div>

                      {candidate.createdBy && (
                        <div className="text-[10px] text-gray-400 uppercase flex items-center">
                          <UserPlus className="w-3 h-3 mr-1" />
                          Adicionado por: {getCreatorName(candidate.createdBy)}
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-50 dark:border-slate-600 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {candidate.interviewDate ? new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>
                      </div>

                      <div className="mt-3">
                        <Textarea
                          value={candidate.notes || ''}
                          onChange={(e) => handleNotesChange(candidate.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Adicionar observações rápidas..."
                          rows={2}
                          className="w-full text-xs p-2 border border-gray-200 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-brand-500 focus:border-brand-500 resize-y"
                        />
                      </div>

                      <div className="pt-3 mt-1 border-t border-gray-50 dark:border-slate-600">
                        <div className="grid grid-cols-1 gap-2">
                          {hiringPipelineColumns
                            .filter((column) => column.id !== stage.id)
                            .slice(0, 4)
                            .map((column) => {
                              const ActionIcon = getColumnActionIcon(column);
                              return (
                                <button
                                  key={column.id}
                                  onClick={(e) => handleMoveToColumn(e, candidate.id, column)}
                                  className="w-full min-w-0 px-2 min-h-[30px] flex items-center justify-start space-x-1 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition text-left whitespace-normal break-words leading-snug border border-gray-200 dark:border-slate-600"
                                  title={`Mover para ${column.title}`}
                                >
                                  <ActionIcon className="w-3 h-3" />
                                  <span>{column.title}</span>
                                </button>
                              );
                            })}

                          <button
                            onClick={(e) => handleOpenUpdateDate(e, candidate)}
                            className="w-full min-w-0 px-2 min-h-[30px] flex items-center justify-start space-x-1 py-1 bg-brand-600 text-white rounded-lg text-[10px] font-bold hover:bg-brand-700 transition text-left whitespace-normal break-words leading-snug"
                            title="Agendar ou reagendar entrevista"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Agendar / Reagendar</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 mt-1 flex justify-center">
                        <div className="flex items-center text-[10px] font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                          VER PROCESSO
                          <ArrowRightCircle className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stage.list.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                  <UserRound className="w-8 h-8 mb-2" />
                  <p className="text-xs font-medium">Vazio</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
      />
    </div>
  );
};

export default HiringPipeline;