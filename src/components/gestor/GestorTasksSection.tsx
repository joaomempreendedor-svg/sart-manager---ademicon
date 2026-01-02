import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { GestorTask } from '@/types';
import { Plus, Edit2, Trash2, CheckCircle2, Circle, Loader2, Calendar, MessageSquare, Clock, Save, X, ListTodo, CalendarPlus, Repeat } from 'lucide-react'; // Adicionado Repeat icon
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox'; // Importar Checkbox
import toast from 'react-hot-toast';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

export const GestorTasksSection: React.FC = () => {
  const { user } = useAuth();
  const { gestorTasks, gestorTaskCompletions, addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false); // NOVO: Estado para tarefa recorrente
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [editingTask, setEditingTask] = useState<GestorTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskIsRecurring, setEditTaskIsRecurring] = useState(false); // NOVO: Estado para tarefa recorrente em edição
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);

  const sortedTasks = useMemo(() => {
    return [...gestorTasks].sort((a, b) => {
      // Tarefas recorrentes incompletas primeiro
      const aIsCompletedToday = a.is_recurring && gestorTaskCompletions.some(c => c.gestor_task_id === a.id && c.user_id === user?.id && c.date === today && c.done);
      const bIsCompletedToday = b.is_recurring && gestorTaskCompletions.some(c => c.gestor_task_id === b.id && c.user_id === user?.id && c.date === today && c.done);

      if (a.is_recurring && !aIsCompletedToday && (!b.is_recurring || bIsCompletedToday)) return -1;
      if (b.is_recurring && !bIsCompletedToday && (!a.is_recurring || aIsCompletedToday)) return 1;

      // Tarefas não recorrentes incompletas
      if (!a.is_recurring && !a.is_completed && (!b.is_recurring && b.is_completed)) return -1;
      if (!b.is_recurring && !b.is_completed && (!a.is_recurring && a.is_completed)) return 1;

      // Em seguida, por data de vencimento (mais próxima primeiro, sem data por último)
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [gestorTasks, gestorTaskCompletions, user?.id, today]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    setIsAddingTask(true);
    try {
      await addGestorTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        due_date: newTaskDueDate || undefined,
        is_completed: false, // Tarefas novas sempre começam como não concluídas
        is_recurring: newTaskIsRecurring, // NOVO: Incluir status de recorrência
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskIsRecurring(false); // Resetar estado
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
    setEditTaskIsRecurring(task.is_recurring || false); // NOVO: Setar estado de recorrência
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTask || !editTaskTitle.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    setIsUpdatingTask(true);
    try {
      await updateGestorTask(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim() || undefined,
        due_date: editTaskDueDate || undefined,
        is_recurring: editTaskIsRecurring, // NOVO: Incluir status de recorrência
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
      if (task.is_recurring) {
        const isCompletedToday = gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user.id && c.date === today && c.done);
        await toggleGestorTaskCompletion(task.id, !isCompletedToday, today);
      } else {
        await toggleGestorTaskCompletion(task.id, !task.is_completed, today); // today é ignorado para não recorrentes
      }
      toast.success(`Tarefa ${task.is_completed || (task.is_recurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user.id && c.date === today && c.done)) ? 'marcada como pendente' : 'concluída'}!`);
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
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
        <ListTodo className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-lg font-semibold text-brand-800 dark:text-brand-300">Tarefas do Gestor ({gestorTasks.length})</h2> {/* Título atualizado */}
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna de Adicionar/Editar Tarefa */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">
            {editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
          </h3>
          <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="space-y-3">
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
                rows={3}
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
            {/* NOVO: Checkbox para tarefa recorrente */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={editingTask ? editTaskIsRecurring : newTaskIsRecurring}
                  onCheckedChange={(checked) => (editingTask ? setEditTaskIsRecurring(!!checked) : setNewTaskIsRecurring(!!checked))}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                  <Repeat className="w-4 h-4 mr-1" /> Tarefa Recorrente Diária
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                Tarefas recorrentes aparecem todos os dias e seu status é resetado diariamente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isAddingTask || isUpdatingTask} className="bg-brand-600 hover:bg-brand-700 text-white flex-1">
                {isAddingTask || isUpdatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingTask ? 'Salvar Edição' : 'Adicionar Tarefa'}
              </Button>
              {editingTask && (
                <Button type="button" variant="outline" onClick={() => setEditingTask(null)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Coluna de Lista de Tarefas */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">Lista de Tarefas ({sortedTasks.length})</h3>
          <ScrollArea className="h-[300px] pr-4 custom-scrollbar">
            {sortedTasks.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tarefa do gestor.</p>
            ) : (
              <div className="space-y-3">
                {sortedTasks.map(task => {
                  const isCompletedToday = task.is_recurring && gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === user?.id && c.date === today && c.done);
                  const isCompleted = task.is_recurring ? isCompletedToday : task.is_completed;

                  return (
                    <div key={task.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700'} group`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleCompletion(task)}
                        className={`flex-shrink-0 ${isCompleted ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-brand-600'}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </Button>
                      <div className="flex-1">
                        <p className={`font-medium ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {task.due_date && (
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" /> Vence: {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {task.is_recurring && (
                            <span className="flex items-center text-brand-600 dark:text-brand-400">
                              <Repeat className="w-3 h-3 mr-1" /> Diária
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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