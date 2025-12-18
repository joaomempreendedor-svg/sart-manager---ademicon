import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, TeamMember } from '@/types';
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
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose, lead }) => {
  const { user } = useAuth();
  const { addLeadTask, updateCrmLeadStage, crmStages } = useApp(); // Removido teamMembers

  const [title, setTitle] = useState(`Reunião com ${lead.name}`);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  // const [invitedManagerId, setInvitedManagerId] = useState<string | undefined>(undefined); // REMOVIDO
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // REMOVIDO: managers useMemo
  // const managers = useMemo(() => {
  //   const filtered = teamMembers.filter(member => 
  //     member.roles.includes('Gestor') && 
  //     member.isActive &&
  //     member.hasLogin &&
  //     !member.id.startsWith('legacy_')
  //   );
  //   console.log("[ScheduleMeetingModal] Filtered Managers for selection:", filtered.map(m => ({ id: m.id, name: m.name, hasLogin: m.hasLogin })));
    
  //   const validManagers = filtered.filter(m => {
  //     const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(m.id);
  //     if (!isValidUuid) {
  //       console.warn(`[ScheduleMeetingModal] Manager ${m.name} (ID: ${m.id}) has an invalid UUID format. Filtering out.`);
  //     }
  //     return isValidUuid;
  //   });
  //   console.log("[ScheduleMeetingModal] Validated Managers (UUID format check):", validManagers.map(m => ({ id: m.id, name: m.name })));
  //   return validManagers;
  // }, [teamMembers]);

  const meetingStage = useMemo(() => {
    return crmStages.find(stage => stage.name.toLowerCase().includes('reunião') && stage.is_active);
  }, [crmStages]);

  useEffect(() => {
    if (isOpen) {
      setTitle(`Reunião com ${lead.name}`);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      // setInvitedManagerId(undefined); // REMOVIDO
      setError('');
    }
  }, [isOpen, lead.name]);

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

    console.log("[ScheduleMeetingModal] Attempting to schedule meeting.");
    console.log("[ScheduleMeetingModal] Lead ID:", lead.id);
    console.log("[ScheduleMeetingModal] Consultant User ID (from Auth):", user?.id);
    // console.log("[ScheduleMeetingModal] Invited Manager ID (before addLeadTask):", invitedManagerId); // REMOVIDO
    console.log("[ScheduleMeetingModal] Meeting Start Time:", startDateTime.toISOString());
    console.log("[ScheduleMeetingModal] Meeting End Time:", endDateTime.toISOString());

    setIsSaving(true);
    try {
      await addLeadTask({
        lead_id: lead.id,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: date,
        is_completed: false,
        type: 'meeting',
        meeting_start_time: startDateTime.toISOString(),
        meeting_end_time: endDateTime.toISOString(),
        // manager_id: invitedManagerId, // REMOVIDO
        // manager_invitation_status: invitedManagerId ? 'pending' : undefined, // REMOVIDO
      });

      if (meetingStage && lead.stage_id !== meetingStage.id) {
        await updateCrmLeadStage(lead.id, meetingStage.id);
      }

      onClose();
    } catch (err: any) {
      console.error("Erro ao agendar reunião:", err);
      setError(err.message || 'Falha ao agendar reunião.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.append('text', encodeURIComponent(title));
    googleCalendarUrl.searchParams.append('dates', `${startDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}/${endDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}`);
    googleCalendarUrl.searchParams.append('details', encodeURIComponent(description || `Reunião com o lead ${lead.name}`));
    
    if (lead.data.email) {
      googleCalendarUrl.searchParams.append('add', encodeURIComponent(lead.data.email));
    }
    if (user?.email) {
      googleCalendarUrl.searchParams.append('add', encodeURIComponent(user.email));
    }
    // REMOVIDO: Lógica de convite de gestor
    // const invitedManager = managers.find(m => m.id === invitedManagerId);
    // if (invitedManager?.email) {
    //   googleCalendarUrl.searchParams.append('add', encodeURIComponent(invitedManager.email));
    // }

    window.open(googleCalendarUrl.toString(), '_blank');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Agendar Reunião para: {lead.name}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da reunião.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleScheduleMeeting}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
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
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
              {/* REMOVIDO: Campo de convite de gestor */}
              {/* <div>
                <Label htmlFor="manager">Convidar Gestor (Opcional)</Label>
                <Select value={invitedManagerId} onValueChange={setInvitedManagerId}>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione um gestor" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {managers.map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={handleAddToGoogleCalendar} className="mb-2 sm:mb-0 flex items-center space-x-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <CalendarPlus className="w-4 h-4" />
              <span>Adicionar ao Google Agenda</span>
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Agendando...' : 'Agendar Reunião'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};