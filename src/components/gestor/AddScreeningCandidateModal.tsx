import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Candidate, TeamMember } from '@/types';
import { X, Save, Loader2, User, Phone, Mail, MapPin, Users } from 'lucide-react';
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

interface AddScreeningCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Removido origins: string[];
  // Removido responsibleMembers: TeamMember[];
}

export const AddScreeningCandidateModal: React.FC<AddScreeningCandidateModalProps> = ({ isOpen, onClose }) => {
  const { addCandidate, origins, teamMembers } = useApp(); // Acessa origins e teamMembers do contexto
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) { // Apenas o nome é obrigatório agora
      setError('Nome é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      const newCandidate: Candidate = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        origin: formData.origin || 'Não Informado', // Define um valor padrão se não for fornecido
        status: 'Triagem', // Inicia no status de triagem
        screeningStatus: 'Pending Contact', // Inicia como pendente de contato
        interviewDate: '', // Não há data de entrevista inicial
        interviewer: '', // Não há entrevistador inicial
        interviewScores: { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
        checklistProgress: {},
        consultantGoalsProgress: {},
        feedbacks: [],
        createdAt: new Date().toISOString(),
        responsibleUserId: formData.responsibleUserId || undefined, // Define como undefined se não for fornecido
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
          <div className="grid gap-4 py-4">
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
            {/* Removido o campo de Origem */}
            {/* Removido o campo de Responsável */}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={handleClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>Adicionar Candidato</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};