import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { LeadTask, CrmLead } from '@/types';
import { X, Plus, CalendarPlus, CheckCircle2, Circle, Edit2, Trash2, Loader2, MessageSquare, Clock, Save } from 'lucide-react'; // Adicionado Save
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduleMeetingModal } from './ScheduleMeetingModal'; // Importar o modal de agendamento/edição

interface LeadTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  highlightedTaskId?: string | null; // NOVO: Prop para destacar uma tarefa específica
}

export const LeadTasksModal: React.FC<LeadTasksModalProps> = ({ isOpen, onClose, lead, highlightedTaskId }) => {
  const { user } = useAuth();
  const { leadTasks, addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [editingTask, setEditingTask] = useState<LeadTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // NOVO: Estados para o modal de edição de reunião
  const [isEditMeetingModalOpen, setIsEditMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<LeadTask | null>(null);

  const tasksForLead = leadTasks.filter(task => task.lead_id === lead.id).sort((a, b) => {
    // Sort by completion status (incomplete first), then by due date
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  // NOVO: Efeito para abrir o modal de reunião se highlightedTaskId for uma reunião
  useEffect(() => {
    if (isOpen && highlightedTaskId) {
      const taskToHighlight = tasksForLead.find(task => task.id === highlightedTaskId);
      if (taskToHighlight && taskToHighlight.type === 'meeting') {
        setEditingMeeting(taskToHighlight);
        setIsEditMeetingModalOpen(true);
      }
    }
  }, [isOpen, highlightedTaskId, tasksForLead]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;

    setIsAddingTask(true);
    try {
      await addLeadTask({
        lead_id: lead.id,
        user_id: user.id, // O usuário logado é o criador da tarefa
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        due_date: newTaskDueDate || undefined,
        is_completed: false,
        type: 'task', // Tipo padrão é 'task'
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
    } catch (error) {
      console.error("Failed to add lead task:", error);
      alert("Erro ao adicionar tarefa.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const startEditingTask = (task: LeadTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskDueDate(task.due_date || '');
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTask || !editTaskTitle.trim()) return;

    setIsUpdatingTask(true);
    try {
      await updateLeadTask(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim() || undefined,
        due_date: editTaskDueDate || undefined,
        user_id: editingTask.user_id, // Garante que o user_id não seja alterado
        manager_id: editingTask.manager_id, // Garante que o manager_id não seja alterado
      });
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to update lead task:", error);
      alert("Erro ao atualizar tarefa.");
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      await deleteLeadTask(taskId);
    } catch (error) {
      console.error("Failed to delete lead task:", error);
      alert("Erro ao excluir tarefa.");
    }
  };

  const handleToggleCompletion = async (task: LeadTask) => {
    if (!user) return;
    try {
      await toggleLeadTaskCompletion(task.id, !task.is_completed);
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
      alert("Erro ao atualizar status da tarefa.");
    }
  };

  const handleAddToGoogleCalendar = (task: LeadTask) => {
    if (!task.due_date) {
      alert("Adicione uma data de vencimento à tarefa para agendar no Google Agenda.");
      return;
    }
    const title = encodeURIComponent(`${task.title} - Lead: ${lead.name}`);
    const startDate = new Date(task.due_date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // Evento de dia inteiro
    const formatDateForGoogle = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
    const details = encodeURIComponent(`Tarefa para o Lead ${lead.name}:\n${task.description || ''}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}`;
    window.open(url, '_blank');
  };

  // NOVO: Função para abrir o modal de edição de reunião
  const handleEditMeeting = (meeting: LeadTask) => {
    setEditingMeeting(meeting);
    setIsEditMeetingModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Tarefas do Lead: {lead.name}</DialogTitle>
          <DialogDescription>
            Gerencie as tarefas e acompanhe o histórico de atividades para este lead.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Coluna de Adicionar/Editar Tarefa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
            </h3>
            <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="space-y-3">
              <div>
                <Label htmlFor="taskTitle">Título da Tarefa</Label>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lista de Tarefas ({tasksForLead.length})</h3>
            <ScrollArea className="h-[300px] pr-4 custom-scrollbar">
              {tasksForLead.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma tarefa para este lead.</p>
              ) : (
                <div className="space-y-3">
                  {tasksForLead.map(task => (
                    <div key={task.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${task.is_completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700'} group flex-col sm:flex-row`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleCompletion(task)}
                        className={`flex-shrink-0 ${task.is_completed ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-brand-600'}`}
                      >
                        {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </Button>
                      <div className="flex-1">
                        <p className={`font-medium ${task.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                          {task.type === 'meeting' && task.meeting_start_time && task.meeting_end_time ? (
                            <>
                              <span className="flex items-center text-purple-600 dark:text-purple-400 font-semibold">
                                <CalendarPlus className="w-3 h-3 mr-1" /> Reunião: {new Date(task.meeting_start_time).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="flex items-center text-purple-600 dark:text-purple-400 font-semibold">
                                <Clock className="w-3 h-3 mr-1" /> {new Date(task.meeting_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(task.meeting_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          ) : (
                            task.due_date && (
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" /> {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )
                          )}
                          {task.is_completed && task.completed_at && (
                            <span className="flex items-center text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Concluído em {new Date(task.completed_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-2 sm:mt-0 flex-wrap justify-end">
                        {task.type === 'meeting' && ( // NOVO: Botão de edição para reuniões
                          <Button variant="ghost" size="icon" onClick={() => handleEditMeeting(task)} className="text-gray-400 hover:text-purple-600" title="Editar Reunião">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {task.due_date && (
                          <Button variant="ghost" size="icon" onClick={() => handleAddToGoogleCalendar(task)} className="text-gray-400 hover:text-blue-600" title="Adicionar ao Google Agenda">
                            <CalendarPlus className="w-4 h-4" />
                          </Button>
                        )}
                        {task.type !== 'meeting' && ( // Não permite editar tarefas comuns aqui, apenas reuniões
                          <Button variant="ghost" size="icon" onClick={() => startEditingTask(task)} className="text-gray-400 hover:text-brand-600" title="Editar Tarefa">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* NOVO: Modal de Edição de Reunião */}
        {isEditMeetingModalOpen && editingMeeting && (
          <ScheduleMeetingModal
            isOpen={isEditMeetingModalOpen}
            onClose={() => {
              console.log("ScheduleMeetingModal onClose called");
              setIsEditMeetingModalOpen(false);
              setEditingMeeting(null);
            }}
            lead={lead} // Passa o lead atual
            currentMeeting={editingMeeting} // Passa a reunião para edição
          />
        )}
      </DialogContent>
    </Dialog>
  );
};