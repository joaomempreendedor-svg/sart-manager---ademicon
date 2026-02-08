import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Candidate } from '@/types';
import { X, Calendar as CalendarIcon, Save, Loader2, Users, CalendarPlus } from 'lucide-react';
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
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const responsibleMembers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && m.authUserId && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  useEffect(() => {
    if (isOpen && candidate) {
      setDate(candidate.interviewDate || new Date().toISOString().split('T')[0]);
      setResponsibleUserId(candidate.responsibleUserId || '');
    }
  }, [isOpen, candidate]);

  const handleAddToGoogleCalendar = () => {
    if (!candidate || !date) return;
    
    const title = encodeURIComponent(`Entrevista: ${candidate.name}`);
    const startDate = new Date(date + 'T09:00:00'); // Default to 9 AM
    const endDate = new Date(date + 'T10:00:00');   // Default to 10 AM
    
    const formatDateForGoogle = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
    
    const details = encodeURIComponent(`Entrevista com o candidato ${candidate.name}.\nTelefone: ${candidate.phone || 'Não informado'}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !date || !responsibleUserId) {
      toast.error("Data e responsável são obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCandidate(candidate.id, {
        interviewDate: date,
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
            Defina a data e o responsável pela entrevista de {candidate.name}.
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
                      <SelectItem key={member.authUserId} value={member.authUserId!}>
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