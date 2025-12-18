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

  const wonStage = useMemo(() => {
    return crmStages.find(stage => stage.is_won && stage.is_active);
  }, [crmStages]);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Prévia') || m.roles.includes('Autorizado')) && m.name.trim() !== '');
  }, [teamMembers]);
  const managers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && m.roles.includes('Gestor') && m.name.trim() !== '');
  }, [teamMembers]);
  const angels = useMemo(() => {
    return teamMembers.filter(m => m.isActive && m.roles.includes('Anjo') && m.name.trim() !== '');
  }, [teamMembers]);

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

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-brand-500" />
                  Equipe Envolvida
                </h4>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="consultant">Consultor (Prévia/Autorizado)</Label>
                    <Select value={selectedConsultant} onValueChange={setSelectedConsultant} required>
                      <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Selecione o Consultor" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                        {consultants.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="manager">Gestor (Opcional)</Label>
                    <Select value={selectedManager} onValueChange={setSelectedManager}>
                      <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Selecione o Gestor" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                        <SelectItem value="Nenhum">Nenhum</SelectItem> {/* Usar um valor distinto para 'Nenhum' */}
                        {managers.map(m => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                    <div><span className="block font-medium text-gray-900 dark:text-white">Existe Anjo?</span></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={hasAngel} onChange={() => setHasAngel(!hasAngel)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
                    </label>
                  </div>
                  {hasAngel && (
                    <div>
                      <Label htmlFor="angel">Anjo</Label>
                      <Select value={selectedAngel} onValueChange={setSelectedAngel} required={hasAngel}>
                        <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Selecione o Anjo" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                          {angels.map(a => (
                            <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="taxRate">Imposto (%)</Label>
                    <Input
                      id="taxRate"
                      type="text"
                      value={taxRateInput}
                      onChange={(e) => setTaxRateInput(e.target.value.replace(/[^0-9,]/g, ''))}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      placeholder="Ex: 6"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
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