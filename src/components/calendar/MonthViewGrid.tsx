import React, { useMemo } from 'react';
import { CalendarEvent } from '@/pages/CalendarPage';
import { getMonthDays, isSameDay } from './utils';
import { Clock, UserRound, MessageSquare } from 'lucide-react';

interface MonthViewGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
}

export const MonthViewGrid: React.FC<MonthViewGridProps> = ({ currentDate, events, onEventClick, onSlotClick }) => {
  const daysInMonth = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const eventsByDay = useMemo(() => {
    const map: { [key: string]: CalendarEvent[] } = {};
    daysInMonth.forEach(day => {
      map[day.toISOString().split('T')[0]] = [];
    });

    events.forEach(event => {
      const eventDate = event.start.toISOString().split('T')[0];
      if (map[eventDate]) {
        map[eventDate].push(event);
      }
    });
    return map;
  }, [daysInMonth, events]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
      <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-slate-700 min-h-full">
        {weekdays.map(day => (
          <div key={day} className="p-2 text-center font-medium text-sm border-b border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white">
            {day}
          </div>
        ))}
        {daysInMonth.map((day, index) => {
          const dayStr = day.toISOString().split('T')[0];
          const today = new Date();
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);

          return (
            <div
              key={index}
              className={`relative h-32 p-2 border-b border-r border-gray-200 dark:border-slate-700 ${!isCurrentMonth ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white'} ${isToday ? 'ring-2 ring-brand-500 dark:ring-brand-400' : ''}`}
              onClick={() => onSlotClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0, 0), new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0, 0, 0))}
            >
              <span className={`absolute top-1 right-1 text-xs font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                {day.getDate()}
              </span>
              <div className="mt-4 space-y-1 overflow-y-auto h-[calc(100%-2rem)] custom-scrollbar">
                {(eventsByDay[dayStr] || []).map(event => (
                  <div
                    key={event.id}
                    className={`flex items-center p-1 rounded-sm text-xs truncate cursor-pointer
                      ${event.type === 'lead_meeting' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}`}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    title={event.title}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};