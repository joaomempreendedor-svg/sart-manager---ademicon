import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, User, CheckCircle2, ListChecks, Target, CalendarDays, Loader2, Phone, Mail, Tag, Clock, AlertCircle, Plus, DollarSign, Handshake } from 'lucide-react';
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
    commissions, // Adicionado para calcular o total vendido
    leadTasks, // Adicionado para calcular reuniões
    isDataLoading 
  } = useApp();

  const today = useMemo(() => new Date(), []);
  const todayFormatted = useMemo(() => today.toISOString().split('T')[0], [today]); // YYYY-MM-DD
  const currentMonthStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [today]);
  const currentMonthEnd = useMemo(() => {
    const date = new Date(today);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0); // Last day of current month
    date.setHours(23, 59, 59, 999);
    return date;
  }, [today]);

  // --- CRM Statistics (Mês Atual) ---
  const { totalLeadsMonth, newLeadsMonth, meetingsScheduledMonth, proposalValueMonth, totalSoldMonth } = useMemo(() => {
    if (!user) return { totalLeadsMonth: 0, newLeadsMonth: 0, meetingsScheduledMonth: 0, proposalValueMonth: 0, totalSoldMonth: 0 };

    const consultantLeads = crmLeads.filter(lead => lead.consultant_id === user.id);

    const leadsThisMonth = consultantLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= currentMonthStart && leadDate <= currentMonthEnd;
    });

    const totalLeadsMonth = leadsThisMonth.length;
    const newLeadsMonth = leadsThisMonth.length; // Para o mês atual, "novos leads" é o total de leads criados no mês

    const meetingsScheduledMonth = leadTasks.filter(task => {
      if (task.lead_id && task.type === 'meeting' && task.meeting_start_time) {
        const meetingDate = new Date(task.meeting_start_time);
        return task.user_id === user.id && meetingDate >= currentMonthStart && meetingDate <= currentMonthEnd;
      }
      return false;
    }).length;

    const proposalValueMonth = leadsThisMonth.reduce((sum, lead) => {
      if (lead.data?.proposal_value) {
        return sum + (lead.data.proposal_value as number);
      }
      return sum;
    }, 0);

    const totalSoldMonth = commissions.filter(c => {
      const commissionDate = new Date(c.date);
      return c.user_id === user.id && commissionDate >= currentMonthStart && commissionDate <= currentMonthEnd;
    }).reduce((sum, c) => sum + c.value, 0);


    return { 
      totalLeadsMonth, 
      newLeadsMonth, 
      meetingsScheduledMonth, 
      proposalValueMonth, 
      totalSoldMonth 
    };
  }, [user, crmLeads, leadTasks, commissions, currentMonthStart, currentMonthEnd]);

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
    currentWeekStart.setHours(0, 0, 0, 0);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Saturday
    currentWeekEnd.setHours(23, 59, 59, 999);

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
      
      {/* CRM Statistics (Mês Atual) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Leads Cadastrados (Mês)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeadsMonth}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <CalendarDays className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reuniões Agendadas (Mês)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{meetingsScheduledMonth}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Handshake className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor de Propostas (Mês)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposalValueMonth)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Vendido (Mês)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSoldMonth)}</p>
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
    </div>
  );
};

export default ConsultorDashboard;