import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarEvent } from '@/pages/CalendarPage';
import { X, Save, Loader2, Calendar, Clock, MessageSquare, Users, Trash2, CheckCircle2, XCircle, UserRound, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  selectedSlot?: { start: Date; end: Date } | null;
  selectedConsultantId: string | null;
  userRole: 'GESTOR' | 'CONSULTOR' | 'ADMIN';
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, event, selectedSlot, selectedConsultantId, userRole }) => {
  const { user } = useAuth();
  const { 
    crmLeads, 
    teamMembers, 
    addConsultantEvent, 
    updateConsultantEvent, 
    deleteConsultantEvent,
    updateLeadTask,
    deleteLeadTask,
    updateLeadMeetingInvitationStatus,
  } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState<'personal_task' | 'training' | 'other'>('personal_task');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isNewEvent = !event;
  const isLeadMeeting = event?.type === 'lead_meeting';
  const isConsultantEvent = event?.type === 'consultant_event';

  const eventConsultant = useMemo(() => {
    if (isLeadMeeting && event?.consultantId) {
      return teamMembers.find(tm => tm.id === event.consultantId);
    }
    if (isConsultantEvent && event?.consultantId) {
      return teamMembers.find(tm => tm.id === event.consultantId);
    }
    return null;
  }, [event, teamMembers, isLeadMeeting, isConsultantEvent]);

  const eventManager = useMemo(() => {
    if (isLeadMeeting && event?.managerId) {
      return teamMembers.find(tm => tm.id === event.managerId);
    }
    return null;
  }, [event, teamMembers, isLeadMeeting]);

  const eventLead = useMemo(() => {
    if (isLeadMeeting && event?.leadId) {
      return crmLeads.find(lead => lead.id === event.leadId);
    }
    return null;
  }, [event, crmLeads, isLeadMeeting]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setDate(event.start.toISOString().split('T')[0]);
        setStartTime(event.start.toTimeString().substring(0, 5));
        setEndTime(event.end.toTimeString().substring(0, 5));
        setEventType(event.type === 'consultant_event' ? (event as ConsultantEvent).event_type || 'personal_task' : 'personal_task');
      } else if (selectedSlot) {
        setTitle('');
        setDescription('');
        setDate(selectedSlot.start.toISOString().split('T')[0]);
        setStartTime(selectedSlot.start.toTimeString().substring(0, 5));
        setEndTime(selectedSlot.end.toTimeString().substring(0, 5));
        setEventType('personal_task');
      } else {
        setTitle('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
        setEventType('personal_task');
      }
    }
  }, [isOpen, event, selectedSlot]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }
    if (!title.trim() || !date || !startTime || !endTime) {
      setError('Título, data e horários de início/fim são obrigatórios.');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    setIsSaving(true);
    try {
      if (isNewEvent) {
        // Create new consultant event
        const newEvent: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'> = {
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: eventType,
        };
        await addConsultantEvent(newEvent);
        toast.success('Evento pessoal criado com sucesso!');
      } else if (isConsultantEvent && event) {
        // Update existing consultant event
        const updatedEvent: Partial<ConsultantEvent> = {
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: eventType,
        };
        await updateConsultantEvent(event.id, updatedEvent);
        toast.success('Evento pessoal atualizado com sucesso!');
      } else if (isLeadMeeting && event && event.leadId && event.consultantId) {
        // Update existing lead meeting (only title, description, time)
        const updatedLeadMeeting: Partial<LeadTask> = {
          title: title.trim(),
          description: description.trim() || undefined,
          meeting_start_time: startDateTime.toISOString(),
          meeting_end_time: endDateTime.toISOString(),
          due_date: date, // Keep due_date in sync
        };
        await updateLeadTask(event.id, updatedLeadMeeting);
        toast.success('Reunião de lead atualizada com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar evento:', err);
      setError(err.message || 'Falha ao salvar o evento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !event) return;
    if (!window.confirm(`Tem certeza que deseja excluir "${event.title}"?`)) return;

    setIsSaving(true);
    try {
      if (isConsultantEvent) {
        await deleteConsultantEvent(event.id);
        toast.success('Evento pessoal excluído com sucesso!');
      } else if (isLeadMeeting) {
        await deleteLeadTask(event.id);
        toast.success('Reunião de lead excluída com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir evento:', err);
      setError(err.message || 'Falha ao excluir o evento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMeetingStatus = async (status: 'accepted' | 'declined') => {
    if (!user || !event || !isLeadMeeting) return;
    setIsSaving(true);
    try {
      await updateLeadMeetingInvitationStatus(event.id, status);
      toast.success(`Convite de reunião ${status === 'accepted' ? 'aceito' : 'recusado'}!`);
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar status do convite:', err);
      setError(err.message || 'Falha ao atualizar status do convite.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToLead = () => {
    if (eventLead?.id) {
      onClose();
      navigate(`/gestor/crm`, { state: { highlightLeadId: eventLead.id } });
    }
  };

  const isManagerViewingLeadMeeting = userRole === 'GESTOR' && isLeadMeeting && event?.managerId === user?.id;
  const isConsultantViewingOwnEvent = userRole === 'CONSULTOR' && isConsultantEvent && event?.consultantId === user?.id;
  const isConsultantViewingOwnMeeting = userRole === 'CONSULTOR' && isLeadMeeting && event?.consultantId === user?.id;

  const canEdit = isNewEvent || isConsultantViewingOwnEvent || isConsultantViewingOwnMeeting;
  const canDelete = isConsultantViewingOwnEvent || isConsultantViewingOwnMeeting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{isNewEvent ? 'Novo Evento' : event?.title}</DialogTitle>
          <DialogDescription>
            {isNewEvent ? 'Crie um novo evento pessoal.' : 'Detalhes do evento.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {isLeadMeeting && event && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Reunião de Lead
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Com: <span className="font-medium">{eventLead?.name || 'Desconhecido'}</span>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Consultor: <span className="font-medium">{eventConsultant?.name || 'Desconhecido'}</span>
                </p>
                {eventManager && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Gestor Convidado: <span className="font-medium">{eventManager.name}</span>
                  </p>
                )}
                {event.status && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Status Convite: <span className="font-medium capitalize">{event.status}</span>
                  </p>
                )}
                <Button variant="link" size="sm" onClick={handleGoToLead} className="p-0 h-auto text-blue-600 dark:text-blue-400 text-xs mt-2">
                  <LinkIcon className="w-3 h-3 mr-1" /> Ver Lead
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                disabled={!canEdit && !isNewEvent}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                disabled={!canEdit && !isNewEvent}
              />
            </div>
            <div>
              <Label htmlFor="date">Data *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  disabled={!canEdit && !isNewEvent}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Hora Início *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    disabled={!canEdit && !isNewEvent}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime">Hora Fim *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    disabled={!canEdit && !isNewEvent}
                  />
                </div>
              </div>
            </div>
            {isConsultantEvent && (
              <div>
                <Label htmlFor="eventType">Tipo de Evento</Label>
                <Select
                  value={eventType}
                  onValueChange={(value: 'personal_task' | 'training' | 'other') => setEventType(value)}
                  disabled={!canEdit && !isNewEvent}
                >
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="personal_task">Tarefa Pessoal</SelectItem>
                    <SelectItem value="training">Treinamento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            {canDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSaving} className="w-full sm:w-auto mb-2 sm:mb-0">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            )}
            {isManagerViewingLeadMeeting && event?.status === 'pending' && (
              <>
                <Button type="button" onClick={() => handleUpdateMeetingStatus('declined')} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto mb-2 sm:mb-0">
                  <XCircle className="w-4 h-4 mr-2" /> Recusar Convite
                </Button>
                <Button type="button" onClick={() => handleUpdateMeetingStatus('accepted')} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto mb-2 sm:mb-0">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Aceitar Convite
                </Button>
              </>
            )}
            {(canEdit || isNewEvent) && (
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>{isSaving ? 'Salvando...' : (isNewEvent ? 'Criar Evento' : 'Salvar Alterações')}</span>
              </Button>
            )}
            {!canEdit && !isNewEvent && !isManagerViewingLeadMeeting && (
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};