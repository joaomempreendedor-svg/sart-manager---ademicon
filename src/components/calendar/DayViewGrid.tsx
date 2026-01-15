import React, { useMemo } from 'react';
import { CalendarEvent } from '@/pages/CalendarPage';
import { formatTime } from './utils';
import { Clock, UserRound, MessageSquare } from 'lucide-react';

interface DayViewGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
}

export const DayViewGrid: React.FC<DayViewGridProps> = ({ currentDate, events, onEventClick, onSlotClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = useMemo(() => {
    // Crie uma cópia de currentDate para evitar mutação da prop
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    return events.filter(event =>
      (event.start >= startOfDay && event.start <= endOfDay) ||
      (event.end >= startOfDay && event.end <= endOfDay) ||
      (event.start < startOfDay && event.end > endOfDay)
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [currentDate, events]);

  const renderEvents = (hour: number) => {
    // Crie uma cópia de currentDate para evitar mutação da prop
    const hourStart = new Date(currentDate);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(currentDate);
    hourEnd.setHours(hour, 59, 59, 999);

    return dayEvents.filter(event =>
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
          className={`absolute w-[calc(100%-10px)] rounded-md p-1.5 text-xs overflow-hidden cursor-pointer shadow-sm
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
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
      <div className="grid grid-cols-[50px_1fr] min-h-[1440px]"> {/* Adicionado min-h para 24 horas * 60px/hora */}
        <div className="border-r border-gray-200 dark:border-slate-700">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] flex items-start justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 relative">
              <span className="-mt-2">{formatTime(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0))}</span> {/* Removida a condição hour > 0 */}
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map(hour => (
            <div
              key={hour}
              className="h-[60px] border-b border-gray-200 dark:border-slate-700 relative"
              onClick={() => onSlotClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, 0, 0, 0), new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour + 1, 0, 0, 0))}
            >
              {renderEvents(hour)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};