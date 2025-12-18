import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, User, CheckCircle2, ListChecks, Target, CalendarDays, Loader2, Phone, Mail, Tag, Clock, AlertCircle, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistItem, WeeklyTargetItem, MetricLog } from '@/types';
import { DailyChecklist } from '@/pages/consultor/DailyChecklist'; // Importar o DailyChecklist

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
    isDataLoading 
  } = useApp();

  const today = useMemo(() => new Date(), []);
  const todayFormatted = useMemo(() => today.toISOString().split('T')[0], [today]); // YYYY-MM-DD

  // --- CRM Statistics ---
  const { totalLeads, newLeadsThisWeek, meetingsToday, conversionRate } = useMemo(() => {
    if (!user) return { totalLeads: 0, newLeadsThisWeek: 0, meetingsToday: 0, conversionRate: 0 };

    const consultantLeads = crmLeads.filter(lead => lead.consultant_id === user.id);
    const totalLeads = consultantLeads.length;

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const newLeadsThisWeek = consultantLeads.filter(lead => new Date(lead.created_at) >= oneWeekAgo).length;

    // Assuming 'meeting' is a custom field key for meetings and it stores a date
    const meetingsToday = consultantLeads.filter(lead => {
      const meetingDate = lead.data?.next_action_at; // Assuming 'next_action_at' is a custom field for next interaction date
      return meetingDate && new Date(meetingDate).toISOString().split('T')[0] === todayFormatted;
    }).length;

    // Simple conversion rate: (Won Leads / Total Leads)
    const activePipeline = crmPipelines.find(p => p.is_active);
    const wonStage = crmStages.find(s => s.pipeline_id === activePipeline?.id && s.is_won);
    const lostStage = crmStages.find(s => s.pipeline_id === activePipeline?.id && s.is_lost);

    const wonLeads = consultantLeads.filter(lead => lead.stage_id === wonStage?.id).length;
    const lostLeads = consultantLeads.filter(lead => lead.stage_id === lostStage?.id).length;
    const totalClosedLeads = wonLeads + lostLeads;

    const conversionRate = totalClosedLeads > 0 ? (wonLeads / totalClosedLeads) * 100 : 0;

    return { totalLeads, newLeadsThisWeek, meetingsToday, conversionRate: conversionRate.toFixed(2) };
  }, [user, crmLeads, crmPipelines, crmStages, today, todayFormatted]);

  // --- Daily Checklist Progress ---
  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
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
  }, [user, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, todayFormatted]);

  // --- Weekly Goals ---
  const { activeWeeklyTarget, weeklyGoalsProgress } = useMemo(() => {
    if (!user) return { activeWeeklyTarget: null, weeklyGoalsProgress: [] };

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Saturday

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
  }, [user, weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs, today]);

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Olá, {user?.name.split(' ')[0]}!</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Bem-vindo ao seu Dashboard. Aqui estão suas principais informações e atalhos.</p>
      
      {/* CRM Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Novos Leads (Semana)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{newLeadsThisWeek}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <CalendarDays className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reuniões Hoje</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{meetingsToday}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Daily Checklist Progress */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><ListChecks className="w-5 h-5 mr-2 text-brand-500" />Checklist Diário</h2>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{completedDailyTasks}/{totalDailyTasks} Concluídas</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
          <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${dailyProgress}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{dailyProgress}% do seu checklist de hoje está completo.</p>
      </div>

      {/* Daily Checklist Component */}
      <div className="mb-8">
        <DailyChecklist />
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
      {(!activeWeeklyTarget || weeklyGoalsProgress.length === 0) && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center mb-8">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma meta semanal ativa atribuída a você.</p>
          <p className="text-sm text-gray-400">Entre em contato com seu gestor para definir suas metas.</p>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/consultor/crm" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all group">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meu CRM</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400">Gerenciar meus leads</p>
            </div>
          </div>
        </Link>
        <Link to="/consultor/daily-checklist" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-500 transition-all group">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Checklist Diário</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">Ver minhas tarefas do dia</p>
            </div>
          </div>
        </Link>
        <Link to="/profile" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-green-500 transition-all group">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meu Perfil</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400">Atualizar minhas informações</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ConsultorDashboard;