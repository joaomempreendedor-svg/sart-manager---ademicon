import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  FileText, 
  TrendingUp, 
  UserCheck, 
  Ghost, 
  UserMinus, 
  XCircle, 
  Percent, 
  Calendar, 
  RotateCcw,
  ArrowUpRight,
  Briefcase,
  ListChecks,
  Loader2,
  AlertCircle,
  CheckSquare,
  ChevronRight,
  CalendarDays,
  ListTodo,
  Check,
  Trash2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';
import { Candidate } from '@/types';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal'; // Importar o novo modal

interface AgendaItem {
  id: string;
  type: 'task' | 'interview' | 'gestor_task';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember';
  dueDate: string;
  taskId?: string; // ID específico da tarefa no checklist
}

// Componente MetricCard movido para cá
const MetricCard = ({ title, value, icon: Icon, colorClass, subValue, onClick }: any) => {
  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-4xl font-black">{value}</h3>
          {subValue && <p className="text-xs font-medium opacity-60">{subValue}</p>}
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={100} strokeWidth={3} />
        </div>
      </div>
    </>
  );

  const baseClasses = `relative overflow-hidden p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md ${colorClass}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} text-left w-full`}>
        {CardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {CardContent}
    </div>
  );
};

export const SecretariaDashboard = () => {
  const { user } = useAuth();
  const { 
    candidates, 
    checklistStructure, 
    isDataLoading, 
    gestorTasks, 
    gestorTaskCompletions, 
    isGestorTaskDueOnDate, 
    toggleChecklistItem,
    setChecklistDueDate,
    toggleGestorTaskCompletion,
    deleteGestorTask,
    updateCandidate,
    teamMembers
  } = useApp();
  const navigate = useNavigate();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false); // NOVO: Estado para o modal de candidatos
  const [candidatesModalTitle, setCandidatesModalTitle] = useState(''); // NOVO: Título do modal de candidatos
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]); // NOVO: Lista de candidatos para o modal
  const [candidatesMetricType, setCandidatesMetricType] = useState<'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified'>('total'); // NOVO: Tipo de métrica para o modal de candidatos

  // --- Handlers de Ação ---
  const handleCompleteItem = async (e: React.MouseEvent, item: AgendaItem) => {
    e.stopPropagation();
    try {
      if (item.type === 'task' && item.taskId) {
        await toggleChecklistItem(item.personId, item.taskId);
        toast.success("Tarefa concluída!");
      } else if (item.type === 'gestor_task') {
        await toggleGestorTaskCompletion(item.id, true, todayStr);
        toast.success("Tarefa pessoal concluída!");
      } else if (item.type === 'interview') {
        // Secretaria não deve marcar entrevistas como realizadas
        toast.error("A Secretaria não pode marcar entrevistas como realizadas diretamente aqui.");
      }
    } catch (error) {
      toast.error("Erro ao concluir item.");
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: AgendaItem) => {
    e.stopPropagation();
    if (!window.confirm("Deseja remover este lembrete/prazo?")) return;

    try {
      if (item.type === 'task' && item.taskId) {
        await setChecklistDueDate(item.personId, item.taskId, '');
        toast.success("Prazo removido.");
      } else if (item.type === 'gestor_task') {
        await deleteGestorTask(item.id);
        toast.success("Tarefa excluída.");
      } else if (item.type === 'interview') {
        // Secretaria não deve remover datas de entrevista
        toast.error("A Secretaria não pode remover datas de entrevista diretamente aqui.");
      }
    } catch (error) {
      toast.error("Erro ao remover item.");
    }
  };

  // --- Lógica da Agenda ---
  const { todayAgenda, overdueTasks } = useMemo(() => {
    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];

    candidates.forEach(candidate => {
      Object.entries(candidate.checklistProgress || {}).forEach(([taskId, state]) => {
        if (state.dueDate) {
          const item = checklistStructure.flatMap(s => s.items).find(i => i.id === taskId);
          if (item) {
            const agendaItem: AgendaItem = { 
              id: candidate.id, 
              type: 'task', 
              title: item.label, 
              personName: candidate.name, 
              personId: candidate.id, 
              personType: 'candidate', 
              dueDate: state.dueDate,
              taskId: taskId
            };
            // Apenas adiciona tarefas se o responsável for a Secretaria ou se for uma tarefa global
            if (item.responsibleRole === 'SECRETARIA' || !item.responsibleRole) {
              if (state.dueDate === todayStr && !state.completed) todayAgendaItems.push(agendaItem);
              else if (state.dueDate < todayStr && !state.completed) overdueItems.push(agendaItem);
            }
          }
        }
      });

      // REMOVIDO: Lógica para adicionar entrevistas à agenda da Secretaria
      // if (candidate.interviewDate === todayStr && !candidate.interviewConducted) {
      //   todayAgendaItems.push({ 
      //     id: candidate.id, 
      //     type: 'interview', 
      //     title: 'Entrevista Agendada', 
      //     personName: candidate.name, 
      //     personId: candidate.id, 
      //     personType: 'candidate', 
      //     dueDate: candidate.interviewDate 
      //   });
      // } else if (candidate.interviewDate && candidate.interviewDate < todayStr && candidate.status === 'Entrevista' && !candidate.interviewConducted) {
      //   overdueItems.push({
      //     id: candidate.id,
      //     type: 'interview',
      //     title: 'Entrevista não realizada',
      //     personName: candidate.name,
      //     personId: candidate.id,
      //     personType: 'candidate',
      //     dueDate: candidate.interviewDate
      //   });
      // }
    });

    gestorTasks.filter(task => task.user_id === user?.id).forEach(task => {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === todayStr && c.done);
      const isDueToday = isGestorTaskDueOnDate(task, todayStr);

      if (!isCompletedToday && isDueToday) {
        todayAgendaItems.push({ 
          id: task.id, 
          type: 'gestor_task', 
          title: task.title, 
          personName: 'Minha Tarefa', 
          personId: user!.id, 
          personType: 'teamMember', 
          dueDate: task.due_date || todayStr 
        });
      } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
        overdueItems.push({ 
          id: task.id, 
          type: 'gestor_task', 
          title: task.title, 
          personName: 'Minha Tarefa', 
          personId: user!.id, 
          personType: 'teamMember', 
          dueDate: task.due_date 
        });
      }
    });

    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems };
  }, [candidates, checklistStructure, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, todayStr]);

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') navigate(`/gestor/candidate/${item.personId}`);
  };

  const metrics = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const isInFilterRange = (dateString?: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date >= start && date <= end;
    };

    const totalCandidates = candidates.filter(c => isInFilterRange(c.createdAt));
    
    const newCandidatesList = totalCandidates.filter(c => 
      (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)
    );

    const contactedList = totalCandidates.filter(c => 
      isInFilterRange(c.contactedDate) && c.screeningStatus === 'Contacted'
    );

    const scheduledList = totalCandidates.filter(c => 
      isInFilterRange(c.interviewScheduledDate)
    );

    const conductedList = totalCandidates.filter(c => 
      isInFilterRange(c.interviewConductedDate)
    );

    const awaitingPreviewList = totalCandidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate)
    );

    const hiredList = totalCandidates.filter(c => 
      isInFilterRange(c.authorizedDate)
    );

    const noShowList = totalCandidates.filter(c => 
      isInFilterRange(c.faltouDate)
    );

    const withdrawnList = totalCandidates.filter(c => 
      isInFilterRange(c.reprovadoDate)
    );

    const disqualifiedList = totalCandidates.filter(c => 
      isInFilterRange(c.disqualifiedDate)
    );

    const totalHiredList = totalCandidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate) ||
      isInFilterRange(c.onboardingOnlineDate) ||
      isInFilterRange(c.integrationPresencialDate) ||
      isInFilterRange(c.acompanhamento90DiasDate) ||
      isInFilterRange(c.authorizedDate)
    );

    const totalInterviewsScheduled = scheduledList.length;
    const totalInterviewsConducted = conductedList.length;

    const attendanceRate = totalInterviewsScheduled > 0 ? (totalInterviewsConducted / totalInterviewsScheduled) * 100 : 0;
    const hiringRate = totalCandidates.length > 0 ? (totalHiredList.length / totalCandidates.length) * 100 : 0;

    return {
      total: totalCandidates.length,
      newCandidates: newCandidatesList.length,
      contacted: contactedList.length,
      scheduled: scheduledList.length,
      conducted: conductedList.length,
      awaitingPreview: awaitingPreviewList.length,
      hired: hiredList.length,
      noShow: noShowList.length,
      withdrawn: withdrawnList.length,
      disqualified: disqualifiedList.length,
      attendanceRate,
      hiringRate,
      totalHired: totalHiredList.length,
      // Listas para o modal
      newCandidatesList,
      contactedList,
      scheduledList,
      conductedList,
      awaitingPreviewList,
      hiredList,
      noShowList,
      withdrawnList,
      disqualifiedList,
      totalCandidatesList: totalCandidates,
      totalHiredList,
    };
  }, [candidates, startDate, endDate]);

  const handleOpenCandidatesDetailModal = (title: string, candidates: Candidate[], metricType: 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified') => {
    setCandidatesModalTitle(title);
    setCandidatesForModal(candidates);
    setCandidatesMetricType(metricType);
    setIsCandidatesDetailModalOpen(true);
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      {/* 1. SEÇÃO DE AGENDA E LEMBRETES */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2 text-brand-500" /> Agenda e Lembretes de Prazos
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Compromissos de Hoje
            </h3>
            {todayAgenda.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum compromisso com data para hoje.</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-3">
                  {todayAgenda.map(item => (
                    <li key={item.id + item.type + item.taskId} onClick={() => handleAgendaItemClick(item)} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-brand-200 group">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {item.type === 'interview' ? <Calendar className="w-4 h-4 text-green-500" /> : <CheckSquare className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.personName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleCompleteItem(e, item)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md" title="Concluir">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteItem(e, item)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remover Prazo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-red-100 dark:border-red-900/30 shadow-md">
            <h3 className="text-sm font-bold text-red-500 uppercase mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Prazos e Datas Atrasadas
            </h3>
            {overdueTasks.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma data atrasada. Tudo em dia!</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-3">
                  {overdueTasks.map(item => (
                    <li key={item.id + item.type + item.taskId} onClick={() => handleAgendaItemClick(item)} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 transition-colors cursor-pointer border border-red-100 dark:border-red-900/20 group">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1"><AlertCircle className="w-4 h-4 text-red-500" /></div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-red-900 dark:text-red-200">{item.title}</p>
                          <p className="text-xs text-red-700 dark:text-red-400">{item.personName} • Venceu em {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleCompleteItem(e, item)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md" title="Concluir">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteItem(e, item)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remover Prazo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-slate-800" />

      {/* 2. SEÇÃO DE METAS DIÁRIAS */}
      <section className="animate-fade-in">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ListChecks className="w-6 h-6 mr-2 text-brand-500" /> Minhas Rotinas Diárias
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Checklist de tarefas operacionais recorrentes.</p>
        </div>
        <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
      </section>

      <hr className="border-gray-200 dark:border-slate-800" />

      {/* 3. SEÇÃO DE DASHBOARD DE CANDIDATURAS */}
      <section className="animate-fade-in">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-brand-500" /> Dashboard de Candidaturas
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Métricas detalhadas do fluxo de contratação.</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 dark:text-white"
            />
            <span className="text-gray-400 font-bold">→</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 dark:text-white"
            />
            <button 
              onClick={() => {
                const d = new Date();
                setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
              }}
              className="ml-2 p-1 text-gray-400 hover:text-brand-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <MetricCard 
            title="Total de Candidaturas" 
            value={metrics.total} 
            icon={Users} 
            colorClass="bg-indigo-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Total de Candidaturas', metrics.totalCandidatesList, 'total')}
          />
          <MetricCard 
            title="Novos Candidatos" 
            value={metrics.newCandidates} 
            icon={UserPlus} 
            colorClass="bg-slate-600 text-white" 
            subValue="Aguardando contato"
            onClick={() => handleOpenCandidatesDetailModal('Novos Candidatos', metrics.newCandidatesList, 'newCandidates')}
          />
          <MetricCard 
            title="Contatados" 
            value={metrics.contacted} 
            icon={MessageSquare} 
            colorClass="bg-amber-500 text-white" 
            subValue="Em triagem ativa"
            onClick={() => handleOpenCandidatesDetailModal('Contatados', metrics.contactedList, 'contacted')}
          />
          <MetricCard 
            title="Entrevistas Agendadas" 
            value={metrics.scheduled} 
            icon={Clock} 
            colorClass="bg-orange-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Entrevistas Agendadas', metrics.scheduledList, 'scheduled')}
          />
          <MetricCard 
            title="Entrevistas Realizadas" 
            value={metrics.conducted} 
            icon={FileText} 
            colorClass="bg-purple-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Entrevistas Realizadas', metrics.conductedList, 'conducted')}
          />
          <MetricCard 
            title="Contratados (Em Prévia)" 
            value={metrics.totalHired} 
            icon={TrendingUp} 
            colorClass="bg-blue-600 text-white" 
            subValue="Passaram na seleção"
            onClick={() => handleOpenCandidatesDetailModal('Contratados (Em Prévia)', metrics.totalHiredList, 'awaitingPreview')}
          />
          <MetricCard 
            title="Autorizados" 
            value={metrics.hired} 
            icon={UserCheck} 
            colorClass="bg-emerald-600 text-white" 
            subValue="Contratações efetivas"
            onClick={() => handleOpenCandidatesDetailModal('Autorizados', metrics.hiredList, 'hired')}
          />
          <MetricCard 
            title="Faltas" 
            value={metrics.noShow} 
            icon={Ghost} 
            colorClass="bg-rose-500 text-white" 
            subValue="Não compareceram"
            onClick={() => handleOpenCandidatesDetailModal('Faltas', metrics.noShowList, 'noShow')}
          />
          <MetricCard 
            title="Desistências" 
            value={metrics.withdrawn} 
            icon={UserMinus} 
            colorClass="bg-rose-600 text-white" 
            subValue="Candidato desistiu"
            onClick={() => handleOpenCandidatesDetailModal('Desistências', metrics.withdrawnList, 'withdrawn')}
          />
          <MetricCard 
            title="Desqualificados" 
            value={metrics.disqualified} 
            icon={XCircle} 
            colorClass="bg-rose-700 text-white" 
            subValue="Reprovados pelo gestor"
            onClick={() => handleOpenCandidatesDetailModal('Desqualificados', metrics.disqualifiedList, 'disqualified')}
          />
          
          <MetricCard 
            title="Taxa de Comparecimento" 
            value={`${metrics.attendanceRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Efetividade Agenda"
          />
          <MetricCard 
            title="Taxa de Contratação" 
            value={`${metrics.hiringRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Conversão Final"
          />
        </div>
      </section>
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