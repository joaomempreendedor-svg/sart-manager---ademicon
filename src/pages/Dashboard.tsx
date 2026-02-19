import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw, CalendarPlus, Mail, Phone, ClipboardCheck, UserPlus, UserCheck, PieChart, MessageSquare, UserX, UserMinus, Ghost, MapPin, BarChart3, FileText, Percent, HelpCircle, PhoneCall, CalendarCheck } from 'lucide-react'; // Adicionado CalendarCheck
import { CandidateStatus, ChecklistTaskState, GestorTask, LeadTask, CrmLead, Candidate, ColdCallLead, ColdCallLog, ColdCallDetailType } from '@/types'; // Adicionado ColdCallLead, ColdCallLog, ColdCallDetailType
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal';
import toast from 'react-hot-toast';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LeadsDetailModal } from '@/components/gestor/LeadsDetailModal';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal'; // Importar o novo modal
import { ColdCallDetailModal } from '@/components/gestor/ColdCallDetailModal'; // NOVO: Importar o modal de detalhes de Cold Call
import { formatLargeCurrency } from '@/utils/currencyUtils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface AgendaItem {
  id: string;
  type: 'task' | 'interview' | 'feedback' | 'gestor_task';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember' | 'lead';
  dueDate: string;
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
      </div >
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

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, crmStages, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications, hiringOrigins, getColdCallMetrics, coldCallLeads, coldCallLogs } = useApp(); // Adicionado coldCallLeads, coldCallLogs, getColdCallMetrics
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const [isLeadsDetailModalOpen, setIsLeadsDetailModalOpen] = useState(false);
  const [leadsModalTitle, setLeadsModalTitle] = useState('');
  const [leadsForModal, setLeadsForModal] = useState<CrmLead[]>([]);
  const [leadsMetricType, setLeadsMetricType] = useState<'proposal' | 'sold' | 'meeting'>('proposal');

  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false); // NOVO: Estado para o modal de candidatos
  const [candidatesModalTitle, setCandidatesModalTitle] = useState(''); // NOVO: Título do modal de candidatos
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]); // NOVO: Lista de candidatos para o modal
  const [candidatesMetricType, setCandidatesMetricType] = useState<'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse'>('total'); // NOVO: Tipo de métrica para o modal de candidatos, adicionado 'noResponse'

  // NOVO: Estados para o modal de detalhes de Cold Call
  const [isColdCallDetailModalOpen, setIsColdCallDetailModal] = useState(false);
  const [coldCallModalTitle, setColdCallModalTitle] = useState('');
  const [coldCallLeadsForModal, setColdCallLeadsForModal] = useState<ColdCallLead[]>([]);
  const [coldCallLogsForModal, setColdCallLogsForModal] = useState<ColdCallLog[]>([]);
  const [coldCallDetailType, setColdCallDetailType] = useState<ColdCallDetailType>('all');
  const [selectedColdCallConsultantName, setSelectedColdCallConsultantName] = useState<string>('Todos os Consultores'); // Default para "Todos os Consultores"
  const [selectedColdCallConsultantId, setSelectedColdCallConsultantId] = useState<string | null>(null); // Default para null (todos)
  const [coldCallFilterStartDate, setColdCallFilterStartDate] = useState(''); // NOVO: Filtro de data de início para Cold Call
  const [coldCallFilterEndDate, setColdCallFilterEndDate] = useState('');     // NOVO: Filtro de data de fim para Cold Call


  const handleOpenNotifications = () => setIsNotificationCenterOpen(true);
  const handleCloseNotifications = () => setIsNotificationCenterOpen(false);

  // --- Métricas Comerciais (Mês Atual) ---
  const commercialMetrics = useMemo(() => {
    const today = new Date();
    if (!user) return null;

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const leadsForGestor = crmLeads.filter(lead => lead.user_id === user.id);

    const totalLeads = leadsForGestor.length;
    const newLeads = leadsForGestor.filter(lead => new Date(lead.created_at) >= currentMonthStart).length;

    const meetingsTasks = leadTasks.filter(task => {
      const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
      if (!lead || task.type !== 'meeting') return false;
      const taskDate = new Date(task.due_date || task.meeting_start_time || '');
      return taskDate >= currentMonthStart && taskDate <= currentMonthEnd;
    });
    const meetingsCount = meetingsTasks.length;

    const leadsWithMeetings = crmLeads.filter(lead => 
      meetingsTasks.some(task => task.lead_id === lead.id)
    );

    const leadsWithProposal = leadsForGestor.filter(lead => {
      if (lead.proposal_value && lead.proposal_value > 0 && lead.proposal_closing_date) { // Usando snake_case
        const proposalDate = new Date(lead.proposal_closing_date + 'T00:00:00'); // Usando snake_case
        return proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd;
      }
      return false;
    });
    const proposalValue = leadsWithProposal.reduce((sum, lead) => sum + (lead.proposal_value || 0), 0); // Usando snake_case

    const leadsSold = leadsForGestor.filter(lead => {
      if (lead.sold_credit_value && lead.sold_credit_value > 0 && lead.sale_date) { // Usando snake_case
        const saleDate = new Date(lead.sale_date + 'T00:00:00'); // Usando snake_case
        return saleDate >= currentMonthStart && saleDate <= currentMonthEnd;
      }
      return false;
    });
    const soldValue = leadsSold.reduce((sum, lead) => sum + (lead.sold_credit_value || 0), 0); // Usando snake_case

    const pendingTasks = leadTasks.filter(task => {
      const lead = crmLeads.find(l => l.id === task.lead_id && l.user_id === user.id);
      return lead && !task.is_completed && task.due_date && new Date(task.due_date + 'T00:00:00') <= new Date(today.toISOString().split('T')[0] + 'T00:00:00');
    });

    return { totalLeads, newLeads, meetingsCount, proposalValue, soldValue, pendingTasks, leadsWithProposal, leadsSold, leadsWithMeetings };
  }, [crmLeads, leadTasks, user]);

  // --- Métricas de Contratação (Mês Atual) ---
  const hiringMetrics = useMemo(() => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const isInFilterRange = (dateString?: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date >= currentMonthStart && date <= currentMonthEnd;
    };

    const totalCandidates = candidates.filter(c => isInFilterRange(c.createdAt));
    
    const newCandidatesList = totalCandidates.filter(c => 
      (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)
    );

    const contactedList = totalCandidates.filter(c => 
      isInFilterRange(c.contactedDate) && c.screeningStatus === 'Contacted'
    );

    const noResponseList = totalCandidates.filter(c => // NOVO: Lista de Não Respondidos
      isInFilterRange(c.noResponseDate) && c.screeningStatus === 'No Response'
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
      newCandidates: newCandidatesList.length, // Este será o "Não Respondido"
      contacted: contactedList.length,
      noResponse: noResponseList.length, // NOVO: Contagem de Não Respondidos
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
      noResponseList, // NOVO: Lista de Não Respondidos para o modal
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
  }, [candidates, hiringOrigins]);

  // NOVO: Métricas de Cold Call (Mês Atual)
  const coldCallMetrics = useMemo(() => {
    console.log("[ColdCallMetrics] Calculating metrics...");
    console.log("[ColdCallMetrics] User:", user);
    console.log("[ColdCallMetrics] selectedColdCallConsultantId:", selectedColdCallConsultantId);
    console.log("[ColdCallMetrics] Raw coldCallLogs length:", coldCallLogs.length);

    if (!user) {
      console.log("[ColdCallMetrics] No user, returning zeros.");
      return { totalCalls: 0, totalConversations: 0, totalMeetingsScheduled: 0, conversationToMeetingRate: 0 };
    }

    // Se nenhum consultor específico for selecionado, o gestor deve ver as métricas de TODOS os consultores.
    // Caso contrário, filtra pelo consultor selecionado.
    const logsToConsider = selectedColdCallConsultantId 
      ? coldCallLogs.filter(log => log.user_id === selectedColdCallConsultantId)
      : coldCallLogs; // Se 'all' ou null, considera todos os logs que o gestor pode ver (via RLS)
    
    console.log("[ColdCallMetrics] logsToConsider length (after consultant filter):", logsToConsider.length);

    // Aplicar filtros de data
    let filteredLogs = logsToConsider;
    if (coldCallFilterStartDate) {
      const start = new Date(coldCallFilterStartDate + 'T00:00:00');
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) >= start);
    }
    if (coldCallFilterEndDate) {
      const end = new Date(coldCallFilterEndDate + 'T23:59:59');
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) <= end);
    }

    console.log("[ColdCallMetrics] filteredLogs length (after date filter):", filteredLogs.length);

    const totalCalls = filteredLogs.length;
    const totalConversations = filteredLogs.filter(log => log.result === 'Conversou' || log.result === 'Agendar Reunião').length;
    const totalMeetingsScheduled = filteredLogs.filter(log => log.result === 'Agendar Reunião').length;
    
    const conversationToMeetingRate = totalConversations > 0 ? (totalMeetingsScheduled / totalConversations) * 100 : 0;

    console.log("[ColdCallMetrics] Calculated metrics:", { totalCalls, totalConversations, totalMeetingsScheduled, conversationToMeetingRate });

    return {
      totalCalls,
      totalConversations,
      totalMeetingsScheduled,
      conversationToMeetingRate,
    };
  }, [user, selectedColdCallConsultantId, coldCallLogs, coldCallFilterStartDate, coldCallFilterEndDate]);

  // NOVO: Lista de consultores para o filtro de Cold Call
  const coldCallConsultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')));
  }, [teamMembers]);

  // --- Agenda do Dia ---
  const { todayAgenda, overdueTasks } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];

    candidates.filter(c => c.responsibleUserId === user?.id).forEach(candidate => {
      Object.entries(candidate.checklistProgress || {}).forEach(([taskId, state]) => {
        if (state.dueDate) {
          const item = checklistStructure.flatMap(s => s.items).find(i => i.id === taskId);
          if (item) {
            const agendaItem: AgendaItem = { id: `${candidate.id}-${taskId}`, type: 'task', title: item.label, personName: candidate.name, personId: candidate.id, personType: 'candidate', dueDate: state.dueDate };
            if (state.dueDate === todayStr && !state.completed) todayAgendaItems.push(agendaItem);
            else if (state.dueDate < todayStr && !state.completed) overdueItems.push(agendaItem);
          }
        }
      });
      if (candidate.interviewDate === todayStr) {
        todayAgendaItems.push({ id: `interview-${candidate.id}`, type: 'interview', title: 'Entrevista Agendada', personName: candidate.name, personId: candidate.id, personType: 'candidate', dueDate: candidate.interviewDate });
      }
    });

    gestorTasks.filter(task => task.user_id === user?.id).forEach(task => {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === todayStr && c.done);
      const isDueToday = isGestorTaskDueOnDate(task, todayStr);

      if (!isCompletedToday && isDueToday) {
        todayAgendaItems.push({ id: `gestor-task-${task.id}`, type: 'gestor_task', title: task.title, personName: 'Eu', personId: user!.id, personType: 'teamMember', dueDate: task.due_date || '' });
      } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
        overdueItems.push({ id: `gestor-task-${task.id}`, type: 'gestor_task', title: task.title, personName: 'Eu', personId: user!.id, personType: 'teamMember', dueDate: task.due_date });
      }
    });

    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems };
  }, [candidates, checklistStructure, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate]);

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') navigate(`/gestor/candidate/${item.personId}`);
    else if (item.personType === 'lead') navigate(`/gestor/crm`, { state: { highlightLeadId: item.personId } });
  };

  const handleOpenLeadsDetailModal = (title: string, leads: CrmLead[], metricType: 'proposal' | 'sold' | 'meeting') => {
    setLeadsModalTitle(title);
    setLeadsForModal(leads);
    setLeadsMetricType(metricType);
    setIsLeadsDetailModalOpen(true);
  };

  const handleOpenCandidatesDetailModal = (title: string, candidates: Candidate[], metricType: 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse') => { // NOVO: Adicionado 'noResponse'
    setCandidatesModalTitle(title);
    setCandidatesForModal(candidates);
    setCandidatesMetricType(metricType);
    setIsCandidatesDetailModalOpen(true);
  };

  // NOVO: Handler para abrir o modal de detalhes de Cold Call
  const handleOpenColdCallDetailModal = (title: string, type: ColdCallDetailType) => {
    // Filtra os leads e logs de cold call com base no consultor selecionado no filtro do dashboard
    const leadsToPass = selectedColdCallConsultantId 
      ? coldCallLeads.filter(l => l.user_id === selectedColdCallConsultantId)
      : coldCallLeads;
    const logsToPass = selectedColdCallConsultantId
      ? coldCallLogs.filter(log => log.user_id === selectedColdCallConsultantId)
      : coldCallLogs;

    setColdCallModalTitle(title);
    setColdCallLeadsForModal(leadsToPass);
    setColdCallLogsForModal(logsToPass);
    setColdCallDetailType(type);
    setSelectedColdCallConsultantName(teamMembers.find(m => m.authUserId === selectedColdCallConsultantId)?.name || 'Todos os Consultores');
    setIsColdCallDetailModal(true);
  };

  if (isDataLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {user?.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 dark:text-gray-400">Aqui está o resumo da sua operação hoje.</p>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell notificationCount={notifications.length} onClick={handleOpenNotifications} />
          <NotificationCenter isOpen={isNotificationCenterOpen} onClose={handleCloseNotifications} notifications={notifications} />
        </div>
      </div>

      {/* 1. Métricas Comerciais */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-brand-500" /> Métricas Comerciais (Mês Atual)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Total Leads"
            value={commercialMetrics?.totalLeads}
            icon={Users}
            colorClass="bg-indigo-600 text-white"
          />
          <MetricCard
            title="Novos Leads"
            value={commercialMetrics?.newLeads}
            icon={Plus}
            colorClass="bg-green-600 text-white"
          />
          <MetricCard
            title="Reuniões"
            value={commercialMetrics?.meetingsCount}
            icon={Calendar}
            colorClass="bg-orange-600 text-white"
            onClick={() => handleOpenLeadsDetailModal('Reuniões do Mês', commercialMetrics?.leadsWithMeetings || [], 'meeting')}
          />
          <MetricCard
            title="Propostas"
            value={formatLargeCurrency(commercialMetrics?.proposalValue || 0)}
            icon={Send}
            colorClass="bg-purple-600 text-white"
            onClick={() => handleOpenLeadsDetailModal('Propostas do Mês', commercialMetrics?.leadsWithProposal || [], 'proposal')}
          />
          <MetricCard
            title="Vendido"
            value={formatLargeCurrency(commercialMetrics?.soldValue || 0)}
            icon={DollarSign}
            colorClass="bg-teal-600 text-white"
            onClick={() => handleOpenLeadsDetailModal('Vendas do Mês', commercialMetrics?.leadsSold || [], 'sold')}
          />
          <MetricCard
            title="Pendências"
            value={commercialMetrics?.pendingTasks.length}
            icon={ListTodo}
            colorClass="bg-red-600 text-white"
            onClick={() => setIsPendingTasksModalOpen(true)}
          />
        </div>
      </section>

      {/* 2. Métricas de Cold Call */}
      <section className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <PhoneCall className="w-5 h-5 mr-2 text-brand-500" /> Métricas de Cold Call
          </h2>
          <div className="flex items-center space-x-2">
            <label htmlFor="coldCallConsultant" className="text-sm font-medium text-gray-700 dark:text-gray-300">Consultor:</label>
            <Select
              value={selectedColdCallConsultantId || 'all'}
              onValueChange={(value) => {
                setSelectedColdCallConsultantId(value === 'all' ? null : value);
                setSelectedColdCallConsultantName(value === 'all' ? 'Todos os Consultores' : teamMembers.find(m => m.authUserId === value)?.name || 'Consultor Desconhecido');
              }}
            >
              <SelectTrigger className="w-[180px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Selecione o Consultor" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {coldCallConsultants.map(consultant => (
                  <SelectItem key={consultant.id} value={consultant.authUserId || consultant.id}>
                    {consultant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total de Ligações" 
            value={coldCallMetrics.totalCalls} 
            icon={PhoneCall} 
            colorClass="bg-blue-600 text-white" 
            onClick={() => handleOpenColdCallDetailModal('Total de Ligações', 'calls')}
          />
          <MetricCard 
            title="Total de Conversas" 
            value={coldCallMetrics.totalConversations} 
            icon={MessageSquare} 
            colorClass="bg-purple-600 text-white" 
            onClick={() => handleOpenColdCallDetailModal('Total de Conversas', 'conversations')}
          />
          <MetricCard 
            title="Reuniões Agendadas" 
            value={coldCallMetrics.totalMeetingsScheduled} 
            icon={CalendarCheck} 
            colorClass="bg-green-600 text-white" 
            onClick={() => handleOpenColdCallDetailModal('Reuniões Agendadas', 'meetings')}
          />
          <MetricCard 
            title="Taxa Conversa → Reunião" 
            value={`${coldCallMetrics.conversationToMeetingRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-yellow-600 text-white" 
            subValue="Efetividade da Conversão"
          />
        </div>
      </section>

      {/* 3. Dashboard de Contratação */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-brand-500" /> Dashboard de Candidaturas (Mês Atual)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <MetricCard 
            title="Total de Candidaturas" 
            value={hiringMetrics.total} 
            icon={Users} 
            colorClass="bg-indigo-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Total de Candidaturas', hiringMetrics.totalCandidatesList, 'total')}
          />
          <MetricCard 
            title="Contatados" 
            value={hiringMetrics.contacted} 
            icon={MessageSquare} 
            colorClass="bg-amber-500 text-white" 
            subValue="Em triagem ativa"
            onClick={() => handleOpenCandidatesDetailModal('Contatados', hiringMetrics.contactedList, 'contacted')}
          />
          <MetricCard 
            title="Não Respondido" // NOVO: Título alterado
            value={hiringMetrics.noResponse} // NOVO: Usando a métrica de Não Respondido
            icon={HelpCircle} // NOVO: Ícone alterado
            colorClass="bg-orange-500 text-white" // NOVO: Cor alterada
            subValue="Aguardando retorno" // NOVO: Subtítulo alterado
            onClick={() => handleOpenCandidatesDetailModal('Não Respondido', hiringMetrics.noResponseList, 'noResponse')} // NOVO: Ação para o modal
          />
          <MetricCard 
            title="Entrevistas Agendadas" 
            value={hiringMetrics.scheduled} 
            icon={Clock} 
            colorClass="bg-orange-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Entrevistas Agendadas', hiringMetrics.scheduledList, 'scheduled')}
          />
          <MetricCard 
            title="Entrevistas Realizadas" 
            value={hiringMetrics.conducted} 
            icon={FileText} 
            colorClass="bg-purple-600 text-white" 
            onClick={() => handleOpenCandidatesDetailModal('Entrevistas Realizadas', hiringMetrics.conductedList, 'conducted')}
          />
          <MetricCard 
            title="Contratados (Em Prévia)" 
            value={hiringMetrics.totalHired} 
            icon={TrendingUp} 
            colorClass="bg-blue-600 text-white" 
            subValue="Passaram na seleção"
            onClick={() => handleOpenCandidatesDetailModal('Contratados (Em Prévia)', hiringMetrics.totalHiredList, 'awaitingPreview')}
          />
          <MetricCard 
            title="Autorizados" 
            value={hiringMetrics.hired} 
            icon={UserCheck} 
            colorClass="bg-emerald-600 text-white" 
            subValue="Contratações efetivas"
            onClick={() => handleOpenCandidatesDetailModal('Autorizados', hiringMetrics.hiredList, 'hired')}
          />
          <MetricCard 
            title="Faltas" 
            value={hiringMetrics.noShow} 
            icon={Ghost} 
            colorClass="bg-rose-500 text-white" 
            subValue="Não compareceram"
            onClick={() => handleOpenCandidatesDetailModal('Faltas', hiringMetrics.noShowList, 'noShow')}
          />
          <MetricCard 
            title="Desistências" 
            value={hiringMetrics.withdrawn} 
            icon={UserMinus} 
            colorClass="bg-rose-600 text-white" 
            subValue="Candidato desistiu"
            onClick={() => handleOpenCandidatesDetailModal('Desistências', hiringMetrics.withdrawnList, 'withdrawn')}
          />
          <MetricCard 
            title="Desqualificados" 
            value={hiringMetrics.disqualified} 
            icon={XCircle} 
            colorClass="bg-rose-700 text-white" 
            subValue="Reprovados pelo gestor"
            onClick={() => handleOpenCandidatesDetailModal('Desqualificados', hiringMetrics.disqualifiedList, 'disqualified')}
          />
          
          <MetricCard 
            title="Taxa de Comparecimento" 
            value={`${hiringMetrics.attendanceRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Efetividade Agenda"
          />
          <MetricCard 
            title="Taxa de Contratação" 
            value={`${hiringMetrics.hiringRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Conversão Final"
          />
        </div>
      </section>

      {/* 4. Agenda do Dia */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-brand-500" /> Agenda do Dia
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Compromissos de Hoje</h3>
            {todayAgenda.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum item na agenda para hoje.</p>
            ) : (
              <ScrollArea className="h-[250px] pr-4">
                <ul className="space-y-3">
                  {todayAgenda.map(item => (
                    <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-brand-200">
                      <div className="mt-1">{item.type === 'interview' ? <Calendar className="w-4 h-4 text-green-500" /> : <CheckSquare className="w-4 h-4 text-blue-500" />}</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.personName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-red-100 dark:border-red-900/30 shadow-md">
            <h3 className="text-sm font-bold text-red-500 uppercase mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Pendências Atrasadas
            </h3>
            {overdueTasks.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma tarefa atrasada. Bom trabalho!</p>
            ) : (
              <ScrollArea className="h-[250px] pr-4">
                <ul className="space-y-3">
                  {overdueTasks.map(item => (
                    <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="flex items-start space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 transition-colors cursor-pointer border border-red-100 dark:border-red-900/20">
                      <div className="mt-1"><AlertCircle className="w-4 h-4 text-red-500" /></div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-red-900 dark:text-red-200">{item.title}</p>
                        <p className="text-xs text-red-700 dark:text-red-400">{item.personName} • Venceu em {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>
      </section>

      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
      <PendingLeadTasksModal isOpen={isPendingTasksModalOpen} onClose={() => setIsPendingTasksModalOpen(false)} pendingTasks={commercialMetrics?.pendingTasks || []} crmLeads={crmLeads} teamMembers={teamMembers} />
      <LeadsDetailModal isOpen={isLeadsDetailModalOpen} onClose={() => setIsLeadsDetailModalOpen(false)} title={leadsModalTitle} leads={leadsForModal} crmStages={crmStages} teamMembers={teamMembers} metricType={leadsMetricType} />
      <CandidatesDetailModal 
        isOpen={isCandidatesDetailModalOpen} 
        onClose={() => setIsCandidatesDetailModalOpen(false)} 
        title={candidatesModalTitle} 
        candidates={candidatesForModal} 
        teamMembers={teamMembers} 
        metricType={candidatesMetricType} 
      />
      {/* NOVO: Modal de Detalhes de Cold Call */}
      <ColdCallDetailModal
        isOpen={isColdCallDetailModalOpen}
        onClose={() => setIsColdCallDetailModal(false)}
        title={coldCallModalTitle}
        consultantName={selectedColdCallConsultantName}
        leads={coldCallLeadsForModal}
        logs={coldCallLogsForModal}
        type={coldCallDetailType}
        teamMembers={teamMembers}
        filterStartDate={coldCallFilterStartDate}
        filterEndDate={coldCallFilterEndDate}
      />
    </div>
  );
};

export default Dashboard;