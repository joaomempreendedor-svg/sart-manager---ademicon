import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  User, 
  CheckCircle2, 
  ListChecks, 
  Target, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Calendar, 
  DollarSign, 
  Send, 
  Users, 
  ListTodo, 
  ChevronRight,
  Clock,
  Square,
  CheckSquare,
  CalendarDays,
  Timer
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistItem, LeadTask } from '@/types';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import { PendingLeadTasksModal } from '@/components/gestor/PendingLeadTasksModal';
import moment from 'moment';
import 'moment/locale/pt-br';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

moment.locale('pt-br');

const ConsultorDashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    crmLeads, 
    crmPipelines, 
    crmStages, 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    dailyChecklistCompletions,
    weeklyTargets,
    weeklyTargetItems,
    weeklyTargetAssignments,
    metricLogs,
    leadTasks,
    teamMembers,
    toggleLeadTaskCompletion,
    isDataLoading 
  } = useApp();

  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const activeStageIds = useMemo(() => {
    if (!activePipeline) return new Set<string>();
    return new Set(crmStages.filter(s => s.pipeline_id === activePipeline.id && s.is_active).map(s => s.id));
  }, [crmStages, activePipeline]);

  // --- CRM Statistics ---
  const stats = useMemo(() => {
    const today = moment().startOf('day');

    if (!user) return { 
      totalLeads: 0, 
      newLeadsThisMonth: 0, 
      meetingsThisMonth: 0, 
      proposalValueThisMonth: 0, 
      soldValueThisMonth: 0, 
      pendingLeadTasks: [], 
      pendingLeadTasksCount: 0,
      overdueTasksCount: 0
    };

    const consultantLeads = crmLeads.filter(lead => lead.consultant_id === user.id && activeStageIds.has(lead.stage_id));
    const totalLeads = consultantLeads.length;

    const currentMonthStart = moment().startOf('month');
    const currentMonthEnd = moment().endOf('month');

    const newLeadsThisMonth = consultantLeads.filter(lead => moment(lead.created_at).isSameOrAfter(currentMonthStart)).length;

    const meetingsThisMonth = leadTasks.filter(task => {
      if (task.user_id !== user.id || task.type !== 'meeting') return false;
      const taskDate = moment(task.meeting_start_time || '');
      return taskDate.isBetween(currentMonthStart, currentMonthEnd, null, '[]');
    }).length;

    const proposalValueThisMonth = consultantLeads.reduce((sum, lead) => {
      const stage = crmStages.find(s => s.id === lead.stage_id);
      const isResolved = stage?.is_won || stage?.is_lost;

      if (lead.proposal_value && lead.proposal_value > 0 && lead.proposal_closing_date && !isResolved) {
        const proposalDate = moment(lead.proposal_closing_date, 'YYYY-MM-DD');
        if (proposalDate.isBetween(currentMonthStart, currentMonthEnd, null, '[]')) {
          return sum + (lead.proposal_value || 0);
        }
      }
      return sum;
    }, 0);

    const soldValueThisMonth = consultantLeads.reduce((sum, lead) => {
      if (lead.sold_credit_value && lead.sold_credit_value > 0 && lead.sale_date) {
        const saleDate = moment(lead.sale_date, 'YYYY-MM-DD');
        if (saleDate.isBetween(currentMonthStart, currentMonthEnd, null, '[]')) {
          return sum + (lead.sold_credit_value || 0);
        }
      }
      return sum;
    }, 0);

    const pendingLeadTasksList = leadTasks
      .filter(task => task.user_id === user.id && !task.is_completed)
      .map(task => {
        const dueDate = task.due_date ? moment(task.due_date, 'YYYY-MM-DD').startOf('day') : null;
        let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
        
        if (dueDate) {
          if (dueDate.isBefore(today)) status = 'overdue';
          else if (dueDate.isSame(today)) status = 'today';
        }
        
        return { ...task, status };
      })
      .sort((a, b) => {
        const statusPriority = { overdue: 0, today: 1, upcoming: 2 };
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });

    const overdueTasksCount = pendingLeadTasksList.filter(t => t.status === 'overdue').length;

    return { 
      totalLeads, 
      newLeadsThisMonth, 
      meetingsThisMonth, 
      proposalValueThisMonth, 
      soldValueThisMonth,
      pendingLeadTasks: pendingLeadTasksList,
      pendingLeadTasksCount: pendingLeadTasksList.length,
      overdueTasksCount
    };
  }, [user, crmLeads, crmPipelines, crmStages, leadTasks, activeStageIds]);

  // --- Daily Checklist Progress ---
  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    const todayFormatted = moment().format('YYYY-MM-DD');

    if (!user) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0 };

    const assignedChecklists = dailyChecklists
      .filter(checklist => checklist.is_active && 
        (dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id && assignment.consultant_id === user.id) ||
         !dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id))
      );

    const relevantItems: DailyChecklistItem[] = assignedChecklists.flatMap(checklist => 
      dailyChecklistItems.filter(item => item.daily_checklist_id === checklist.id && item.is_active)
    );

    const total = relevantItems.length;
    const completed = relevantItems.filter(item => 
      dailyChecklistCompletions.some(
        completion =>
          completion.daily_checklist_item_id === item.id &&
          completion.consultant_id === user.id &&
          completion.date === todayFormatted &&
          completion.done
      )
    ).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [user, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions]);

  // --- Weekly Goals ---
  const { activeWeeklyTarget, weeklyGoalsProgress } = useMemo(() => {
    const today = moment();

    if (!user) return { activeWeeklyTarget: null, weeklyGoalsProgress: [] };

    const currentWeekStart = moment().startOf('week');
    const currentWeekEnd = moment().endOf('week');

    const activeTarget = weeklyTargets.find(target => {
      const targetStart = moment(target.week_start);
      const targetEnd = moment(target.week_end);
      return target.is_active &&
             weeklyTargetAssignments.some(assignment => assignment.weekly_target_id === target.id && assignment.consultant_id === user.id) &&
             targetStart.isSameOrBefore(currentWeekEnd) && targetEnd.isSameOrAfter(currentWeekStart);
    });

    if (!activeTarget) return { activeWeeklyTarget: null, weeklyGoalsProgress: [] };

    const itemsForTarget = weeklyTargetItems
      .filter(item => item.weekly_target_id === activeTarget.id && item.is_active)
      .sort((a, b) => a.order_index - b.order_index);

    const progress = itemsForTarget.map(item => {
      const logs = metricLogs.filter(log => 
        log.consultant_id === user.id && 
        log.metric_key === item.metric_key &&
        moment(log.date).isBetween(activeTarget.week_start, activeTarget.week_end, null, '[]')
      );
      const currentValue = logs.reduce((sum, log) => sum + log.value, 0);
      const isCompleted = currentValue >= item.target_value;
      return {
        ...item,
        currentValue,
        isCompleted,
        progressPercent: Math.min(100, (currentValue / item.target_value) * 100),
      };
    });

    return { activeWeeklyTarget: activeTarget, weeklyGoalsProgress: progress };
  }, [user, weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs]);

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto bg-gray-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Olá, {user?.name.split(' ')[0]}! 👋</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Bem-vindo ao seu Dashboard. Aqui estão suas principais informações e atalhos.</p>
      
      <div className="animate-fade-in space-y-8">
        {/* CRM Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLeads}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Novos Leads (Mês)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newLeadsThisMonth}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reuniões Mês</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.meetingsThisMonth}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Propostas Mês</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.proposalValueThisMonth || 0)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Vendido Mês</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.soldValueThisMonth || 0)}</p>
            </div>
          </div>

          <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm flex items-center space-x-4 ${stats.overdueTasksCount > 0 ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200 dark:border-slate-700'}`}>
            <div className={`p-3 rounded-lg ${stats.overdueTasksCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
              <ListTodo className={`w-6 h-6 ${stats.overdueTasksCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tarefas Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingLeadTasksCount}</p>
            </div>
          </div>
        </div>

        {/* Minhas Tarefas - PRIORIZADO E DESTACADO */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
            <div className="flex items-center space-x-2">
              <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Minhas Tarefas ({stats.pendingLeadTasksCount})</h2>
            </div>
            {stats.overdueTasksCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {stats.overdueTasksCount} Vencidas
              </Badge>
            )}
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {stats.pendingLeadTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Tudo em dia! Nenhuma tarefa pendente.</div>
              ) : (
                stats.pendingLeadTasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`group p-4 rounded-xl border transition-all duration-200 ${
                      task.status === 'overdue' 
                        ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:border-red-300' 
                        : task.status === 'today'
                        ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50 hover:border-orange-300'
                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => toggleLeadTaskCompletion(task.id, true)}
                        className={`mt-1 flex-shrink-0 transition-colors ${
                          task.status === 'overdue' ? 'text-red-400 hover:text-red-600' : 'text-gray-300 hover:text-brand-500'
                        }`}
                      >
                        <Square className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-semibold truncate ${
                            task.status === 'overdue' ? 'text-red-900 dark:text-red-200' : 'text-gray-900 dark:text-white'
                          }`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.status === 'overdue' && (
                              <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">Vencida</Badge>
                            )}
                            {task.status === 'today' && (
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] uppercase tracking-wider">Hoje</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1 sm:space-y-0 sm:space-x-4">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" /> 
                            Lead: <span className="font-semibold ml-1">{crmLeads.find(l => l.id === task.lead_id)?.name || 'Lead Desconhecido'}</span>
                          </span>
                          {task.due_date && (
                            <span className={`flex items-center ${task.status === 'overdue' ? 'text-red-600 font-bold' : ''}`}>
                              <CalendarDays className="w-3 h-3 mr-1" /> 
                              Vence: {moment(task.due_date, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                            </span>
                          )}
                          {task.type === 'meeting' && (
                            <span className="flex items-center text-brand-600 dark:text-brand-400">
                              <Timer className="w-3 h-3 mr-1" /> Reunião
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          <Link 
                            to={`/consultor/crm`} 
                            state={{ highlightLeadId: task.lead_id }}
                            className="text-xs font-medium text-brand-600 hover:underline flex items-center"
                          >
                            Ver Lead <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Daily Checklist Progress */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Progresso das Metas Diárias</h2>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{completedDailyTasks}/{totalDailyTasks} Concluídas</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${dailyProgress}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{dailyProgress}% do seu checklist de hoje está completo.</p>
        </div>

        {/* Daily Checklist Display */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Metas Diárias</h2>
          <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
        </div>

        {/* Weekly Goals */}
        {activeWeeklyTarget && weeklyGoalsProgress.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Target className="w-5 h-5 mr-2 text-green-500" />Metas da Semana ({activeWeeklyTarget.title})</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {moment(activeWeeklyTarget.week_start).format('DD/MM/YYYY')} - {moment(activeWeeklyTarget.week_end).format('DD/MM/YYYY')}
              </span>
            </div>
            <div className="space-y-4">
              {weeklyGoalsProgress.map(goal => (
                <div key={goal.id} className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${goal.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}>
                    {goal.isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${goal.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{goal.label}</p>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-1">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${goal.progressPercent}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {goal.currentValue} / {goal.target_value} ({Math.round(goal.progressPercent)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isPendingTasksModalOpen && (
        <PendingLeadTasksModal
          isOpen={isPendingTasksModalOpen}
          onClose={() => setIsPendingTasksModalOpen(false)}
          pendingTasks={stats.pendingLeadTasks}
          crmLeads={crmLeads}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

export default ConsultorDashboard;