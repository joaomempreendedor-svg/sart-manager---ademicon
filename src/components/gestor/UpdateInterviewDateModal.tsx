import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Candidate } from '@/types';
import { X, Calendar as CalendarIcon, Save, Loader2, Users, CalendarPlus, Clock } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

interface UpdateInterviewDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export const UpdateInterviewDateModal: React.FC<UpdateInterviewDateModalProps> = ({ isOpen, onClose, candidate }) => {
  const { updateCandidate, teamMembers } = useApp();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(''); // NOVO: Estado para a hora de início
  const [endTime, setEndTime] = useState('');     // NOVO: Estado para a hora de término
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const responsibleMembers = useMemo(() => {
    // Filtra apenas membros ativos que são GESTOR ou ANJO (em maiúsculas)
    return teamMembers.filter(m => m.isActive && (m.roles.includes('GESTOR') || m.roles.includes('ANJO')));
  }, [teamMembers]);

  useEffect(() => {
    if (isOpen && candidate) {
      setDate(candidate.interviewDate || new Date().toISOString().split('T')[0]);
      setStartTime(candidate.interviewStartTime || '09:00'); // NOVO: Inicializa com valor existente ou padrão
      setEndTime(candidate.interviewEndTime || '10:00');     // NOVO: Inicializa com valor existente ou padrão
      setResponsibleUserId(candidate.responsibleUserId || '');
    }
  }, [isOpen, candidate]);

  const handleAddToGoogleCalendar = () => {
    if (!candidate || !date || !startTime || !endTime) {
      toast.error("Data e horários são obrigatórios para agendar no Google Agenda.");
      return;
    }
    
    const title = encodeURIComponent(`Entrevista: ${candidate.name}`);
    
    // Combina data e hora para criar objetos Date para o Google Calendar
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    // Formato para Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGoogleDateTime = (dt: Date) => {
      return dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
    };

    const dates = `${formatGoogleDateTime(startDateTime)}/${formatGoogleDateTime(endDateTime)}`;
    
    const details = encodeURIComponent(`Entrevista com o candidato ${candidate.name}.\nTelefone: ${candidate.phone || 'Não informado'}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !date || !startTime || !endTime || !responsibleUserId) {
      toast.error("Data, horários e responsável são obrigatórios.");
      return;
    }

    // Validação de horário
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    if (startDateTime >= endDateTime) {
      toast.error("A hora de início deve ser anterior à hora de término.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCandidate(candidate.id, {
        interviewDate: date,
        interviewStartTime: startTime, // NOVO: Salva a hora de início
        interviewEndTime: endTime,     // NOVO: Salva a hora de término
        responsibleUserId: responsibleUserId,
        status: 'Entrevista'
      });
      toast.success(`Entrevista com ${candidate.name} agendada!`);
      onClose();
    } catch (error: any) {
      toast.error(`Erro ao agendar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Agendar Entrevista</DialogTitle>
          <DialogDescription>
            Defina a data, horários e o responsável pela entrevista de {candidate.name}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="interviewDate">Data da Entrevista *</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="interviewDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
            <div>
              <Label htmlFor="responsible">Responsável *</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={responsibleUserId}
                  onValueChange={setResponsibleUserId}
                  required
                >
                  <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    {responsibleMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddToGoogleCalendar}
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Google Agenda
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>Salvar</span>
              </Button>
            </div>
            <Button type="button" variant="ghost" onClick={onClose} className="w-full text-gray-500">
              Cancelar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};