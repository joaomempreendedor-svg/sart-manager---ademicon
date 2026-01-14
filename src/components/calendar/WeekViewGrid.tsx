import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay, formatTime } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask, DailyChecklistItem, LeadTask } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

interface WeekViewGridProps {
  weekDays: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  onOpenEventModal: (date: Date, event?: CalendarEvent) => void;
  onDeleteEvent: (eventId: string, eventType: CalendarEvent['type']) => void;
  onToggleGestorTaskCompletion: (task: GestorTask, date: Date) => void;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents: boolean;
}

const WeekViewGrid: React.FC<WeekViewGridProps> = ({
  weekDays,
  eventsByDay,
  today,
  onOpenEventModal,
  onDeleteEvent,
  onToggleGestorTaskCompletion,
  userRole,
  showPersonalEvents,
}) => {
  const isCurrentWeek = weekDays.some(day => isSameDay(day, new Date()));
  const navigate = useNavigate();
  const { toggleDailyChecklistCompletion, toggleLeadTaskCompletion, deleteLeadTask } = useApp();

  const allWeekAllDayEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      events.push(...(eventsByDay[dayStr]?.filter(e => e.allDay) || []));
    });
    return events;
  }, [weekDays, eventsByDay]);

  const hasAnyAllDayEventsInWeek = allWeekAllDayEvents.length > 0;

  const positionedEventsByDay = useMemo(() => {
    const result: Record<string, (CalendarEvent & { top: number; height: number; left: number; width: number; })[]> = {};

    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      const timedEvents = eventsByDay[dayStr]?.filter(e => !e.allDay) || [];

      timedEvents.sort((a, b) => {
        if (a.start.getTime() !== b.start.getTime()) {
          return a.start.getTime() - b.start.getTime();
        }
        return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
      });

      const columns: { end: number; events: (CalendarEvent & { top: number; height: number; left: number; width: number; })[] }[] = [];
      
      result[dayStr] = timedEvents.map(event => {
        const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
        const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
        const top = (startMinutes / (24 * 60)) * 100;
        const height = ((endMinutes - startMinutes) / (24 * 60)) * 100;

        let columnIndex = 0;
        while (columnIndex < columns.length && columns[columnIndex].end > startMinutes) {
          columnIndex++;
        }

        if (columnIndex === columns.length) {
          columns.push({ end: endMinutes, events: [] });
        }
        columns[columnIndex].end = endMinutes;

        const left = (columnIndex / (columns.length || 1)) * 100; // Avoid division by zero
        const width = (1 / (columns.length || 1)) * 100;

        return { ...event, top, height, left, width };
      });
    });
    return result;
  }, [weekDays, eventsByDay]);

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
      case 'personal': return <CalendarDays className="w-3 h-3 mr-1 flex-shrink-0" />;
      case 'meeting': return <Users className="w-3 h-3 mr-1 flex-shrink-0" />;
      case 'gestor_task': return <MessageSquare className="w-3 h-3 mr-1 flex-shrink-0" />;
      case 'daily_checklist': return <ListChecks className="w-3 h-3 mr-1 flex-shrink-0" />;
      case 'lead_task': return <ListTodo className="w-3 h-3 mr-1 flex-shrink-0" />;
      default: return null;
    }
  };

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

  // Calculate current time line position
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeTop = ((currentHour * 60 + currentMinutes) / (24 * 60)) * 100;

  return (
    <div className="flex flex-col flex-1">
      {/* All-day events section for the entire week */}
      {hasAnyAllDayEventsInWeek && (
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          {/* Empty spacer to align with time column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"></div>
          
          {/* Grid for 7 days of all-day events */}
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map(day => {
              const dayStr = day.toISOString().split('T')[0];
              const dayAllDayEvents = allWeekAllDayEvents.filter(e => isSameDay(e.start, day));
              return (
                <div key={dayStr} className="flex flex-col space-y-0.5 p-1 border-l border-gray-200 dark:border-slate-700">
                  {dayAllDayEvents.map(event => (
                    <div key={event.id} className={`mb-1 p-1.5 rounded-md text-xs font-medium ${getEventColorClass(event.type)} flex items-center group`}>
                      <div className="flex-1 flex items-center overflow-hidden">
                        {getEventIcon(event.type)}
                        <span className="truncate" title={event.title}>{event.title}</span>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
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
              );
            })}
          </div>
        </div>
      )}

      {/* Main content area: Time column + Days Grid */}
      <div className="flex flex-1">
        {/* Time Column */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="h-16 border-b border-gray-200 dark:border-slate-700"></div> {/* Corner for day headers */}
          <div className="relative h-[1440px]"> {/* 24 hours * 60 minutes = 1440px height */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour} 
                className="absolute text-xs text-gray-500 dark:text-gray-400 text-right pr-2"
                style={{ top: `${(hour * 60) / 1440 * 100}%`, transform: 'translateY(-50%)' }}
              >
                {hour === 0 ? '' : `${hour}:00`}
              </div>
            ))}
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1">
          {weekDays.map(day => {
            const dayStr = day.toISOString().split('T')[0];
            const isCurrentDay = isSameDay(day, now); // Use 'now' for current day check
            const positionedTimedEvents = positionedEventsByDay[dayStr] || [];

            return (
              <div key={dayStr} className="flex-1 border-l border-gray-200 dark:border-slate-700 relative">
                {/* Day Header */}
                <div className={`h-16 flex flex-col items-center justify-center border-b border-gray-200 dark:border-slate-700 ${isCurrentDay ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                  <p className={`text-xs font-medium ${isCurrentDay ? 'text-brand-800 dark:text-brand-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold ${isCurrentDay ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-white'}`}>
                    {day.getDate()}
                  </p>
                  {showPersonalEvents && (
                    <button
                      onClick={() => onOpenEventModal(day)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
                      title="Adicionar Evento"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Timed events grid */}
                <div className="relative h-[1440px]"> {/* 24 hours * 60 minutes = 1440px height */}
                  {/* Hourly and Half-Hourly Grid Lines */}
                  {Array.from({ length: 24 * 2 }).map((_, index) => { // 48 half-hour slots
                    const isHalfHour = index % 2 !== 0;
                    return (
                      <div
                        key={index}
                        className={`absolute left-0 right-0 h-[30px] border-t ${isHalfHour ? 'border-gray-100 dark:border-slate-700' : 'border-gray-200 dark:border-slate-600'} ${isHalfHour ? '' : 'opacity-50'}`}
                        style={{ top: `${(index * 30) / 1440 * 100}%` }}
                      ></div>
                    );
                  })}

                  {/* Clickable slots for adding new events */}
                  {Array.from({ length: 24 * 2 }).map((_, index) => { // 48 half-hour slots
                    const hour = Math.floor(index / 2);
                    const minute = (index % 2) * 30;
                    return (
                      <div
                        key={`slot-${index}`}
                        className="absolute left-0 right-0 h-[30px] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30"
                        style={{ top: `${(index * 30) / 1440 * 100}%` }}
                        onClick={() => {
                          if (showPersonalEvents) {
                            const newEventDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
                            onOpenEventModal(newEventDate);
                          } else {
                            toast.info("Você não tem permissão para adicionar eventos pessoais aqui.");
                          }
                        }}
                      ></div>
                    );
                  })}

                  {/* Current Time Indicator */}
                  {isCurrentDay && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                      style={{ top: `${currentTimeTop}%` }}
                    >
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                  )}

                  {positionedTimedEvents.map(event => (
                    <div
                      key={event.id}
                      className={`absolute p-1 rounded-lg shadow-sm border ${getEventColorClass(event.type)} group overflow-hidden z-10 flex flex-col`}
                      style={{ top: `${event.top}%`, height: `${event.height}%`, left: `${event.left}%`, width: `${event.width}%` }}
                    >
                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-1"> {/* Content area */}
                        <div className="flex items-center text-xs font-medium">
                          {getEventIcon(event.type)}
                          <span className="line-clamp-2" title={event.title}>{event.title}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1 flex-shrink-0" /> {formatTime(event.start)} - {formatTime(event.end)}
                        </p>
                        {event.personName && event.type !== 'gestor_task' && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                            <UserRound className="w-3 h-3 mr-1 flex-shrink-0" /> <span className="truncate">{event.personName}</span>
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
                      </div>
                      {/* Action buttons - positioned at the bottom right */}
                      <div className="flex justify-end items-center space-x-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity"> {/* Added opacity for hover */}
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekViewGrid;