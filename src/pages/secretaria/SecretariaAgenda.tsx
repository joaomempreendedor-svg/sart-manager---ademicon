import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
  Plus,
  Repeat,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistItem, GestorTask } from '@/types';

const SECRETARIA_PREFIX = '[SEC] ';

type AgendaItem = {
  id: string;
  kind: 'task' | 'daily' | 'candidate';
  title: string;
  description?: string;
  time?: string;
  done: boolean;
  recurring?: boolean;
  sourceLabel: string;
  task?: GestorTask;
  dailyItem?: DailyChecklistItem;
  candidateId?: string;
  checklistItemId?: string;
};

const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const isDailyItemDueOnDate = (item: DailyChecklistItem, dateStr: string) => {
  const recurrence = item.resource?.recurrence;
  if (!recurrence || recurrence.type === 'daily') return true;

  const parse = (value: string) => new Date(`${value}T00:00:00`);
  const target = parse(dateStr);

  if (recurrence.type === 'weekly') return target.getDay() === (recurrence.dayOfWeek ?? target.getDay());
  if (recurrence.type === 'monthly') return target.getDate() === (recurrence.dayOfMonth ?? target.getDate());
  if (recurrence.type === 'specific_date') return dateStr === recurrence.specificDate;
  if (recurrence.type === 'every_x_days') {
    const start = recurrence.startDate ? parse(recurrence.startDate) : new Date(item.created_at);
    if (target < start) return false;
    const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays % Math.max(2, recurrence.intervalDays ?? 2) === 0;
  }
  return true;
};

