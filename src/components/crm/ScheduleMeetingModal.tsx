import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, LeadTask, TeamMember } from '@/types';
import { X, Save, Loader2, Calendar, Clock, MessageSquare, Users, CheckCircle2, XCircle } from 'lucide-react';
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

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  currentMeeting?: LeadTask | null; // Optional, for editing an existing meeting
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose, lead, currentMeeting }) => {
  const { user } = useAuth();
  const { addLeadTask, updateLeadTask, teamMembers } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const managers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && m.roles.includes('Gestor'));
  }, [teamMembers]);

  useEffect(() => {
    if (isOpen) {
      if (currentMeeting) {
        setTitle(currentMeeting.title);
        setDescription(currentMeeting.description || '');
        setMeetingDate(currentMeeting.meeting_start_time ? currentMeeting.meeting_start_time.split('T')[0] : '');
        setStartTime(currentMeeting.meeting_start_time ? currentMeeting.meeting_start_time.split('T')[1].substring(0, 5) : '');
        setEndTime(currentMeeting.meeting_end_time ? currentMeeting.meeting_end_time.split('T')[1].substring(0, 5) : '');
        setManagerId(currentMeeting.manager_id || null);
      } else {
        setTitle(`Reunião com ${lead.name}`);
        setDescription('');
        setMeetingDate(new Date().toISOString().split('T')[0]); // Corrigido: Usando setMeetingDate
        setStartTime('09:00');
        setEndTime('10:00');
        setManagerId(user?.id || null); // Default to current user if manager
      }
      setError('');
    }
  }, [isOpen, currentMeeting, lead.name, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }
    if (!title.trim() || !meetingDate || !startTime || !endTime) {
      setError('Título, data e horários de início/fim são obrigatórios.');
      return;
    }

    const startDateTime = new Date(`${meetingDate}T${startTime}:00`);
    const endDateTime = new Date(`${meetingDate}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    setIsSaving(true);
    try {
      const taskData = {
        lead_id: lead.id,
        user_id: user.id, // Consultant who created the task
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: meetingDate, // Due date is the meeting date
        is_completed: false,
        type: 'meeting' as const,
        meeting_start_time: startDateTime.toISOString(),
        meeting_end_time: endDateTime.toISOString(),
        manager_id: managerId, // Manager invited to the meeting
        manager_invitation_status: managerId ? 'pending' as const : undefined,
      };

      if (currentMeeting) {
        await updateLeadTask(currentMeeting.id, taskData);
        toast.success('Reunião atualizada com sucesso!');
      } else {
        await addLeadTask(taskData);
        toast.success('Reunião agendada com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao agendar/atualizar reunião:', err);
      setError(err.message || 'Falha ao salvar a reunião.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{currentMeeting ? 'Editar Reunião' : 'Agendar Reunião'}</DialogTitle>
          <DialogDescription>
            {currentMeeting ? `Edite os detalhes da reunião com ${lead.name}.` : `Agende uma nova reunião com ${lead.name}.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="title">Título da Reunião *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder={`Reunião com ${lead.name}`}
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
                placeholder="Detalhes da pauta da reunião..."
              />
            </div>
            <div>
              <Label htmlFor="meetingDate">Data da Reunião *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
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
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isSaving ? 'Salvando...' : (currentMeeting ? 'Atualizar Reunião' : 'Agendar Reunião')}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};