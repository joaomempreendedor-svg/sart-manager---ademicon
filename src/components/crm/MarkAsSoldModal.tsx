import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmStage } from '@/types';
import { X, Save, Loader2, DollarSign, Calendar, Users, Hash, Plus } from 'lucide-react'; // Importar Plus icon
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
import { Textarea } from '@/components/ui/textarea'; // Importar Textarea

interface MarkAsSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
  onSaleSuccess: (leadName: string) => void; // NOVO: Callback para sucesso da venda
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

export const MarkAsSoldModal: React.FC<MarkAsSoldModalProps> = ({ isOpen, onClose, lead, onSaleSuccess }) => {
  const { updateCrmLead, crmStages, crmPipelines } = useApp();
  const [soldCreditValue, setSoldCreditValue] = useState<string>('');
  const [soldGroup, setSoldGroup] = useState<string>('');
  const [soldQuota, setSoldQuota] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const quotaTextareaRef = useRef<HTMLTextAreaAreaElement>(null); // Ref para a área de texto da cota

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const wonStage = useMemo(() => {
    if (!activePipeline) return null;
    return crmStages.find(stage => stage.pipeline_id === activePipeline.id && stage.is_won && stage.is_active);
  }, [crmStages, activePipeline]);

  useEffect(() => {
    if (isOpen) {
      console.log("[MarkAsSoldModal] Modal is open. Checking for Add Cota button."); // Log de depuração
      setSoldCreditValue(lead.soldCreditValue !== undefined && lead.soldCreditValue !== null ? formatCurrencyInput(lead.soldCreditValue.toFixed(2).replace('.', ',')) : '0,00');
      setSoldGroup(lead.soldGroup || '');
      setSoldQuota(lead.soldQuota || '');
      setSaleDate(lead.saleDate || new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedSoldCreditValue = parseCurrencyInput(soldCreditValue);

    if (!parsedSoldCreditValue || parsedSoldCreditValue < 0) {
      setError('O valor do crédito vendido deve ser maior ou igual a zero.');
      return;
    }
    if (!soldGroup.trim()) {
      setError('O campo Grupo é obrigatório.');
      return;
    }
    if (!soldQuota.trim()) {
      setError('O campo Cota(s) é obrigatório.');
      return;
    }
    if (!saleDate) {
      setError('A data da venda é obrigatória.');
      return;
    }

    if (!wonStage) {
      setError('Nenhuma etapa de "Ganha" ativa configurada no pipeline. Por favor, configure-a nas configurações do CRM.');
      return;
    }

    setIsSaving(true);
    try {
      await updateCrmLead(lead.id, {
        soldCreditValue: parsedSoldCreditValue,
        soldGroup: soldGroup.trim(),
        soldQuota: soldQuota.trim(),
        saleDate: saleDate,
        stage_id: wonStage.id,
      });

      toast.success(`Venda para "${lead.name}" registrada e lead movido para "${wonStage.name}" com sucesso!`);
      onSaleSuccess(lead.name); // Chamar o callback de sucesso
      onClose();
    } catch (err: any) {
      console.error("Erro ao registrar venda:", err);
      setError(err.message || 'Falha ao registrar a venda.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Venda para: {lead.name}</DialogTitle>
          <DialogDescription>
            Insira os detalhes da venda finalizada para este lead.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div>
              <Label htmlFor="soldCreditValue">Valor do Crédito (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="soldCreditValue"
                  type="text"
                  value={soldCreditValue}
                  onChange={(e) => setSoldCreditValue(formatCurrencyInput(e.target.value))}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="soldGroup">Grupo</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="soldGroup"
                  type="text"
                  value={soldGroup}
                  onChange={(e) => setSoldGroup(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: 5025"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="soldQuota">Cota(s)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  id="soldQuota"
                  value={soldQuota}
                  onChange={(e) => setSoldQuota(e.target.value)}
                  required
                  rows={3}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Ex: 150, 151, 152 (uma por linha)"
                  ref={quotaTextareaRef}
                />
              </div>
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  setSoldQuota(prev => prev + '\n');
                  quotaTextareaRef.current?.focus();
                }}
                className="mt-2 flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white" // Estilo chamativo
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Cota</span>
              </Button>
            </div>
            <div>
              <Label htmlFor="saleDate">Data da Venda</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
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
              <span>{isSaving ? 'Registrando...' : 'Registrar Venda'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};