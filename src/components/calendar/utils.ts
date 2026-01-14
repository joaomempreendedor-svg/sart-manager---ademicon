import { CalendarEvent } from '@/components/CalendarView'; // Importar o tipo CalendarEvent
import { GestorTask } from '@/types'; // Importar GestorTask

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'personal' | 'meeting' | 'gestor_task' | 'daily_checklist' | 'lead_task'; // NOVO: Adicionado 'daily_checklist' e 'lead_task'
  personName?: string;
  personId?: string;
  originalEvent?: any; // Pode ser LeadTask, GestorTask, ConsultantEvent, DailyChecklistItem
  allDay?: boolean; // NOVO: Indica se é um evento de dia inteiro
}

export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const days = [];
  let currentDay = new Date(firstDayOfMonth);

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
  const startPadding = firstDayOfWeek; // Number of days from previous month to show

  for (let i = 0; i < startPadding; i++) {
    const prevDay = new Date(firstDayOfMonth);
    prevDay.setDate(firstDayOfMonth.getDate() - (startPadding - i));
    days.push(prevDay);
  }

  // Add days of the current month
  while (currentDay <= lastDayOfMonth) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Add days from next month to fill the last week (up to 6 weeks total)
  const totalDays = days.length;
  const endPadding = (7 - (totalDays % 7)) % 7; // Days to fill the last week
  
  for (let i = 0; i < endPadding; i++) {
    const nextDay = new Date(lastDayOfMonth);
    nextDay.setDate(lastDayOfMonth.getDate() + (i + 1));
    days.push(nextDay);
  }

  return days;
};

export const getWeekDays = (date: Date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

export const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });