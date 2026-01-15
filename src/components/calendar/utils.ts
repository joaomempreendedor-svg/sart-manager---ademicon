import { GestorTask, DailyChecklistItem, LeadTask } from '@/types';

export const PIXELS_PER_MINUTE = 1;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'personal' | 'meeting' | 'gestor_task' | 'daily_checklist' | 'lead_task';
  personName?: string;
  personId?: string;
  originalEvent?: GestorTask | DailyChecklistItem | LeadTask;
  allDay?: boolean;
}

export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const days = [];
  let currentDay = new Date(firstDayOfMonth);

  const firstDayOfWeek = firstDayOfMonth.getDay();
  const startPadding = firstDayOfWeek;

  for (let i = 0; i < startPadding; i++) {
    const prevDay = new Date(firstDayOfMonth);
    prevDay.setDate(firstDayOfMonth.getDate() - (startPadding - i));
    days.push(prevDay);
  }

  while (currentDay <= lastDayOfMonth) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const totalDays = days.length;
  const endPadding = (7 - (totalDays % 7)) % 7;
  
  for (let i = 0; i < endPadding; i++) {
    const nextDay = new Date(lastDayOfMonth);
    nextDay.setDate(lastDayOfMonth.getDate() + (i + 1));
    days.push(nextDay);
  }

  return days;
};

export const getWeekDays = (date: Date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
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

export const timeToMinutes = (date: Date) => {
  return date.getHours() * 60 + date.getMinutes();
};

export const getEventTop = (startTime: Date) => {
  return timeToMinutes(startTime) * PIXELS_PER_MINUTE;
};

export const getEventHeight = (startTime: Date, endTime: Date) => {
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  return Math.max(1, durationMinutes * PIXELS_PER_MINUTE);
};