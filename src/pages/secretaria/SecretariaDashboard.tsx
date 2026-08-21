import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle,
  Sparkles,
  Eye,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';
import { DailyChecklistItem } from '@/types';
import { MetricCard } from '@/components/MetricCard';
import { DailyChecklistItemResourceModal } from '@/components/DailyChecklistItemResourceModal';

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
    toggleDailyChecklistCompletion,
  } = useApp();
  const navigate = useNavigate();

  const [selectedResourceItem, setSelectedResourceItem] = useState<DailyChecklistItem | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

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

  const isItemRecorrente = (item: DailyChecklistItem) => {
    const rec = item.resource?.recurrence?.type;
    return rec && rec !== 'specific_date';
  };

  const { completedDailyTasks, totalDailyTasks, dailyProgress, allTodayItems } = useMemo(() => {
    if (!user) return { completedDailyTasks: 0, totalDailyTasks: 0, dailyProgress: 0, allTodayItems: [] };

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

    const relevantItems = secretariaChecklists.flatMap((checklist) =>
      dailyChecklistItems.filter(
        (item) =>
          item.daily_checklist_id === checklist.id &&
          item.is_active &&
          isItemDueOnDate(item, todayStr),
      ),
    );

    const itemsWithStatus = relevantItems.map((item) => ({
      ...item,
      isDone: dailyChecklistCompletions.some(
        (c) => c.daily_checklist_item_id === item.id && c.consultant_id === user.id && c.date === todayStr && c.done,
      ),
      isRecorrente: isItemRecorrente(item),
    }));

    const total = itemsWithStatus.length;
    const completed = itemsWithStatus.filter((item) => item.isDone).length;

    return {
      completedDailyTasks: completed,
      totalDailyTasks: total,
      dailyProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      allTodayItems: itemsWithStatus,
    };
  }, [user, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, todayStr]);

  const handleToggleItem = async (itemId: string, currentlyDone: boolean) => {
    if (!user) return;
    setTogglingItemId(itemId);
    try {
      await toggleDailyChecklistCompletion(itemId, todayStr, !currentlyDone, user.id);
    } catch {
      toast.error('Erro ao atualizar tarefa.');
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleOpenResourceModal = (item: DailyChecklistItem) => {
    setSelectedResourceItem(item);
    setIsResourceModalOpen(true);
  };

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

  const totalOverdueCount = overdueTasks.length;

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Aqui está o que você precisa fazer hoje.
        </p>
      </div>

      {/* ALERTA DE ATRASADOS — só aparece se houver */}
      {totalOverdueCount > 0 && (
        <section className="animate-fade-in rounded-2xl border-2 border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-red-700 dark:text-red-300">
                {totalOverdueCount} {totalOverdueCount === 1 ? 'item atrasado' : 'itens atrasados'}
              </h2>
              <p className="text-xs text-red-600 dark:text-red-400">Precisam de atenção imediata</p>
            </div>
          </div>
          <ul className="space-y-2">
            {overdueTasks.slice(0, 4).map((item) => (
              <li
                key={item.id + item.type + item.taskId}
                onClick={() => handleAgendaItemClick(item)}
                className="flex items-center justify-between rounded-lg bg-white/70 p-2.5 dark:bg-slate-800/50 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition group"
              >
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-200">{item.title}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {item.personName} • venceu em {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={(e) => handleCompleteItem(e, item)}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md opacity-0 group-hover:opacity-100 transition"
                  title="Concluir"
                >
                  <Check className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          {totalOverdueCount > 4 && (
            <p className="mt-2 text-center text-xs font-bold text-red-500">
              +{totalOverdueCount - 4} outros itens atrasados
            </p>
          )}
        </section>
      )}

      {/* CHECKLIST DE HOJE — DESTAQUE PRINCIPAL E ÚNICO */}
      <section className="animate-fade-in">
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-md dark:border-brand-800 dark:from-brand-900/20 dark:to-slate-800">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Checklist de Hoje</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {completedDailyTasks} de {totalDailyTasks} tarefas concluídas
                </p>
              </div>
            </div>
            <span className={`text-3xl font-black ${dailyProgress === 100 ? 'text-green-600' : 'text-brand-600'}`}>
              {dailyProgress}%
            </span>
          </div>

          <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-white dark:bg-slate-700">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${dailyProgress === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${dailyProgress}%` }}
            />
          </div>

          {totalDailyTasks === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Nenhuma tarefa configurada para hoje.</p>
          ) : allTodayItems.every((i) => i.isDone) ? (
            <div className="flex flex-col items-center justify-center py-6 text-center mb-2">
              <Check className="h-10 w-10 text-green-500 mb-2" />
              <p className="font-bold text-green-700 dark:text-green-400">Tudo concluído por hoje! 🎉</p>
            </div>
          ) : null}

          {totalDailyTasks > 0 && (
            <div className="space-y-2">
              {allTodayItems.map((item) => {
                const hasResource = item.resource && item.resource.type !== 'none';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      item.isDone
                        ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                        : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleItem(item.id, item.isDone)}
                      disabled={togglingItemId === item.id}
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                        item.isDone
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-700'
                      }`}
                    >
                      {item.isDone && <Check className="h-4 w-4" />}
                    </button>

                    <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      item.isRecorrente
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}>
                      {item.isRecorrente ? 'RECORRENTE' : 'PONTUAL'}
                    </span>

                    <span className={`text-sm flex-1 truncate ${item.isDone ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                      {item.text}
                    </span>

                    {hasResource && (
                      <button
                        onClick={() => handleOpenResourceModal(item)}
                        className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Como fazer?
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* MÉTRICAS RÁPIDAS */}
      <section className="animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Checklist de Hoje"
            value={`${completedDailyTasks}/${totalDailyTasks}`}
            icon={ListChecks}
            colorClass="bg-brand-600 text-white"
            subValue={`${dailyProgress}% concluído`}
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

      {selectedResourceItem && (
        <DailyChecklistItemResourceModal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          itemText={selectedResourceItem.text}
          resource={selectedResourceItem.resource}
        />
      )}
    </div>
  );
};