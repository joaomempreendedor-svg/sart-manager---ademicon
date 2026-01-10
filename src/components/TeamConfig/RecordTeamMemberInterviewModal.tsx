import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Calendar as CalendarIcon, Users, CheckCircle2 } from 'lucide-react';
import { Candidate, InterviewScores, TeamMember } from '@/types';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
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

interface RecordTeamMemberInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember;
}

export const RecordTeamMemberInterviewModal: React.FC<RecordTeamMemberInterviewModalProps> = ({ isOpen, onClose, teamMember }) => {
  const { addCandidate, teamMembers, origins } = useApp(); // Adicionado origins
  const navigate = useNavigate();

  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [candidateOrigin, setCandidateOrigin] = useState(''); // NOVO: Estado para a origem
  const [isSaving, setIsSaving] = useState(false);
  const [savedCandidate, setSavedCandidate] = useState<Candidate | null>(null);

  const responsibleMembers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  useEffect(() => {
    if (isOpen) {
      setInterviewDate(new Date().toISOString().split('T')[0]);
      setResponsibleUserId(''); // Reset responsible user on open
      setCandidateOrigin(''); // Resetar origem
      setSavedCandidate(null);
    }
  }, [isOpen, teamMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate || !responsibleUserId || !candidateOrigin) { // Validação da origem
      alert('A data da entrevista, o responsável e a origem são obrigatórios.');
      return;
    }
    setIsSaving(true);

    const emptyScores: InterviewScores = {
      basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: ''
    };

    const newCandidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'> = { // Usar Omit para o tipo
      name: teamMember.name,
      phone: '', // Phone is not available on TeamMember directly, can be added later
      interviewDate: interviewDate,
      interviewer: 'Não definido', // Can be updated later
      origin: candidateOrigin, // NOVO: Salva a origem
      status: 'Entrevista',
      interviewScores: emptyScores,
      checkedQuestions: {},
      checklistProgress: {},
      consultantGoalsProgress: {},
      feedbacks: [],
      responsibleUserId: responsibleUserId,
    };

    try {
      const addedCandidate = await addCandidate(newCandidate); // addCandidate agora retorna o Candidate completo
      setSavedCandidate(addedCandidate);
    } catch (error: any) {
      alert(`Erro ao registrar entrevista: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToCandidateDetail = () => {
    if (savedCandidate) {
      navigate(`/gestor/candidate/${savedCandidate.id}`, { state: { openInterviewTab: true } });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Entrevista para: {teamMember.name}</DialogTitle>
          <DialogDescription>
            {savedCandidate 
              ? 'Entrevista registrada com sucesso!' 
              : 'Preencha os detalhes da entrevista para este membro da equipe.'}
          </DialogDescription>
        </DialogHeader>
        
        {savedCandidate ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-800 dark:text-gray-200">A entrevista para <strong>{savedCandidate.name}</strong> foi registrada para <strong>{new Date(savedCandidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Você pode agora ir para a avaliação completa do candidato.</p>
            <div className="mt-6 flex flex-col space-y-2">
              <Button onClick={handleGoToCandidateDetail} className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                Ir para Avaliação
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="relative">
                <Label htmlFor="interviewDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Entrevista</Label>
                <CalendarIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                <Input
                  id="interviewDate"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  required
                  className="pl-10 bg-white text-gray-900 dark:bg-slate-700 dark:text-white dark:border-slate-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              {/* NOVO: Campo de seleção para a Origem */}
              <div>
                <Label htmlFor="candidateOrigin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem do Candidato *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Select
                    value={candidateOrigin}
                    onValueChange={(value) => setCandidateOrigin(value)}
                    required
                  >
                    <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                      {origins.map(origin => (
                        <SelectItem key={origin} value={origin}>
                          {origin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="responsibleUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Indicado por (Responsável) *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Select
                    value={responsibleUserId}
                    onValueChange={setResponsibleUserId}
                    required
                  >
                    <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione um gestor ou anjo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                      {responsibleMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.roles.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                <span>Registrar</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};