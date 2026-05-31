import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import {
  Clock,
  ListChecks,
  Loader2,
  AlertCircle,
  CheckSquare,
  ChevronRight,
  CalendarDays,
  Check,
  Trash2,
  Calendar,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';
import { DailyChecklistItem } from '@/types';
import { MetricCard } from '@/components/MetricCard';

const SECRETARIA_PREFIX = '[SEC] ';

interface AgendaItem {
  id: string;
  type: 'task' | 'interview' | 'gestor_task';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember';
  dueDate: string;
  taskId?: string;
}

export const SecretariaDashboard = () => {
  const { user } = useAuth();
  const {
    candidates,
    checklistStructure,
    isDataLoading,
    gestorTasks,
    gestorTaskCompletions,
    isGestorTaskDueOnDate,
    toggleChecklistItem,
    setChecklistDueDate,
    toggleGestorTaskCompletion,
    deleteGestorTask,
    dailyChecklists,
    dailyChecklistItems,
    dailyChecklistAssignments,
    dailyChecklistCompletions,
    teamMembers,
  } = useApp();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];

  const { completedDailyTasks, totalDailyTasks, dailyProgress } = useMemo(() => {
    if (!user) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0 };

    const secretariaChecklists = dailyChecklists.filter((checklist) => {
      const isSecChecklist = checklist.title.startsWith(SECRETARIA_PREFIX);
      const hasAssignment = dailyChecklistAssignments.some(
        (a) => a.daily_checklist_id === checklist.id && a.consultant_id === user.id,
      );
      const hasNoAssignment = !dailyChecklistAssignments.some(
        (a) => a.daily_checklist_id === checklist.id,
      );

      return checklist.is_active && (hasAssignment || (isSecChecklist && hasNoAssignment));
    });

    const isItemDueOnDate = (item: DailyChecklistItem, dateStr: string) => {
      const rec = item.resource?.recurrence;
      if (!rec || rec.type === 'daily') return true;
      const toDate = (s: string) => new Date(s + 'T00:00:00');
      if (rec.type === 'weekly') return new Date(dateStr + 'T00:00:00').getDay() === (rec.dayOfWeek ?? 0);
      if (rec.type === 'monthly') return new Date(dateStr + 'T00:00:00').getDate() === (rec.dayOfMonth ?? 1);
      if (rec.type === 'every_x_days') {
        const start = rec.startDate ? toDate(rec.startDate) : new Date(item.created_at);
        const target = toDate(dateStr);
        if (target < start) return false;
        const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays % (rec.intervalDays ?? 2) === 0;
      }
      if (rec.type === 'specific_date') return dateStr === rec.specificDate;
      return true;
    };

    const relevantItems = secretariaChecklists.flatMap((checklist) =>
      dailyChecklistItems.filter(
        (item) =>
          item.daily_checklist_id === checklist.id &&
          item.is_active &&
          isItemDueOnDate(item, todayStr),
      ),
    );

    const total = relevantItems.length;
    const completed = relevantItems.filter((item) =>
      dailyChecklistCompletions.some(
        (c) => c.daily_checklist_item_id === item.id && c.consultant_id === user.id && c.date === todayStr && c.done,
      ),
    ).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [user, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, todayStr]);

  const handleCompleteItem = async (e: React.MouseEvent, item: AgendaItem) => {
    e.stopPropagation();
    try {
      if (item.type === 'task' && item.taskId) {
        await toggleChecklistItem(item.personId, item.taskId);
        toast.success('Tarefa concluída!');
      } else if (item.type === 'gestor_task') {
        await toggleGestorTaskCompletion(item.id, true, todayStr);
        toast.success('Tarefa pessoal concluída!');
      }
    } catch (error) {
      toast.error('Erro ao concluir item.');
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: AgendaItem) => {
    e.stopPropagation();
    if (!window.confirm('Deseja remover este lembrete/prazo?')) return;

    try {
      if (item.type === 'task' && item.taskId) {
        await setChecklistDueDate(item.personId, item.taskId, '');
        toast.success('Prazo removido.');
      } else if (item.type === 'gestor_task') {
        await deleteGestorTask(item.id);
        toast.success('Tarefa excluída.');
      }
    } catch (error) {
      toast.error('Erro ao remover item.');
    }
  };

  const { todayAgenda, overdueTasks } = useMemo(() => {
    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];

    candidates.forEach((candidate) => {
      Object.entries(candidate.checklistProgress || {}).forEach(([taskId, state]) => {
        if (state.dueDate) {
          const item = checklistStructure.flatMap((s) => s.items).find((i) => i.id === taskId);
          if (item) {
            const agendaItem: AgendaItem = {
              id: candidate.id,
              type: 'task',
              title: item.label,
              personName: candidate.name,
              personId: candidate.id,
              personType: 'candidate',
              dueDate: state.dueDate,
              taskId,
            };
            if (item.responsibleRole === 'SECRETARIA' || !item.responsibleRole) {
              if (state.dueDate === todayStr && !state.completed) todayAgendaItems.push(agendaItem);
              else if (state.dueDate < todayStr && !state.completed) overdueItems.push(agendaItem);
            }
          }
        }
      });
    });

    gestorTasks
      .filter((task) => task.user_id === user?.id)
      .forEach((task) => {
        const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
        const isCompletedToday =
          isRecurring &&
          gestorTaskCompletions.some(
            (c) => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === todayStr && c.done,
          );
        const isDueToday = isGestorTaskDueOnDate(task, todayStr);

        if (!isCompletedToday && isDueToday) {
          todayAgendaItems.push({
            id: task.id,
            type: 'gestor_task',
            title: task.title,
            personName: 'Minha Tarefa',
            personId: user!.id,
            personType: 'teamMember',
            dueDate: task.due_date || todayStr,
          });
        } else if (!isRecurring && task.due_date && task.due_date < todayStr && !task.is_completed) {
          overdueItems.push({
            id: task.id,
            type: 'gestor_task',
            title: task.title,
            personName: 'Minha Tarefa',
            personId: user!.id,
            personType: 'teamMember',
            dueDate: task.due_date,
          });
        }
      });

    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems };
  }, [candidates, checklistStructure, user, gestorTasks, gestorTaskCompletions, isGestorTaskDueOnDate, todayStr]);

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') navigate(`/gestor/candidate/${item.personId}`);
  };

  if (isDataLoading) {

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      <section className="animate-fade-in">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Painel da Secretaria
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Acompanhe sua rotina, prazos e o andamento operacional da contratação.
            </p>
          </div>
          <button
            onClick={() => navigate('/secretaria/checklists')}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <CheckSquare className="h-4 w-4" />
            Abrir meus checklists
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Checklist de Hoje"
            value={`${completedDailyTasks}/${totalDailyTasks}`}
            icon={ListChecks}
            colorClass="bg-brand-600 text-white"
            subValue={`${dailyProgress}% concluído`}
            onClick={() => navigate('/secretaria/checklists')}
          />
          <MetricCard
            title="Prazos de Hoje"
            value={todayAgenda.length}
            icon={CalendarDays}
            colorClass="bg-blue-600 text-white"
            subValue="Itens com vencimento hoje"
          />
          <MetricCard
            title="Itens Atrasados"
            value={overdueTasks.length}
            icon={AlertCircle}
            colorClass="bg-red-600 text-white"
            subValue="Precisam de atenção"
          />
        </div>
      </section>

      <section className="animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2 text-brand-500" /> Agenda e Lembretes de Prazos
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Compromissos de Hoje
            </h3>
            {todayAgenda.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum compromisso com data para hoje.</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-3">
                  {todayAgenda.map((item) => (
                    <li
                      key={item.id + item.type + item.taskId}
                      onClick={() => handleAgendaItemClick(item)}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-brand-200 group"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {item.type === 'interview' ? (
                            <Calendar className="w-4 h-4 text-green-500" />
                          ) : (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.personName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleCompleteItem(e, item)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                          title="Concluir"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, item)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                          title="Remover Prazo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-red-100 dark:border-red-900/30 shadow-md">
            <h3 className="text-sm font-bold text-red-500 uppercase mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Prazos e Datas Atrasadas
            </h3>
            {overdueTasks.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma data atrasada. Tudo em dia!</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-3">
                  {overdueTasks.map((item) => (
                    <li
                      key={item.id + item.type + item.taskId}
                      onClick={() => handleAgendaItemClick(item)}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 transition-colors cursor-pointer border border-red-100 dark:border-red-900/20 group"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-red-900 dark:text-red-200">{item.title}</p>
                          <p className="text-xs text-red-700 dark:text-red-400">
                            {item.personName} • Venceu em {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleCompleteItem(e, item)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                          title="Concluir"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, item)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                          title="Remover Prazo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-slate-800" />

      <section className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <ListChecks className="w-6 h-6 mr-2 text-brand-500" /> Minhas Rotinas Diárias
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Checklist de tarefas operacionais recorrentes.</p>
          </div>
          <button
            onClick={() => navigate('/secretaria/checklists')}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30"
          >
            <ChevronRight className="h-4 w-4" />
            Ver página completa
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <ListChecks className="w-5 h-5 mr-2 text-brand-500" />
              Progresso das Metas Diárias
            </h2>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {completedDailyTasks}/{totalDailyTasks} Concluídas
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
              className="bg-brand-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {dailyProgress}% do seu checklist de hoje está completo.
          </p>
        </div>

        <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
      </section>

    </div>
  );
};
