import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, User, Phone, Mail, CheckCircle2, XCircle, RotateCcw, ArrowRight, MessageSquare, UserX, Plus, Trash2, Users, Clock, UserRound, UploadCloud, CalendarDays, Filter, Calendar, FileText, UserCheck, Star, TrendingUp, ChevronRight, Check, CalendarClock, UserMinus, ArrowRightCircle, ShieldCheck } from 'lucide-react'; // Adicionado ShieldCheck
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { Candidate, InterviewScores, CandidateStatus, TeamMember } from '@/types';
import { AddScreeningCandidateModal } from '@/components/gestor/AddScreeningCandidateModal';
import { UpdateInterviewDateModal } from '@/components/gestor/UpdateInterviewDateModal';
import { highlightText } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea'; // Importar Textarea
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'; // Importar useDebouncedCallback

// ID do gestor principal para fallback de exibição
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

const HiringPipeline = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, setCandidates, teamMembers, isDataLoading, updateCandidate, deleteCandidate, interviewStructure, checklistStructure, hiringOrigins, hasPendingSecretariaTasks } = useApp(); // Adicionado hasPendingSecretariaTasks
  const navigate = useNavigate();
  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateDateModalOpen, setIsUpdateDateModalOpen] = useState(false);
  const [selectedCandidateForDate, setSelectedCandidateForDate] = useState<Candidate | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de Data Padrão: Mês Atual
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const sortByRecentUpdate = (a: Candidate, b: Candidate) => {
    const dateA = new Date(a.lastUpdatedAt || a.createdAt).getTime();
    const dateB = new Date(b.lastUpdatedAt || b.createdAt).getTime();
    return dateB - dateA;
  };

  const {
    pipelineStages,
  } = useMemo(() => {
    if (!user) return { pipelineStages: { candidates: [], contacted: [], scheduled: [], conducted: [], awaitingPreview: [], authorized: [], droppedOut: [], disqualified: [], noShow: [] } };

    let candidatesForGestor = candidates.filter(Boolean);

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      candidatesForGestor = candidatesForGestor.filter(c => 
        (String(c.name || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.phone || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.email || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.notes || '').toLowerCase()).includes(lowerCaseSearchTerm) // NOVO: Incluir busca nas notas
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

    // Split Triagem into Candidates (Pending) and Contacted
    const entryPool = candidatesForGestor.filter(c => c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)).sort(sortByRecentUpdate);
    const contactedPool = candidatesForGestor.filter(c => c.status === 'Triagem' && c.screeningStatus === 'Contacted').sort(sortByRecentUpdate);
    
    const scheduled = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      !c.interviewConducted &&
      c.interviewScores.basicProfile === 0 && 
      c.interviewScores.commercialSkills === 0 && 
      c.interviewScores.behavioralProfile === 0 && 
      c.interviewScores.jobFit === 0 && 
      c.interviewScores.notes === ''
    ).sort(sortByRecentUpdate);

    const conducted = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      (c.interviewConducted || c.interviewScores.basicProfile > 0 || c.interviewScores.commercialSkills > 0 || c.interviewScores.behavioralProfile > 0 || c.interviewScores.jobFit > 0 || c.interviewScores.notes !== '')
    ).sort(sortByRecentUpdate);

    const awaitingPreview = candidatesForGestor.filter(c => c.status === 'Aguardando Prévia').sort(sortByRecentUpdate);
    const authorized = candidatesForGestor.filter(c => c.status === 'Autorizado').sort(sortByRecentUpdate);
    const droppedOut = candidatesForGestor.filter(c => c.status === 'Reprovado').sort(sortByRecentUpdate);
    const disqualified = candidatesForGestor.filter(c => c.status === 'Desqualificado').sort(sortByRecentUpdate);
    const noShow = candidatesForGestor.filter(c => c.status === 'Faltou').sort(sortByRecentUpdate);

    return {
      pipelineStages: { 
        candidates: { title: 'Candidatos', list: entryPool, color: 'gray', icon: Users },
        contacted: { title: 'Contatados', list: contactedPool, color: 'blue', icon: MessageSquare },
        scheduled: { title: 'Agendadas', list: scheduled, color: 'blue', icon: Calendar },
        conducted: { title: 'Realizadas', list: conducted, color: 'purple', icon: FileText },
        noShow: { title: 'Faltou', list: noShow, color: 'red', icon: UserX },
        awaitingPreview: { title: 'Em Prévia', list: awaitingPreview, color: 'yellow', icon: Clock },
        authorized: { title: 'Autorizados', list: authorized, color: 'green', icon: UserCheck },
        droppedOut: { title: 'Desistências', list: droppedOut, color: 'red', icon: UserX },
        disqualified: { title: 'Desqualificado', list: disqualified, color: 'red', icon: XCircle }
      }
    };
  }, [user, candidates, searchTerm, filterStartDate, filterEndDate]);

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

    let newStatus: CandidateStatus;
    let updates: Partial<Candidate> = {};

    switch (targetColumnId) {
      case 'candidates': 
        newStatus = 'Triagem'; 
        updates.screeningStatus = 'Pending Contact';
        break;
      case 'contacted': 
        newStatus = 'Triagem'; 
        updates.screeningStatus = 'Contacted';
        break;
      case 'scheduled': 
        newStatus = 'Entrevista'; 
        updates.interviewConducted = false;
        break;
      case 'conducted': 
        newStatus = 'Entrevista'; 
        updates.interviewConducted = true;
        break;
      case 'noShow': newStatus = 'Faltou'; break;
      case 'awaitingPreview': newStatus = 'Aguardando Prévia'; break;
      case 'authorized': newStatus = 'Autorizado'; break;
      case 'droppedOut': newStatus = 'Reprovado'; break;
      case 'disqualified': newStatus = 'Desqualificado'; break;
      default: return;
    }

    await updateCandidate(candidateId, { status: newStatus, ...updates });
    setDraggingCandidateId(null);
  };

  const handleUpdateStatus = async (e: React.MouseEvent, candidateId: string, newStatus: CandidateStatus, updates: Partial<Candidate> = {}) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateCandidate(candidateId, { status: newStatus, ...updates });
      toast.success(`Candidato movido para ${newStatus}`);
    } catch (error: any) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleOpenUpdateDate = (e: React.MouseEvent, candidate: Candidate) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCandidateForDate(candidate);
    setIsUpdateDateModalOpen(true);
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find(m => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    if (member) return member.name;
    if (responsibleUserId === JOAO_GESTOR_AUTH_ID) return 'João Müller';
    return 'Desconhecido';
  };

  const getColumnColorClasses = (color: string) => {
    switch(color) {
      case 'blue': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'purple': return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 text-purple-700 dark:text-purple-300';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'green': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300';
      case 'red': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'gray': return 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300';
      default: return 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300';
    }
  };

  const debouncedUpdateCandidateNotes = useDebouncedCallback(async (candidateId: string, notes: string) => {
    try {
      await updateCandidate(candidateId, { notes });
      toast.success("Observações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar observações.");
      console.error("Failed to save candidate notes:", error);
    }
  }, 1000); // Salva 1 segundo após a última digitação

  const handleNotesChange = (candidateId: string, newNotes: string) => {
    // Atualiza o estado local imediatamente para feedback visual
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, notes: newNotes } : c));
    // Chama a função debounced para salvar no banco de dados
    debouncedUpdateCandidateNotes(candidateId, newNotes);
  };

  const handleDeleteCandidatePermanently = async (e: React.MouseEvent, candidateDbId: string, candidateName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o candidato "${candidateName}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteCandidate(candidateDbId); // Passa o db_id
        toast.success(`Candidato "${candidateName}" excluído permanentemente!`);
      } catch (error: any) {
        toast.error(`Erro ao excluir candidato: ${error.message}`);
      }
    }
  };

  // Memoize the responsibleMembers list for the modal
  const responsibleMembersForModal = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('GESTOR') || m.roles.includes('ANJO')));
  }, [teamMembers]);

  if (isAuthLoading || isDataLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-full mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe o fluxo de candidatos desde a entrada até a contratação.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-6 rounded-lg transition shadow-lg shadow-brand-600/20 font-bold"><Plus className="w-5 h-5" /><span>Novo Candidato</span></button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtros</h3>
          {(searchTerm || filterStartDate || filterEndDate) && <button onClick={() => { setSearchTerm(''); setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs flex items-center text-red-500 hover:text-red-700 transition"><RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Nome, telefone ou email..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Criado de</label><input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" /></div>
          <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Criado até</label><input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" /></div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-6 space-x-4 custom-scrollbar">
        {Object.entries(pipelineStages).map(([id, stage]) => (
          <div 
            key={id} 
            onDragOver={(e) => handleDragOver(e, id)} 
            onDrop={(e) => handleDrop(e, id)} 
            className={`flex-shrink-0 w-72 bg-gray-100/50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all ${dragOverColumn === id ? 'ring-2 ring-brand-500 border-transparent bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
          >
            <div className={`p-4 border-b rounded-t-xl flex items-center justify-between ${getColumnColorClasses(stage.color)}`}>
              <div className="flex items-center space-x-2">
                <stage.icon className="w-4 h-4" />
                <h3 className="font-bold text-sm uppercase tracking-wider">{stage.title}</h3>
              </div>
              <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-xs font-bold">{stage.list.length}</span>
            </div>
            
            <div className="p-3 space-y-3 min-h-[500px]">
              {stage.list.map(candidate => {
                const totalScore = candidate.interviewScores.basicProfile + candidate.interviewScores.commercialSkills + candidate.interviewScores.behavioralProfile + candidate.interviewScores.jobFit;
                const isToday = candidate.interviewDate === todayStr;
                const hasPendingSecretariaTasksForCandidate = hasPendingSecretariaTasks(candidate); // NOVO: Verifica tarefas pendentes da Secretaria

                return (
                  <div 
                    key={candidate.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, candidate.id)} 
                    onClick={() => navigate(`/gestor/candidate/${candidate.id}`)}
                    className={`block bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer ${isToday ? 'ring-2 ring-brand-500' : ''}`}
                  >
                    {isToday && (
                      <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> HOJE
                      </div>
                    )}
                    {id === 'awaitingPreview' && hasPendingSecretariaTasksForCandidate && ( // NOVO: Indicador para Secretaria
                      <div className="absolute top-0 left-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg flex items-center" title="Tarefas da Secretaria Pendentes">
                        <ShieldCheck className="w-3 h-3 mr-1" /> SECRETARIA
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900 dark:text-white leading-tight group-hover:text-brand-600 transition-colors">
                        {highlightText(candidate.name, searchTerm)}
                      </p>
                      <button 
                        onClick={(e) => handleDeleteCandidatePermanently(e, candidate.db_id || candidate.id, candidate.name)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir Candidato Permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center"><UserRound className="w-3 h-3 mr-1" /> {getResponsibleName(candidate.responsibleUserId)}</span>
                        {totalScore > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${totalScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {totalScore} pts
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {candidate.phone && <span className="text-[10px] bg-gray-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 flex items-center"><Phone className="w-2.5 h-2.5 mr-1" /> {highlightText(candidate.phone, searchTerm)}</span>}
                        {candidate.origin && <span className="text-[10px] bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded text-brand-700 dark:text-brand-400 font-medium">{highlightText(candidate.origin, searchTerm)}</span>}
                      </div>

                      <div className="pt-2 border-t border-gray-50 dark:border-slate-600 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> 
                          {candidate.interviewDate ? new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                          {candidate.interviewStartTime && candidate.interviewEndTime && (
                            <span className="ml-1">
                              ({candidate.interviewStartTime} - {candidate.interviewEndTime})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* NOVO: Campo de Observações */}
                      <div className="mt-3">
                        <Textarea
                          value={candidate.notes || ''}
                          onChange={(e) => handleNotesChange(candidate.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Impede que o clique na textarea abra o modal do candidato
                          placeholder="Adicionar observações rápidas..."
                          rows={2}
                          className="w-full text-xs p-2 border border-gray-200 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-brand-500 focus:border-brand-500 resize-y"
                        />
                      </div>

                      {/* BOTÕES DE AÇÃO RÁPIDA NO CARD */}
                      <div className="pt-3 mt-1 border-t border-gray-50 dark:border-slate-600 grid grid-cols-2 gap-2">
                        {id === 'candidates' && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Triagem', { screeningStatus: 'Contacted' })}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Contatado</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Desqualificado')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Desqualificado</span>
                            </button>
                          </>
                        )}

                        {id === 'contacted' && (
                          <>
                            <button 
                              onClick={(e) => handleOpenUpdateDate(e, candidate)}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition"
                            >
                              <CalendarClock className="w-3 h-3" />
                              <span>Agendar</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Desqualificado')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Desqualificado</span>
                            </button>
                          </>
                        )}

                        {id === 'scheduled' && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Entrevista', { interviewConducted: true })}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition"
                            >
                              <Check className="w-3 h-3" />
                              <span>Compareceu</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Faltou')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Faltou</span>
                            </button>
                          </>
                        )}

                        {id === 'conducted' && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Aguardando Prévia')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-bold hover:bg-brand-600 transition"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>Aprovar</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Desqualificado')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Desqualificado</span>
                            </button>
                          </>
                        )}

                        {id === 'noShow' && (
                          <button 
                            onClick={(e) => handleOpenUpdateDate(e, candidate)}
                            className="col-span-2 flex items-center justify-center space-x-1 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition"
                            >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reagendar</span>
                          </button>
                        )}

                        {id === 'awaitingPreview' && (
                          <>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Autorizado')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Autorizar</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Desqualificado')}
                              className="flex items-center justify-center space-x-1 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Desqualificado</span>
                            </button>
                            <button 
                              onClick={(e) => handleUpdateStatus(e, candidate.id, 'Reprovado')}
                              className="col-span-2 flex items-center justify-center space-x-1 py-1.5 border border-gray-200 dark:border-slate-600 text-gray-500 rounded-lg text-[10px] font-bold hover:bg-gray-50 transition"
                            >
                              <UserMinus className="w-3 h-3" />
                              <span>Desistiu</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* BOTÃO VER PROCESSO */}
                      <div className="pt-2 mt-1 flex justify-center">
                        <div className="flex items-center text-[10px] font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                          VER PROCESSO <ArrowRightCircle className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {stage.list.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                  <stage.icon className="w-8 h-8 mb-2" />
                  <p className="text-xs font-medium">Vazio</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <AddScreeningCandidateModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        origins={hiringOrigins} // Passando as origens de contratação
        responsibleMembers={responsibleMembersForModal} // Passando a lista de responsáveis
      />
      <UpdateInterviewDateModal
        isOpen={isUpdateDateModalOpen}
        onClose={() => {
          setIsUpdateDateModalOpen(false);
          setSelectedCandidateForDate(null);
        }}
        candidate={selectedCandidateForDate}
      />
    </div>
  );
};

export default HiringPipeline;