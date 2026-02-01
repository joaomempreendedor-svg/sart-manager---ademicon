import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { GestorTask } from '@/types';
import { Plus, Edit2, Trash2, CheckCircle2, Circle, Loader2, Calendar, MessageSquare, Clock, Save, X, ListTodo, CalendarPlus, Repeat, CalendarDays } from 'lucide-react'; // Adicionado CalendarDays icon
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

export const GestorTasksSection: React.FC = () => {
  const { user } = useAuth();
  const { gestorTasks, gestorTaskCompletions, addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion, isGestorTaskDueOnDate } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskRecurrenceType, setNewTaskRecurrenceType] = useState<'none' | 'daily' | 'every_x_days'>('none'); // NOVO: Tipo de recorrência
  const [newTaskRecurrenceInterval, setNewTaskRecurrenceInterval] = useState<number | undefined>(undefined); // NOVO: Intervalo de recorrência
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [editingTask, setEditingTask] = useState<GestorTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskRecurrenceType, setEditTaskRecurrenceType] = useState<'none' | 'daily' | 'every_x_days'>('none'); // NOVO: Tipo de recorrência em edição
  const [editTaskRecurrenceInterval, setEditTaskRecurrenceInterval] = useState<number | undefined>(undefined); // NOVO: Intervalo de recorrência em edição
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // CORREÇÃO: Calcular 'today' a cada renderização para garantir que esteja sempre atualizado
  const today = formatDate(new Date());

  const sortedTasks = useMemo(() => {
    return [...gestorTasks].sort((a, b) => {
      const aIsRecurring = a.recurrence_pattern && a.recurrence_pattern.type !== 'none';
      const bIsRecurring = b.recurrence_pattern && b.recurrence_pattern.type !== 'none';

      const aIsCompletedToday = aIsRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === a.id && c.user_id === user?.id && c.date === today && c.done);
      const bIsCompletedToday = bIsRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === b.id && c.user_id === user?.id && c.date === today && c.done);

      const aIsDueToday = isGestorTaskDueOnDate(a, today);
      const bIsDueToday = isGestorTaskDueOnDate(b, today);

      // Priorizar tarefas recorrentes ou com vencimento hoje que não foram concluídas
      if (aIsDueToday && !aIsCompletedToday && (!bIsDueToday || bIsCompletedToday)) return -1;
      if (bIsDueToday && !bIsCompletedToday && (!aIsDueToday || aIsCompletedToday)) return 1;

      // Em seguida, tarefas não recorrentes incompletas
      if (!aIsRecurring && !a.is_completed && (!bIsRecurring && b.is_completed)) return -1;
      if (!bIsRecurring && !b.is_completed && (!aIsRecurring && a.is_completed)) return 1;

      // Em seguida, por data de vencimento (mais próxima primeiro, sem data por último)
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [gestorTasks, gestorTaskCompletions, user?.id, today, isGestorTaskDueOnDate]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }
    if (newTaskRecurrenceType === 'every_x_days' && (!newTaskRecurrenceInterval || isNaN(newTaskRecurrenceInterval) || newTaskRecurrenceInterval < 2)) {
      toast.error("Para recorrência 'A cada X dias', o intervalo deve ser um número maior ou igual a 2.");
      return;
    }

    setIsAddingTask(true);
    try {
      const recurrence_pattern = newTaskRecurrenceType === 'none' 
        ? { type: 'none' } 
        : { 
            type: newTaskRecurrenceType, 
            interval: newTaskRecurrenceType === 'every_x_days' 
              ? (newTaskRecurrenceInterval && !isNaN(newTaskRecurrenceInterval) ? Math.max(2, newTaskRecurrenceInterval) : 2) 
              : undefined 
          };

      await addGestorTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        due_date: newTaskDueDate || undefined,
        is_completed: false, // Tarefas novas sempre começam como não concluídas
        recurrence_pattern: recurrence_pattern, // NOVO: Incluir padrão de recorrência
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskRecurrenceType('none'); // Resetar estado
      setNewTaskRecurrenceInterval(undefined); // Resetar estado
      toast.success("Tarefa do gestor adicionada!");
    } catch (error) {
      console.error("Failed to add gestor task:", error);
      toast.error("Erro ao adicionar tarefa do gestor.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const startEditingTask = (task: GestorTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskDueDate(task.due_date || '');
    setEditTaskRecurrenceType(task.recurrence_pattern?.type || 'none'); // NOVO: Setar tipo de recorrência
    setEditTaskRecurrenceInterval(task.recurrence_pattern?.interval); // NOVO: Setar intervalo de recorrência
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTask || !editTaskTitle.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }
    if (editTaskRecurrenceType === 'every_x_days' && (!editTaskRecurrenceInterval || isNaN(editTaskRecurrenceInterval) || editTaskRecurrenceInterval < 2)) {
      toast.error("Para recorrência 'A cada X dias', o intervalo deve ser um número maior ou igual a 2.");
      return;
    }

    setIsUpdatingTask(true);
    try {
      const recurrence_pattern = editTaskRecurrenceType === 'none' 
        ? { type: 'none' } 
        : { 
            type: editTaskRecurrenceType, 
            interval: editTaskRecurrenceType === 'every_x_days' 
              ? (editTaskRecurrenceInterval && !isNaN(editTaskRecurrenceInterval) ? Math.max(2, editTaskRecurrenceInterval) : 2) 
              : undefined 
          };

      await updateGestorTask(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim() || undefined,
        due_date: editTaskDueDate || undefined,
        recurrence_pattern: recurrence_pattern, // NOVO: Incluir padrão de recorrência
      });
      setEditingTask(null);
      toast.success("Tarefa do gestor atualizada!");
    } catch (error) {
      console.error("Failed to update gestor task:", error);
      toast.error("Erro ao atualizar tarefa do gestor.");
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !window.confirm("Tem certeza que deseja excluir esta tarefa do gestor?")) return;
    try {
      await deleteGestorTask(taskId);
      toast.success("Tarefa do gestor excluída!");
    } catch (error) {
      console.error("Failed to delete gestor task:", error);
      toast.error("Erro ao excluir tarefa do gestor.");
    }
  };

  const handleToggleCompletion = async (task: GestorTask) => {
    if (!user) return;
    try {
      const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
      const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === today && c.done);
      
      await toggleGestorTaskCompletion(task.id, !isCompletedToday, today);
      
      toast.success(`Tarefa ${isCompletedToday ? 'marcada como pendente' : 'concluída'}!`);
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
      toast.error("Erro ao atualizar status da tarefa do gestor.");
    }
  };

  const handleAddToGoogleCalendar = (task: GestorTask) => {
    if (!task.due_date) {
      toast.error("Adicione uma data de vencimento à tarefa para agendar no Google Agenda.");
      return;
    }
    const title = encodeURIComponent(`${task.title} (Tarefa do Gestor)`);
    const startDate = new Date(task.due_date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // Evento de dia inteiro
    const formatDateForGoogle = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
    const details = encodeURIComponent(`Tarefa do gestor: ${task.description || ''}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
        <ListTodo className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-300">Tarefas do Gestor ({gestorTasks.length})</h2>
      </div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Coluna de Adicionar/Editar Tarefa */}
        <div className="space-y-2">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">
            {editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
          </h3>
          <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="space-y-2">
            <div>
              <Label htmlFor="taskTitle">Título da Tarefa *</Label>
              <Input
                id="taskTitle"
                value={editingTask ? editTaskTitle : newTaskTitle}
                onChange={(e) => (editingTask ? setEditTaskTitle(e.target.value) : setNewTaskTitle(e.target.value))}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Descrição (Opcional)</Label>
              <Textarea
                id="taskDescription"
                value={editingTask ? editTaskDescription : newTaskDescription}
                onChange={(e) => (editingTask ? setEditTaskDescription(e.target.value) : setNewTaskDescription(e.target.value))}
                rows={2}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div>
              <Label htmlFor="taskDueDate">Data de Vencimento (Opcional)</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={editingTask ? editTaskDueDate : newTaskDueDate}
                onChange={(e) => (editingTask ? setEditTaskDueDate(e.target.value) : setNewTaskDueDate(e.target.value))}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            {/* NOVO: Seletor de Recorrência */}
            <div>
              <Label htmlFor="recurrenceType">Recorrência</Label>
              <Select
                value={editingTask ? editTaskRecurrenceType : newTaskRecurrenceType}
                onValueChange={(value: 'none' | 'daily' | 'every_x_days') => {
                  if (editingTask) {
                    setEditTaskRecurrenceType(value);
                    if (value === 'none') setEditTaskRecurrenceInterval(undefined);
                    else if (value === 'daily') setEditTaskRecurrenceInterval(1);
                    else setEditTaskRecurrenceInterval(2); // Default para 'a cada 2 dias'
                  } else {
                    setNewTaskRecurrenceType(value);
                    if (value === 'none') setNewTaskRecurrenceInterval(undefined);
                    else if (value === 'daily') setNewTaskRecurrenceInterval(1);
                    else setNewTaskRecurrenceInterval(2);
                  }
                }}
              >
                <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="every_x_days">A cada X dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editingTask ? editTaskRecurrenceType === 'every_x_days' : newTaskRecurrenceType === 'every_x_days') && (
              <div>
                <Label htmlFor="recurrenceInterval">Repetir a cada (dias) *</Label>
                <Input
                  id="recurrenceInterval"
                  type="number"
                  min="2"
                  value={editingTask ? editTaskRecurrenceInterval || '' : newTaskRecurrenceInterval || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (editingTask) setEditTaskRecurrenceInterval(isNaN(value) ? undefined : value);
                    else setNewTaskRecurrenceInterval(isNaN(value) ? undefined : value);
                  }}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: 3"
                  required // Campo obrigatório quando 'every_x_days'
                />
              </div>
            )}
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button type="submit" disabled={isAddingTask || isUpdatingTask} className="bg-brand-600 hover:bg-brand-700 text-white flex-1">
                {isAddingTask || isUpdatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingTask ? 'Salvar Edição' : 'Adicionar Tarefa'}
              </Button>
              {editingTask && (
                <Button type="button" variant="outline" onClick={() => setEditingTask(null)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 flex-1">
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Coluna de Lista de Tarefas */}
        <div className="space-y-2">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">Lista de Tarefas ({sortedTasks.length})</h3>
          <ScrollArea className="h-[240px] pr-4 custom-scrollbar"> {/* Aumentado h-[160px] para h-[240px] */}
            {sortedTasks.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tarefa do gestor.</p>
            ) : (
              <div className="space-y-2">
                {sortedTasks.map(task => {
                  const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
                  const isCompletedToday = isRecurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === today && c.done);
                  const isVisuallyCompleted = isRecurring ? isCompletedToday : task.is_completed; // A chave para o estado visual
                  const isDueToday = isGestorTaskDueOnDate(task, today);
                  const isOverdue = !isRecurring && !task.is_completed && task.due_date && new Date(task.due_date + 'T00:00:00') < new Date(today + 'T00:00:00');

                  // Determine classes for the task item
                  let itemClasses = 'flex items-start space-x-2 p-2 rounded-lg border group flex-col sm:flex-row flex-wrap'; // Adicionado flex-wrap
                  let titleClasses = 'font-medium';
                  let descriptionClasses = 'text-sm mt-1';

                  if (isVisuallyCompleted) {
                    itemClasses += ' bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
                    titleClasses += ' line-through text-gray-500 dark:text-gray-400';
                    descriptionClasses += ' line-through text-gray-500 dark:text-gray-400';
                  } else if (isDueToday || isOverdue) { // Pendente e vencendo hoje ou atrasada
                    itemClasses += ' bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                    titleClasses += ' text-red-800 dark:text-red-200';
                    descriptionClasses += ' text-red-700 dark:text-red-300';
                  } else { // Não concluída, não vencendo hoje, não atrasada (tarefas futuras ou recorrentes não devidas hoje)
                    itemClasses += ' bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700';
                    titleClasses += ' text-gray-900 dark:text-white';
                    descriptionClasses += ' text-gray-600 dark:text-gray-300';
                  }

                  return (
                    <div key={task.id} className={itemClasses}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleCompletion(task)}
                        className={`flex-none ${isVisuallyCompleted ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-brand-600'}`}
                      >
                        {isVisuallyCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className={titleClasses}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className={descriptionClasses}>
                            {task.description}
                          </p>
                        )}
                        {/* NOVO: Indicador de conclusão explícito e mais proeminente */}
                        {isVisuallyCompleted ? (
                          <span className="flex items-center text-base text-green-600 dark:text-green-400 font-bold mt-1">
                            <CheckCircle2 className="w-4 h-4 mr-1 inline-block" /> {isRecurring ? 'Concluído hoje' : 'Concluído'}
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                            {task.due_date && !isRecurring && ( // Exibir data de vencimento apenas para tarefas não recorrentes
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> Vence: {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {isRecurring && (
                              <span className="flex items-center text-brand-600 dark:text-brand-400">
                                {task.recurrence_pattern?.type === 'daily' ? <Repeat className="w-3 h-3 mr-1" /> : <CalendarDays className="w-3 h-3 mr-1" />}
                                {task.recurrence_pattern?.type === 'daily' ? 'Diária' : `A cada ${task.recurrence_pattern?.interval} dias`}
                              </span>
                            )}
                            {isDueToday && ( // Task is due today (applies to both recurring and non-recurring if not completed)
                              <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                                <Clock className="w-3 h-3 mr-1" /> Vence Hoje!
                              </span>
                            )}
                            {isOverdue && !isDueToday && ( // Non-recurring task that is overdue but not due today (i.e., due in the past)
                              <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                                <Clock className="w-3 h-3 mr-1" /> Atrasada!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`flex-none flex items-center space-x-1 mt-2 sm:mt-0`}> {/* Ajustado space-x-1 para space-x-1 */}
                        {task.due_date && (
                          <Button variant="ghost" size="icon" onClick={() => handleAddToGoogleCalendar(task)} className="text-gray-400 hover:text-blue-600" title="Adicionar ao Google Agenda">
                            <CalendarPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => startEditingTask(task)} className="text-gray-400 hover:text-brand-600" title="Editar Tarefa">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};