import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, CrmStage } from '@/types';
import { X, Save, Loader2, DollarSign, Calendar, MessageSquare, Users, Home, Car, AlertTriangle } from 'lucide-react'; // Adicionado AlertTriangle
import toast from 'react-hot-toast'; // Importar toast
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead;
}

export const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, lead }) => {
  const { user } = useAuth();
  const { addCommission, updateCrmLeadStage, crmStages, pvs } = useApp();

  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [creditValue, setCreditValue] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState<'Imóvel' | 'Veículo'>('Imóvel');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const wonStage = useMemo(() => {
    return crmStages.find(stage => stage.is_won && stage.is_active);
  }, [crmStages]);

  useEffect(() => {
    if (isOpen) {
      setGroup(lead.data?.group || '');
      setQuota(lead.data?.quota || '');
      setCreditValue(lead.data?.proposal_value ? (lead.data.proposal_value / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') : '');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSaleType('Imóvel'); // Default to Imóvel
      setError(''); // Limpar erro ao abrir o modal
    }
  }, [isOpen, lead, user]);

  const formatAndSetCurrency = (value: string) => {
    let v = value.replace(/\D/g, '');
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    if (v === 'NaN,NaN') v = '';
    setCreditValue(v);
  };

  const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      const msg = 'Usuário não autenticado.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!wonStage) {
      const msg = "A etapa 'Vendido' (Ganha) não está configurada ou ativa no CRM. Por favor, contate seu gestor.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!group.trim() || !quota.trim() || !creditValue.trim() || !saleDate.trim()) {
      const msg = 'Grupo, Cota, Valor do Crédito e Data da Venda são obrigatórios.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const parsedCreditValue = parseCurrency(creditValue);
    if (parsedCreditValue <= 0) {
      const msg = 'O valor do crédito deve ser maior que zero.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Registrar a comissão
      const initialInstallments: Record<string, any> = {};
      for (let i = 1; i <= 15; i++) { initialInstallments[i] = { status: 'Pendente' }; }

      const baseCommissionValue = parsedCreditValue * 0.05; // Example: 5% of credit value
      const consultantShare = baseCommissionValue * 0.7; // Example: 70% for consultant
      const managerShare = baseCommissionValue * 0.2; // Example: 20% for manager
      const angelShare = 0; // Anjo removido da seleção, então 0

      const commissionPayload = {
        date: saleDate,
        clientName: lead.name || 'Cliente Desconhecido',
        type: saleType,
        group: group.trim(),
        quota: quota.trim(),
        consultant: user.name || 'N/A', // Automaticamente o usuário logado
        managerName: 'N/A', // Padrão para N/A
        angelName: undefined, // Padrão para undefined
        pv: lead.data?.pv || 'Não Informado', // Use PV do lead se existir
        value: parsedCreditValue,
        taxRate: 0, // Imposto removido, então 0
        netValue: (consultantShare + managerShare + angelShare), // Ajustado para não considerar imposto
        installments: 15,
        status: 'Em Andamento',
        installmentDetails: initialInstallments,
        consultantValue: consultantShare,
        managerValue: managerShare,
        angelValue: angelShare,
        receivedValue: 0, // Will be updated as installments are paid
      };

      await addCommission(commissionPayload);

      // 2. Mover o lead para a etapa "Vendido"
      await updateCrmLeadStage(lead.id, wonStage.id);

      toast.success(`Venda de ${lead.name} registrada e lead movido para "Vendido"!`);
      onClose();
    } catch (err: any) {
      console.error("Erro ao registrar venda:", err);
      const msg = err.message || 'Falha ao registrar venda.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6 z-[9999]">
        <DialogHeader>
          <DialogTitle>Registrar Venda para: {lead.name}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da venda para registrar a comissão e mover o lead.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="creditValue">Valor do Crédito (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="creditValue"
                    type="text"
                    value={creditValue}
                    onChange={(e) => formatAndSetCurrency(e.target.value)}
                    required
                    className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="group">Grupo</Label>
                  <Input
                    id="group"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Ex: 5025"
                  />
                </div>
                <div>
                  <Label htmlFor="quota">Cota</Label>
                  <Input
                    id="quota"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                    required
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    placeholder="Ex: 150"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="saleDate">Data da Venda</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div>
                <Label>Tipo de Venda</Label>
                <div className="flex space-x-2 mt-1">
                  <Button
                    type="button"
                    variant={saleType === 'Imóvel' ? 'default' : 'outline'}
                    onClick={() => setSaleType('Imóvel')}
                    className={`flex-1 flex items-center justify-center space-x-2 ${saleType === 'Imóvel' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}
                  >
                    <Home className="w-4 h-4" /> <span>Imóvel</span>
                  </Button>
                  <Button
                    type="button"
                    variant={saleType === 'Veículo' ? 'default' : 'outline'}
                    onClick={() => setSaleType('Veículo')}
                    className={`flex-1 flex items-center justify-center space-x-2 ${saleType === 'Veículo' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}
                  >
                    <Car className="w-4 h-4" /> <span>Veículo</span>
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm font-medium text-red-800 dark:text-red-200 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Registrando...' : 'Registrar Venda'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};