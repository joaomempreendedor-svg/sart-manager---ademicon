import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, User, Phone, Mail, CheckCircle2, XCircle, RotateCcw, ArrowRight, MessageSquare, UserX, Plus, Trash2, Users, Clock, UserRound, UploadCloud, CalendarDays, Filter, Calendar, FileText, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { AddScreeningCandidateModal } from '@/components/gestor/AddScreeningCandidateModal';
import { ImportCandidatesModal } from '@/components/gestor/ImportCandidatesModal';
import { Candidate, InterviewScores, CandidateStatus, TeamMember } from '@/types';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { highlightText } from '@/lib/utils';

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
    pipelineStages,
    teamMembersInPreview,
    teamMembersAuthorized,
  } = useMemo(() => {
    if (!user) return { pipelineStages: { scheduled: [], conducted: [], awaitingPreview: [], authorized: [], droppedOut: [] }, teamMembersInPreview: [], teamMembersAuthorized: [] };

    let candidatesForGestor = candidates.filter(Boolean);

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      candidatesForGestor = candidatesForGestor.filter(c => 
        (String(c.name || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.phone || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        (String(c.email || '').toLowerCase()).includes(lowerCaseSearchTerm)
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

    const scheduled = candidatesForGestor.filter(c => c.status === 'Entrevista' && c.interviewScores.basicProfile === 0 && c.interviewScores.commercialSkills === 0 && c.interviewScores.behavioralProfile === 0 && c.interviewScores.jobFit === 0 && c.interviewScores.notes === '');
    const conducted = candidatesForGestor.filter(c => c.status === 'Entrevista' && (c.interviewScores.basicProfile > 0 || c.interviewScores.commercialSkills > 0 || c.interviewScores.behavioralProfile > 0 || c.interviewScores.jobFit > 0 || c.interviewScores.notes !== ''));
    const awaitingPreview = candidatesForGestor.filter(c => c.status === 'Aguardando Prévia');
    const authorized = candidatesForGestor.filter(c => c.status === 'Autorizado');
    const droppedOut = candidatesForGestor.filter(c => c.status === 'Reprovado');

    const membersInPreview = teamMembers.filter(m => m.isActive && m.roles.includes('Prévia'));
    const membersAuthorized = teamMembers.filter(m => m.isActive && m.roles.includes('Autorizado'));

    return {
      pipelineStages: { scheduled, conducted, awaitingPreview, authorized, droppedOut },
      teamMembersInPreview: membersInPreview,
      teamMembersAuthorized: membersAuthorized,
    };
  }, [user, candidates, teamMembers, searchTerm, filterStartDate, filterEndDate]);

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
    switch (targetColumnId) {
      case 'scheduled': newStatus = 'Entrevista'; break;
      case 'conducted': newStatus = 'Entrevista'; break;
      case 'awaitingPreview': newStatus = 'Aguardando Prévia'; break;
      case 'authorized': newStatus = 'Autorizado'; break;
      case 'droppedOut': newStatus = 'Reprovado'; break;
      default: return;
    }

    await updateCandidate(candidateId, { status: newStatus });
    setDraggingCandidateId(null);
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    // Busca tanto pelo ID interno quanto pelo ID de autenticação
    const member = teamMembers.find(m => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    return member ? member.name : 'Desconhecido';
  };

  if (isAuthLoading || isDataLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe o fluxo de candidatos desde a entrevista até a contratação.</p>
        </div>
        <button onClick={() => setIsScheduleModalOpen(true)} className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"><Plus className="w-5 h-5" /><span>Agendar Entrevista</span></button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Candidatos</h3>
          {(searchTerm || filterStartDate || filterEndDate) && <button onClick={() => { setSearchTerm(''); setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs flex items-center text-red-500 hover:text-red-700 transition"><RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar candidato..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
        {Object.entries(pipelineStages).map(([id, list]) => (
          <div key={id} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} className={`flex-shrink-0 w-64 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 ${dragOverColumn === id ? 'border-brand-500 border-2 border-dashed' : ''}`}>
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 rounded-t-xl">
              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{id === 'scheduled' ? 'Agendadas' : id === 'conducted' ? 'Realizadas' : id === 'awaitingPreview' ? 'Em Prévia' : id === 'authorized' ? 'Autorizados' : 'Desistências'}</h3>
              <span className="text-xs text-gray-500">{list.length} candidatos</span>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {list.map(candidate => (
                <Link to={`/gestor/candidate/${candidate.id}`} key={candidate.id} draggable onDragStart={(e) => handleDragStart(e, candidate.id)} className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 transition-all group">
                  <p className="font-medium text-gray-900 dark:text-white">{highlightText(candidate.name, searchTerm)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 flex items-center"><UserRound className="w-3 h-3 mr-1" /> {getResponsibleName(candidate.responsibleUserId)}</p>
                  <div className="flex justify-end mt-2"><ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500" /></div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
    </div>
  );
};

export default HiringPipeline;