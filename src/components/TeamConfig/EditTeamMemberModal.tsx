import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Mail, CalendarDays, User, Shield, Crown, Star, UserCheck } from 'lucide-react'; // Adicionado UserCheck
import { TeamMember, TeamRole } from '@/types';
import { formatCpf } from '@/utils/authUtils';
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
import toast from 'react-hot-toast';

const ALL_ROLES: TeamRole[] = ['Prévia', 'Autorizado', 'Gestor', 'Anjo', 'Secretaria'];

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSave: (id: string, updates: Partial<TeamMember>) => Promise<void>;
}

export const EditTeamMemberModal: React.FC<EditTeamMemberModalProps> = ({ isOpen, onClose, member, onSave }) => {
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingCpf, setEditingCpf] = useState('');
  const [editingDateOfBirth, setEditingDateOfBirth] = useState('');
  const [editingRoles, setEditingRoles] = useState<TeamRole[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && member) {
      setEditingName(member.name);
      setEditingEmail(member.email || '');
      setEditingCpf(formatCpf(member.cpf || ''));
      setEditingDateOfBirth(member.dateOfBirth || '');
      setEditingRoles(member.roles);
      setError('');
    }
  }, [isOpen, member]);

  const handleRoleChange = (role: TeamRole) => {
    const updatedRoles = editingRoles.includes(role)
      ? editingRoles.filter(r => r !== role)
      : [...editingRoles, role];
    setEditingRoles(updatedRoles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!member) return;

    if (!editingName.trim() || !editingEmail.trim() || editingRoles.length === 0 || !editingCpf.trim()) {
      setError("Nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (editingCpf.replace(/\D/g, '').length !== 11) {
      setError("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsSaving(true);
    try {
      const cleanedCpf = editingCpf.replace(/\D/g, '');
      await onSave(member.id, {
        name: editingName.trim(),
        email: editingEmail.trim(),
        cpf: cleanedCpf,
        roles: editingRoles,
        dateOfBirth: editingDateOfBirth || undefined,
      });
      toast.success("Membro da equipe atualizado com sucesso!");
      onClose();
    } catch (err: any) {
      console.error("Erro ao atualizar membro:", err);
      setError(err.message || "Falha ao atualizar membro da equipe.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch(role) {
        case 'Gestor': return <Crown className="w-4 h-4 text-blue-500" />;
        case 'Anjo': return <Star className="w-4 h-4 text-yellow-500" />;
        case 'Autorizado': return <Shield className="w-4 h-4 text-green-500" />;
        case 'Secretaria': return <UserCheck className="w-4 h-4 text-purple-500" />; // Ícone para Secretaria
        default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isOpen || !member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Editar Membro: {member.name}</DialogTitle>
          <DialogDescription>
            Atualize as informações e cargos de {member.name}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="editingName">Nome Completo</Label>
              <Input
                id="editingName"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div>
              <Label htmlFor="editingEmail">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="editingEmail"
                  type="email"
                  value={editingEmail}
                  onChange={(e) => setEditingEmail(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editingCpf">CPF</Label>
              <Input
                id="editingCpf"
                type="text"
                value={editingCpf}
                onChange={(e) => setEditingCpf(formatCpf(e.target.value))}
                maxLength={14}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div>
              <Label htmlFor="editingDateOfBirth">Data de Nascimento (Opcional)</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="editingDateOfBirth"
                  type="date"
                  value={editingDateOfBirth}
                  onChange={(e) => setEditingDateOfBirth(e.target.value)}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <div>
              <Label>Cargos / Funções</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map(role => (
                  <label key={role} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};