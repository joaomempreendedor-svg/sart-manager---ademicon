import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, LeadTask, GestorTask, ConsultantEvent, TeamMember } from '@/types';
import { EventModal } from './EventModal';
import toast from 'react-hot-toast';

// Importar os novos componentes de visualização
import DayViewGrid from './calendar/DayViewGrid';
import WeekViewGrid from './calendar/WeekViewGrid';
import MonthViewGrid from './calendar/MonthViewGrid';
import { getDaysInMonth, getWeekDays, isSameDay, formatTime } from './calendar/utils';
import { CalendarEvent } from './calendar/utils';

interface CalendarViewProps {
  userId: string;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents?: boolean;
  showLeadMeetings?: boolean;
  showGestorTasks?: boolean;
  view: 'day' | 'week' | 'month';
  highlightedItemId?: string | null;
  highlightedDate?: string | null;
  highlightedEventType?: 'daily_checklist' | 'lead_task' | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  userId,
  userRole,
  showPersonalEvents = true,
  showLeadMeetings = true,
  showGestorTasks = true,
  view,
  highlightedItemId,
  highlightedDate,
  highlightedEventType,
}) => {
  const {
    crmLeads,
    leadTasks,
    gestorTasks,
    gestorTaskCompletions,
    consultantEvents,
    teamMembers,
    dailyChecklists,
    dailyChecklistItems,
    dailyChecklistAssignments,
    dailyChecklistCompletions,
    addConsultantEvent,
    updateConsultantEvent,
    deleteConsultantEvent,
    deleteLeadTask,
    deleteGestorTask,
    toggleGestorTaskCompletion,
    isGestorTaskDueOnDate,
  } = useApp();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [today, setToday] = useState(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null);

  // Efeito para atualizar 'today' a cada minuto
  useEffect(() => {
    const intervalId = setInterval(() => {
      setToday(new Date());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Efeito para ajustar a data atual se houver um item destacado
  useEffect(() => {
    if (highlightedDate) {
      const newDate = new Date(highlightedDate + 'T00:00:00');
      if (!isSameDay(currentDate, newDate)) {
        setCurrentDate(newDate);
      }
    }
  }, [highlightedDate]);


  const displayedDays = useMemo(() => {
    if (view === 'day') {
      return [currentDate];
    } else if (view === 'week') {
      return getWeekDays(currentDate);
    } else { // month
      return getDaysInMonth(currentDate);
    }
  }, [currentDate, view]);

  const allEvents = useMemo(() => {
    console.log("[CalendarView] Recalculating allEvents...");
    const events: CalendarEvent[] = [];

    // 1. Eventos Pessoais do Consultor (se aplicável)
    if (showPersonalEvents && userRole === 'CONSULTOR') {
      consultantEvents.filter(event => event.user_id === userId).forEach(event => {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        
        // An event is considered all-day if it starts at midnight and ends at midnight on the same day,
        // or if it starts at midnight and ends at 23:59 on the same day.
        // Otherwise, it's a timed event.
        const isAllDayEvent = (start.getHours() === 0 && start.getMinutes() === 0) &&
                              (end.getHours() === 0 && end.getMinutes() === 0 || (end.getHours() === 23 && end.getMinutes() === 59)) &&
                              isSameDay(start, end);
        
        console.log(`[CalendarView - Personal Event] Title: ${event.title}, Start: ${event.start_time}, End: ${event.end_time}, isAllDayEvent: ${isAllDayEvent}`);

        events.push({
          id: event.id,
          title: event.title,
          description: event.description,
          start,
          end,
          type: 'personal',
          personName: user?.name || 'Eu',
          personId: userId,
          originalEvent: event,
          allDay: isAllDayEvent,
        });
      });
    }

    // 2. Reuniões de Leads (para gestores e consultores)
    if (showLeadMeetings) {
      leadTasks.filter(task => {
        if (task.type !== 'meeting' || !task.meeting_start_time || !task.meeting_end_time) return false;
        
        const isConsultantMeeting = userRole === 'CONSULTOR' && task.user_id === userId;
        const isGestorMeeting = (userRole === 'GESTOR' || userRole === 'ADMIN') && task.manager_id === userId;
        
        return isConsultantMeeting || isGestorMeeting;
      }).forEach(task => {
        const lead = crmLeads.find(l => l.id === task.lead_id);
        const consultant = teamMembers.find(m => m.id === task.user_id);
        const start = new Date(task.meeting_start_time!);
        const end = new Date(task.meeting_end_time!);
        
        const isAllDayEvent = (start.getHours() === 0 && start.getMinutes() === 0) &&
                              (end.getHours() === 0 && end.getMinutes() === 0 || (end.getHours() === 23 && end.getMinutes() === 59)) &&
                              isSameDay(start, end);

        events.push({
          id: task.id,
          title: task.title,
          description: task.description,
          start,
          end,
          type: 'meeting',
          personName: lead?.name || consultant?.name || 'Desconhecido',
          personId: lead?.id || consultant?.id,
          originalEvent: task,
          allDay: isAllDayEvent,
        });
      });
    }

    // 3. Tarefas Pessoais do Gestor (se aplicável)
    if (showGestorTasks && (userRole === 'GESTOR' || userRole === 'ADMIN')) {
      gestorTasks.filter(task => task.user_id === userId).forEach(task => {
        // Para tarefas recorrentes e não recorrentes, criamos um evento de dia inteiro para cada dia da visualização se for devido
        displayedDays.forEach(day => {
          if (isGestorTaskDueOnDate(task, day.toISOString().split('T')[0])) {
            const completionForDay = gestorTaskCompletions.find(c => c.gestor_task_id === task.id && c.user_id === userId && isSameDay(new Date(c.date), day));
            events.push({
              id: `${task.id}-${day.toISOString().split('T')[0]}`, // ID único para cada ocorrência diária
              title: task.title,
              description: task.description,
              start: day,
              end: day,
              type: 'gestor_task',
              personName: 'Eu',
              originalEvent: { ...task, is_completed: completionForDay?.done || false }, // Adiciona status de conclusão para o dia
              allDay: true, // Tarefas do gestor são consideradas de dia inteiro para o calendário
            });
          }
        });
      });
    }

    // NOVO: 4. Tarefas de Lead (não reuniões) como eventos de dia inteiro
    if (showLeadMeetings) { // Reutilizando a flag showLeadMeetings para mostrar tarefas de lead
      leadTasks.filter(task => {
        if (task.type !== 'task' || task.is_completed || !task.due_date) return false;
        
        const isConsultantTask = userRole === 'CONSULTOR' && task.user_id === userId;
        const isGestorTask = (userRole === 'GESTOR' || userRole === 'ADMIN') && crmLeads.some(l => l.id === task.lead_id && l.user_id === userId);
        
        return isConsultantTask || isGestorTask;
      }).forEach(task => {
        const lead = crmLeads.find(l => l.id === task.lead_id);
        const dueDate = new Date(task.due_date!);
        
        // Apenas adiciona se a data de vencimento estiver dentro dos dias exibidos
        if (displayedDays.some(day => isSameDay(day, dueDate))) {
          events.push({
            id: task.id,
            title: task.title,
            description: task.description,
            start: dueDate,
            end: dueDate,
            type: 'lead_task',
            personName: lead?.name || 'Lead Desconhecido',
            personId: lead?.id,
            originalEvent: task,
            allDay: true,
          });
        }
      });
    }

    // NOVO: 5. Itens de Daily Checklist (para consultores) como eventos de dia inteiro
    if (userRole === 'CONSULTOR') {
      const userTeamMember = teamMembers.find(tm => tm.id === userId || (tm.email && tm.email === user?.email) || (tm.isLegacy && tm.name === user?.name));
      if (userTeamMember) {
        const assignedChecklists = dailyChecklists
          .filter(checklist => checklist.is_active && 
            (dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id && assignment.consultant_id === userTeamMember.id) ||
             !dailyChecklistAssignments.some(assignment => assignment.daily_checklist_id === checklist.id))
          );

        assignedChecklists.forEach(checklist => {
          dailyChecklistItems
            .filter(item => item.daily_checklist_id === checklist.id && item.is_active)
            .forEach(item => {
              displayedDays.forEach(day => {
                const dayStr = day.toISOString().split('T')[0];
                const isCompleted = dailyChecklistCompletions.some(
                  completion =>
                    completion.daily_checklist_item_id === item.id &&
                    completion.consultant_id === userTeamMember.id &&
                    completion.date === dayStr &&
                    completion.done
                );
                
                if (!isCompleted) { // Apenas itens incompletos
                  events.push({
                    id: `${item.id}-${dayStr}`, // ID único para cada ocorrência diária
                    title: item.text,
                    description: checklist.title, // Usar o título do checklist como descrição
                    start: day,
                    end: day,
                    type: 'daily_checklist',
                    personName: user?.name || 'Eu',
                    personId: userId,
                    originalEvent: item,
                    allDay: true,
                  });
                }
              });
            });
        });
      }
    }
    console.log("[CalendarView] allEvents calculated:", events);
    return events;
  }, [
    userId, userRole, showPersonalEvents, showLeadMeetings, showGestorTasks,
    consultantEvents, leadTasks, crmLeads, teamMembers, gestorTasks, gestorTaskCompletions,
    displayedDays, isGestorTaskDueOnDate, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, user?.name, user?.email
  ]);

  const eventsByDay = useMemo(() => {
    console.log("[CalendarView] Recalculating eventsByDay...");
    const map: Record<string, CalendarEvent[]> = {};
    displayedDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      map[dayStr] = allEvents.filter(event => {
        const eventStartDay = event.start.toISOString().split('T')[0];
        const eventEndDay = event.end.toISOString().split('T')[0];
        return eventStartDay <= dayStr && eventEndDay >= dayStr;
      }).sort((a, b) => {
        // Sort all-day events first, then by start time
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
    });
    console.log("[CalendarView] eventsByDay calculated:", map);
    return map;
  }, [allEvents, displayedDays]);

  const navigateDate = (offset: number, unit: 'day' | 'week' | 'month') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (unit === 'day') {
        newDate.setDate(prevDate.getDate() + offset);
      } else if (unit === 'week') {
        newDate.setDate(prevDate.getDate() + (offset * 7));
      } else { // month
        newDate.setMonth(prevDate.getMonth() + offset);
      }
      return newDate;
    });
  };

  const handleOpenEventModal = (date: Date, event: CalendarEvent | null = null) => {
    console.log(`[CalendarView] handleOpenEventModal called. Date: ${date.toISOString()}, Event:`, event);
    setSelectedDateForNewEvent(date);
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'> | ConsultantEvent) => {
    if (!user) return;

    try {
      if ('id' in eventData) {
        await updateConsultantEvent(eventData.id, eventData);
        toast.success("Evento atualizado com sucesso!");
      } else {
        await addConsultantEvent(eventData);
        toast.success("Evento adicionado com sucesso!");
      }
      setIsEventModalOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar evento: ${error.message}`);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventType: CalendarEvent['type']) => {
    if (!user || !window.confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      if (eventType === 'personal') {
        await deleteConsultantEvent(eventId);
      } else if (eventType === 'meeting') {
        await deleteLeadTask(eventId);
      } else if (eventType === 'gestor_task') {
        await deleteGestorTask(eventId);
      } else if (eventType === 'daily_checklist' || eventType === 'lead_task') {
        toast.error("Itens de checklist e tarefas de lead são gerenciados em suas respectivas seções, não diretamente no calendário.");
        return;
      }
      toast.success("Evento excluído com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao excluir evento: ${error.message}`);
    }
  };

  const handleToggleGestorTaskCompletion = async (task: GestorTask, date: Date) => {
    if (!user) return;
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = gestorTaskCompletions.some(c => c.gestor_task_id === task.id && c.user_id === userId && c.date === dateStr && c.done);
    try {
      await toggleGestorTaskCompletion(task.id, !isCompleted, dateStr);
      toast.success(`Tarefa ${isCompleted ? 'marcada como pendente' : 'concluída'}!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar status da tarefa: ${error.message}`);
    }
  };

  const renderCalendarGrid = () => {
    const commonGridProps = {
      eventsByDay,
      today,
      onOpenEventModal: handleOpenEventModal, // Correctly reference the internal function
      onDeleteEvent: handleDeleteEvent,
      onToggleGestorTaskCompletion: handleToggleGestorTaskCompletion,
      userRole,
      showPersonalEvents,
    };

    if (view === 'day') {
      return (
        <DayViewGrid
          day={displayedDays[0]}
          events={eventsByDay[displayedDays[0].toISOString().split('T')[0]] || []}
          {...commonGridProps}
        />
      );
    } else if (view === 'week') {
      return (
        <WeekViewGrid
          weekDays={displayedDays}
          {...commonGridProps}
        />
      );
    } else if (view === 'month') {
      return (
        <MonthViewGrid
          displayedDays={displayedDays}
          currentMonth={currentDate}
          {...commonGridProps}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header de Navegação */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <button onClick={() => navigateDate(-1, view)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {view === 'day' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {view === 'week' && `${displayedDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${displayedDays[displayedDays.length - 1].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
          {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => navigateDate(1, view)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Renderização do Grid de Calendário */}
      <div className="flex-1">
        {view === 'month' && (
          <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dayName => (
              <div key={dayName} className="p-2">{dayName}</div>
            ))}
          </div>
        )}
        {renderCalendarGrid()}
      </div>

      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleSaveEvent}
          event={editingEvent}
          defaultStartDateTime={selectedDateForNewEvent || undefined}
          userId={userId}
        />
      )}
    </div>
  );
};