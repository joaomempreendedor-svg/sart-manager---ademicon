import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmStage } from '@/types';
import { X, Save, Loader2, DollarSign, Calendar, CheckCircle2, XCircle } from 'lucide-react';
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

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
}

const formatCurrencyInput = (value: string): string => {
  let v = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ','); // Converte para float, 2 casas decimais, usa vírgula
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona pontos para milhares
  if (v === 'NaN,NaN') return '';
  return v;
};

const parseCurrencyInput = (value: string): number => {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

export const ProposalModal: React.FC<ProposalModalProps> = ({ isOpen, onClose, lead }) => {
  const { updateCrmLead, crmStages, crmPipelines } = useApp();
  const [proposalValue, setProposalValue] = useState<string>('');
  const [closingDate, setClosingDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const proposalSentStage = useMemo(() => {
    if (!activePipeline) return null;
    return crmStages.find(stage => stage.pipeline_id === activePipeline.id && stage.name.toLowerCase().includes('proposta') && stage.is_active);
  }, [crmStages, activePipeline]);

  useEffect(() => {
    if (isOpen) {
      setProposalValue(lead.proposal_value !== undefined && lead.proposal_value !== null ? formatCurrencyInput(lead.proposal_value.toFixed(2).replace('.', ',')) : ''); // Usando snake_case
      setClosingDate(lead.proposal_closing_date || ''); // Usando snake_case
      setError('');
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log("ProposalModal: handleSubmit called");

    const parsedValue = parseCurrencyInput(proposalValue);

    if (!parsedValue || parsedValue <= 0) {
      setError('O valor da proposta deve ser maior que zero.');
      return;
    }
    if (!closingDate) {
      setError('A data de fechamento esperada é obrigatória.');
      return;
    }
    if (!proposalSentStage) {
      setError("Nenhuma etapa de 'Proposta' ativa configurada no pipeline. Por favor, configure-a nas configurações do CRM.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCrmLead(lead.id, {
        proposal_value: parsedValue, // Usando snake_case
        proposal_closing_date: closingDate, // Usando snake_case
        stage_id: proposalSentStage.id, // Mover para a etapa de proposta
      });

      toast.success(`Proposta para "${lead.name}" salva e lead movido para "${proposalSentStage.name}" com sucesso!`);
      console.log("ProposalModal: Calling onClose() after successful save.");
      onClose(); // <--- Isso deve fechar o modal
    } catch (err: any) {
      console.error("ProposalModal: Error saving proposal:", err);
      setError(err.message || 'Falha ao salvar a proposta.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log("ProposalModal: Dialog onOpenChange called with", open);
      if (!open) onClose(); // Se o Dialog quer fechar (clique fora, Esc), chame onClose
    }}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Proposta para: {lead.name}</DialogTitle>
          <DialogDescription>
            Insira os detalhes da proposta enviada para este lead.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="proposalValue">Valor da Proposta (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="proposalValue"
                  type="text"
                  value={proposalValue}
                  onChange={(e) => setProposalValue(formatCurrencyInput(e.target.value))}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="closingDate">Data de Fechamento Esperada</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={() => {
              console.log("ProposalModal: Cancel button clicked, calling onClose()");
              onClose();
            }} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};