import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw, CalendarPlus, Mail, Phone, ClipboardCheck, UserPlus, UserCheck, PieChart, MessageSquare, UserX, UserMinus, Ghost, MapPin, BarChart3, FileText, Percent } from 'lucide-react';
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

export const Dashboard = () => {
  const { user } = useAuth();
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, crmStages, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, notifications, hiringOrigins } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const [isLeadsDetailModalOpen, setIsLeadsDetailModalOpen] = useState(false);
  const [leadsModalTitle, setLeadsModalTitle] = useState('');
  const [leadsForModal, setLeadsForModal] = useState<CrmLead[]>([]);
  const [leadsMetricType, setLeadsMetricType] = useState<'proposal' | 'sold' | 'meeting'>('proposal');

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

    const total = candidates.filter(c => isInFilterRange(c.createdAt)).length;
    
    const contacted = candidates.filter(c => 
      isInFilterRange(c.contactedDate) // Usa contactedDate
    ).length;

    const scheduled = candidates.filter(c => 
      isInFilterRange(c.interviewScheduledDate) // Usa interviewScheduledDate
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
  }, [candidates, hiringOrigins]);

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
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Total Leads</p><p className="text-lg font-bold">{commercialMetrics?.totalLeads}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><Plus className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Novos Leads</p><p className="text-lg font-bold">{commercialMetrics?.newLeads}</p></div>
          </div>
          <button onClick={() => handleOpenLeadsDetailModal('Reuniões do Mês', commercialMetrics?.leadsWithMeetings || [], 'meeting')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3 hover:bg-gray-50 transition text-left">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><Calendar className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Reuniões</p><p className="text-lg font-bold">{commercialMetrics?.meetingsCount}</p></div>
          </button>
          <button onClick={() => handleOpenLeadsDetailModal('Propostas do Mês', commercialMetrics?.leadsWithProposal || [], 'proposal')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3 hover:bg-gray-50 transition text-left">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><Send className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Propostas</p><p className="text-lg font-bold">{formatLargeCurrency(commercialMetrics?.proposalValue || 0)}</p></div>
          </button>
          <button onClick={() => handleOpenLeadsDetailModal('Vendas do Mês', commercialMetrics?.leadsSold || [], 'sold')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3 hover:bg-gray-50 transition text-left">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><DollarSign className="w-5 h-5 text-teal-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Vendido</p><p className="text-lg font-bold">{formatLargeCurrency(commercialMetrics?.soldValue || 0)}</p></div>
          </button>
          <button onClick={() => setIsPendingTasksModalOpen(true)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3 hover:bg-gray-50 transition text-left">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><ListTodo className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-bold">Pendências</p><p className="text-lg font-bold">{commercialMetrics?.pendingTasks.length}</p></div>
          </button>
        </div>
      </section>

      {/* 2. Dashboard de Contratação */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-brand-500" /> Dashboard de Contratação (Mês Atual)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <MetricCard 
            title="Candidatos (Entrada no Funil)" 
            value={hiringMetrics.total} 
            icon={Users} 
            colorClass="bg-indigo-600 text-white" 
          />
          <MetricCard 
            title="Contatados (no Período)" 
            value={hiringMetrics.contacted} 
            icon={MessageSquare} 
            colorClass="bg-amber-500 text-white" 
          />
          <MetricCard 
            title="Entrevistas Agendadas (no Período)" 
            value={hiringMetrics.scheduled} 
            icon={Clock} 
            colorClass="bg-orange-600 text-white" 
          />
          <MetricCard 
            title="Entrevistas Realizadas (no Período)" 
            value={hiringMetrics.conducted} 
            icon={FileText} 
            colorClass="bg-purple-600 text-white" 
          />
          <MetricCard 
            title="Em Prévia (no Período)" 
            value={hiringMetrics.awaitingPreview} 
            icon={TrendingUp} 
            colorClass="bg-blue-600 text-white" 
          />
          <MetricCard 
            title="Autorizados (no Período)" 
            value={hiringMetrics.hired} 
            icon={UserCheck} 
            colorClass="bg-emerald-600 text-white" 
          />
          
          <MetricCard 
            title="Faltas (no Período)" 
            value={hiringMetrics.noShow} 
            icon={Ghost} 
            colorClass="bg-rose-500 text-white" 
          />
          <MetricCard 
            title="Desistências (no Período)" 
            value={hiringMetrics.withdrawn} 
            icon={UserMinus} 
            colorClass="bg-rose-600 text-white" 
          />
          <MetricCard 
            title="Desqualificados (no Período)" 
            value={hiringMetrics.disqualified} 
            icon={XCircle} 
            colorClass="bg-rose-700 text-white" 
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

      {/* 3. Agenda do Dia */}
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
    </div>
  );
};

export default Dashboard;