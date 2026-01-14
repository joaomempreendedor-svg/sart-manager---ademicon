import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, UserRound, MessageSquare, Tag, XCircle, Edit2, Trash2, Users, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, LeadTask, GestorTask, ConsultantEvent, TeamMember } from '@/types';
import { EventModal } from './EventModal';
import toast from 'react-hot-toast';

interface CalendarViewProps {
  userId: string;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents?: boolean;
  showLeadMeetings?: boolean;
  showGestorTasks?: boolean;
  view: 'day' | 'week' | 'month'; // NOVO: Prop para controlar a visualização
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'personal' | 'meeting' | 'gestor_task';
  personName?: string;
  personId?: string;
  originalEvent?: LeadTask | GestorTask | ConsultantEvent;
}

const getDaysInMonth = (date: Date) => {
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

const getWeekDays = (date: Date) => {
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

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const CalendarView: React.FC<CalendarViewProps> = ({
  userId,
  userRole,
  showPersonalEvents = true,
  showLeadMeetings = true,
  showGestorTasks = true,
  view, // NOVO: Recebe a prop de visualização
}) => {
  const {
    crmLeads,
    leadTasks,
    gestorTasks,
    gestorTaskCompletions,
    consultantEvents,
    teamMembers,
    addConsultantEvent,
    updateConsultantEvent,
    deleteConsultantEvent,
    updateLeadTask,
    toggleGestorTaskCompletion,
    isGestorTaskDueOnDate,
  } = useApp();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date()); // Renomeado de currentWeekStart
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null);

  const today = useMemo(() => new Date(), []);

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
    const events: CalendarEvent[] = [];

    // 1. Eventos Pessoais do Consultor (se aplicável)
    if (showPersonalEvents && userRole === 'CONSULTOR') {
      consultantEvents.filter(event => event.user_id === userId).forEach(event => {
        events.push({
          id: event.id,
          title: event.title,
          description: event.description,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          type: 'personal',
          originalEvent: event,
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
        
        events.push({
          id: task.id,
          title: task.title,
          description: task.description,
          start: new Date(task.meeting_start_time!),
          end: new Date(task.meeting_end_time!),
          type: 'meeting',
          personName: lead?.name || consultant?.name || 'Desconhecido',
          personId: lead?.id || consultant?.id,
          originalEvent: task,
        });
      });
    }

    // 3. Tarefas Pessoais do Gestor (se aplicável)
    if (showGestorTasks && (userRole === 'GESTOR' || userRole === 'ADMIN')) {
      gestorTasks.filter(task => task.user_id === userId).forEach(task => {
        const taskDueDate = task.due_date ? new Date(task.due_date + 'T00:00:00') : null;
        const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
        
        // Para tarefas recorrentes, criamos um evento para cada dia da semana/mês se for devido
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
            });
          }
        });
        // Para tarefas não recorrentes, adicionamos apenas se a data de vencimento estiver no período exibido
        if (!isRecurring && taskDueDate && displayedDays.some(day => isSameDay(day, taskDueDate))) {
          events.push({
            id: task.id,
            title: task.title,
            description: task.description,
            start: taskDueDate,
            end: taskDueDate,
            type: 'gestor_task',
            personName: 'Eu',
            originalEvent: task,
          });
        }
      });
    }

    return events;
  }, [
    userId, userRole, showPersonalEvents, showLeadMeetings, showGestorTasks,
    consultantEvents, leadTasks, crmLeads, teamMembers, gestorTasks, gestorTaskCompletions,
    displayedDays, isGestorTaskDueOnDate
  ]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    displayedDays.forEach(day => {
      const dayStr = day.toISOString().split('T')[0];
      map[dayStr] = allEvents.filter(event => {
        const eventStartDay = event.start.toISOString().split('T')[0];
        const eventEndDay = event.end.toISOString().split('T')[0];
        return eventStartDay <= dayStr && eventEndDay >= dayStr;
      }).sort((a, b) => a.start.getTime() - b.start.getTime());
    });
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

  const renderDayHeader = (day: Date) => (
    <div className={`p-3 border-b ${isSameDay(day, today) ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50'} flex justify-between items-center`}>
      <div>
        <p className={`text-sm font-semibold ${isSameDay(day, today) ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-white'}`}>
          {day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
        </p>
        <p className={`text-xs ${isSameDay(day, today) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {day.toLocaleDateString('pt-BR', { month: 'short' })}
        </p>
      </div>
      {showPersonalEvents && userRole === 'CONSULTOR' && (
        <button
          onClick={() => handleOpenEventModal(day)}
          className="p-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
          title="Adicionar Evento"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const renderMonthDayHeader = (day: Date) => {
    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
    const isToday = isSameDay(day, today);
    return (
      <div className={`p-2 text-center border-b border-gray-200 dark:border-slate-700 ${isToday ? 'bg-brand-50 dark:bg-brand-900/20' : isCurrentMonth ? 'bg-gray-50 dark:bg-slate-700/50' : 'bg-gray-100 dark:bg-slate-800 opacity-70'}`}>
        <p className={`text-sm font-semibold ${isToday ? 'text-brand-800 dark:text-brand-200' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {day.getDate()}
        </p>
        {showPersonalEvents && userRole === 'CONSULTOR' && isCurrentMonth && (
          <button
            onClick={() => handleOpenEventModal(day)}
            className="absolute top-1 right-1 p-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
            title="Adicionar Evento"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <button onClick={() => navigateDate(-1, view)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {view === 'day' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {view === 'week' && `${displayedDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${displayedDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
          {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => navigateDate(1, view)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {view === 'month' && (
        <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dayName => (
            <div key={dayName} className="p-2">{dayName}</div>
          ))}
        </div>
      )}

      <div className={`grid ${view === 'month' ? 'grid-cols-7' : 'grid-cols-1 md:grid-cols-7'} gap-4`}>
        {displayedDays.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          const eventsToday = eventsByDay[dayStr] || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);

          return (
            <div key={dayStr} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border ${isToday ? 'border-brand-500 dark:border-brand-400' : 'border-gray-200 dark:border-slate-700'} flex flex-col ${view === 'month' && !isCurrentMonth ? 'opacity-60' : ''}`}>
              {view === 'month' ? renderMonthDayHeader(day) : renderDayHeader(day)}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[120px]">
                {eventsToday.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">Nenhum evento.</p>
                ) : (
                  eventsToday.map(event => (
                    <div key={event.id} className={`p-2 rounded-lg border ${getEventColorClass(event.type)} group relative`}>
                      <div className="flex items-center text-xs font-medium">
                        {getEventIcon(event.type)}
                        <span className="truncate">{event.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.type === 'gestor_task' && isSameDay(event.start, event.end)
                          ? 'Dia inteiro'
                          : `${formatTime(event.start)} - ${formatTime(event.end)}`}
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
                          onClick={() => handleToggleGestorTaskCompletion(event.originalEvent as GestorTask, event.start)}
                          className="mt-2 w-full flex items-center justify-center px-2 py-1 bg-purple-500 text-white rounded-md text-xs hover:bg-purple-600 transition"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como Concluída
                        </button>
                      )}
                      <div className="absolute top-1 right-1 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(event.type === 'personal' || event.type === 'gestor_task') && (
                          <>
                            <button
                              onClick={() => handleOpenEventModal(event.start, event)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.type)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {event.type === 'meeting' && (
                          <button
                            onClick={() => toast.info("Reuniões de leads são gerenciadas na seção de CRM.")}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                            title="Gerenciar no CRM"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleSaveEvent}
          event={editingEvent}
          defaultDate={selectedDateForNewEvent || undefined}
          userId={userId}
        />
      )}
    </div>
  );
};