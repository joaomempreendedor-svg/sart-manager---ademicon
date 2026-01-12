import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Calendar, CheckCircle2, UserX, UserCheck, TrendingUp, Users, FileText, ArrowRight, UserRound, Plus, Search, Filter, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';
import { CandidateStatus, InterviewScores, TeamMember } from '@/types';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';

// Helper function to highlight text
const highlightText = (text: string, highlight: string) => {
  if (!highlight) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white rounded px-0.5">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

const HiringPipeline = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, isDataLoading, updateCandidate, interviewStructure } = useApp();
  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const {
    scheduledInterviews,
    conductedInterviews,
    awaitingPreviewCandidates,
    authorizedCandidates,
    droppedOutCandidates,
    teamMembersInPreview,
    teamMembersAuthorized,
    pipelineStages,
  } = useMemo(() => {
    if (!user) {
      return {
        scheduledInterviews: [],
        conductedInterviews: [],
        awaitingPreviewCandidates: [],
        authorizedCandidates: [],
        droppedOutCandidates: [],
        teamMembersInPreview: [],
        teamMembersAuthorized: [],
        pipelineStages: {
          scheduled: [],
          conducted: [],
          awaitingPreview: [],
          authorized: [],
          droppedOut: [],
        },
      };
    }

    let candidatesForGestor = candidates;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      candidatesForGestor = candidatesForGestor.filter(c =>
        (c.name && c.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (c.phone && c.phone.includes(lowerCaseSearchTerm)) ||
        (c.email?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      candidatesForGestor = candidatesForGestor.filter(c => new Date(c.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      candidatesForGestor = candidatesForGestor.filter(c => new Date(c.createdAt) <= end);
    }

    const teamMemberIdentifiersInPreview = new Set(
      teamMembers
        .filter(m => m.isActive && m.roles.includes('Prévia'))
        .flatMap(m => [m.name.toLowerCase().trim(), m.email?.toLowerCase().trim()].filter(Boolean))
    );
    const teamMemberIdentifiersAuthorized = new Set(
      teamMembers
        .filter(m => m.isActive && m.roles.includes('Autorizado'))
        .flatMap(m => [m.name.toLowerCase().trim(), m.email?.toLowerCase().trim()].filter(Boolean))
    );

    const isCandidateAlsoTeamMember = (candidate: typeof candidates[0], teamMemberIdentifiers: Set<string>) => {
      const candidateNameLower = candidate.name.toLowerCase().trim();
      const candidateEmailLower = candidate.email?.toLowerCase().trim();
      
      if (teamMemberIdentifiers.has(candidateNameLower)) {
        return true;
      }
      if (candidateEmailLower && teamMemberIdentifiers.has(candidateEmailLower)) {
        return true;
      }
      return false;
    };

    const getResponsibleUserIdForTeamMember = (member: TeamMember) => {
      const matchingCandidate = candidatesForGestor.find(c => 
        c.name.toLowerCase().trim() === member.name.toLowerCase().trim() ||
        (c.email && member.email && c.email.toLowerCase().trim() === member.email.toLowerCase().trim())
      );
      return matchingCandidate?.responsibleUserId;
    };

    const scheduled = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      c.interviewScores.basicProfile === 0 && 
      c.interviewScores.commercialSkills === 0 &&
      c.interviewScores.behavioralProfile === 0 &&
      c.interviewScores.jobFit === 0 &&
      c.interviewScores.notes === ''
    );

    const conducted = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      (c.interviewScores.basicProfile > 0 || 
       c.interviewScores.commercialSkills > 0 ||
       c.interviewScores.behavioralProfile > 0 ||
       c.interviewScores.jobFit > 0 ||
       c.interviewScores.notes !== '')
    );

    const awaitingPreview = candidatesForGestor.filter(c => 
      c.status === 'Aguardando Prévia' &&
      !isCandidateAlsoTeamMember(c, teamMemberIdentifiersInPreview)
    );
    
    const authorized = candidatesForGestor.filter(c => 
      c.status === 'Autorizado' &&
      !isCandidateAlsoTeamMember(c, teamMemberIdentifiersAuthorized)
    );

    const droppedOut = candidatesForGestor.filter(c => c.status === 'Reprovado');

    const membersInPreview = teamMembers
      .filter(m => m.isActive && m.roles.includes('Prévia'))
      .map(m => ({
        ...m,
        responsibleUserId: getResponsibleUserIdForTeamMember(m)
      }));

    const membersAuthorized = teamMembers
      .filter(m => m.isActive && m.roles.includes('Autorizado'))
      .map(m => ({
        ...m,
        responsibleUserId: getResponsibleUserIdForTeamMember(m)
      }));

    return {
      scheduledInterviews: scheduled,
      conductedInterviews: conducted,
      awaitingPreviewCandidates: awaitingPreview,
      authorizedCandidates: authorized,
      droppedOutCandidates: droppedOut,
      teamMembersInPreview: membersInPreview,
      teamMembersAuthorized: membersAuthorized,
      pipelineStages: {
        scheduled,
        conducted,
        awaitingPreview,
        authorized,
        droppedOut,
      },
    };
  }, [user, candidates, teamMembers, searchTerm, filterStartDate, filterEndDate]);

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggingCandidateId(candidateId);
    e.dataTransfer.setData('candidateId', candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const candidateId = e.dataTransfer.getData('candidateId');
    if (!candidateId || !draggingCandidateId) return;

    const candidateToUpdate = candidates.find(c => c.id === candidateId);
    if (!candidateToUpdate) return;

    let newStatus: CandidateStatus;
    let newInterviewScores: InterviewScores | undefined = undefined;

    switch (targetColumnId) {
      case 'scheduled':
        newStatus = 'Entrevista';
        newInterviewScores = { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' };
        break;
      case 'conducted':
        newStatus = 'Entrevista';
        if (candidateToUpdate.interviewScores.basicProfile === 0 &&
            candidateToUpdate.interviewScores.commercialSkills === 0 &&
            candidateToUpdate.interviewScores.behavioralProfile === 0 &&
            candidateToUpdate.interviewScores.jobFit === 0) {
          newInterviewScores = { ...candidateToUpdate.interviewScores, basicProfile: 1 };
        }
        break;
      case 'awaitingPreview':
        newStatus = 'Aguardando Prévia';
        break;
      case 'authorized':
        newStatus = 'Autorizado';
        break;
      case 'droppedOut':
        newStatus = 'Reprovado';
        break;
      default:
        return;
    }

    try {
      await updateCandidate(candidateId, { 
        status: newStatus, 
        ...(newInterviewScores !== undefined && { interviewScores: newInterviewScores }) 
      });
    } catch (error) {
      console.error("Failed to update candidate status:", error);
    } finally {
      setDraggingCandidateId(null);
    }
  };

  const getColumnClasses = (columnId: string) => {
    let classes = "flex-shrink-0 w-full bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700";
    if (dragOverColumn === columnId) {
      classes += " border-2 border-dashed border-brand-500 dark:border-brand-400";
    }
    return classes;
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find(m => m.id === responsibleUserId);
    return member ? member.name : 'Desconhecido';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters = searchTerm || filterStartDate || filterEndDate;

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe o fluxo de candidatos desde a entrevista até a contratação.</p>
        </div>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Agendar Entrevista</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Candidatos</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label htmlFor="searchTerm" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar por Nome, Telefone ou E-mail</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="searchTerm"
                placeholder="Buscar candidato..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Criado de</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Criado até</label>
            <input
              type="date"
              id="filterEndDate"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Agendadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pipelineStages.scheduled.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Realizadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{conductedInterviews.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <UserCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Em Prévia</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{awaitingPreviewCandidates.length + teamMembersInPreview.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Autorizados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{authorizedCandidates.length + teamMembersAuthorized.length}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-brand-500" />Fluxo de Candidatos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4 overflow-x-auto custom-scrollbar">
        <div 
          id="scheduled"
          className={getColumnClasses('scheduled')}
          onDragOver={(e) => handleDragOver(e, 'scheduled')}
          onDrop={(e) => handleDrop(e, 'scheduled')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center"><Calendar className="w-4 h-4 mr-2" />Agendadas</h3>
            <span className="text-xs text-blue-600 dark:text-blue-400">{pipelineStages.scheduled.length} candidatos</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.scheduled.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum candidato agendado.</p>
            ) : (
              pipelineStages.scheduled.map(candidate => (
                <Link 
                  to={`/gestor/candidate/${candidate.id}`} 
                  key={candidate.id} 
                  className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onDragEnd={() => setDraggingCandidateId(null)}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  {candidate.responsibleUserId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(candidate.responsibleUserId)}
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div 
          id="conducted"
          className={getColumnClasses('conducted')}
          onDragOver={(e) => handleDragOver(e, 'conducted')}
          onDrop={(e) => handleDrop(e, 'conducted')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 rounded-t-xl">
            <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center"><FileText className="w-4 h-4 mr-2" />Realizadas</h3>
            <span className="text-xs text-green-600 dark:text-green-400">{pipelineStages.conducted.length} candidatos</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.conducted.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhuma entrevista realizada.</p>
            ) : (
              pipelineStages.conducted.map(candidate => (
                <Link 
                  to={`/gestor/candidate/${candidate.id}`} 
                  key={candidate.id} 
                  className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onDragEnd={() => setDraggingCandidateId(null)}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  {candidate.responsibleUserId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(candidate.responsibleUserId)}
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div 
          id="awaitingPreview"
          className={getColumnClasses('awaitingPreview')}
          onDragOver={(e) => handleDragOver(e, 'awaitingPreview')}
          onDrop={(e) => handleDrop(e, 'awaitingPreview')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
            <h3 className="font-semibold text-brand-800 dark:text-brand-300 flex items-center"><UserCheck className="w-4 h-4 mr-2" />Aguardando Prévia</h3>
            <span className="text-xs text-brand-600 dark:text-brand-400">{pipelineStages.awaitingPreview.length + teamMembersInPreview.length} pessoas</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.awaitingPreview.length === 0 && teamMembersInPreview.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum candidato ou membro em prévia.</p>
            ) : (
              <>
                {pipelineStages.awaitingPreview.map(candidate => (
                  <Link 
                    to={`/gestor/candidate/${candidate.id}`} 
                    key={`candidate-${candidate.id}`} 
                    className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onDragEnd={() => setDraggingCandidateId(null)}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-brand-500" /> Candidato em Prévia
                    </p>
                    {candidate.responsibleUserId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(candidate.responsibleUserId)}
                      </p>
                    )}
                    <div className="flex justify-end mt-2">
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                  </Link>
                ))}
                {teamMembersInPreview.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Membros da Equipe (Prévia)</p>
                    {teamMembersInPreview.map(member => (
                      <Link 
                        to={`/gestor/config-team`}
                        key={`member-${member.id}`} 
                        className="block bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all group"
                      >
                        <p className="font-medium flex items-center"><UserRound className="w-4 h-4 mr-2 text-gray-500" />{highlightText(member.name, searchTerm)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Função: Prévia</p>
                        {member.responsibleUserId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(member.responsibleUserId)}
                          </p>
                        )}
                        <div className="flex justify-end mt-2">
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div 
          id="authorized"
          className={getColumnClasses('authorized')}
          onDragOver={(e) => handleDragOver(e, 'authorized')}
          onDrop={(e) => handleDrop(e, 'authorized')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20 rounded-t-xl">
            <h3 className="font-semibold text-purple-800 dark:text-purple-300 flex items-center"><UserCheck className="w-4 h-4 mr-2" />Autorizados</h3>
            <span className="text-xs text-purple-600 dark:text-purple-400">{pipelineStages.authorized.length + teamMembersAuthorized.length} pessoas</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.authorized.length === 0 && teamMembersAuthorized.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum candidato ou membro autorizado.</p>
            ) : (
              <>
                {pipelineStages.authorized.map(candidate => (
                  <Link 
                    to={`/gestor/candidate/${candidate.id}`} 
                    key={`candidate-${candidate.id}`} 
                    className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    onDragEnd={() => setDraggingCandidateId(null)}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-purple-500" /> Candidato Autorizado
                    </p>
                    {candidate.responsibleUserId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(candidate.responsibleUserId)}
                      </p>
                    )}
                    <div className="flex justify-end mt-2">
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                  </Link>
                ))}
                {teamMembersAuthorized.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Membros da Equipe (Autorizados)</p>
                    {teamMembersAuthorized.map(member => (
                      <Link 
                        to={`/gestor/config-team`}
                        key={`member-${member.id}`} 
                        className="block bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all group"
                      >
                        <p className="font-medium flex items-center"><UserRound className="w-4 h-4 mr-2 text-gray-500" />{highlightText(member.name, searchTerm)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Função: Autorizado</p>
                        {member.responsibleUserId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(member.responsibleUserId)}
                          </p>
                        )}
                        <div className="flex justify-end mt-2">
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div 
          id="droppedOut"
          className={getColumnClasses('droppedOut')}
          onDragOver={(e) => handleDragOver(e, 'droppedOut')}
          onDrop={(e) => handleDrop(e, 'droppedOut')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
            <h3 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><UserX className="w-4 h-4 mr-2" />Desistências</h3>
            <span className="text-xs text-red-600 dark:text-red-400">{pipelineStages.droppedOut.length} candidatos</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.droppedOut.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhuma desistência registrada.</p>
            ) : (
              pipelineStages.droppedOut.map(candidate => (
                <Link 
                  to={`/gestor/candidate/${candidate.id}`} 
                  key={candidate.id} 
                  className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onDragEnd={() => setDraggingCandidateId(null)}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <UserX className="w-3 h-3 mr-1 text-red-500" /> Reprovado
                  </p>
                  {candidate.responsibleUserId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        <UserRound className="w-3 h-3 mr-1" /> Indicado por: {getResponsibleName(candidate.responsibleUserId)}
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
    </div>
  );
};

export default HiringPipeline;