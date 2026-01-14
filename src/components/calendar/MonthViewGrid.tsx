import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay, formatTime } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask } from '@/types';

interface MonthViewGridProps {
  displayedDays: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  currentMonth: Date;
  onOpenEventModal: (date: Date, event?: CalendarEvent) => void; // Adicionado aqui
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
  onOpenEventModal, // Desestruturado aqui
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
      case 'daily_checklist': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'lead_task': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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

  return (
    <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-slate-700">
      {displayedDays.map(day => {
        const dayStr = day.toISOString().split('T')[0];
        const eventsToday = eventsByDay[dayStr] || [];
        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
        const isToday = isSameDay(day, today);

        const allDayEvents = eventsToday.filter(event => event.allDay);
        const timedEvents = eventsToday.filter(event => !event.allDay).sort((a, b) => a.start.getTime() - b.start.getTime());

        return (
          <div
            key={dayStr}
            className={`relative h-32 border-r border-b border-gray-200 dark:border-slate-700 p-1 overflow-hidden ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900 opacity-70'}`}
          >
            <div className={`flex justify-between items-center mb-1 ${isToday ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-white'}`}>
              <span className={`text-sm font-bold ${isToday ? 'bg-brand-100 dark:bg-brand-900/30 rounded-full h-6 w-6 flex items-center justify-center' : ''}`}>
                {day.getDate()}
              </span>
              {showPersonalEvents && (
                <button
                  onClick={() => onOpenEventModal(day)}
                  className="p-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
                  title="Adicionar Evento"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Seção para eventos de dia inteiro */}
            {allDayEvents.length > 0 && (
              <div className="space-y-0.5 text-xs mb-1">
                {allDayEvents.slice(0, 1).map(event => ( // Limita a 1 evento de dia inteiro para não sobrecarregar
                  <div key={event.id} className={`p-1 rounded-md ${getEventColorClass(event.type)} flex items-center group`}>
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
                      {(event.type === 'daily_checklist' || event.type === 'lead_task') && (
                        <Button variant="ghost" size="icon" onClick={() => toast.info("Itens de checklist e tarefas de lead são gerenciados em suas respectivas seções, não diretamente no calendário.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
                      )}
                    </div>
                  </div>
                ))}
                {allDayEvents.length > 1 && (
                  <div className="p-1 text-gray-600 dark:text-gray-400">
                    +{allDayEvents.length - 1} mais (dia inteiro)
                  </div>
                )}
              </div>
            )}
            {/* Seção para eventos com horário */}
            <div className="space-y-0.5 text-xs">
              {timedEvents.slice(0, 2).map(event => ( // Show max 2 timed events
                <div key={event.id} className={`p-1 rounded-md ${getEventColorClass(event.type)} flex items-center group`}>
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
                    {event.type === 'meeting' && (
                      <Button variant="ghost" size="icon" onClick={() => toast.info("Reuniões de leads são gerenciadas na seção de CRM.")} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="w-3 h-3" /></Button>
                    )}
                  </div>
                </div>
              ))}
              {timedEvents.length > 2 && (
                <div className="p-1 text-gray-600 dark:text-gray-400">
                  +{timedEvents.length - 2} mais
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