export const SecretariaAgenda = () => {
  const { user } = useAuth();
  const {
    isDataLoading,
    gestorTasks,
    gestorTaskCompletions,
    isGestorTaskDueOnDate,
    toggleGestorTaskCompletion,
    deleteGestorTask,
    addGestorTask,
    teamMembers,
    dailyChecklists,
    dailyChecklistItems,
    dailyChecklistAssignments,
    dailyChecklistCompletions,
    toggleDailyChecklistCompletion,
    candidates,
    checklistStructure,
    toggleChecklistItem,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily' | 'every_x_days'>('none');
  const [newInterval, setNewInterval] = useState('2');
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = toDateStr(selectedDate);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    if (!user) return [];

    const items: AgendaItem[] = [];

    // Atividades enviadas pelo gestor ou criadas pela própria secretaria.
    gestorTasks
      .filter(task => task.user_id === user.id && isGestorTaskDueOnDate(task, dateStr))
      .forEach(task => {
        const recurring = Boolean(task.recurrence_pattern && task.recurrence_pattern.type !== 'none');
        const done = recurring
          ? gestorTaskCompletions.some(
              completion =>
                completion.gestor_task_id === task.id &&
                completion.user_id === user.id &&
                completion.date === dateStr &&
                completion.done,
            )
          : task.is_completed;

        items.push({
          id: `task-${task.id}`,
          kind: 'task',
          title: task.title,
          description: task.description,
          time: task.scheduled_time ? task.scheduled_time.slice(0, 5) : undefined,
          done,
          recurring,
          sourceLabel: recurring ? 'Atividade recorrente' : 'Atividade',
          task,
        });
      });

    // Itens dos checklists diários atribuídos à secretaria.
    const userTeamMember = teamMembers.find(member => member.authUserId === user.id);
    const isSecretaria = userTeamMember?.roles.includes('SECRETARIA') ?? true;
    const assignedChecklistIds = new Set(
      dailyChecklists
        .filter(checklist => {
          if (!checklist.is_active) return false;
          const hasAssignment = dailyChecklistAssignments.some(
            assignment => assignment.daily_checklist_id === checklist.id,
          );
          if (hasAssignment) {
            return dailyChecklistAssignments.some(
              assignment =>
                assignment.daily_checklist_id === checklist.id && assignment.consultant_id === user.id,
            );
          }
          return isSecretaria && checklist.title.startsWith(SECRETARIA_PREFIX);
        })
        .map(checklist => checklist.id),
    );

    dailyChecklistItems
      .filter(item => item.is_active && assignedChecklistIds.has(item.daily_checklist_id))
      .filter(item => isDailyItemDueOnDate(item, dateStr))
      .forEach(item => {
        const done = dailyChecklistCompletions.some(
          completion =>
            completion.daily_checklist_item_id === item.id &&
            completion.consultant_id === user.id &&
            completion.date === dateStr &&
            completion.done,
        );
        const recurrence = item.resource?.recurrence?.type;

        items.push({
          id: `daily-${item.id}`,
          kind: 'daily',
          title: item.text,
          time: item.resource?.recurrence?.time?.slice(0, 5),
          done,
          recurring: Boolean(recurrence && recurrence !== 'specific_date'),
          sourceLabel: 'Checklist',
          dailyItem: item,
        });
      });

    // Prazos de candidatos sob responsabilidade da secretaria.
    candidates.forEach(candidate => {
      Object.entries(candidate.checklistProgress || {}).forEach(([checklistItemId, state]) => {
        if (!state.dueDate || state.dueDate !== dateStr || state.completed) return;
        const checklistItem = checklistStructure
          .flatMap(stage => stage.items)
          .find(item => item.id === checklistItemId);
        if (!checklistItem) return;
        if (checklistItem.responsibleRole !== 'SECRETARIA' && checklistItem.responsibleRole) return;

        items.push({
          id: `candidate-${candidate.id}-${checklistItemId}`,
          kind: 'candidate',
          title: checklistItem.label,
          description: `Prazo de ${candidate.name}`,
          done: false,
          sourceLabel: 'Prazo de candidato',
          candidateId: candidate.id,
          checklistItemId,
        });
      });
    });

    return items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.title.localeCompare(b.title, 'pt-BR');
    });
  }, [
    user,
    dateStr,
    gestorTasks,
    gestorTaskCompletions,
    isGestorTaskDueOnDate,
    teamMembers,
    dailyChecklists,
    dailyChecklistItems,
    dailyChecklistAssignments,
    dailyChecklistCompletions,
    candidates,
    checklistStructure,
  ]);

  const completedCount = agendaItems.filter(item => item.done).length;
  const pendingCount = agendaItems.length - completedCount;

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewTime('');
    setNewRecurrence('none');
    setNewInterval('2');
  };

  const handleAddActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newTitle.trim()) {
      toast.error('Informe o título da atividade.');
      return;
    }
    if (newRecurrence === 'every_x_days' && Number(newInterval) < 2) {
      toast.error('O intervalo deve ser 2 ou mais dias.');
      return;
    }

    setIsSaving(true);
    try {
      await addGestorTask(
        {
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          due_date: dateStr,
          scheduled_time: newTime || undefined,
          recurrence_pattern:
            newRecurrence === 'none'
              ? { type: 'none' }
              : {
                  type: newRecurrence,
                  interval: newRecurrence === 'every_x_days' ? Number(newInterval) : undefined,
                },
        },
        user.id,
      );
      toast.success('Atividade adicionada à agenda.');
      resetForm();
      setIsAdding(false);
    } catch {
      toast.error('Erro ao adicionar atividade.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (item: AgendaItem) => {
    if (!user) return;
    try {
      if (item.kind === 'task' && item.task) {
        await toggleGestorTaskCompletion(item.task.id, !item.done, dateStr);
      } else if (item.kind === 'daily' && item.dailyItem) {
        await toggleDailyChecklistCompletion(item.dailyItem.id, dateStr, !item.done, user.id);
      } else if (item.kind === 'candidate' && item.candidateId && item.checklistItemId) {
        await toggleChecklistItem(item.candidateId, item.checklistItemId);
      }
      toast.success(item.done ? 'Atividade marcada como pendente.' : 'Atividade concluída!');
    } catch {
      toast.error('Erro ao atualizar atividade.');
    }
  };

  const handleDelete = async (item: AgendaItem) => {
    if (!item.task || !window.confirm(`Deseja excluir a atividade "${item.title}"?`)) return;
    try {
      await deleteGestorTask(item.task.id);
      toast.success('Atividade removida.');
    } catch {
      toast.error('Erro ao remover atividade.');
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-20 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <CalendarDays className="h-7 w-7 text-brand-500" />
            Minha Agenda
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Todas as atividades que você precisa fazer, organizadas por data.
          </p>
        </div>
        <Button onClick={() => setIsAdding(current => !current)}>
          {isAdding ? 'Fechar formulário' : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Nova atividade
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => addDays(prev, -1))} title="Dia anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => addDays(prev, 1))} title="Próximo dia">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2">
            <p className="text-sm font-bold capitalize text-gray-900 dark:text-white">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400">{pendingCount} pendente(s) · {completedCount} concluída(s)</p>
          </div>
        </div>
        <Input
          type="date"
          value={dateStr}
          onChange={event => {
            const [year, month, day] = event.target.value.split('-').map(Number);
            if (year && month && day) setSelectedDate(new Date(year, month - 1, day));
          }}
          className="w-full sm:w-48"
        />
      </div>

      {isAdding && (
        <form onSubmit={handleAddActivity} className="space-y-4 rounded-xl border border-brand-200 bg-white p-5 shadow-sm dark:border-brand-900 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Adicionar atividade em {selectedDate.toLocaleDateString('pt-BR')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="agenda-title">Título *</Label>
              <Input id="agenda-title" value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Ex.: Enviar contratos para assinatura" />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="agenda-description">Descrição</Label>
              <Textarea id="agenda-description" value={newDescription} onChange={event => setNewDescription(event.target.value)} rows={2} placeholder="Detalhes da atividade" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-time">Horário</Label>
              <Input id="agenda-time" type="time" value={newTime} onChange={event => setNewTime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-recurrence">Repetição</Label>
              <select
                id="agenda-recurrence"
                value={newRecurrence}
                onChange={event => setNewRecurrence(event.target.value as 'none' | 'daily' | 'every_x_days')}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="none">Não repetir</option>
                <option value="daily">Todos os dias</option>
                <option value="every_x_days">A cada X dias</option>
              </select>
            </div>
            {newRecurrence === 'every_x_days' && (
              <div className="space-y-2">
                <Label htmlFor="agenda-interval">Intervalo (dias)</Label>
                <Input id="agenda-interval" type="number" min={2} value={newInterval} onChange={event => setNewInterval(event.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Adicionar'}</Button>
          </div>
        </form>
      )}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <ListChecks className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Atividades desta data</h2>
        </div>

        {agendaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <CalendarDays className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nenhuma atividade para esta data.</p>
            <p className="text-xs text-gray-400">Use “Nova atividade” para adicionar um lembrete.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {agendaItems.map(item => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                <button
                  onClick={() => handleToggle(item)}
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                    item.done
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white hover:border-brand-400 dark:border-slate-600 dark:bg-slate-700'
                  }`}
                  title={item.done ? 'Marcar como pendente' : 'Concluir atividade'}
                >
                  {item.done && <Check className="h-4 w-4" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold ${item.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {item.title}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {item.sourceLabel}
                    </span>
                    {item.recurring && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <Repeat className="h-3 w-3" /> Recorrente
                      </span>
                    )}
                    {item.time && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                        <Clock className="h-3 w-3" /> {item.time}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  )}
                </div>

                {item.kind === 'task' && item.task && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="rounded-md p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Excluir atividade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {item.kind === 'candidate' && (
                  <span title="Prazo de candidato">
                    <UserRoundCheck className="h-5 w-5 flex-shrink-0 text-amber-500" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Você ainda tem {pendingCount} atividade(s) pendente(s) nesta data.
        </div>
      )}
    </div>
  );
};

export default SecretariaAgenda;
