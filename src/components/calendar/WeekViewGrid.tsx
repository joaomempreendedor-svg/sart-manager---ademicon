import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay, formatTime } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask } from '@/types';

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

  // Collect all all-day events for the entire week
  const allWeekAllDayEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      events.push(...(eventsByDay[dayStr]?.filter(e => e.allDay) || []));
    });
    return events;
  }, [weekDays, eventsByDay]);

  // Check if there are any all-day events in the entire week to conditionally render the section
  const hasAnyAllDayEventsInWeek = allWeekAllDayEvents.length > 0;

  // Calculate event positioning for timed events
  const positionedEventsByDay = useMemo(() => {
    const result: Record<string, (CalendarEvent & { top: number; height: number; left: number; width: number; })[]> = {};

    weekDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      const timedEvents = eventsByDay[dayStr]?.filter(e => !e.allDay) || [];

      // Sort events by start time, then by duration (longer first)
      timedEvents.sort((a, b) => {
        if (a.start.getTime() !== b.start.getTime()) {
          return a.start.getTime() - b.start.getTime();
        }
        return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
      });

      const columns: { end: number; events: (CalendarEvent & { top: number; height: number; left: number; width: number; })[] }[] = [];
      
      result[dayStr] = timedEvents.map(event => {
        const startHour = event.start.getHours() + event.start.getMinutes() / 60;
        const endHour = event.end.getHours() + event.end.getMinutes() / 60;
        const top = (startHour * 60) * (100 / (24 * 60));
        const height = ((endHour - startHour) * 60) * (100 / (24 * 60));

        let columnIndex = 0;
        while (columnIndex < columns.length && columns[columnIndex].end > startHour) {
          columnIndex++;
        }

        if (columnIndex === columns.length) {
          columns.push({ end: endHour, events: [] });
        }
        columns[columnIndex].end = endHour;

        const left = (columnIndex / columns.length) * 100;
        const width = (1 / columns.length) * 100;

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
      case 'personal': return <CalendarDays className="w-3 h-3 mr-1" />;
      case 'meeting': return <Users className="w-3 h-3 mr-1" />;
      case 'gestor_task': return <MessageSquare className="w-3 h-3 mr-1" />;
      case 'daily_checklist': return <ListChecks className="w-3 h-3 mr-1" />;
      case 'lead_task': return <ListTodo className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* All-day events section for the entire week */}
      {hasAnyAllDayEventsInWeek && (
        <div className="p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <div className="grid grid-cols-7 gap-1"> {/* Grid for 7 days */}
            {weekDays.map(day => {
              const dayStr = day.toISOString().split('T')[0];
              const dayAllDayEvents = allWeekAllDayEvents.filter(e => isSameDay(e.start, day));
              return (
                <div key={dayStr} className="flex flex-col space-y-0.5">
                  {dayAllDayEvents.map(event => (
                    <div key={event.id} className={`p-1.5 rounded-md text-xs font-medium ${getEventColorClass(event.type)} flex items-center justify-between group`}>
                      <span className="truncate flex items-center">{getEventIcon(event.type)} {event.title}</span>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(event.type === 'personal' || event.type === 'gestor_task') && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                          </>
                        )}
                        {(event.type === 'daily_checklist' || event.type === 'lead_task') && (
                          <Button variant="ghost" size="icon" onClick={() => toast.info("Itens de checklist e tarefas de lead são gerenciados em suas respectivas seções, não diretamente no calendário.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
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
          {/* Removed "Dia Inteiro" header from here, it's now above */}
          <div className="relative h-[calc(100vh-200px)]"> {/* Adjust height */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="h-[60px] text-xs text-gray-500 dark:text-gray-400 text-right pr-2 -mt-2">
                {hour === 0 ? '' : `${hour} ${hour < 12 ? 'AM' : 'PM'}`}
              </div>
            ))}
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1">
          {weekDays.map(day => {
            const dayStr = day.toISOString().split('T')[0];
            const isCurrentDay = isSameDay(day, new Date());
            // All-day events are no longer rendered here
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
                <div className="relative h-[calc(100vh-200px)]"> {/* Adjust height */}
                  {/* Hourly lines and clickable slots */}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-gray-100 dark:border-slate-800 h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      style={{ top: `${(hour / 24) * 100}%` }}
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

                  {/* Event blocks */}
                  {positionedTimedEvents.map(event => (
                    <div
                      key={event.id}
                      className={`absolute p-1 rounded-lg shadow-sm border ${getEventColorClass(event.type)} group overflow-hidden`}
                      style={{ top: `${event.top}%`, height: `${event.height}%`, left: `${event.left}%`, width: `${event.width}%` }}
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
        })}
      </div>
    </div>
  );
};

export default WeekViewGrid;