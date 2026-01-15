import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw } from 'lucide-react';
import { CandidateStatus, ChecklistTaskState, GestorTask, LeadTask } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { GestorTasksSection } from '@/components/gestor/GestorTasksSection';
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal';
import toast from 'react-hot-toast';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';

const StatusBadge = ({ status }: { status: CandidateStatus }) => {
  const colors = {
    'Entrevista': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    'Aguardando Prévia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Onboarding Online': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Integração Presencial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Acompanhamento 90 Dias': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Autorizado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Reprovado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'Triagem': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

type AgendaItem = {
  id: string;
  type: 'task' | 'interview' | 'feedback' | 'gestor_task' | 'consultant_event';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember' | 'lead';
  dueDate: string;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications, consultantEvents } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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
  } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!user) return { totalCrmLeads: 0, newLeadsThisMonth: 0, meetingsThisMonth: 0, proposalValueThisMonth: 0, soldValueThisMonth: 0, pendingLeadTasks: [] };

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

    const proposalValueThisMonth = leadsForGestor.reduce((sum, lead) => {
      if (lead.proposalValue && lead.proposalValue > 0 && lead.proposalClosingDate) {
        const proposalDate = new Date(lead.proposalClosingDate + 'T00:00:00');
        if (proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd) {
          return sum + (lead.proposalValue || 0);
        }
      }
      return sum;
    }, 0);

    const soldValueThisMonth = leadsForGestor.reduce((sum, lead) => {
      if (lead.soldCreditValue && lead.soldCreditValue > 0 && lead.saleDate) {
        const saleDate = new Date(lead.saleDate + 'T00:00:00');
        if (saleDate >= currentMonthStart && saleDate <= currentMonthEnd) {
          return sum + (lead.soldCreditValue || 0);
        }
      }
      return sum;
    }, 0);

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
    };
  }, [crmLeads, leadTasks, user]);

  // --- Hiring Metrics (existing) ---
  const totalCandidates = candidates.length;
  const authorized = teamMembers.filter(m => m.isActive && m.roles.includes('Autorizado')).length;
  const previas = teamMembers.filter(m => m.isActive && m.roles.includes('Prévia')).length;
  const activeTeam = teamMembers.filter(m => m.isActive).length;

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
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user.id && c.date === todayStr && c.done);
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
  }, [candidates, teamMembers, checklistStructure, leadTasks, crmLeads, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, consultantEvents]);

  const getAgendaIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'interview': return <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'feedback': return <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
      case 'gestor_task': return <ListTodo className="w-4 h-4 text-brand-600 dark:text-brand-400" />;
      case 'consultant_event': return <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') {
      navigate(`/gestor/candidate/${item.personId}`);
    } else if (item.personType === 'lead') {
      navigate(`/gestor/crm`);
    } else if (item.type === 'gestor_task') {
      toast.info("Gerencie suas tarefas do gestor na seção 'Tarefas do Gestor'.");
    } else if (item.type === 'consultant_event') {
      navigate('/gestor/calendar');
    } else {
      navigate('/gestor/feedbacks');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const candidatesForTable = useMemo(() => {
    let currentCandidates = candidates.filter(c => c.status !== 'Triagem');

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) <= end);
    }

    const sortedCandidates = currentCandidates.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;

      return dateB - dateA;
    });

    console.log("Candidates for table (sorted by createdAt):", sortedCandidates.map(c => ({ name: c.name, createdAt: c.createdAt })));

    return sortedCandidates;
  }, [candidates, filterStartDate, filterEndDate]);

  const clearCandidateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveCandidateFilters = filterStartDate || filterEndDate;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between flex-col sm:flex-row">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCrmLeads}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Novos Leads (Mês)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{newLeadsThisMonth}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reuniões Agendadas (Mês)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{meetingsThisMonth}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Propostas (Mês)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(proposalValueThisMonth)}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Vendido (Mês)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(soldValueThisMonth)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPendingTasksModalOpen(true)}
                  className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                >
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <ListTodo className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tarefas de Lead Pendentes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingLeadTasks.length}</p>
                  </div>
                </button>
              </div>

              {/* Seção de Métricas de Contratação */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-brand-500" />Métricas de Contratação</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Candidatos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCandidates}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Autorizados</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{authorized}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-orange-50 dark:bg-brand-900/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Prévias</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{previas}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Equipe Ativa</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeTeam}</p>
                  </div>
                </div>
              </div>

              {/* Minhas Tarefas Pessoais (Gestor) */}
              <div className="mb-8">
                <GestorTasksSection key={`${gestorTasks.length}-${gestorTaskCompletions.length}`} />
              </div>

              {/* Todos os Candidatos */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Todos os Candidatos</h2>
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 mt-2 sm:mt-0"
                  >
                    + Agendar Entrevista
                  </button>
                </div>

                {/* NOVO: Filtros de Data para Candidatos */}
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between flex-col sm:flex-row mb-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Candidatos por Data de Criação</h3>
                    {hasActiveCandidateFilters && (
                      <button onClick={clearCandidateFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
                        <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="candidateFilterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">De</label>
                      <input
                        type="date"
                        id="candidateFilterStartDate"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="candidateFilterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Até</label>
                      <input
                        type="date"
                        id="candidateFilterEndDate"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {isDataLoading ? (
                  <div className="p-6">
                    <TableSkeleton />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                      <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white font-medium">
                        <tr>
                          <th className="px-6 py-3">Nome</th>
                          <th className="px-6 py-3">Data Entrevista</th>
                          <th className="px-6 py-3">Nota</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {candidatesForTable.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                              Nenhum candidato cadastrado ainda.
                            </td>
                          </tr>
                        ) : (
                          candidatesForTable.map((c) => {
                            const totalScore =
                              c.interviewScores.basicProfile +
                              c.interviewScores.commercialSkills +
                              c.interviewScores.behavioralProfile +
                              c.interviewScores.jobFit;

                            return (
                              <tr
                                key={c.id}
                                onClick={() => navigate(`/gestor/candidate/${c.id}`)}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xs">
                                          {c.name.substring(0,2).toUpperCase()}
                                      </div>
                                      <span>{c.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 flex items-center space-x-2">
                                   <Calendar className="w-4 h-4 text-gray-400" />
                                   <span>{new Date(c.interviewDate + 'T00:00:00').toLocaleDateString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`font-bold ${totalScore > 0 ? (totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') : 'text-gray-400'}`}>
                                      {totalScore > 0 ? `${totalScore}/100` : 'Pendente'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <StatusBadge status={c.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
        </>
      )}
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
      <PendingLeadTasksModal
        isOpen={isPendingTasksModalOpen}
        onClose={() => setIsPendingTasksModalOpen(false)}
        pendingTasks={pendingLeadTasks}
        crmLeads={crmLeads}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default Dashboard;