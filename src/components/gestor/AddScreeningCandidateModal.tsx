import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Loader2, User, Phone, Mail, Users, MapPin } from 'lucide-react';
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
import { Candidate, TeamMember } from '@/types';

interface AddScreeningCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  origins: string[]; // This is the prop for hiring origins
  responsibleMembers: TeamMember[];
}

export const AddScreeningCandidateModal: React.FC<AddScreeningCandidateModalProps> = ({ isOpen, onClose, origins, responsibleMembers }) => {
  const { addCandidate, teamMembers, hiringOrigins } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    origin: '',
    responsibleUserId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const responsibleMembers = useMemo(() => {
    // Filtra apenas membros ativos que são Gestor ou Anjo
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      origin: '',
      responsibleUserId: '',
    });
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      console.log("[AddScreeningCandidateModal] Received origins:", origins); // Adicionado log aqui
      resetForm();
    }
  }, [isOpen, origins]); // Adicionado 'origins' como dependência

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!formData.origin.trim()) {
      setError('Origem é obrigatória.');
      return;
    }

    setIsSaving(true);
    try {
      const newCandidate: Candidate = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        origin: formData.origin,
        status: 'Triagem',
        screeningStatus: 'Pending Contact',
        interviewDate: '',
        interviewer: '',
        interviewScores: { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
        checklistProgress: {},
        consultantGoalsProgress: {},
        feedbacks: [],
        createdAt: new Date().toISOString(),
        responsibleUserId: formData.responsibleUserId || undefined,
      };

      await addCandidate(newCandidate);
      toast.success(`Candidato "${newCandidate.name}" adicionado para triagem!`);
      handleClose();
    } catch (err: any) {
      console.error("Erro ao adicionar candidato para triagem:", err);
      setError(err.message || 'Falha ao adicionar candidato.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Pessoa para Triagem</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos para iniciar o processo de triagem.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Nome do candidato"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Telefone (Opcional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail (Opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="origin">Origem *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={formData.origin}
                  onValueChange={(value) => setFormData({...formData, origin: value})}
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
              <Label htmlFor="responsibleUser">De quem é o candidato? (Opcional)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={formData.responsibleUserId}
                  onValueChange={(value) => setFormData({...formData, responsibleUserId: value})}
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
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={handleClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>Adicionar Candidato</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};