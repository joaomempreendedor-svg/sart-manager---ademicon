import React, { useState, useMemo, useCallback } from 'react';
import { CalendarEvent } from '@/pages/CalendarPage';
import { DayViewGrid } from './calendar/DayViewGrid';
import { WeekViewGrid } from './calendar/WeekViewGrid';
import { MonthViewGrid } from './calendar/MonthViewGrid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Added import for ChevronLeft and ChevronRight

interface CalendarViewProps {
  events: CalendarEvent[]; // These are ALL events, not pre-filtered
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  viewMode: 'day' | 'week' | 'month';
  setViewMode: React.Dispatch<React.SetStateAction<'day' | 'week' | 'month'>>;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
  selectedConsultantId: string | null;
  consultants: { id: string; name: string; }[];
  onSelectConsultant: (id: string | null) => void;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
}

const getMonthYear = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const getWeekRange = (date: Date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  return `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};
const getDay = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export const CalendarView: React.FC<CalendarViewProps> = ({
  events, // This is now allEvents from CalendarPage
  currentDate,
  setCurrentDate,
  viewMode,
  setViewMode,
  onEventClick,
  onSlotClick,
  selectedConsultantId,
  consultants,
  onSelectConsultant,
  userRole,
}) => {

  const navigateDate = useCallback((offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (viewMode === 'month') {
        newDate.setMonth(prevDate.getMonth() + offset);
      } else if (viewMode === 'week') {
        newDate.setDate(prevDate.getDate() + (offset * 7));
      } else { // day
        newDate.setDate(prevDate.getDate() + offset);
      }
      return newDate;
    });
  }, [setCurrentDate, viewMode]);

  const displayDateRange = useMemo(() => {
    if (viewMode === 'month') return getMonthYear(currentDate);
    if (viewMode === 'week') return getWeekRange(currentDate);
    return getDay(currentDate);
  }, [currentDate, viewMode]);

  const eventsToRender = useMemo(() => { // Renamed from filteredEvents to avoid confusion
    if (!selectedConsultantId) {
      console.log("[CalendarView] No consultant selected, showing all events:", events.length);
      return events;
    }
    const filtered = events.filter(event => {
      if (event.type === 'lead_meeting') {
        return event.consultantId === selectedConsultantId || event.managerId === selectedConsultantId;
      }
      if (event.type === 'consultant_event') {
        return event.consultantId === selectedConsultantId;
      }
      return false;
    });
    console.log("[CalendarView] Filtered events for selectedConsultantId:", selectedConsultantId, filtered.length, filtered);
    return filtered;
  }, [events, selectedConsultantId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white w-48 text-center">{displayDateRange}</h2>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          {userRole !== 'CONSULTOR' && (
            <Select
              value={selectedConsultantId || 'all'}
              onValueChange={(value) => onSelectConsultant(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[180px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Consultores" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {consultants.map(consultant => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={viewMode}
            onValueChange={(value: 'day' | 'week' | 'month') => setViewMode(value)}
          >
            <SelectTrigger className="w-[120px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <SelectValue placeholder="Visualização" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'day' && (
          <DayViewGrid
            currentDate={currentDate}
            events={eventsToRender} // Pass eventsToRender
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekViewGrid
            currentDate={currentDate}
            events={eventsToRender} // Pass eventsToRender
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {viewMode === 'month' && (
          <MonthViewGrid
            currentDate={currentDate}
            events={eventsToRender} // Pass eventsToRender
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
      </div>
    </div>
  );
};