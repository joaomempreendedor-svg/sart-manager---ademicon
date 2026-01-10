import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, CalendarCheck, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat } from 'lucide-react'; // Adicionado Repeat icon
import { CandidateStatus, ChecklistTaskState, GestorTask, LeadTask } from '@/types'; // Importar GestorTask e LeadTask
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { GestorTasksSection } from '@/components/gestor/GestorTasksSection'; // Importar o novo componente
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal'; // NOVO: Importar o modal de tarefas pendentes
import toast from 'react-hot-toast';
import { NotificationBell } from '@/components/NotificationBell'; // Importar NotificationBell
import { NotificationCenter } from '@/components/NotificationCenter'; // Importar NotificationCenter

const StatusBadge = ({ status }: { status: CandidateStatus }) => {
  const colors = {
    'Entrevista': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    'Aguardando Prévia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Onboarding Online': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Integração Presencial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Acompanhamento 90 Dias': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Autorizado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Reprovado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

type AgendaItem = {
  id: string;
  type: 'task' | 'interview' | 'feedback' | 'meeting' | 'gestor_task'; // Adicionado 'gestor_task'
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember' | 'lead';
  dueDate: string;
  meetingDetails?: {
    startTime: string;
    endTime: string;
    consultantName: string;
    managerInvitationStatus?: 'pending' | 'accepted' | 'declined';
    taskId: string;
  };
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, updateLeadMeetingInvitationStatus, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications } = useApp(); // Added notifications
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false); // State for NotificationCenter

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
    pendingLeadTasks, // NOVO: Agora é a lista de tarefas, não apenas a contagem
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
      // A tarefa deve ser do tipo 'meeting' e estar associada a um lead que o gestor gerencia
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

    // NOVO: Lista de Tarefas Pendentes (Hoje/Atrasadas)
    const pendingLeadTasksList: LeadTask[] = leadTasks.filter(task => {
      // Tarefas pendentes para leads que o gestor gerencia
      const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
      if (!lead || task.is_completed) return false;
      if (!task.due_date) return false; // Only tasks with a due date
      
      const taskDueDate = new Date(task.due_date + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');

      return taskDueDate <= todayDate; // Due today or overdue
    }).sort((a, b) => {
      // Sort by due date, with undated tasks at the end
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
  const previas = teamMembers.filter(m => m.isActive && m.roles.includes('Prévia')).length; // NOVO: Contagem de Prévias
  const activeTeam = teamMembers.filter(m => m.isActive).length;

  // --- Agenda Items ---
  const { todayAgenda, overdueTasks, meetingInvitations, allGestorTasks } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];
    const invitationsItems: AgendaItem[] = [];
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

    // 4. Lead Tasks (CRM) - Meeting Invitations for Gestor
    if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
      leadTasks.filter(task =>
        task.type === 'meeting' &&
        task.manager_id === user.id &&
        task.manager_invitation_status === 'pending'
      ).forEach(task => {
        const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
        const consultant = teamMembers.find(tm => tm.id === task.user_id);
        if (lead && consultant && task.meeting_start_time && task.meeting_end_time) {
          invitationsItems.push({
            id: `meeting-invite-${task.id}`,
            type: 'meeting',
            title: `Convite de Reunião: ${task.title}`,
            personName: lead.name || 'Lead Desconhecido',
            personId: lead.id,
            personType: 'lead',
            dueDate: task.due_date || new Date(task.meeting_start_time).toISOString().split('T')[0],
            meetingDetails: {
              startTime: new Date(task.meeting_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              endTime: new Date(task.meeting_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              consultantName: consultant.name,
              managerInvitationStatus: task.manager_invitation_status,
              taskId: task.id,
            }
          });
        }
      });
    }

    // 5. Gestor Personal Tasks (Tarefas do Gestor)
    gestorTasks.filter(task => task.user_id === user?.id).forEach(task => {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user.id && c.date === todayStr && c.done);
      const isDueToday = isGestorTaskDueOnDate(task, todayStr);

      if (!isCompletedToday && isDueToday) { // Apenas tarefas devidas hoje e não concluídas hoje
        const agendaItem: AgendaItem = {
          id: `gestor-task-${task.id}`,
          type: 'gestor_task', // NOVO: Tipo específico para tarefas do gestor
          title: task.title,
          personName: 'Eu', // Tarefa pessoal do gestor
          personId: user!.id,
          personType: 'teamMember',
          dueDate: task.due_date || '',
        };
        todayAgendaItems.push(agendaItem);
      } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
        // Tarefas não recorrentes atrasadas
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
      gestorPersonalTasks.push({ // Todas as tarefas do gestor (para a seção)
        id: `gestor-task-${task.id}`,
        type: 'gestor_task',
        title: task.title,
        personName: 'Eu',
        personId: user!.id,
        personType: 'teamMember',
        dueDate: task.due_date || '',
      });
    });


    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems, meetingInvitations: invitationsItems, allGestorTasks: gestorPersonalTasks };
  }, [candidates, teamMembers, checklistStructure, leadTasks, crmLeads, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate]);

  const getAgendaIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'interview': return <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'feedback': return <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
      case 'meeting': return <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'gestor_task': return <ListTodo className="w-4 h-4 text-brand-600 dark:text-brand-400" />; // NOVO: Ícone para tarefas do gestor
    }
  };

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') {
      navigate(`/gestor/candidate/${item.personId}`);
    } else if (item.personType === 'lead') {
      navigate(`/gestor/crm`);
    } else if (item.type === 'gestor_task') { // NOVO: Navegação para tarefas do gestor
      // Não há navegação específica para a tarefa em si, pois ela é gerenciada na seção abaixo
      toast.info("Gerencie suas tarefas do gestor na seção 'Tarefas do Gestor'.");
    } else {
      navigate('/gestor/feedbacks');
    }
  };

  const handleInvitationResponse = async (taskId: string, status: 'accepted' | 'declined', meetingDetails: AgendaItem['meetingDetails']) => {
    if (!user || !meetingDetails) return;

    try {
      await updateLeadMeetingInvitationStatus(taskId, status);
      toast.success(`Convite de reunião ${status === 'accepted' ? 'aceito' : 'recusado'} com sucesso!`);

      if (status === 'accepted') {
        const startDateTime = new Date(meetingDetails.dueDate + 'T' + meetingDetails.startTime);
        const endDateTime = new Date(meetingDetails.dueDate + 'T' + meetingDetails.endTime);

        const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
        googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
        googleCalendarUrl.searchParams.append('text', encodeURIComponent(meetingDetails.title || 'Reunião'));
        googleCalendarUrl.searchParams.append('dates', `${startDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}/${endDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}`);
        googleCalendarUrl.searchParams.append('details', encodeURIComponent(`Reunião com o lead ${meetingDetails.personName} e consultor ${meetingDetails.consultantName}`));
        if (user.email) {
          googleCalendarUrl.searchParams.append('add', encodeURIComponent(user.email));
        }
        const consultant = teamMembers.find(tm => tm.name === meetingDetails.consultantName);
        if (consultant?.email) {
          googleCalendarUrl.searchParams.append('add', encodeURIComponent(consultant.email));
        }

        window.open(googleCalendarUrl.toString(), '_blank');
      }
    } catch (error) {
      console.error("Erro ao responder convite:", error);
      toast.error("Erro ao responder ao convite. Tente novamente.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between"> {/* Adicionado flex e justify-between */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral do Gestor</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso da equipe e as métricas chave.</p>
        </div>
        <div className="flex items-center space-x-4"> {/* Container para o sino */}
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
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
        {/* NOVO CARD: Tarefas Pendentes - Agora clicável */}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Prévias</p> {/* Alterado de 'Em Treinamento' para 'Prévias' */}
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{previas}</p> {/* Usando a nova contagem */}
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

      {/* Meeting Invitations Section */}
      {user?.role === 'GESTOR' && meetingInvitations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/20 rounded-t-xl">
            <BellRing className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Convites de Reunião</h2>
            <span className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs font-bold px-2 py-0.5 rounded-full">{meetingInvitations.length}</span>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {meetingInvitations.map((item) => (
                <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="p-4 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        <span className="flex items-center"><UserRound className="w-3 h-3 mr-1" /> Consultor: <span className="font-semibold ml-1">{item.meetingDetails?.consultantName}</span></span>
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(item.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {item.meetingDetails?.startTime} - {item.meetingDetails?.endTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInvitationResponse(item.meetingDetails!.taskId, 'accepted', item.meetingDetails)}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium hover:bg-green-600 flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aceitar</span>
                      </button>
                      <button
                        onClick={() => handleInvitationResponse(item.meetingDetails!.taskId, 'declined', item.meetingDetails)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Agenda Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                 <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                 <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Tarefas Atrasadas</h2>
                 <span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 text-xs font-bold px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
            </div>
            <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
                {overdueTasks.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Nenhuma tarefa atrasada.</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {overdueTasks.map((task) => (
                            <li key={task.id} onClick={() => handleAgendaItemClick(task)} className="p-4 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer transition">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{task.title}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Pessoa: <span className="font-semibold">{task.personName}</span></span>
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Venceu: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Today Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
                 <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                 <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Agenda de Hoje</h2>
                 <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs font-bold px-2 py-0.5 rounded-full">{todayAgenda.length}</span>
            </div>
            <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
                 {todayAgenda.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Nenhuma tarefa agendada para hoje.</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {todayAgenda.map((item) => (
                            <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-0.5">{getAgendaIcon(item.type)}</div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Pessoa: <span className="font-semibold">{item.personName}</span></span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      </div>

      {/* Minhas Tarefas Pessoais (Gestor) */}
      <div className="mb-8">
        <GestorTasksSection key={`${gestorTasks.length}-${gestorTaskCompletions.length}`} /> {/* Added key */}
      </div>

      {/* Todos os Candidatos */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Todos os Candidatos</h2>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300"
          >
            + Agendar Entrevista
          </button>
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
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      Nenhum candidato cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
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
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
      {/* NOVO: Renderiza o modal de tarefas pendentes */}
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