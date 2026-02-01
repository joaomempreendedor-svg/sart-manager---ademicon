import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw, CalendarPlus, Mail, Phone, ClipboardCheck } from 'lucide-react';
import { CandidateStatus, ChecklistTaskState, GestorTask, LeadTask, CrmLead } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal';
import toast from 'react-hot-toast';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LeadsDetailModal } from '@/components/gestor/LeadsDetailModal';
import { formatLargeCurrency } from '@/utils/currencyUtils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Tipo para itens da agenda
interface AgendaItem {
  id: string;
  type: 'task' | 'interview' | 'feedback' | 'gestor_task';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember' | 'lead';
  dueDate: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, crmStages, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const [isLeadsDetailModalOpen, setIsLeadsDetailModalOpen] = useState(false);
  const [leadsModalTitle, setLeadsModalTitle] = useState('');
  const [leadsForModal, setLeadsForModal] = useState<CrmLead[]>([]);
  const [leadsMetricType, setLeadsMetricType] = useState<'proposal' | 'sold'>('proposal');


  const handleOpenNotifications = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleCloseNotifications = () => {
    setIsNotificationCenterOpen(false);
  };

  const {
    totalCrmLeads,
    newLeadsThisMonth,
    meetingsThisMonth,
    proposalValueThisMonth,
    soldValueThisMonth,
    pendingLeadTasks,
    leadsWithProposalThisMonth,
    leadsSoldThisMonth,
  } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!user) return { totalCrmLeads: 0, newLeadsThisMonth: 0, meetingsThisMonth: 0, proposalValueThisMonth: 0, soldValueThisMonth: 0, pendingLeadTasks: [], leadsWithProposalThisMonth: [], leadsSoldThisMonth: [] };

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const leadsForGestor = crmLeads.filter(lead => lead.user_id === user.id);

    const totalCrmLeads = leadsForGestor.length;
    const newLeadsThisMonth = leadsForGestor.filter(lead => new Date(lead.created_at) >= currentMonthStart).length;

    const meetingsThisMonth = leadTasks.filter(task => {
      const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
      if (!lead || task.type !== 'meeting') return false;
      
      const taskDate = new Date(task.due_date || task.meeting_start_time || '');
      return taskDate >= currentMonthStart && taskDate <= currentMonthEnd;
    }).length;

    let proposalValueThisMonth = 0;
    const leadsWithProposalThisMonth: CrmLead[] = [];
    leadsForGestor.forEach(lead => {
      if (lead.proposalValue && lead.proposalValue > 0 && lead.proposalClosingDate) {
        const proposalDate = new Date(lead.proposalClosingDate + 'T00:00:00');
        if (proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd) {
          return sum + (lead.proposalValue || 0);
        }
      }
      return sum;
    }, 0);

    let soldValueThisMonth = 0;
    const leadsSoldThisMonth: CrmLead[] = [];
    leadsForGestor.forEach(lead => {
      if (lead.soldCreditValue && lead.soldCreditValue > 0 && lead.saleDate) {
        const saleDate = new Date(lead.saleDate + 'T00:00:00');
        if (saleDate >= currentMonthStart && saleDate <= currentMonthEnd) {
          soldValueThisMonth += (lead.soldCreditValue || 0);
          leadsSoldThisMonth.push(lead);
        }
      }
    });

    const pendingLeadTasksList: LeadTask[] = leadTasks.filter(task => {
      const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
      if (!lead || task.is_completed) return false;
      if (!task.due_date) return false;
      
      const taskDueDate = new Date(task.due_date + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');

      return taskDueDate <= todayDate;
    }).sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return {
      totalCrmLeads,
      newLeadsThisMonth,
      meetingsThisMonth,
      proposalValueThisMonth,
      soldValueThisMonth,
      pendingLeadTasks: pendingLeadTasksList,
      leadsWithProposalThisMonth,
      leadsSoldThisMonth,
    };
  }, [crmLeads, leadTasks, user, crmStages]);

  const { todayAgenda, overdueTasks } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];

    // Candidatos: Tarefas de Checklist e Entrevistas
    candidates.filter(c => c.responsibleUserId === user?.id).forEach(candidate => {
      Object.entries(candidate.checklistProgress || {}).forEach(([taskId, state]) => {
        if (state.dueDate) {
          const item = checklistStructure.flatMap(s => s.items).find(i => i.id === taskId);
          if (item) {
            const agendaItem: AgendaItem = {
              id: `${candidate.id}-${taskId}`,
              type: 'task',
              title: item.label,
              personName: candidate.name,
              personId: candidate.id,
              personType: 'candidate',
              dueDate: state.dueDate,
            };
            if (state.dueDate === todayStr && !state.completed) {
              todayAgendaItems.push(agendaItem);
            } else if (state.dueDate < todayStr && !state.completed) {
              overdueItems.push(agendaItem);
            }
          }
        }
      });

      if (candidate.interviewDate === todayStr) {
        todayAgendaItems.push({
          id: `interview-${candidate.id}`,
          type: 'interview',
          title: 'Entrevista Agendada',
          personName: candidate.name,
          personId: candidate.id,
          personType: 'candidate',
          dueDate: candidate.interviewDate,
        });
      }
    });

    // Feedbacks (Candidatos e Membros da Equipe)
    const allPeople = [
      ...candidates.filter(c => c.responsibleUserId === user?.id).map(c => ({ ...c, personType: 'candidate' as const })),
      ...teamMembers.filter(m => m.id === user?.id || m.roles.includes('Gestor')).map(m => ({ ...m, personType: 'teamMember' as const })) // Incluir o próprio gestor
    ];
    allPeople.forEach(person => {
      (person.feedbacks || []).forEach(feedback => {
        if (feedback.date === todayStr) {
          todayAgendaItems.push({
            id: `feedback-${person.id}-${feedback.id}`,
            type: 'feedback',
            title: 'Sessão de Feedback',
            personName: person.name,
            personId: person.id,
            personType: person.personType,
            dueDate: feedback.date,
          });
        }
      });
    });

    // Tarefas do Gestor (pessoais)
    gestorTasks.filter(task => task.user_id === user?.id).forEach(task => {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === todayStr && c.done);
      const isDueToday = isGestorTaskDueOnDate(task, todayStr);

      if (!isCompletedToday && isDueToday) {
        const agendaItem: AgendaItem = {
          id: `gestor-task-${task.id}`,
          type: 'gestor_task',
          title: task.title,
          personName: 'Eu', // Para tarefas pessoais do gestor
          personId: user!.id,
          personType: 'teamMember',
          dueDate: task.due_date || '',
        };
        todayAgendaItems.push(agendaItem);
      } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
        overdueItems.push({
          id: `gestor-task-${task.id}`,
          type: 'gestor_task',
          title: task.title,
          personName: 'Eu',
          personId: user!.id,
          personType: 'teamMember',
          dueDate: task.due_date,
        });
      }
    });

    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems };
  }, [candidates, teamMembers, checklistStructure, leadTasks, crmLeads, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate]);

  const getAgendaIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'interview': return <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'feedback': return <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
      case 'gestor_task': return <ListTodo className="w-4 h-4 text-brand-600 dark:text-brand-400" />;
    }
  };

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') {
      navigate(`/gestor/candidate/${item.personId}`);
    } else if (item.personType === 'lead') {
      navigate(`/gestor/crm`, { state: { highlightLeadId: item.personId, highlightLeadTaskId: item.id } });
    } else if (item.type === 'gestor_task') {
      // Para tarefas do gestor, podemos navegar para a seção de tarefas ou apenas mostrar um toast
      toast.info("Gerencie suas tarefas pessoais na seção 'Minhas Tarefas'.");
    } else {
      navigate('/gestor/feedbacks');
    }
  };

  const handleOpenLeadsDetailModal = (title: string, leads: CrmLead[], metricType: 'proposal' | 'sold') => {
    setLeadsModalTitle(title);
    setLeadsForModal(leads);
    setLeadsMetricType(metricType);
    setIsLeadsDetailModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral do Gestor</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso da equipe e as métricas chave.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <NotificationBell
            notificationCount={notifications.length}
            onClick={handleOpenNotifications}
          />
          <NotificationCenter
            isOpen={isNotificationCenterOpen}
            onClose={handleCloseNotifications}
            notifications={notifications}
          />
        </div>
      </div>

      {isDataLoading ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
        </div>
      ) : (
        <>
            <div className="animate-fade-in">
              {/* Seção de Ações Rápidas */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Plus className="w-5 h-5 mr-2 text-brand-500" />Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Button onClick={() => navigate('/gestor/crm')} className="h-auto py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold shadow-md hover:shadow-lg transition-all">
                  <TrendingUp className="w-6 h-6 mr-3" /> Monitorar CRM
                </Button>
                <Button onClick={() => setIsScheduleModalOpen(true)} className="h-auto py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold shadow-md hover:shadow-lg transition-all">
                  <CalendarPlus className="w-6 h-6 mr-3" /> Agendar Entrevista
                </Button>
                <Button onClick={() => navigate('/gestor/daily-checklist-monitoring')} className="h-auto py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold shadow-md hover:shadow-lg transition-all">
                  <ClipboardCheck className="w-6 h-6 mr-3" /> Monitorar Metas Diárias
                </Button>
                <Button onClick={() => navigate('/gestor/config-team')} className="h-auto py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold shadow-md hover:shadow-lg transition-all">
                  <Users className="w-6 h-6 mr-3" /> Gerenciar Equipe
                </Button>
              </div>

              {/* Main Content Grid - Agora em uma única coluna */}
              <div className="grid grid-cols-1 gap-6">
                {/* Métricas Comerciais */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Métricas Comerciais (Mês Atual)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{totalCrmLeads}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Novos Leads (Mês)</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{newLeadsThisMonth}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3">
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reuniões Mês</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{meetingsThisMonth}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenLeadsDetailModal('Valor Propostas Mês', leadsWithProposalThisMonth, 'proposal')}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3"
                    >
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valor Propostas (Mês)</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{formatCurrency(proposalValueThisMonth)}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleOpenLeadsDetailModal('Valor Vendido Mês', leadsSoldThisMonth, 'sold')}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3"
                    >
                      <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valor Vendido (Mês)</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{formatCurrency(soldValueThisMonth)}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setIsPendingTasksModalOpen(true)}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex items-center space-x-3"
                    >
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <ListTodo className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tarefas de Lead Pendentes</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">{pendingLeadTasks.length}</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Agenda do Dia */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-brand-500" /> Agenda do Dia</h2>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md">
                    {todayAgenda.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum item na agenda para hoje.</p>
                    ) : (
                      <ScrollArea className="h-[200px] pr-4 custom-scrollbar">
                        <ul className="space-y-3">
                          {todayAgenda.map(item => (
                            <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                              <div className="flex-shrink-0 mt-0.5">
                                {getAgendaIcon(item.type)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                  {item.personName}
                                </p>
                                {item.dueDate && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" /> {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </div>

                {/* Tarefas Atrasadas */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" /> Tarefas Atrasadas</h2>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md">
                    {overdueTasks.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tarefa atrasada. Bom trabalho!</p>
                    ) : (
                      <ScrollArea className="h-[200px] pr-4 custom-scrollbar">
                        <ul className="space-y-3">
                          {overdueTasks.map(item => (
                            <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="flex items-start space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer border border-red-200 dark:border-red-800">
                              <div className="flex-shrink-0 mt-0.5">
                                {getAgendaIcon(item.type)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-red-800 dark:text-red-200">{item.title}</p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                                  {item.personName}
                                </p>
                                {item.dueDate && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" /> Venceu em: {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </>
      )}
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
      <PendingLeadTasksModal
        isOpen={isPendingTasksModalOpen}
        onClose={() => {
          console.log("[ConsultorDashboard] PendingLeadTasksModal onClose called");
          setIsPendingTasksModalOpen(false);
        }}
        pendingTasks={pendingLeadTasks}
        crmLeads={crmLeads}
        teamMembers={teamMembers}
      />
      <LeadsDetailModal
        isOpen={isLeadsDetailModalOpen}
        onClose={() => setIsLeadsDetailModalOpen(false)}
        title={leadsModalTitle}
        leads={leadsForModal}
        crmStages={crmStages}
        teamMembers={teamMembers}
        metricType={leadsMetricType}
      />
    </div>
  );
};

export default Dashboard;