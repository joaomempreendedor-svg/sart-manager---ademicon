import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, LeadTask, TeamMember } from '@/types'; // Importar LeadTask
import { X, Save, Loader2, Calendar, Clock, MessageSquare, Users, CalendarPlus, Link as LinkIcon } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  currentMeeting?: LeadTask | null; // NOVO: Prop opcional para edição
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose, lead, currentMeeting }) => {
  const { user } = useAuth();
  const { addLeadTask, updateLeadTask, updateCrmLeadStage, crmStages, teamMembers } = useApp(); // Adicionado teamMembers

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const meetingStage = useMemo(() => {
    return crmStages.find(stage => stage.name.toLowerCase().includes('reunião') && stage.is_active);
  }, [crmStages]);

  useEffect(() => {
    if (isOpen) {
      if (currentMeeting) {
        // Modo Edição: Preencher com dados da reunião existente
        setTitle(currentMeeting.title);
        setDescription(currentMeeting.description || '');
        setDate(currentMeeting.due_date || (currentMeeting.meeting_start_time ? new Date(currentMeeting.meeting_start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
        setStartTime(currentMeeting.meeting_start_time ? new Date(currentMeeting.meeting_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '09:00');
        setEndTime(currentMeeting.meeting_end_time ? new Date(currentMeeting.meeting_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '10:00');
      } else {
        // Modo Criação: Valores padrão
        setTitle(`Reunião com ${lead.name}`);
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
      }
      setError('');
    }
  }, [isOpen, lead.name, currentMeeting]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }
    if (!title.trim() || !date || !startTime || !endTime) {
      setError('Título, data e horários são obrigatórios.');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError('A hora de início deve ser anterior à hora de término.');
      return;
    }

    setIsSaving(true);
    try {
      // Determine taskOwnerId (consultant) and invitedManagerId (gestor)
      let taskOwnerId = lead.consultant_id; // Default to lead's consultant
      let invitedManagerId: string | null = null;

      if (user.role === 'GESTOR' || user.role === 'ADMIN') {
        // If gestor is scheduling, the task owner is the lead's consultant
        taskOwnerId = lead.consultant_id;
        // The gestor themselves are the invited manager
        invitedManagerId = user.id;
      } else if (user.role === 'CONSULTOR') {
        // If consultant is scheduling, they are the task owner
        taskOwnerId = user.id;
        // No manager invited by default, unless specified (not in this modal)
        invitedManagerId = null; // Or could be lead.user_id if that's the manager
      }

      if (!taskOwnerId) {
        setError('Não foi possível determinar o consultor responsável pela tarefa.');
        setIsSaving(false);
        return;
      }

      const meetingData: Omit<LeadTask, 'id' | 'created_at' | 'completed_at'> & { user_id: string; manager_id?: string | null; } = {
        lead_id: lead.id,
        user_id: taskOwnerId, // ID do consultor responsável pela tarefa
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: date, // YYYY-MM-DD
        is_completed: false,
        type: 'meeting' as const,
        meeting_start_time: startDateTime.toISOString(),
        meeting_end_time: endDateTime.toISOString(),
        manager_id: invitedManagerId, // ID do gestor convidado
        manager_invitation_status: invitedManagerId ? 'pending' : undefined, // Status inicial
      };

      console.log("[ScheduleMeetingModal] Data being sent to update/add:", { id: currentMeeting?.id, meetingData });

      if (currentMeeting) {
        // Atualizar reunião existente
        await updateLeadTask(currentMeeting.id, meetingData);
        console.log("[ScheduleMeetingModal] Meeting updated successfully.");
      } else {
        // Adicionar nova reunião
        await addLeadTask(meetingData);
        if (meetingStage && lead.stage_id !== meetingStage.id) {
          await updateCrmLeadStage(lead.id, meetingStage.id);
        }
        console.log("[ScheduleMeetingModal] Meeting added successfully.");
      }
      onClose();
    } catch (err: any) {
      console.error("Erro ao agendar/editar reunião:", err);
      setError(err.message || 'Falha ao agendar/editar reunião.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    const formattedStartDate = startDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const formattedEndDate = endDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const datesParam = `${formattedStartDate}/${formattedEndDate}`;

    const eventTitle = `Reunião com ${lead.name}`;
    const eventDescription = description || `Reunião com o lead ${lead.name}`;

    let googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE`;
    googleCalendarUrl += `&text=${encodeURIComponent(eventTitle)}`;
    googleCalendarUrl += `&dates=${datesParam}`;
    googleCalendarUrl += `&details=${encodeURIComponent(eventDescription)}`;

    if (lead.data.email) {
      googleCalendarUrl += `&add=${encodeURIComponent(lead.data.email)}`;
    }
    if (user?.email) {
      googleCalendarUrl += `&add=${encodeURIComponent(user.email)}`;
    }
    
    window.open(googleCalendarUrl.toString(), '_blank');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{currentMeeting ? 'Editar Reunião' : 'Agendar Reunião'} para: {lead.name}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da reunião.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleScheduleMeeting}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4 custom-scrollbar">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: Treinamento de Produto"
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
                  placeholder="Detalhes do evento..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="startTime">Início</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="endTime">Fim</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={handleAddToGoogleCalendar} className="mb-2 sm:mb-0 flex items-center space-x-2 dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
              <CalendarPlus className="w-4 h-4" />
              <span>Adicionar ao Google Agenda</span>
            </Button>
            <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>{currentMeeting ? 'Salvar Alterações' : 'Agendar Reunião'}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};