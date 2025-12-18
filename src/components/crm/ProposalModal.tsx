import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmStage } from '@/types';
import { X, Save, Loader2, DollarSign, Calendar, MessageSquare } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  onSave: (leadId: string, proposalValue: number, proposalDate: string, proposalNotes?: string) => Promise<void>;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({ isOpen, onClose, lead, onSave }) => {
  const [proposalValue, setProposalValue] = useState('');
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [proposalNotes, setProposalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with existing proposal data if available
      setProposalValue(lead.data?.proposal_value ? (lead.data.proposal_value / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') : '');
      setProposalDate(lead.data?.proposal_date || new Date().toISOString().split('T')[0]);
      setProposalNotes(lead.data?.proposal_notes || '');
      setError('');
    }
  }, [isOpen, lead]);

  const formatAndSetCurrency = (value: string) => {
    let v = value.replace(/\D/g, '');
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    if (v === 'NaN,NaN') v = '';
    setProposalValue(v);
  };

  const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedValue = parseCurrency(proposalValue);

    if (!parsedValue || parsedValue <= 0) {
      setError('O valor da proposta deve ser maior que zero.');
      return;
    }
    if (!proposalDate) {
      setError('A data da proposta é obrigatória.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(lead.id, parsedValue, proposalDate, proposalNotes.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar proposta:", err);
      setError(err.message || 'Falha ao salvar proposta.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Proposta para: {lead.name}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da proposta enviada para este lead.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="proposalValue">Valor da Proposta (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="proposalValue"
                    type="text"
                    value={proposalValue}
                    onChange={(e) => formatAndSetCurrency(e.target.value)}
                    required
                    className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="proposalDate">Data da Proposta</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="proposalDate"
                    type="date"
                    value={proposalDate}
                    onChange={(e) => setProposalDate(e.target.value)}
                    required
                    className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="proposalNotes">Anotações (Opcional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="proposalNotes"
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                    rows={3}
                    className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Detalhes adicionais sobre a proposta..."
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Salvando...' : 'Salvar Proposta'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};