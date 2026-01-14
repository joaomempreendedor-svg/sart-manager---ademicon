import React, { useMemo, useRef, useEffect } from 'react';
import { CalendarEvent, isSameDay, formatTime } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask } from '@/types';

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
  const now = new Date();
  const currentTimeRef = useRef<HTMLDivElement>(null);

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

  // Update current time indicator position every minute
  useEffect(() => {
    const updateLinePosition = () => {
      if (currentTimeRef.current && isCurrentDay) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const topPercent = (currentMinutes / (24 * 60)) * 100;
        currentTimeRef.current.style.top = `${topPercent}%`;
      }
    };

    updateLinePosition();
    const interval = setInterval(updateLinePosition, 60 * 1000); // Update every minute
    return () => clearInterval(interval);
  }, [isCurrentDay, now]);

  const getEventColorClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'gestor_task': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return <CalendarDays className="w-3 h-3 mr-1" />;
      case 'meeting': return <Users className="w-3 h-3 mr-1" />;
      case 'gestor_task': return <MessageSquare className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 border-l border-gray-200 dark:border-slate-700 relative">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          {allDayEvents.map(event => (
            <div key={event.id} className={`mb-1 p-1.5 rounded-md text-xs font-medium ${getEventColorClass(event.type)} flex items-center justify-between group`}>
              <span className="truncate">{event.title}</span>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(event.type === 'personal' || event.type === 'gestor_task') && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timed events grid */}
      <div className="relative h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar"> {/* Adjust height based on header/footer */}
        {/* Current time indicator */}
        {isCurrentDay && (
          <div
            ref={currentTimeRef}
            className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
            style={{ top: `${(now.getHours() * 60 + now.getMinutes()) / (24 * 60) * 100}%` }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
          </div>
        )}

        {/* Event blocks */}
        {positionedEvents.map(event => (
          <div
            key={event.id}
            className={`absolute left-0 right-0 mx-1 p-2 rounded-lg shadow-sm border ${getEventColorClass(event.type)} group`}
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
              {event.type === 'meeting' && (
                <Button variant="ghost" size="icon" onClick={() => toast.info("Reuniões de leads são gerenciadas na seção de CRM.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayViewGrid;