import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay, formatTime } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask, DailyChecklistItem, LeadTask } from '@/types';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useApp } from '@/context/AppContext'; // Importar useApp para funções de contexto

interface DayViewGridProps {
  day: Date;
  events: CalendarEvent[];
  today: Date;
  onOpenEventModal: (date: Date, event?: CalendarEvent) => void;
  onDeleteEvent: (eventId: string, eventType: CalendarEvent['type']) => void;
  onToggleGestorTaskCompletion: (task: GestorTask, date: Date) => void;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents: boolean;
}

const DayViewGrid: React.FC<DayViewGridProps> = ({
  day,
  events,
  today,
  onOpenEventModal,
  onDeleteEvent,
  onToggleGestorTaskCompletion,
  userRole,
  showPersonalEvents,
}) => {
  const isCurrentDay = isSameDay(day, today);
  const navigate = useNavigate(); // Inicializar useNavigate
  const { toggleDailyChecklistCompletion, toggleLeadTaskCompletion, deleteLeadTask } = useApp(); // Funções do AppContext

  const allDayEvents = useMemo(() => events.filter(e => e.allDay), [events]);
  const timedEvents = useMemo(() => events.filter(e => !e.allDay), [events]);

  // Calculate event positioning for timed events
  const positionedEvents = useMemo(() => {
    return timedEvents.map(event => {
      const startHour = event.start.getHours() + event.start.getMinutes() / 60;
      const endHour = event.end.getHours() + event.end.getMinutes() / 60;
      const top = (startHour * 60) * (100 / (24 * 60)); // Percentage of total height (24 hours * 60 minutes)
      const height = ((endHour - startHour) * 60) * (100 / (24 * 60)); // Percentage of total height

      return { ...event, top, height };
    });
  }, [timedEvents]);

  const getEventColorClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'gestor_task': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'daily_checklist': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'lead_task': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return <CalendarDays className="w-3 h-3 mr-1" />;
      case 'meeting': return <Users className="w-3 h-3 mr-1" />;
      case 'gestor_task': return <MessageSquare className="w-3 h-3 mr-1" />;
      case 'daily_checklist': return <ListChecks className="w-3 h-3 mr-1" />;
      case 'lead_task': return <ListTodo className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  // Funções de ação para daily_checklist e lead_task
  const handleToggleDailyChecklist = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'daily_checklist') return;
    const item = event.originalEvent as DailyChecklistItem;
    const dateStr = event.start.toISOString().split('T')[0];
    try {
      await toggleDailyChecklistCompletion(item.id, dateStr, !item.is_completed, event.personId!);
      toast.success(`Item de checklist ${item.is_completed ? 'marcado como pendente' : 'concluído'}!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar checklist: ${error.message}`);
    }
  };

  const handleEditDailyChecklist = (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'daily_checklist') return;
    const item = event.originalEvent as DailyChecklistItem;
    const dateStr = event.start.toISOString().split('T')[0];
    navigate(`/consultor/daily-checklist`, { state: { highlightChecklistItemId: item.id, highlightChecklistDate: dateStr } });
  };

  const handleToggleLeadTask = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    try {
      await toggleLeadTaskCompletion(task.id, !task.is_completed);
      toast.success(`Tarefa de lead ${task.is_completed ? 'marcada como pendente' : 'concluída'}!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar tarefa de lead: ${error.message}`);
    }
  };

  const handleEditLeadTask = (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    const path = userRole === 'CONSULTOR' ? '/consultor/crm' : '/gestor/crm';
    navigate(path, { state: { highlightLeadId: task.lead_id, highlightLeadTaskId: task.id } });
  };

  const handleDeleteLeadTask = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
      try {
        await deleteLeadTask(task.id);
        toast.success("Tarefa de lead excluída com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir tarefa de lead: ${error.message}`);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {allDayEvents.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          {allDayEvents.map(event => (
            <div key={event.id} className={`mb-1 p-1.5 rounded-md text-xs font-medium ${getEventColorClass(event.type)} flex items-center justify-between group`}>
              <span className="truncate flex items-center">{getEventIcon(event.type)} {event.title}</span>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(event.type === 'personal' || event.type === 'gestor_task') && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
                {event.type === 'daily_checklist' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleDailyChecklist(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                      {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditDailyChecklist(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Checklist">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {event.type === 'lead_task' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleLeadTask(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                      {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditLeadTask(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Tarefa">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLeadTask(event)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {event.type === 'meeting' && (
                  <Button variant="ghost" size="icon" onClick={() => toast.info("Reuniões de leads são gerenciadas na seção de CRM.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1">
        <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="relative h-[calc(100vh-200px)]"> {/* Adjust height */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour} 
                className="absolute text-xs text-gray-500 dark:text-gray-400 text-right pr-2"
                style={{ top: `${(hour / 24) * 100}%`, transform: 'translateY(-50%)' }} // Position at the line, center vertically
              >
                {hour === 0 ? '' : `${hour}:00`} {/* Explicitly show :00 */}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 relative border-t border-l border-gray-200 dark:border-slate-700 overflow-y-auto custom-scrollbar h-[calc(100vh-200px)]">
          {Array.from({ length: 24 }).map((_, hour) => ( // 24 slots for 60-minute intervals
            <div
              key={hour}
              className="absolute left-0 right-0 border-b border-gray-200 dark:border-slate-700 h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30" // 60px height for 60-min slot
              style={{ top: `${(hour / 24) * 100}%` }} // Position based on 24 slots
              onClick={() => {
                if (showPersonalEvents) {
                  const newEventDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
                  onOpenEventModal(newEventDate);
                } else {
                  toast.info("Você não tem permissão para adicionar eventos pessoais aqui.");
                }
              }}
            ></div>
          ))}

          {positionedEvents.map(event => (
            <div
              key={event.id}
              className={`absolute p-1 rounded-lg shadow-sm border ${getEventColorClass(event.type)} group overflow-hidden`}
              style={{ top: `${event.top}%`, height: `${event.height}%` }}
            >
              <div className="flex items-center text-xs font-medium mb-1">
                {getEventIcon(event.type)}
                <span className="truncate">{event.title}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {formatTime(event.start)} - {formatTime(event.end)}
              </p>
              {event.personName && event.type !== 'gestor_task' && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                  <UserRound className="w-3 h-3 mr-1" /> {event.personName}
                </p>
              )}
              {event.type === 'gestor_task' && (event.originalEvent as GestorTask)?.is_completed && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
                </p>
              )}
              {event.type === 'gestor_task' && !(event.originalEvent as GestorTask)?.is_completed && isSameDay(event.start, today) && (
                <button
                  onClick={() => onToggleGestorTaskCompletion(event.originalEvent as GestorTask, event.start)}
                  className="mt-2 w-full flex items-center justify-center px-2 py-1 bg-purple-500 text-white rounded-md text-xs hover:bg-purple-600 transition"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como Concluída
                </button>
              )}
              <div className="absolute top-1 right-1 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(event.type === 'personal' || event.type === 'gestor_task') && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
                {event.type === 'daily_checklist' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleDailyChecklist(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                      {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditDailyChecklist(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Checklist">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {event.type === 'lead_task' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleLeadTask(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                      {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditLeadTask(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Tarefa">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLeadTask(event)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {event.type === 'meeting' && (
                  <Button variant="ghost" size="icon" onClick={() => toast.info("Reuniões de leads são gerenciadas na seção de CRM.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DayViewGrid;