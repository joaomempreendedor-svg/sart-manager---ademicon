import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CrmLead, CrmStage } from '@/types';
import { X, Save, Loader2, DollarSign, Calendar, MessageSquare, Users, Home, Car } from 'lucide-react';
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
  const { addCommission, updateCrmLeadStage, crmStages, teamMembers, pvs } = useApp();

  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [creditValue, setCreditValue] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState<'Imóvel' | 'Veículo'>('Imóvel');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedAngel, setSelectedAngel] = useState('');
  const [hasAngel, setHasAngel] = useState(false);
  const [taxRateInput, setTaxRateInput] = useState('6'); // Default tax rate
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  console.log("SaleModal is rendering. isOpen:", isOpen, "Lead:", lead?.name);

  const wonStage = useMemo(() => {
    return crmStages.find(stage => stage.is_won && stage.is_active);
  }, [crmStages]);

  const consultants = useMemo(() => teamMembers.filter(m => m.isActive && (m.roles.includes('Prévia') || m.roles.includes('Autorizado'))), [teamMembers]);
  const managers = useMemo(() => teamMembers.filter(m => m.isActive && m.roles.includes('Gestor')), [teamMembers]);
  const angels = useMemo(() => teamMembers.filter(m => m.isActive && m.roles.includes('Anjo')), [teamMembers]);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with lead data if available
      setGroup(lead.data?.group || '');
      setQuota(lead.data?.quota || '');
      setCreditValue(lead.data?.proposal_value ? (lead.data.proposal_value / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') : '');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSaleType('Imóvel'); // Default to Imóvel
      setSelectedConsultant(user?.name || ''); // Pre-fill with current user as consultant
      setSelectedManager('');
      setSelectedAngel('');
      setHasAngel(false);
      setTaxRateInput('6');
      setError('');
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
      setError('Usuário não autenticado.');
      return;
    }
    if (!wonStage) {
      setError("A etapa 'Vendido' (Ganha) não está configurada ou ativa no CRM. Por favor, contate seu gestor.");
      return;
    }
    if (!group.trim() || !quota.trim() || !creditValue.trim() || !saleDate.trim() || !selectedConsultant.trim()) {
      setError('Grupo, Cota, Valor do Crédito, Data da Venda e Consultor são obrigatórios.');
      return;
    }
    if (hasAngel && !selectedAngel.trim()) {
      setError('Selecione o Anjo ou desative a opção "Existe Anjo?".');
      return;
    }

    const parsedCreditValue = parseCurrency(creditValue);
    if (parsedCreditValue <= 0) {
      setError('O valor do crédito deve ser maior que zero.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Registrar a comissão
      const taxValue = parseFloat(taxRateInput.replace(',', '.')) || 0;
      const initialInstallments: Record<string, any> = {};
      for (let i = 1; i <= 15; i++) { initialInstallments[i] = { status: 'Pendente' }; }

      // Simplified commission calculation for now, assuming default rules
      // In a real scenario, this would involve more complex logic or a dedicated function
      const baseCommissionValue = parsedCreditValue * 0.05; // Example: 5% of credit value
      const consultantShare = baseCommissionValue * 0.7; // Example: 70% for consultant
      const managerShare = baseCommissionValue * 0.2; // Example: 20% for manager
      const angelShare = hasAngel ? baseCommissionValue * 0.1 : 0; // Example: 10% for angel

      const commissionPayload = {
        date: saleDate,
        clientName: lead.name || 'Cliente Desconhecido',
        type: saleType,
        group: group.trim(),
        quota: quota.trim(),
        consultant: selectedConsultant.trim(),
        managerName: selectedManager.trim() || 'N/A',
        angelName: hasAngel ? selectedAngel.trim() : undefined,
        pv: lead.data?.pv || 'Não Informado', // Use PV do lead se existir
        value: parsedCreditValue,
        taxRate: taxValue,
        netValue: (consultantShare + managerShare + angelShare) * (1 - (taxValue / 100)),
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

      onClose();
    } catch (err: any) {
      console.error("Erro ao registrar venda:", err);
      setError(err.message || 'Falha ao registrar venda.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    console.log("SaleModal is NOT open, returning null.");
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6 z-[9999]">
        <DialogHeader>
          <DialogTitle>Registrar Venda para: {lead.name}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da venda para registrar a comissão e mover o lead.
          </DialogDescription>
        </DialogHeader>
        
        {/* Conteúdo simplificado para depuração */}
        <div className="py-4 text-center text-lg font-bold text-green-600 dark:text-green-400">
          Olá do Modal de Venda! Se você está vendo isso, o modal está abrindo.
        </div>
        {/* Fim do conteúdo simplificado */}

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};