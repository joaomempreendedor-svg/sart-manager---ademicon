import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw } from 'lucide-react';
import { CandidateStatus, ChecklistTaskState, GestorTask, LeadTask, CrmLead } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { GestorTasksSection } from '@/components/gestor/GestorTasksSection';
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal';
import toast from 'react-hot-toast';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LeadsDetailModal } from '@/components/gestor/LeadsDetailModal'; // NOVO: Importar o modal de detalhes de leads

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, crmStages, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // NOVO: Estados para o modal de detalhes de leads
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

  // --- Commercial Metrics ---
  const {
    totalCrmLeads,
    newLeadsThisMonth,
    meetingsThisMonth,
    proposalValueThisMonth,
    soldValueThisMonth,
    pendingLeadTasks,
    leadsWithProposalThisMonth, // NOVO: Lista de leads com proposta no mês
    leadsSoldThisMonth, // NOVO: Lista de leads vendidos no mês
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
          proposalValueThisMonth += (lead.proposalValue || 0);
          leadsWithProposalThisMonth.push(lead);
        }
      }
    });

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
      leadsWithProposalThisMonth, // NOVO
      leadsSoldThisMonth, // NOVO
    };
  }, [crmLeads, leadTasks, user, crmStages]);

  // --- Agenda Items ---
  const { todayAgenda, overdueTasks, allGestorTasks } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];
    const gestorPersonalTasks: AgendaItem[] = [];

    // 1. Checklist Tasks (Candidatos)
    candidates.forEach(candidate => {
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
    });

    // 2. Interviews (Candidatos)
    candidates.forEach(candidate => {
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

    // 3. Feedbacks (Candidatos e Membros da Equipe)
    const allPeople = [
      ...candidates.map(c => ({ ...c, personType: 'candidate' as const })),
      ...teamMembers.map(m => ({ ...m, personType: 'teamMember' as const }))
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

    // 4. Gestor Personal Tasks (Tarefas do Gestor)
    gestorTasks.filter(task => task.user_id === user?.id).forEach(task => {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === todayStr && c.done);
      const isDueToday = isGestorTaskDueOnDate(task, todayStr);

      if (!isCompletedToday && isDueToday) {
        const agendaItem: AgendaItem = {
          id: `gestor-task-${task.id}`,
          type: 'gestor_task',
          title: task.title,
          personName: 'Eu',
          personId: user!.id,
          personType: 'teamMember',
          dueDate: task.due_date || '',
        };
        todayAgendaItems.push(agendaItem);
      } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
        overdueItems.push(agendaItem);
      }
      gestorPersonalTasks.push({
        id: `gestor-task-${task.id}`,
        type: 'gestor_task',
        title: task.title,
        personName: 'Eu',
        personId: user!.id,
        personType: 'teamMember',
        dueDate: task.due_date || '',
      });
    });


    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems, allGestorTasks: gestorPersonalTasks };
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
      navigate(`/gestor/crm`);
    } else if (item.type === 'gestor_task') {
      toast.info("Gerencie suas tarefas do gestor na seção 'Tarefas do Gestor'.");
    } else {
      navigate('/gestor/feedbacks');
    }
  };

  // NOVO: Funções para abrir o modal de detalhes de leads
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
              {/* Seção de Métricas Comerciais */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Métricas Comerciais (Mês Atual)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                  <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totalCrmLeads}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                  <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Novos Leads (Mês)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{newLeadsThisMonth}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                  <div className="p-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reuniões Mês</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{meetingsThisMonth}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenLeadsDetailModal('Valor Propostas Mês', leadsWithProposalThisMonth, 'proposal')}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                >
                  <div className="p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valor Propostas (Mês)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(proposalValueThisMonth)}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </button>
                <button 
                  onClick={() => handleOpenLeadsDetailModal('Valor Vendido Mês', leadsSoldThisMonth, 'sold')}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                >
                  <div className="p-1 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valor Vendido (Mês)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(soldValueThisMonth)}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </button>
                <button 
                  onClick={() => setIsPendingTasksModalOpen(true)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                >
                  <div className="p-1 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <ListTodo className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1"> {/* Adicionado flex-1 aqui */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tarefas de Lead Pendentes</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{pendingLeadTasks.length}</p> {/* Reduzido text-2xl para text-lg */}
                  </div>
                </button>
              </div>

              {/* Minhas Tarefas Pessoais (Gestor) */}
              <div className="mb-6">
                <GestorTasksSection key={`${gestorTasks.length}-${gestorTaskCompletions.length}`} />
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
      {/* NOVO: Renderiza o LeadsDetailModal */}
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