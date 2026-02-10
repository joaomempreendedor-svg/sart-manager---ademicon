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
  ListChecks,
  Loader2,
  AlertCircle,
  CheckSquare,
  ChevronRight,
  CalendarDays,
  ListTodo,
  Check,
  Trash2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';

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
    updateCandidate
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
        await updateCandidate(item.personId, { interviewConducted: true, interviewConductedDate: new Date().toISOString() }); // Atualiza a data
        toast.success("Entrevista marcada como realizada!");
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
        await updateCandidate(item.personId, { interviewDate: '', interviewScheduledDate: undefined, interviewConducted: false, interviewConductedDate: undefined }); // Limpa todas as datas relacionadas
        toast.success("Data da entrevista removida.");
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
            if (state.dueDate === todayStr && !state.completed) todayAgendaItems.push(agendaItem);
            else if (state.dueDate < todayStr && !state.completed) overdueItems.push(agendaItem);
          }
        }
      });

      if (candidate.interviewDate === todayStr && !candidate.interviewConducted) {
        todayAgendaItems.push({ 
          id: candidate.id, 
          type: 'interview', 
          title: 'Entrevista Agendada', 
          personName: candidate.name, 
          personId: candidate.id, 
          personType: 'candidate', 
          dueDate: candidate.interviewDate 
        });
      } else if (candidate.interviewDate && candidate.interviewDate < todayStr && candidate.status === 'Entrevista' && !candidate.interviewConducted) {
        overdueItems.push({
          id: candidate.id,
          type: 'interview',
          title: 'Entrevista não realizada',
          personName: candidate.name,
          personId: candidate.id,
          personType: 'candidate',
          dueDate: candidate.interviewDate
        });
      }
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

    const total = candidates.filter(c => isInFilterRange(c.createdAt)).length;
    
    // Candidatos atualmente em Triagem (Pendente de Contato)
    const inScreening = candidates.filter(c => 
      c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)
    ).length;

    // Candidatos atualmente em Triagem (Contatados)
    const contactedInScreening = candidates.filter(c => 
      c.status === 'Triagem' && c.screeningStatus === 'Contacted'
    ).length;

    // Entradas históricas em cada etapa (dentro do período de filtro)
    const contacted = candidates.filter(c => 
      isInFilterRange(c.contactedDate) // Usa contactedDate
    ).length;

    const scheduled = candidates.filter(c => 
      isInFilterRange(c.interviewScheduledDate) && // Usa interviewScheduledDate
      !c.interviewConducted // Ainda não foi conduzida
    ).length;

    const conducted = candidates.filter(c => 
      isInFilterRange(c.interviewConductedDate) // Usa interviewConductedDate
    ).length;

    const awaitingPreview = candidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate) // Usa awaitingPreviewDate
    ).length;

    const hired = candidates.filter(c => 
      isInFilterRange(c.authorizedDate) // Usa authorizedDate
    ).length;

    const noShow = candidates.filter(c => 
      isInFilterRange(c.faltouDate) // Usa faltouDate
    ).length;

    const withdrawn = candidates.filter(c => 
      isInFilterRange(c.reprovadoDate) // Usa reprovadoDate
    ).length;

    const disqualified = candidates.filter(c => 
      isInFilterRange(c.disqualifiedDate) // Usa disqualifiedDate
    ).length;

    // NOVA LÓGICA: Total de Contratados (que passaram da triagem)
    const totalHired = candidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate) || // Entrou em 'Aguardando Prévia'
      isInFilterRange(c.onboardingOnlineDate) || // Entrou em 'Onboarding Online'
      isInFilterRange(c.integrationPresencialDate) || // Entrou em 'Integração Presencial'
      isInFilterRange(c.acompanhamento90DiasDate) || // Entrou em 'Acompanhamento 90 Dias'
      isInFilterRange(c.authorizedDate) // Entrou em 'Autorizado'
    ).length;

    const totalInterviewsScheduled = candidates.filter(c => isInFilterRange(c.interviewScheduledDate)).length;
    const totalInterviewsConducted = candidates.filter(c => isInFilterRange(c.interviewConductedDate)).length;

    const attendanceRate = totalInterviewsScheduled > 0 ? (totalInterviewsConducted / totalInterviewsScheduled) * 100 : 0;
    const hiringRate = total > 0 ? (totalHired / total) * 100 : 0;

    return {
      total,
      inScreening, // Adicionado
      contactedInScreening, // Adicionado
      contacted,
      scheduled,
      conducted,
      awaitingPreview,
      hired,
      noShow,
      withdrawn,
      disqualified,
      attendanceRate,
      hiringRate,
      totalHired
    };
  }, [candidates, startDate, endDate]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const MetricCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
    <div className={`relative overflow-hidden p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-4xl font-black">{value}</h3>
          {subValue && <p className="text-xs font-medium opacity-60">{subValue}</p>}
        </div>
        <div className="p-3 rounded-xl bg-white/20 dark:bg-black/20">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon size={100} strokeWidth={3} />
      </div>
    </div>
  );

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
          <MetricCard title="Total de Candidaturas" value={metrics.total} icon={Users} colorClass="bg-indigo-600 text-white" />
          <MetricCard title="Novos Candidatos" value={metrics.inScreening} icon={UserPlus} colorClass="bg-slate-600 text-white" subValue="Aguardando contato" />
          <MetricCard title="Contatados" value={metrics.contactedInScreening} icon={MessageSquare} colorClass="bg-amber-500 text-white" subValue="Em triagem ativa" />
          <MetricCard title="Entrevistas Agendadas" value={metrics.scheduled} icon={Clock} colorClass="bg-orange-600 text-white" />
          <MetricCard title="Entrevistas Realizadas" value={metrics.conducted} icon={FileText} colorClass="bg-purple-600 text-white" />
          <MetricCard title="Contratados (Em Prévia)" value={metrics.totalHired} icon={TrendingUp} colorClass="bg-blue-600 text-white" subValue="Passaram na seleção" />
          <MetricCard title="Autorizados" value={metrics.hired} icon={UserCheck} colorClass="bg-emerald-600 text-white" subValue="Contratações efetivas" />
          <MetricCard title="Faltas" value={metrics.noShow} icon={Ghost} colorClass="bg-rose-500 text-white" subValue="Não compareceram" />
          <MetricCard title="Desistências" value={metrics.withdrawn} icon={UserMinus} colorClass="bg-rose-600 text-white" subValue="Candidato desistiu" />
          <MetricCard title="Desqualificados" value={metrics.disqualified} icon={XCircle} colorClass="bg-rose-700 text-white" subValue="Reprovados pelo gestor" />
          <MetricCard title="Taxa de Comparecimento" value={`${metrics.attendanceRate.toFixed(1)}%`} icon={Percent} colorClass="bg-slate-800 text-white dark:bg-slate-700" subValue="Efetividade Agenda" />
          <MetricCard title="Taxa de Contratação" value={`${metrics.hiringRate.toFixed(1)}%`} icon={Percent} colorClass="bg-slate-800 text-white dark:bg-slate-700" subValue="Conversão Final" />
        </div>
      </section>
    </div>
  );
};