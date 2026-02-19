import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Phone, Mail, MessageSquare } from 'lucide-react';
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
import { ColdCallLead } from '@/types';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';

interface ColdCallLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ColdCallLead | null; // Null for new lead, object for editing
}

export const ColdCallLeadModal: React.FC<ColdCallLeadModalProps> = ({ isOpen, onClose, lead }) => {
  const { addColdCallLead, updateColdCallLead } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (lead) {
        setName(lead.name);
        setPhone(lead.phone);
        setEmail(lead.email || '');
        setNotes(lead.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim()) {
      setError("Nome e Telefone são obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      const leadData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      
      if (lead) {
        await updateColdCallLead(lead.id, leadData);
        toast.success("Prospect de Cold Call atualizado com sucesso!");
      } else {
        await addColdCallLead(leadData);
        toast.success("Novo Prospect de Cold Call adicionado com sucesso!");
      }
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar prospect:", err);
      setError(err.message || 'Falha ao salvar o prospect.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Prospect' : 'Novo Prospect'}</DialogTitle>
          <DialogDescription>
            {lead ? `Edite as informações de ${lead.name}.` : 'Adicione um novo prospect para suas ligações frias.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Nome do prospect"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Anotações sobre o prospect..."
                />
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
              <span>{isSaving ? 'Salvando...' : 'Salvar Prospect'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};