import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, User, CheckCircle2, ListChecks, Target, CalendarDays, Loader2, Phone, Mail, Tag, Clock, AlertCircle, Plus, Calendar, DollarSign, Send, Users, ListTodo, CalendarCheck, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistItem, WeeklyTargetItem, MetricLog } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';

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
    consultantEvents, // RE-ADDED: consultantEvents
    isDataLoading 
  } = useApp();

  // --- CRM Statistics ---
  const { 
    totalLeads, 
    newLeadsThisMonth, 
    meetingsThisMonth, 
    proposalValueThisMonth, 
    soldValueThisMonth, 
    pendingLeadTasks 
  } = useMemo(() => {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];

    if (!user) return { totalLeads: 0, newLeadsThisMonth: 0, meetingsThisMonth: 0, proposalValueThisMonth: 0, soldValueThisMonth: 0, pendingLeadTasks: 0 };

    const consultantLeads = crmLeads.filter(lead => lead.consultant_id === user.id);
    const totalLeads = consultantLeads.length;

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Novos Leads do Mês
    const newLeadsThisMonth = consultantLeads.filter(lead => new Date(lead.created_at) >= currentMonthStart).length;

    // Reuniões Agendadas no Mês (RE-ADDED: meetingsThisMonth calculation)
    const meetingsThisMonth = leadTasks.filter(task => {
      if (task.user_id !== user.id || task.type !== 'meeting') return false;
      const taskDate = new Date(task.meeting_start_time || '');
      return taskDate >= currentMonthStart && taskDate <= currentMonthEnd;
    }).length;

    // Valor de Propostas Enviadas no Mês
    const proposalValueThisMonth = consultantLeads.reduce((sum, lead) => {
      if (lead.proposalValue && lead.proposalValue > 0 && lead.proposalClosingDate) {
        const proposalDate = new Date(lead.proposalClosingDate + 'T00:00:00');
        if (proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd) {
          return sum + (lead.proposalValue || 0);
        }
      }
      return sum;
    }, 0);

    // Valor Vendido no Mês
    const soldValueThisMonth = consultantLeads.reduce((sum, lead) => {
      if (lead.soldCreditValue && lead.soldCreditValue > 0 && lead.saleDate) {
        const saleDate = new Date(lead.saleDate + 'T00:00:00');
        if (saleDate >= currentMonthStart && saleDate <= currentMonthEnd) {
          return sum + (lead.soldCreditValue || 0);
        }
      }
      return sum;
    }, 0);

    // NOVO: Tarefas Pendentes (Hoje/Atrasadas)
    const pendingLeadTasks = leadTasks.filter(task => {
      if (task.user_id !== user.id || task.is_completed) return false;
      if (!task.due_date) return false;
      
      const taskDueDate = new Date(task.due_date + 'T00:00:00');
      const todayDate = new Date(todayFormatted + 'T00:00:00');

      return taskDueDate <= todayDate;
    }).length;

    return { 
      totalLeads, 
      newLeadsThisMonth, 
      meetingsThisMonth, 
      proposalValueThisMonth, 
      soldValueThisMonth,
      pendingLeadTasks
    };
  }, [user, crmLeads, crmPipelines, crmStages, leadTasks]);

  // --- Daily Checklist Progress ---
  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];

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
    const today = new Date();

    if (!user) return { activeWeeklyTarget: null, weeklyGoalsProgress: [] };

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const activeTarget = weeklyTargets.find(target => {
      const targetStart = new Date(target.week_start);
      const targetEnd = new Date(target.week_end);
      return target.is_active &&
             weeklyTargetAssignments.some(assignment => assignment.weekly_target_id === target.id && assignment.consultant_id === user.id) &&
             targetStart <= currentWeekEnd && targetEnd >= currentWeekStart;
    });

    if (!activeTarget) return { activeWeeklyTarget: null, weeklyGoalsProgress: [] };

    const itemsForTarget = weeklyTargetItems
      .filter(item => item.weekly_target_id === activeTarget.id && item.is_active)
      .sort((a, b) => a.order_index - b.order_index);

    const progress = itemsForTarget.map(item => {
      const logs = metricLogs.filter(log => 
        log.consultant_id === user.id && 
        log.metric_key === item.metric_key &&
        new Date(log.date) >= new Date(activeTarget.week_start) &&
        new Date(log.date) <= new Date(activeTarget.week_end)
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

  // --- Consultant's Tasks ---
  const allConsultantTasks = useMemo(() => {
    if (!user) return [];

    const consultantTasks = leadTasks.filter(task => task.user_id === user.id);

    const allTasks = consultantTasks
      .filter(task => !task.is_completed && task.type === 'task')
      .map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        personName: crmLeads.find(l => l.id === task.lead_id)?.name || 'Lead Desconhecido',
        personId: task.lead_id,
        personType: 'lead',
        dueDate: task.due_date || '',
      }))
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    return allTasks;
  }, [user, leadTasks, crmLeads]);


  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Olá, {user?.name.split(' ')[0]}!</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Bem-vindo ao seu Dashboard. Aqui estão suas principais informações e atalhos.</p>
      
        <div className="animate-fade-in">
          {/* CRM Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeads}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reuniões Mês</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{meetingsThisMonth}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Propostas Mês</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposalValueThisMonth || 0)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Vendido Mês</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(soldValueThisMonth || 0)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <ListTodo className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tarefas Pendentes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingLeadTasks}</p>
              </div>
            </div>
          </div>

          {/* Daily Checklist Progress */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Progresso das Metas Diárias</h2>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{completedDailyTasks}/{totalDailyTasks} Concluídas</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${dailyProgress}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{dailyProgress}% do seu checklist de hoje está completo.</p>
          </div>

          {/* Daily Checklist Display - NOVO */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Metas Diárias</h2>
            <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
          </div>

          {/* Minhas Tarefas */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
              <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Minhas Tarefas ({allConsultantTasks.length})</h2>
            </div>
            <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
              {allConsultantTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400">Nenhuma tarefa pendente.</div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {allConsultantTasks.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1 sm:space-y-0 sm:space-x-2">
                            <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Lead: <span className="font-semibold ml-1">{item.personName}</span></span>
                            {item.dueDate && <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> Vence: {new Date(item.dueDate + 'T00:00:00').toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <Link to={`/consultor/crm`} className="text-brand-600 hover:text-brand-700 text-sm font-medium flex-shrink-0">Ver Lead <ChevronRight className="w-4 h-4 inline ml-1" /></Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Weekly Goals */}
          {activeWeeklyTarget && weeklyGoalsProgress.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Target className="w-5 h-5 mr-2 text-green-500" />Metas da Semana ({activeWeeklyTarget.title})</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(activeWeeklyTarget.week_start).toLocaleDateString()} - {new Date(activeWeeklyTarget.week_end).toLocaleDateString()}
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
    </div>
  );
};

export default ConsultorDashboard;