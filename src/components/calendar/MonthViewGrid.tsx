import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask } from '@/types';

interface MonthViewGridProps {
  displayedDays: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  currentMonth: Date;
  onOpenEventModal: (date: Date, event?: CalendarEvent) => void;
  onDeleteEvent: (eventId: string, eventType: CalendarEvent['type']) => void;
  onToggleGestorTaskCompletion: (task: GestorTask, date: Date) => void;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents: boolean;
}

const MonthViewGrid: React.FC<MonthViewGridProps> = ({
  displayedDays,
  eventsByDay,
  today,
  currentMonth,
  onOpenEventModal,
  onDeleteEvent,
  onToggleGestorTaskCompletion,
  userRole,
  showPersonalEvents,
}) => {
  const getEventColorClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'meeting': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'gestor_task': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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
    <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-slate-700">
      {displayedDays.map(day => {
        const dayStr = day.toISOString().split('T')[0];
        const eventsToday = eventsByDay[dayStr] || [];
        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
        const isToday = isSameDay(day, today);

        const sortedEvents = eventsToday.sort((a, b) => {
          // All-day events first, then by start time
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return a.start.getTime() - b.start.getTime();
        });

        return (
          <div
            key={dayStr}
            className={`relative h-32 border-r border-b border-gray-200 dark:border-slate-700 p-1 overflow-hidden ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900 opacity-70'}`}
          >
            <div className={`flex justify-between items-center mb-1 ${isToday ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-white'}`}>
              <span className={`text-sm font-bold ${isToday ? 'bg-brand-100 dark:bg-brand-900/30 rounded-full h-6 w-6 flex items-center justify-center' : ''}`}>
                {day.getDate()}
              </span>
              {showPersonalEvents && ( // Agora showPersonalEvents será true para Gestores/Admins também
                <button
                  onClick={() => onOpenEventModal(day)}
                  className="p-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
                  title="Adicionar Evento"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-0.5 text-xs">
              {sortedEvents.slice(0, 2).map(event => ( // Show max 2 events, then "Mais X"
                <div key={event.id} className={`p-1 rounded-md ${getEventColorClass(event.type)} flex items-center justify-between group`}>
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
              {sortedEvents.length > 2 && (
                <div className="p-1 text-gray-600 dark:text-gray-400">
                  +{sortedEvents.length - 2} mais
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonthViewGrid;