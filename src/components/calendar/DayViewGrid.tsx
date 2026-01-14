import React, { useMemo } from 'react';
import { CalendarEvent, isSameDay, formatTime, PIXELS_PER_MINUTE } from './utils';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, UserRound, MessageSquare, Users, ListChecks, ListTodo, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { GestorTask, DailyChecklistItem, LeadTask, TeamMember } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

interface DayViewGridProps {
  day: Date;
  events: CalendarEvent[];
  today: Date;
  onOpenEventModal: (date: Date, event?: CalendarEvent) => void;
  onDeleteEvent: (eventId: string, eventType: CalendarEvent['type']) => void;
  onToggleGestorTaskCompletion: (task: GestorTask, date: Date) => void;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
  showPersonalEvents: boolean;
  teamMembers: TeamMember[];
}

const DayViewGrid: React.FC<DayViewGridProps> = ({
  day,
  events,
  today,
  onOpenEventModal,
  onDeleteEvent,
  onToggleGestorTaskCompletion,
  userRole,
  showPersonalEvents,
  teamMembers,
}) => {
  const isCurrentDay = isSameDay(day, today);
  const navigate = useNavigate();
  const { toggleDailyChecklistCompletion, toggleLeadTaskCompletion, deleteLeadTask } = useApp();

  const containerHeightPx = 24 * 60 * PIXELS_PER_MINUTE;

  const allDayEvents = useMemo(() => events.filter(e => e.allDay), [events]);
  const timedEvents = useMemo(() => events.filter(e => !e.allDay), [events]);

  // Posicionamento de eventos usando a mesma origem (00:00) e escala (px/minuto) da barra lateral
  const positionedEvents = useMemo(() => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    return timedEvents.map(event => {
      const startMinutes = Math.max(0, Math.floor((event.start.getTime() - dayStart.getTime()) / 60000));
      const endMinutesCalc = Math.ceil((event.end.getTime() - dayStart.getTime()) / 60000);
      const endMinutes = Math.min(1440, Math.max(startMinutes, endMinutesCalc));
      const top = startMinutes * PIXELS_PER_MINUTE;
      const height = Math.max(1, (endMinutes - startMinutes) * PIXELS_PER_MINUTE);
      return { ...event, top, height };
    });
  }, [timedEvents, day]);

  const getEventColorClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'gestor_task': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'daily_checklist': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'lead_task': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700';
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

  const handleToggleDailyChecklist = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'daily_checklist') return;
    const item = event.originalEvent as DailyChecklistItem;
    const dateStr = day.toISOString().split('T')[0];
    try {
      await toggleDailyChecklistCompletion(item.id, dateStr, !item.is_completed, event.personId!);
      toast.success(`Item de checklist ${item.is_completed ? 'marcado como pendente' : 'concluído'}!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar checklist: ${error.message}`);
    }
  };

  const handleEditDailyChecklist = (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'daily_checklist') return;
    const item = event.originalEvent as DailyChecklistItem;
    const dateStr = day.toISOString().split('T')[0];
    navigate(`/consultor/daily-checklist`, { state: { highlightChecklistItemId: item.id, highlightChecklistDate: dateStr } });
  };

  const handleToggleLeadTask = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    try {
      await toggleLeadTaskCompletion(task.id, !task.is_completed);
      toast.success(`Tarefa de lead ${task.is_completed ? 'marcada como pendente' : 'concluída'}!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar tarefa de lead: ${error.message}`);
    }
  };

  const handleEditLeadTask = (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    const path = userRole === 'CONSULTOR' ? '/consultor/crm' : '/gestor/crm';
    navigate(path, { state: { highlightLeadId: task.lead_id, highlightLeadTaskId: task.id } });
  };

  const handleDeleteLeadTask = async (event: CalendarEvent) => {
    if (!event.originalEvent || event.type !== 'lead_task') return;
    const task = event.originalEvent as LeadTask;
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
      try {
        await deleteLeadTask(task.id);
        toast.success("Tarefa de lead excluída com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir tarefa de lead: ${error.message}`);
      }
    }
  };

  // Linha de "agora" alinhada ao mesmo eixo
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isTodayDisplayed = isSameDay(day, now);
  const currentTimeTopPx = (currentHour * 60 + currentMinutes) * PIXELS_PER_MINUTE;

  return (
    <div className="flex flex-col flex-1">
      {/* Seção de eventos de dia inteiro */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          {/* Coluna de horários vazia (alinhada) */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"></div>
          {/* Grid 1 dia - all-day */}
          <div className="grid grid-cols-1 flex-1">
            <div className="flex flex-col space-y-0.5 p-1">
              {allDayEvents.map(event => (
                <div key={event.id} className={`mb-1 p-1 rounded-md text-xs font-medium ${getEventColorClass(event.type)} flex items-center group relative`}>
                  <div className="flex-1 flex items-center">
                    {getEventIcon(event.type)}
                    {event.type === 'meeting' ? (
                      <span className="flex-1 line-clamp-2" title={`Reunião com ${event.personName}`}>Reunião com {event.personName}</span>
                    ) : (
                      <span className="flex-1 line-clamp-2" title={event.title}>{event.title}</span>
                    )}
                  </div>
                  <div className="absolute top-1 right-1 flex items-center space-x-1 bg-white/80 dark:bg-slate-800/70 rounded-md px-1 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {(event.type === 'personal' || event.type === 'gestor_task') && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                      </>
                    )}
                    {event.type === 'daily_checklist' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleDailyChecklist(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                          {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditDailyChecklist(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Checklist">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {event.type === 'lead_task' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleLeadTask(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                          {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditLeadTask(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Tarefa">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLeadTask(event)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Área principal: coluna de horários + grid do dia */}
      <div className="flex flex-1">
        {/* Coluna de horários (régua de tempo) */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="h-16 border-b border-gray-200 dark:border-slate-700"></div>
          <div className="relative" style={{ height: `${containerHeightPx}px` }}>
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                className="absolute text-xs text-gray-500 dark:text-gray-400 text-right pr-2"
                style={{ top: `${hour * 60 * PIXELS_PER_MINUTE}px` }}
              >
                {hour === 0 ? '' : `${hour}:00`}
              </div>
            ))}
          </div>
        </div>

        {/* Grid do dia (ancorado à mesma origem e escala) */}
        <div className="grid grid-cols-1 flex-1">
          <div className="flex-1 border-l border-gray-200 dark:border-slate-700 relative">
            {/* Cabeçalho do dia */}
            <div className={`h-16 flex flex-col items-center justify-center border-b border-gray-200 dark:border-slate-700 ${isCurrentDay ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
              <p className={`text-xs font-medium ${isCurrentDay ? 'text-brand-800 dark:text-brand-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-bold ${isCurrentDay ? 'text-brand-800 dark:text-brand-200' : 'text-gray-900 dark:text-white'}`}>
                {day.getDate()}
              </p>
              {showPersonalEvents && (
                <button
                  onClick={() => onOpenEventModal(day)}
                  className="absolute top-1 right-1 p-1 rounded-sm bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition"
                  title="Adicionar Evento"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Linhas de fundo e slots clicáveis, usando a mesma escala */}
            <div className="relative" style={{ height: `${containerHeightPx}px` }}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 bg-gray-100 dark:bg-slate-700 opacity-10"
                  style={{ top: `${hour * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }}
                ></div>
              ))}

              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={`slot-${hour}`}
                  className="absolute left-0 right-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  style={{ top: `${hour * 60 * PIXELS_PER_MINUTE}px`, height: `${60 * PIXELS_PER_MINUTE}px` }}
                  onClick={() => {
                    if (showPersonalEvents) {
                      const newEventDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
                      onOpenEventModal(newEventDate);
                    } else {
                      toast.info("Você não tem permissão para adicionar eventos pessoais aqui.");
                    }
                  }}
                ></div>
              ))}

              {/* Indicador de horário atual */}
              {isCurrentDay && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{ top: `${currentTimeTopPx}px` }}
                >
                  <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              )}

              {/* Eventos temporizados, alinhados ao eixo único */}
              {positionedEvents.map(event => (
                <div
                  key={event.id}
                  className={`absolute px-0 py-0 border-x box-border ${getEventColorClass(event.type)} group overflow-hidden z-10 flex flex-col relative`}
                  style={{ top: `${event.top}px`, height: `${event.height}px`, left: `0%`, width: `100%` }}
                >
                  <div className="flex-1 min-h-0 flex flex-col gap-1">
                    <div className="flex items-start text-xs font-medium">
                      {getEventIcon(event.type)}
                      {event.type === 'meeting' ? (
                        <span className="flex-1 line-clamp-2 overflow-hidden" title={`Reunião com ${event.personName}`}>
                          Reunião com {event.personName}
                        </span>
                      ) : (
                        <span className="flex-1 line-clamp-2 overflow-hidden" title={event.title}>{event.title}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center" title={`${formatTime(event.start)} - ${formatTime(event.end)}`}>
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" /> {formatTime(event.start)} - {formatTime(event.end)}
                    </p>
                    {event.type === 'meeting' && event.originalEvent && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center truncate" title={`Consultor: ${teamMembers.find(m => m.id === (event.originalEvent as LeadTask).user_id)?.name || 'Desconhecido'}`}>
                        <UserRound className="w-3 h-3 mr-1 flex-shrink-0" /> Consultor: {teamMembers.find(m => m.id === (event.originalEvent as LeadTask).user_id)?.name || 'Desconhecido'}
                      </p>
                    )}
                    {event.type === 'meeting' && (event.originalEvent as LeadTask)?.manager_invitation_status && (
                      <div className="mt-1">
                        {((event.originalEvent as LeadTask).manager_invitation_status === 'accepted') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            Gestor: Aceito
                          </span>
                        )}
                        {((event.originalEvent as LeadTask).manager_invitation_status === 'pending') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Convite pendente
                          </span>
                        )}
                        {((event.originalEvent as LeadTask).manager_invitation_status === 'declined') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            Gestor: Recusado
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Ações flutuantes */}
                  <div className="absolute top-1 right-1 flex items-center space-x-1 bg-white/80 dark:bg-slate-800/70 rounded-sm px-1 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {(event.type === 'personal' || event.type === 'gestor_task') && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onOpenEventModal(day, event)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteEvent(event.id, event.type)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                      </>
                    )}
                    {event.type === 'daily_checklist' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleDailyChecklist(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                          {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditDailyChecklist(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Checklist">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {event.type === 'lead_task' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleLeadTask(event)} className="p-1 text-gray-400 hover:text-green-600" title={event.originalEvent?.is_completed ? 'Marcar como Pendente' : 'Marcar como Concluído'}>
                          {event.originalEvent?.is_completed ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditLeadTask(event)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver/Editar Tarefa">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLeadTask(event)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir Tarefa">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayViewGrid;