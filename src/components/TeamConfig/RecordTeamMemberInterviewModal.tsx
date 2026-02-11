import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, LeadTask, TeamMember } from '@/types';
import { X, Save, Loader2, Calendar, Clock, MessageSquare, Users, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RecordTeamMemberInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember; // Alterado de 'lead' para 'teamMember'
}

export const RecordTeamMemberInterviewModal: React.FC<RecordTeamMemberInterviewModalProps> = ({ isOpen, onClose, teamMember }) => { // Renomeado o componente e a prop
  const { user } = useAuth();
  const { addLeadTask, updateLeadTask, teamMembers } = useApp(); // Mantido addLeadTask/updateLeadTask por enquanto, mas a lógica será ajustada para entrevistas de candidatos
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState(''); // Renomeado de meetingDate
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [interviewerId, setInterviewerId] = useState<string | null>(null); // Renomeado de managerId
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const interviewers = useMemo(() => { // Renomeado de managers
    // Filtra apenas membros ativos que são Gestor ou Anjo E que possuem um authUserId
    return teamMembers.filter(m => m.isActive && m.authUserId && (m.roles.includes('GESTOR') || m.roles.includes('ANJO')));
  }, [teamMembers]);

  useEffect(() => {
    if (isOpen) {
      // Lógica para preencher o modal com dados da entrevista, se houver
      // Por enquanto, vamos assumir que é sempre uma nova entrevista para este modal
      setTitle(`Entrevista com ${teamMember.name}`);
      setDescription('');
      setInterviewDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setInterviewerId(user?.id || null); // Default para o usuário logado como entrevistador
      setError('');
    }
  }, [isOpen, teamMember, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }
    if (!title.trim() || !interviewDate || !startTime || !endTime) {
      setError('Título, data e horários de início/fim são obrigatórios.');
      return;
    }

    const startDateTime = new Date(`${interviewDate}T${startTime}:00`);
    const endDateTime = new Date(`${interviewDate}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    setIsSaving(true);
    try {
      // A lógica aqui precisaria ser adaptada para registrar uma entrevista de candidato
      // Atualmente, o `addLeadTask` e `updateLeadTask` não são adequados para isso.
      // Você precisaria de uma função `addCandidateInterview` ou `updateCandidateInterview`
      // no AppContext que lide com a atualização do `Candidate` com os dados da entrevista.
      
      // Por enquanto, vamos simular um sucesso e logar os dados
      console.log("Dados da entrevista a serem salvos:", {
        teamMemberId: teamMember.id,
        title: title.trim(),
        description: description.trim() || undefined,
        interviewDate: interviewDate,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        interviewerId: interviewerId,
      });
      toast.success('Entrevista registrada com sucesso (simulado)!');
      onClose();
    } catch (err: any) {
      console.error('Erro ao registrar entrevista:', err);
      setError(err.message || 'Falha ao registrar a entrevista.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Entrevista para: {teamMember.name}</DialogTitle>
          <DialogDescription>
            Registre os detalhes da entrevista realizada com este membro da equipe.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="title">Título da Entrevista *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                placeholder={`Entrevista com ${teamMember.name}`}
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
                placeholder="Detalhes da entrevista, observações..."
              />
            </div>
            <div>
              <Label htmlFor="interviewDate">Data da Entrevista *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="interviewDate"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
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
              <Label htmlFor="interviewerId">Entrevistador (Opcional)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={interviewerId || ''}
                  onValueChange={(value) => setInterviewerId(value === '' ? null : value)}
                >
                  <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione um entrevistador" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="">Nenhum</SelectItem>
                    {interviewers.map(interviewer => (
                      <SelectItem key={interviewer.authUserId} value={interviewer.authUserId!}>
                        {interviewer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <span>{isSaving ? 'Salvando...' : 'Registrar Entrevista'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};