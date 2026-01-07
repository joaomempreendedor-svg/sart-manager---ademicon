import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Calendar, CheckCircle2, UserX, UserCheck, TrendingUp, Users, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';
import { CandidateStatus, InterviewScores } from '@/types'; // Importar CandidateStatus e InterviewScores

const HiringPipeline = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, isDataLoading, updateCandidate, interviewStructure } = useApp(); // Adicionado updateCandidate e interviewStructure
  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const {
    scheduledInterviews,
    conductedInterviews,
    hiredCandidates,
    droppedOutCandidates,
    pipelineStages,
  } = useMemo(() => {
    if (!user) {
      return {
        scheduledInterviews: [],
        conductedInterviews: [],
        hiredCandidates: [],
        droppedOutCandidates: [],
        pipelineStages: {
          scheduled: [],
          conducted: [],
          hired: [],
          droppedOut: [],
        },
      };
    }

    const candidatesForGestor = candidates; // All candidates are managed by the Gestor

    const scheduled = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      c.interviewScores.basicProfile === 0 && // Assuming 0 points means not conducted
      c.interviewScores.commercialSkills === 0 &&
      c.interviewScores.behavioralProfile === 0 &&
      c.interviewScores.jobFit === 0 &&
      c.interviewScores.notes === ''
    );

    const conducted = candidatesForGestor.filter(c => 
      c.status === 'Entrevista' && 
      (c.interviewScores.basicProfile > 0 || // If any score is > 0, it's conducted
       c.interviewScores.commercialSkills > 0 ||
       c.interviewScores.behavioralProfile > 0 ||
       c.interviewScores.jobFit > 0 ||
       c.interviewScores.notes !== '')
    );

    const hired = candidatesForGestor.filter(c => c.status === 'Autorizado');
    const droppedOut = candidatesForGestor.filter(c => c.status === 'Reprovado');

    return {
      scheduledInterviews: scheduled,
      conductedInterviews: conducted,
      hiredCandidates: hired,
      droppedOutCandidates: droppedOut,
      pipelineStages: {
        scheduled,
        conducted,
        hired,
        droppedOut,
      },
    };
  }, [user, candidates]);

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggingCandidateId(candidateId);
    e.dataTransfer.setData('candidateId', candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault(); // Necessary to allow dropping
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
        // Clear interview scores to ensure it lands in 'Agendadas'
        newInterviewScores = { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' };
        break;
      case 'conducted':
        newStatus = 'Entrevista';
        // If scores are all zero, set a minimal score to mark as 'Realizada'
        if (candidateToUpdate.interviewScores.basicProfile === 0 &&
            candidateToUpdate.interviewScores.commercialSkills === 0 &&
            candidateToUpdate.interviewScores.behavioralProfile === 0 &&
            candidateToUpdate.interviewScores.jobFit === 0) {
          newInterviewScores = { ...candidateToUpdate.interviewScores, basicProfile: 1 }; // Set a minimal score
        }
        break;
      case 'hired':
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
      // Optionally show a toast notification
    } finally {
      setDraggingCandidateId(null);
    }
  };

  const getColumnClasses = (columnId: string) => {
    let classes = "flex-shrink-0 w-64 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700";
    if (dragOverColumn === columnId) {
      classes += " border-2 border-dashed border-brand-500 dark:border-brand-400";
    }
    return classes;
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline de Contratação</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe o fluxo de candidatos desde a entrevista até a contratação.</p>
      </div>

      {/* Métricas de Contratação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Agendadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduledInterviews.length}</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Contratados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{hiredCandidates.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Desistências</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{droppedOutCandidates.length}</p>
          </div>
        </div>
      </div>

      {/* Pipeline Visual */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-brand-500" />Fluxo de Candidatos</h2>
      <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
        {/* Coluna: Agendadas */}
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
                  <p className="font-medium text-gray-900 dark:text-white">{candidate.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Coluna: Realizadas */}
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
                  <p className="font-medium text-gray-900 dark:text-white">{candidate.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Coluna: Contratados */}
        <div 
          id="hired"
          className={getColumnClasses('hired')}
          onDragOver={(e) => handleDragOver(e, 'hired')}
          onDrop={(e) => handleDrop(e, 'hired')}
          onDragLeave={handleDragLeave}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
            <h3 className="font-semibold text-brand-800 dark:text-brand-300 flex items-center"><UserCheck className="w-4 h-4 mr-2" />Contratados</h3>
            <span className="text-xs text-brand-600 dark:text-brand-400">{pipelineStages.hired.length} candidatos</span>
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {pipelineStages.hired.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Nenhum candidato contratado.</p>
            ) : (
              pipelineStages.hired.map(candidate => (
                <Link 
                  to={`/gestor/candidate/${candidate.id}`} 
                  key={candidate.id} 
                  className="block bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onDragEnd={() => setDraggingCandidateId(null)}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{candidate.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Autorizado
                  </p>
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Coluna: Desistências */}
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
                  <p className="font-medium text-gray-900 dark:text-white">{candidate.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <UserX className="w-3 h-3 mr-1 text-red-500" /> Reprovado
                  </p>
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiringPipeline;