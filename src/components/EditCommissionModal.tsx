import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, Car, Home, Percent, Plus, Trash2, Users, Wand2 } from 'lucide-react';
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
import toast from 'react-hot-toast';
import { Commission, CommissionRule, TeamMember } from '@/types';

interface EditCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  commissionToEdit: Commission | null;
  onSave: (updatedCommission: Commission) => Promise<void>;
  teamMembers: TeamMember[];
  pvs: string[];
}

type CustomRuleText = {
  id: string;
  startInstallment: string;
  endInstallment: string;
  consultantRate: string;
  managerRate: string;
  angelRate: string;
}

const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

const formatCurrencyInput = (value: string): string => {
  let v = value.replace(/\D/g, '');
  v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  if (v === 'NaN,NaN') v = '';
  return v;
};

export const EditCommissionModal: React.FC<EditCommissionModalProps> = ({
  isOpen,
  onClose,
  commissionToEdit,
  onSave,
  teamMembers,
  pvs,
}) => {
  const [clientName, setClientName] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [saleType, setSaleType] = useState<'Imóvel' | 'Veículo'>('Imóvel');
  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [selectedPV, setSelectedPV] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedAngel, setSelectedAngel] = useState('');
  const [taxRateInput, setTaxRateInput] = useState('6');
  const [creditValue, setCreditValue] = useState('');
  const [hasAngel, setHasAngel] = useState(false);
  const [isCustomRulesMode, setIsCustomRulesMode] = useState(false);
  const [customRules, setCustomRules] = useState<CommissionRule[]>([]);
  const [customRulesText, setCustomRulesText] = useState<CustomRuleText[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = useMemo(() => teamMembers.filter(m => m.isActive), [teamMembers]);
  const consultants = useMemo(() => activeMembers.filter(m => m.roles.includes('Prévia') || m.roles.includes('Autorizado')), [activeMembers]);
  const managers = useMemo(() => activeMembers.filter(m => m.roles.includes('Gestor')), [activeMembers]);
  const angels = useMemo(() => activeMembers.filter(m => m.roles.includes('Anjo')), [activeMembers]);

  useEffect(() => {
    if (isOpen && commissionToEdit) {
      setClientName(commissionToEdit.clientName);
      setSaleDate(commissionToEdit.date);
      setSaleType(commissionToEdit.type);
      setGroup(commissionToEdit.group);
      setQuota(commissionToEdit.quota);
      setSelectedPV(commissionToEdit.pv);
      setSelectedConsultant(commissionToEdit.consultant);
      // Ajuste para o Select do Gestor: se for 'N/A' ou vazio, use 'none'
      setSelectedManager(commissionToEdit.managerName === 'N/A' || !commissionToEdit.managerName ? 'none' : commissionToEdit.managerName);
      setSelectedAngel(commissionToEdit.angelName || '');
      setTaxRateInput(commissionToEdit.taxRate.toString().replace('.', ','));
      setCreditValue(formatCurrencyInput(commissionToEdit.value.toFixed(2).replace('.', ',')));
      setHasAngel(!!commissionToEdit.angelName);
      setIsCustomRulesMode(!!commissionToEdit.customRules && commissionToEdit.customRules.length > 0);

      if (commissionToEdit.customRules && commissionToEdit.customRules.length > 0) {
        setCustomRules(commissionToEdit.customRules);
        setCustomRulesText(commissionToEdit.customRules.map(rule => ({
          id: rule.id,
          startInstallment: rule.startInstallment.toString(),
          endInstallment: rule.endInstallment.toString(),
          consultantRate: rule.consultantRate.toString().replace('.', ','),
          managerRate: rule.managerRate.toString().replace('.', ','),
          angelRate: rule.angelRate.toString().replace('.', ','),
        })));
      } else {
        const defaultRuleId = crypto.randomUUID();
        const defaultRule = { id: defaultRuleId, startInstallment: 1, endInstallment: 15, consultantRate: 0, managerRate: 0, angelRate: 0 };
        const defaultRuleText = { id: defaultRuleId, startInstallment: '1', endInstallment: '15', consultantRate: '0', managerRate: '0', angelRate: '0' };
        setCustomRules([defaultRule]);
        setCustomRulesText([defaultRuleText]);
      }
      setError('');
    }
  }, [isOpen, commissionToEdit]);

  const handleUpdateRuleText = (id: string, field: keyof CustomRuleText, value: string, isDecimal: boolean) => {
    const sanitizedValue = isDecimal
      ? value.replace(/[^0-9,]/g, '').replace(/,(?=.*,)/g, '')
      : value.replace(/[^0-9]/g, '');

    setCustomRulesText(rules => rules.map(r => r.id === id ? { ...r, [field]: sanitizedValue } : r));

    const numericValue = isDecimal
      ? parseFloat(sanitizedValue.replace(',', '.'))
      : parseInt(sanitizedValue, 10);

    setCustomRules(rules => rules.map(r => r.id === id ? { ...r, [field]: isNaN(numericValue) ? 0 : numericValue } : r));
  };

  const handleAddRule = () => {
    const newId = crypto.randomUUID();
    const newRule: CommissionRule = { id: newId, startInstallment: 1, endInstallment: 15, consultantRate: 0, managerRate: 0, angelRate: 0 };
    const newRuleText: CustomRuleText = { id: newId, startInstallment: '1', endInstallment: '15', consultantRate: '0', managerRate: '0', angelRate: '0' };
    setCustomRules(rules => [...rules, newRule]);
    setCustomRulesText(rules => [...rules, newRuleText]);
  };

  const handleRemoveRule = (id: string) => {
    setCustomRules(rules => rules.filter(r => r.id !== id));
    setCustomRulesText(rules => rules.filter(r => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = [];
    const credit = parseCurrency(creditValue);
    if (!credit) errors.push("Valor do Crédito");
    if (!clientName.trim()) errors.push("Nome do Cliente");
    if (!saleDate) errors.push("Data da Venda");
    if (!selectedPV) errors.push("Ponto de Venda (PV)");
    if (!group.trim()) errors.push("Grupo");
    if (!quota.trim()) errors.push("Cota");
    if (!selectedConsultant) errors.push("Prévia/Autorizado");

    if (errors.length > 0) {
      setError(`Por favor, preencha os seguintes campos obrigatórios: ${errors.join(', ')}.`);
      return;
    }

    if (!commissionToEdit) {
      setError("Erro: Comissão para editar não encontrada.");
      return;
    }

    setIsSaving(true);
    try {
      const taxValue = parseFloat(taxRateInput.replace(',', '.')) || 0;

      const updatedCommission: Commission = {
        ...commissionToEdit,
        clientName: clientName.trim(),
        date: saleDate,
        type: saleType,
        group: group.trim(),
        quota: quota.trim(),
        pv: selectedPV,
        consultant: selectedConsultant,
        // Ajuste para o Select do Gestor: se for 'none', salve como 'N/A'
        managerName: selectedManager === 'none' ? 'N/A' : selectedManager,
        angelName: hasAngel ? selectedAngel : undefined,
        value: credit,
        taxRate: taxValue,
        customRules: isCustomRulesMode ? customRules : undefined,
        // netValue, consultantValue, managerValue, angelValue, status will be recalculated by parent
      };

      await onSave(updatedCommission);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar comissão:", err);
      setError(err.message || 'Falha ao salvar a comissão.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !commissionToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Editar Comissão: {commissionToEdit.clientName}</DialogTitle>
          <DialogDescription>
            Altere as informações da venda e as regras de comissão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="saleDate">Data da Venda *</Label>
                <Input id="saleDate" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div>
                <Label htmlFor="saleType">Tipo de Venda *</Label>
                <Select value={saleType} onValueChange={(value: 'Imóvel' | 'Veículo') => setSaleType(value)} required>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="Imóvel">Imóvel</SelectItem>
                    <SelectItem value="Veículo">Veículo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="group">Grupo *</Label>
                  <Input id="group" value={group} onChange={e => setGroup(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
                <div>
                  <Label htmlFor="quota">Cota *</Label>
                  <Input id="quota" value={quota} onChange={e => setQuota(e.target.value)} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </div>
              <div>
                <Label htmlFor="selectedPV">Ponto de Venda (PV) *</Label>
                <Select value={selectedPV} onValueChange={setSelectedPV} required>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o PV" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    {pvs.map(pv => <SelectItem key={pv} value={pv}>{pv}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="selectedConsultant">Prévia/Autorizado *</Label>
                <Select value={selectedConsultant} onValueChange={setSelectedConsultant} required>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o Consultor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    {consultants.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="selectedManager">Gestor</Label>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione o Gestor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    <SelectItem value="none">Nenhum</SelectItem> {/* Corrigido: valor não vazio */}
                    {managers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taxRateInput">Imposto (%)</Label>
                <Input id="taxRateInput" type="text" value={taxRateInput} onChange={e => setTaxRateInput(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="creditValue">Valor do Crédito (R$) *</Label>
                <Input id="creditValue" type="text" value={creditValue} onChange={e => setCreditValue(formatCurrencyInput(e.target.value))} required className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                <div><span className="block font-medium text-gray-900 dark:text-white">Existe Anjo?</span></div>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={hasAngel} onChange={() => setHasAngel(!hasAngel)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div></label>
              </div>
              <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div><span className="block font-medium text-blue-900 dark:text-blue-200">Personalizar Regras?</span></div>
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isCustomRulesMode} onChange={() => setIsCustomRulesMode(!isCustomRulesMode)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div></label>
              </div>

              {isCustomRulesMode && (
                <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Editor de Regras Personalizadas</h3>
                  <div className="grid grid-cols-12 gap-2 items-center mb-2">
                    <div className="col-span-4 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Parcelas</div>
                    <div className="col-span-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Consultor</div>
                    <div className="col-span-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Gestor</div>
                    <div className="col-span-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Anjo</div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="space-y-2">
                    {customRulesText.map((rule) => (
                      <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 flex items-center gap-1">
                          <Input type="text" inputMode="numeric" placeholder="De" value={rule.startInstallment} onChange={e => handleUpdateRuleText(rule.id, 'startInstallment', e.target.value, false)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" />
                          <span className="text-xs">-</span>
                          <Input type="text" inputMode="numeric" placeholder="Até" value={rule.endInstallment} onChange={e => handleUpdateRuleText(rule.id, 'endInstallment', e.target.value, false)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" />
                        </div>
                        <div className="col-span-2"><Input type="text" inputMode="decimal" placeholder="Cons %" value={rule.consultantRate} onChange={e => handleUpdateRuleText(rule.id, 'consultantRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" /></div>
                        <div className="col-span-2"><Input type="text" inputMode="decimal" placeholder="Gestor %" value={rule.managerRate} onChange={e => handleUpdateRuleText(rule.id, 'managerRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" /></div>
                        <div className="col-span-2"><Input type="text" inputMode="decimal" placeholder="Anjo %" disabled={!hasAngel} value={rule.angelRate} onChange={e => handleUpdateRuleText(rule.id, 'angelRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded disabled:bg-gray-100 dark:disabled:bg-slate-800" /></div>
                        <div className="col-span-2 flex justify-end"><Button type="button" onClick={() => handleRemoveRule(rule.id)} variant="ghost" size="icon" className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={handleAddRule} variant="ghost" className="text-xs text-blue-600 font-semibold mt-2 flex items-center"><Plus className="w-3 h-3 mr-1" />Adicionar Faixa</Button>
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2 px-6 flex items-center"><X className="w-4 h-4 mr-2" />{error}</p>}
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>Salvar Alterações</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};