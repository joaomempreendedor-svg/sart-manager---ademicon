import React, { useMemo } from 'react';
import { CalendarEvent } from '@/pages/CalendarPage';
import { getWeekDays, formatTime } from './utils';
import { Clock, UserRound, MessageSquare } from 'lucide-react';

interface WeekViewGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
}

export const WeekViewGrid: React.FC<WeekViewGridProps> = ({ currentDate, events, onEventClick, onSlotClick }) => {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const eventsByDay = useMemo(() => {
    const map: { [key: string]: CalendarEvent[] } = {};
    days.forEach(day => {
      map[day.toISOString().split('T')[0]] = [];
    });

    events.forEach(event => {
      const eventDate = event.start.toISOString().split('T')[0];
      if (map[eventDate]) {
        map[eventDate].push(event);
      }
    });
    return map;
  }, [days, events]);

  const renderEvents = (day: Date, hour: number) => {
    const dayStr = day.toISOString().split('T')[0];
    // Crie uma cópia de day para evitar mutação
    const hourStart = new Date(day);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(day);
    hourEnd.setHours(hour, 59, 59, 999);

    return (eventsByDay[dayStr] || []).filter(event =>
      (event.start < hourEnd && event.end > hourStart)
    ).map(event => {
      const eventStartHour = event.start.getHours();
      const eventStartMinutes = event.start.getMinutes();
      const eventEndHour = event.end.getHours();
      const eventEndMinutes = event.end.getMinutes();

      const topOffset = (eventStartHour * 60 + eventStartMinutes) - (hour * 60);
      const height = (eventEndHour * 60 + eventEndMinutes) - (eventStartHour * 60 + eventStartMinutes);

      const isAllDay = event.allDay || (event.start.getHours() === 0 && event.end.getHours() === 23 && event.end.getMinutes() === 59);

      return (
        <div
          key={event.id}
          className={`absolute w-[calc(100%-4px)] rounded-md p-1 text-xs overflow-hidden cursor-pointer shadow-sm
            ${event.type === 'lead_meeting' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}
          style={{
            top: `${topOffset}px`,
            height: `${height}px`,
            zIndex: 10,
          }}
          onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
        >
          <p className="font-semibold truncate">{event.title}</p>
          {!isAllDay && <p className="truncate">{formatTime(event.start)} - {formatTime(event.end)}</p>}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-slate-900">
      <div className="grid grid-cols-[50px_repeat(7,1fr)] min-w-[700px]">
        {/* Header Row */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 z-20 border-b border-gray-200 dark:border-slate-700"></div>
        {days.map(day => (
          <div key={day.toISOString()} className="sticky top-0 bg-white dark:bg-slate-800 z-20 p-2 text-center border-b border-l border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{day.getDate()}</p>
          </div>
        ))}

        {/* Time Grid */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="h-[60px] flex items-start justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 relative border-r border-gray-200 dark:border-slate-700">
              {hour > 0 && <span className="-mt-2">{formatTime(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0))}</span>}
            </div>
            {days.map(day => (
              <div
                key={`${day.toISOString()}-${hour}`}
                className="h-[60px] border-b border-l border-gray-200 dark:border-slate-700 relative"
                onClick={() => onSlotClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0), new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1, 0, 0, 0))}
              >
                {renderEvents(day, hour)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};