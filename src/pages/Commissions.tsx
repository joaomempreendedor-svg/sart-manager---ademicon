import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Commission, CommissionStatus, CommissionRule, InstallmentStatus, InstallmentInfo, CommissionReport, CutoffPeriod } from '@/types';
import { Trash2, Search, DollarSign, Calendar, Calculator, Save, Table as TableIcon, Car, Home, ChevronDown, MapPin, Percent, Filter, XCircle, Crown, Plus, Wand2, Loader2, FileText, Download, CheckCircle2 as MarkAllPaidIcon, Edit2, CalendarCheck, TrendingUp, Settings2, AlertTriangle, Link, Copy, Upload, Paperclip, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { EditCommissionModal } from '@/components/EditCommissionModal';
import { MarkInstallmentRangeModal } from '@/components/MarkInstallmentRangeModal';
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOverallStatus } from '@/utils/commissionUtils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => {
  const v = Number.isFinite(value) ? value : 0;
  const decimals = v < 0.1 ? 5 : v < 1 ? 4 : 1;
  return v.toFixed(decimals).replace('.', ',') + '%';
};

const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  let v = value.replace(/\D/g, '');
  if (!v) return '';
  v = v.replace(/^0+/, '');
  if (v.length === 0) return '0,00';
  if (v.length === 1) return `0,0${v}`;
  if (v.length === 2) return `0,${v}`;
  const integerPart = v.slice(0, -2);
  const centsPart = v.slice(-2);
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedIntegerPart},${centsPart}`;
};

const DEFAULT_RULES = {
  consultant: { p1_10: 0.001288, p11_13: 0.002374, p15: 0.003 },
  manager: {
    noAngel: { p1_10: 0.000322, p11_13: 0.000593 },
    withAngel: { p1_10: 0.000194, p11_13: 0.000356 }
  },
  angel: { p1_10: 0.0001288, p11_13: 0.0002374 }
};

const MONTHLY_CUTOFF_DAYS: Record<number, number> = {
  1: 19, 2: 18, 3: 19, 4: 19, 5: 19, 6: 17, 7: 19, 8: 19, 9: 19, 10: 19, 11: 19, 12: 19,
};

const getInstallmentStatusColor = (status: InstallmentStatus) => {
  switch (status) {
    case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'Pago': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case 'Atraso': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'Cancelado': return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300 border-gray-200 dark:border-slate-700';
    default: return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300 border-gray-200 dark:border-slate-700';
  }
};

type CustomRuleText = {
  id: string;
  startInstallment: string;
  endInstallment: string;
  consultantRate: string;
  managerRate: string;
  angelRate: string;
};

interface DetailedInstallment {
  commission: Commission;
  installmentNumber: string;
  values: { cons: number; man: number; angel: number; };
  creditValue: number;
  saleDate: string;
}

export const Commissions = () => {
  const { user } = useAuth();
  const {
    commissions,
    addCommission,
    updateCommission,
    deleteCommission,
    teamMembers,
    pvs,
    addPV,
    updateInstallmentStatus,
    cutoffPeriods,
    addCutoffPeriod,
    updateCutoffPeriod,
    deleteCutoffPeriod,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'reports' | 'links'>('calculator');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAngelMode, setIsAngelMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterConsultant, setFilterConsultant] = useState<string[]>([]);
  const [filterAngel, setFilterAngel] = useState<string[]>([]);
  const [filterPV, setFilterPV] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  const [creditValue, setCreditValue] = useState<string>('');
  const [hasAngel, setHasAngel] = useState(false);
  const [isCustomRulesMode, setIsCustomRulesMode] = useState(false);

  const [customRules, setCustomRules] = useState<CommissionRule[]>([]);
  const [customRulesText, setCustomRulesText] = useState<CustomRuleText[]>([]);

  const [clientName, setClientName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState<'Imóvel' | 'Veículo'>('Imóvel');
  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [selectedPV, setSelectedPV] = useState('default-pv');
  const [selectedConsultant, setSelectedConsultant] = useState('default-consultant');
  const [selectedManager, setSelectedManager] = useState('default-manager');
  const [selectedAngel, setSelectedAngel] = useState('default-angel');
  const [taxRateInput, setTaxRateInput] = useState('6');

  const [editingInstallment, setEditingInstallment] = useState<{
    commissionId: string;
    number: number;
    clientName: string;
    saleType: 'Imóvel' | 'Veículo';
  } | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [calculatedCompetence, setCalculatedCompetence] = useState('');

  const [isEditCommissionModalOpen, setIsEditCommissionModalOpen] = useState(false);
  const [commissionToEdit, setCommissionToEdit] = useState<Commission | null>(null);

  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [selectedCommissionForRange, setSelectedCommissionForRange] = useState<Commission | null>(null);

  const [isQuickPayModalOpen, setIsQuickPayModalOpen] = useState(false);
  const [quickPayCommission, setQuickPayCommission] = useState<Commission | null>(null);
  const [quickPayInstallment, setQuickPayInstallment] = useState<string>('');

  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportConsultant, setReportConsultant] = useState<string[]>([]);
  const [reportManager, setReportManager] = useState<string[]>([]);
  const [reportAngel, setReportAngel] = useState<string[]>([]);
  const [reportPV, setReportPV] = useState<string[]>([]);
  const [reportData, setReportData] = useState<{
    month: string;
    totalCommissions: { consultant: number; manager: number; angel: number; total: number; };
    detailedInstallments: DetailedInstallment[];
  } | null>(null);

  const emptyPeriod: Omit<CutoffPeriod, 'id' | 'db_id'> = {
    name: '',
    startDate: '',
    endDate: '',
    competenceMonth: '',
  };
  const [showCutoffManager, setShowCutoffManager] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Omit<CutoffPeriod, 'id' | 'db_id'>>(emptyPeriod);
  const [editingPeriod, setEditingPeriod] = useState<CutoffPeriod | null>(null);
  const [cutoffError, setCutoffError] = useState<string | null>(null);

  const calculateCompetenceMonth = useMemo(() => (paidDate: string): string => {
    const date = new Date(paidDate + 'T00:00:00');

    const period = cutoffPeriods.find(p => {
      const start = new Date(p.startDate + 'T00:00:00');
      const end = new Date(p.endDate + 'T00:00:00');
      return date >= start && date <= end;
    });

    if (period) {
      return period.competenceMonth;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const cutoffDay = MONTHLY_CUTOFF_DAYS[month] || 19;
    const competenceDate = new Date(date);
    competenceDate.setFullYear(date.getFullYear());
    competenceDate.setMonth(date.getMonth());
    competenceDate.setDate(date.getDate());

    if (day <= cutoffDay) {
      competenceDate.setMonth(competenceDate.getMonth() + 1);
    } else {
      competenceDate.setMonth(competenceDate.getMonth() + 2);
    }

    const compYear = competenceDate.getFullYear();
    const compMonth = String(competenceDate.getMonth() + 1).padStart(2, '0');
    return `${compYear}-${compMonth}`;
  }, [cutoffPeriods]);

  const resetCalculatorForm = () => {
    setCreditValue('');
    setClientName('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleType('Imóvel');
    setGroup('');
    setQuota('');
    setSelectedPV('default-pv');
    setSelectedConsultant('default-consultant');
    setSelectedManager('default-manager');
    setSelectedAngel('default-angel');
    setTaxRateInput('6');
    setHasAngel(false);
    setIsCustomRulesMode(false);

    const defaultRuleId = crypto.randomUUID();
    const defaultRule = { id: defaultRuleId, startInstallment: 1, endInstallment: 15, consultantRate: 0, managerRate: 0, angelRate: 0 };
    const defaultRuleText = { id: defaultRuleId, startInstallment: '1', endInstallment: '15', consultantRate: '0', managerRate: '0', angelRate: '0' };
    setCustomRules([defaultRule]);
    setCustomRulesText([defaultRuleText]);
  };

  useEffect(() => {
    resetCalculatorForm();
  }, []);

  useEffect(() => {
    setEditingInstallment(null);
    setPaymentDate('');
    setCalculatedCompetence('');
    setIsEditCommissionModalOpen(false);
    setCommissionToEdit(null);
    setIsRangeModalOpen(false);
    setSelectedCommissionForRange(null);
    setIsQuickPayModalOpen(false);
    setQuickPayCommission(null);
    setQuickPayInstallment('');
  }, [activeTab]);

  const consultantNames = useMemo(() => {
    const fromCommissions = new Set<string>();
    commissions.forEach(c => { if (c.consultant) fromCommissions.add(c.consultant); });
    const fromTeam = teamMembers
      .filter(m => m.isActive && !m.roles?.includes('ANJO') && !m.roles?.includes('SECRETARIA'))
      .map(m => m.name);
    const all = new Set([...fromCommissions, ...fromTeam]);
    return Array.from(all).sort();
  }, [commissions, teamMembers]);

  const getCommissionConferenceUrl = (name: string) => {
    if (!user) return '';
    return `${window.location.origin}${window.location.pathname}#/comissoes/${user.id}/${encodeURIComponent(name)}`;
  };

  const handleCopyLink = async (name: string) => {
    const url = getCommissionConferenceUrl(name);
    await navigator.clipboard.writeText(url);
    toast.success(`Link de ${name} copiado!`);
  };

  const angelNames = useMemo(() => {
    const names = new Set<string>();
    commissions.forEach(c => { if (c.angelName) names.add(c.angelName); });
    return Array.from(names).sort();
  }, [commissions]);

  const [receipts, setReceipts] = useState<{ id: string; consultant_name: string; competence_month: string; file_url: string; file_name: string }[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadReceipts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payment_receipts')
      .select('id, consultant_name, competence_month, file_url, file_name')
      .eq('gestor_id', user.id);
    setReceipts(data || []);
  };

  useEffect(() => { loadReceipts(); }, [user]);

  const handleUploadReceipt = async (consultantName: string, competenceMonth: string, file: File) => {
    if (!user) return;
    const key = `${consultantName}-${competenceMonth}`;
    setUploadingReceipt(key);

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${consultantName}/${competenceMonth}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-receipts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      toast.error(`Erro ao enviar: ${uploadError.message}`);
      setUploadingReceipt(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(filePath);

    await supabase.from('payment_receipts')
      .delete()
      .eq('gestor_id', user.id)
      .eq('consultant_name', consultantName)
      .eq('competence_month', competenceMonth);

    const { error: dbError } = await supabase.from('payment_receipts').insert({
      gestor_id: user.id,
      consultant_name: consultantName,
      competence_month: competenceMonth,
      file_url: urlData.publicUrl,
      file_name: file.name,
    });

    if (dbError) {
      toast.error(`Erro ao salvar: ${dbError.message}`);
    } else {
      toast.success(`Comprovante de ${consultantName} salvo!`);
      loadReceipts();
    }
    setUploadingReceipt(null);
  };

  const handleDeleteReceipt = async (receipt: { id: string; file_url: string }) => {
    if (!window.confirm('Excluir este comprovante?')) return;
    const filePath = receipt.file_url.split('/payment-receipts/')[1];
    if (filePath) await supabase.storage.from('payment-receipts').remove([decodeURIComponent(filePath)]);
    await supabase.from('payment_receipts').delete().eq('id', receipt.id);
    toast.success('Comprovante excluído.');
    loadReceipts();
  };

  const getReceiptFor = (consultantName: string, competenceMonth: string) => {
    return receipts.find(r => r.consultant_name === consultantName && r.competence_month === competenceMonth);
  };

  const reportConsultantSummary = useMemo(() => {
    if (!reportData) return [];
    const map = new Map<string, { name: string; total: number }>();
    reportData.detailedInstallments.forEach(item => {
      const name = item.commission.consultant;
      const existing = map.get(name) || { name, total: 0 };
      existing.total += item.values.cons;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportData]);

  const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  const simulation = useMemo(() => {
    const credit = parseCurrency(creditValue);
    const calcPercent = (pct: number) => credit * (pct / 100);
    const calcFraction = (fraction: number) => credit * fraction;

    let breakdown: any[] = [];
    let totals = { consultant: 0, manager: 0, angel: 0, grandTotal: 0 };

    if (isCustomRulesMode) {
      customRules.forEach(rule => {
        const numInstallments = (rule.endInstallment - rule.startInstallment + 1);
        const consVal = calcPercent(rule.consultantRate) * numInstallments;
        const manVal = calcPercent(rule.managerRate) * numInstallments;
        const angelVal = hasAngel ? calcPercent(rule.angelRate) * numInstallments : 0;

        totals.consultant += consVal;
        totals.manager += manVal;
        totals.angel += angelVal;

        breakdown.push({
          label: `Parcelas ${rule.startInstallment} a ${rule.endInstallment}`,
          count: numInstallments,
          cons: { rate: rule.consultantRate, val: calcPercent(rule.consultantRate) },
          man: { rate: rule.managerRate, val: calcPercent(rule.managerRate) },
          angel: { rate: hasAngel ? rule.angelRate : 0, val: hasAngel ? calcPercent(rule.angelRate) : 0 }
        });
      });
    } else {
      const manRules = hasAngel ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;

      const p1_10 = {
        label: 'Parcelas 1 a 10', count: 10,
        cons: { rate: DEFAULT_RULES.consultant.p1_10 * 100, val: calcFraction(DEFAULT_RULES.consultant.p1_10) },
        man: { rate: manRules.p1_10 * 100, val: calcFraction(manRules.p1_10) },
        angel: { rate: hasAngel ? DEFAULT_RULES.angel.p1_10 * 100 : 0, val: hasAngel ? calcFraction(DEFAULT_RULES.angel.p1_10) : 0 }
      };
      const p11_13 = {
        label: 'Parcelas 11 a 13', count: 3,
        cons: { rate: DEFAULT_RULES.consultant.p11_13 * 100, val: calcFraction(DEFAULT_RULES.consultant.p11_13) },
        man: { rate: manRules.p11_13 * 100, val: calcFraction(manRules.p11_13) },
        angel: { rate: hasAngel ? DEFAULT_RULES.angel.p11_13 * 100 : 0, val: hasAngel ? calcFraction(DEFAULT_RULES.angel.p11_13) : 0 }
      };
      const p15 = {
        label: 'Parcela 15', count: 1,
        cons: { rate: DEFAULT_RULES.consultant.p15 * 100, val: calcFraction(DEFAULT_RULES.consultant.p15) },
        man: { rate: 0, val: 0 }, angel: { rate: 0, val: 0 }
      };

      breakdown = [p1_10, p11_13, p15];
      totals.consultant = (p1_10.cons.val * 10) + (p11_13.cons.val * 3) + p15.cons.val;
      totals.manager = (p1_10.man.val * 10) + (p11_13.man.val * 3);
      totals.angel = hasAngel ? (p1_10.angel.val * 10) + (p11_13.angel.val * 3) : 0;
    }

    totals.grandTotal = totals.consultant + totals.manager + totals.angel;
    return { credit, breakdown, totals };
  }, [creditValue, hasAngel, isCustomRulesMode, customRules]);

  const getInstallmentValues = (commission: Commission, installment: number) => {
    const taxMultiplier = 1 - ((commission.taxRate || 0) / 100);
    const credit = commission.value;
    const hasAngelCommission = !!commission.angelName;

    let consRate = 0, manRate = 0, angelRate = 0;
    let ratesArePercent = false;

    if (commission.customRules) {
      const rule = commission.customRules.find(r => installment >= r.startInstallment && installment <= r.endInstallment);
      if (rule) {
        consRate = rule.consultantRate;
        manRate = rule.managerRate;
        angelRate = hasAngelCommission ? rule.angelRate : 0;
      }
      ratesArePercent = true;
    } else {
      const manRules = hasAngelCommission ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;
      if (installment <= 10) { consRate = DEFAULT_RULES.consultant.p1_10; manRate = manRules.p1_10; if (hasAngelCommission) angelRate = DEFAULT_RULES.angel.p1_10; }
      else if (installment <= 13) { consRate = DEFAULT_RULES.consultant.p11_13; manRate = manRules.p11_13; if (hasAngelCommission) angelRate = DEFAULT_RULES.angel.p11_13; }
      else if (installment === 15) { consRate = DEFAULT_RULES.consultant.p15; }
      ratesArePercent = false;
    }

    const consVal = credit * (ratesArePercent ? (consRate / 100) : consRate) * taxMultiplier;
    const manVal = credit * (ratesArePercent ? (manRate / 100) : manRate) * taxMultiplier;
    const angelVal = credit * (ratesArePercent ? (angelRate / 100) : angelRate) * taxMultiplier;

    return { cons: consVal, man: manVal, angel: angelVal };
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = [];
    const credit = parseCurrency(creditValue);
    if (!credit) errors.push('Valor do Crédito');
    if (!clientName.trim()) errors.push('Nome do Cliente');
    if (!saleDate) errors.push('Data da Venda');
    if (selectedPV === 'default-pv') errors.push('Ponto de Venda (PV)');
    if (!group.trim()) errors.push('Grupo');
    if (!quota.trim()) errors.push('Cota');
    if (selectedConsultant === 'default-consultant') errors.push('Prévia/Autorizado');

    if (errors.length > 0) {
      alert(`Por favor, preencha os seguintes campos obrigatórios:\n\n- ${errors.join('\n- ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const taxValue = parseFloat(taxRateInput.replace(',', '.')) || 0;
      const initialInstallments: Record<string, InstallmentInfo> = {};
      for (let i = 1; i <= 15; i++) {
        initialInstallments[i] = { status: 'Pendente' };
      }

      const payload: Omit<Commission, 'id' | 'db_id' | 'criado_em'> = {
        date: saleDate,
        clientName,
        type: saleType,
        group,
        quota,
        consultant: selectedConsultant,
        managerName: selectedManager === 'default-manager' ? 'N/A' : selectedManager,
        angelName: hasAngel ? (selectedAngel === 'default-angel' ? undefined : selectedAngel) : undefined,
        pv: selectedPV,
        value: credit,
        taxRate: taxValue,
        netValue: simulation.totals.grandTotal * (1 - (taxValue / 100)),
        installments: 15,
        status: 'Em Andamento',
        installmentDetails: initialInstallments,
        consultantValue: simulation.totals.consultant,
        managerValue: simulation.totals.manager,
        angelValue: simulation.totals.angel,
        receivedValue: 0,
        customRules: isCustomRulesMode ? customRules : undefined
      };

      await addCommission(payload);
      toast.success('Venda registrada com sucesso!');
      resetCalculatorForm();
      setActiveTab('history');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de comissão? Esta ação não pode ser desfeita.')) {
      try {
        await deleteCommission(id);
        toast.success('Comissão excluída com sucesso!');
      } catch (error: any) {
        toast.error(`Erro ao excluir comissão: ${error.message}`);
      }
    }
  };

  const handleMarkAllAsPaid = async (commission: Commission) => {
    if (commission.status === 'Concluído') {
      toast('Esta comissão já está marcada como concluída.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja marcar TODAS as 15 parcelas da comissão de "${commission.clientName}" como PAGAS? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const updatedInstallmentDetails: Record<string, InstallmentInfo> = {};
      for (let i = 1; i <= 15; i++) {
        updatedInstallmentDetails[i.toString()] = { status: 'Pago' };
      }

      await updateCommission(commission.db_id!, {
        installmentDetails: updatedInstallmentDetails,
        status: 'Concluído',
      });
      toast.success(`Comissão de "${commission.clientName}" marcada como CONCLUÍDA!`);
    } catch (error: any) {
      toast.error(`Erro ao marcar comissão como concluída: ${error.message}`);
    }
  };

  const handleSaveInstallmentRange = async (commissionId: string, start: number, end: number) => {
    const commission = commissions.find(c => c.id === commissionId);
    if (!commission) {
      toast.error('Comissão não encontrada.');
      return;
    }
    if (!commission.db_id) {
      toast.error('ID do banco de dados da comissão não encontrado. Não é possível atualizar.');
      return;
    }

    const updatedInstallmentDetails = { ...commission.installmentDetails };
    for (let i = start; i <= end; i++) {
      updatedInstallmentDetails[i.toString()] = { status: 'Pago' };
    }

    await updateCommission(commission.db_id, {
      installmentDetails: updatedInstallmentDetails,
      status: getOverallStatus(updatedInstallmentDetails),
    });
    toast.success(`Parcelas ${start} a ${end} da comissão de "${commission.clientName}" marcadas como PAGAS!`);
    setIsRangeModalOpen(false);
    setSelectedCommissionForRange(null);
  };

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

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterConsultant([]);
    setFilterAngel([]);
    setFilterPV([]);
    setFilterStatus([]);
    setSearchTerm('');
  };

  const handleAddPV = () => {
    const newPVName = prompt('Digite o nome do novo Ponto de Venda (PV):');
    if (newPVName && newPVName.trim()) {
      addPV(newPVName.trim());
      setSelectedPV(newPVName.trim());
    }
  };

  const activeMembers = useMemo(() => teamMembers.filter(m => m.isActive), [teamMembers]);
  const consultants = useMemo(
    () => teamMembers
      .filter(m => m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO'))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      }),
    [teamMembers],
  );
  const consultantOptions = useMemo(
    () => consultants.map(c => ({ value: c.name, label: c.isActive ? c.name : `${c.name} (Inativo)` })),
    [consultants],
  );
  const managers = activeMembers.filter(m => m.roles.includes('GESTOR'));
  const angels = activeMembers.filter(m => m.roles.includes('ANJO'));

  const filteredHistory = useMemo(() => {
    const startFilterDate = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
    const endFilterDate = filterEndDate ? new Date(filterEndDate + 'T00:00:00') : null;
    const term = searchTerm.trim().toLowerCase();

    return commissions.filter(c => {
      if (isAngelMode && !c.angelName) return false;

      const commissionDate = new Date(c.date + 'T00:00:00');
      const overallStatus = getOverallStatus(c.installmentDetails);

      const matchesSearch =
        term === '' ||
        c.clientName.toLowerCase().includes(term) ||
        c.consultant.toLowerCase().includes(term) ||
        c.pv.toLowerCase().includes(term) ||
        (c.group || '').toLowerCase().includes(term) ||
        (c.quota || '').toLowerCase().includes(term);

      const matchesStart = !startFilterDate || commissionDate >= startFilterDate;
      const matchesEnd = !endFilterDate || commissionDate <= endFilterDate;
      const matchesConsultant = filterConsultant.length === 0 || filterConsultant.includes(c.consultant);
      const matchesAngel = filterAngel.length === 0 || (c.angelName && filterAngel.includes(c.angelName));
      const matchesPV = filterPV.length === 0 || filterPV.includes(c.pv);
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(overallStatus);

      return matchesSearch && matchesStart && matchesEnd && matchesConsultant && matchesAngel && matchesPV && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [commissions, searchTerm, filterStartDate, filterEndDate, filterConsultant, filterAngel, filterPV, filterStatus, isAngelMode]);

  const summaryStats = useMemo(() => {
    const totalCommissions = filteredHistory.length;
    let inProgress = 0;
    let delayed = 0;
    let completed = 0;
    let cancelled = 0;
    let nearCompletion = 0;
    let totalValue = 0;

    let inProgressCount = 0;
    let delayedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let nearCompletionCount = 0;

    filteredHistory.forEach(c => {
      const status = getOverallStatus(c.installmentDetails);
      const paidCount = Object.values(c.installmentDetails).filter(s => s.status === 'Pago').length;
      const totalInstallments = 15;
      const progressPercent = (paidCount / totalInstallments) * 100;

      if (status === 'Em Andamento') { inProgress++; inProgressCount++; }
      else if (status === 'Atraso') { delayed++; delayedCount++; }
      else if (status === 'Concluído') { completed++; completedCount++; }
      else if (status === 'Cancelado') { cancelled++; cancelledCount++; }

      if (progressPercent > 70 && progressPercent < 100) {
        nearCompletion++;
        nearCompletionCount++;
      }
      totalValue += c.value;
    });

    return {
      totalCommissions,
      inProgress,
      delayed,
      completed,
      cancelled,
      nearCompletion,
      totalValue,
      inProgressCount,
      delayedCount,
      completedCount,
      cancelledCount,
      nearCompletionCount,
      inProgressPercentage: totalCommissions > 0 ? (inProgress / totalCommissions) * 100 : 0,
      delayedPercentage: totalCommissions > 0 ? (delayed / totalCommissions) * 100 : 0,
      completedPercentage: totalCommissions > 0 ? (completed / totalCommissions) * 100 : 0,
      cancelledPercentage: totalCommissions > 0 ? (cancelled / totalCommissions) * 100 : 0,
      nearCompletionPercentage: totalCommissions > 0 ? (nearCompletion / totalCommissions) * 100 : 0,
    };
  }, [filteredHistory]);

  const formatAndSetCurrency = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatCurrencyInput(e.target.value));
  };

  const handleStatusChange = async (
    commissionId: string,
    installmentNumber: number,
    newStatus: InstallmentStatus,
    clientNameValue: string,
    saleTypeValue: 'Imóvel' | 'Veículo'
  ) => {
    if (newStatus === 'Pago') {
      const today = new Date().toISOString().split('T')[0];
      setEditingInstallment({ commissionId, number: installmentNumber, clientName: clientNameValue, saleType: saleTypeValue });
      setPaymentDate(today);
      setCalculatedCompetence(calculateCompetenceMonth(today));
    } else {
      await updateInstallmentStatus(commissionId, installmentNumber, newStatus);
    }
  };

  const getQuickPayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...cutoffPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const active = sorted.find(p => today >= p.startDate && today <= p.endDate);
    if (active) return active.endDate;
    const next = sorted.find(p => today <= p.startDate);
    if (next) return next.endDate;
    const last = sorted[sorted.length - 1];
    if (last) return last.endDate;
    return today;
  };

  const getNextPendingInstallment = (commission: Commission) => {
    const pending = Object.entries(commission.installmentDetails)
      .filter(([, info]) => info.status === 'Pendente')
      .map(([num]) => parseInt(num, 10))
      .sort((a, b) => a - b);
    return pending.length > 0 ? String(pending[0]) : '';
  };

  const handleQuickPay = async () => {
    if (!quickPayCommission) return;
    const num = parseInt(quickPayInstallment, 10);
    if (!num || num < 1 || num > 15) {
      toast.error('Selecione o número da parcela.');
      return;
    }
    if (!paymentDate) {
      toast.error('Selecione a data de pagamento.');
      return;
    }
    try {
      await updateInstallmentStatus(quickPayCommission.db_id!, num, 'Pago', paymentDate, quickPayCommission.type);
      setIsQuickPayModalOpen(false);
      setQuickPayCommission(null);
      setQuickPayInstallment('');
      setPaymentDate('');
      setCalculatedCompetence('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar parcela como paga.');
    }
  };

  useEffect(() => {
    if (paymentDate && editingInstallment) {
      setCalculatedCompetence(calculateCompetenceMonth(paymentDate));
    }
  }, [paymentDate, editingInstallment, calculateCompetenceMonth]);

  const confirmPayment = async () => {
    if (!editingInstallment) return;

    const installmentToUpdate = { ...editingInstallment };
    const dateOfPayment = paymentDate;
    setEditingInstallment(null);

    try {
      await updateInstallmentStatus(
        installmentToUpdate.commissionId,
        installmentToUpdate.number,
        'Pago',
        dateOfPayment,
        installmentToUpdate.saleType
      );

      setPaymentDate('');
      setCalculatedCompetence('');
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao salvar o pagamento. Por favor, verifique o histórico e tente novamente.');
    }
  };

  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const generateReport = () => {
    const filteredCommissions = commissions.filter(c => {
      if (reportConsultant.length > 0 && !reportConsultant.includes(c.consultant)) return false;
      if (reportManager.length > 0 && !reportManager.includes(c.managerName)) return false;
      if (reportAngel.length > 0 && (!c.angelName || !reportAngel.includes(c.angelName))) return false;
      if (reportPV.length > 0 && !reportPV.includes(c.pv)) return false;
      return true;
    });

    const detailedInstallments: DetailedInstallment[] = [];
    const totalCommissions = { consultant: 0, manager: 0, angel: 0, total: 0 };

    filteredCommissions.forEach(commission => {
      Object.entries(commission.installmentDetails).forEach(([num, info]) => {
        if (info.status === 'Pago' && info.competenceMonth === reportMonth) {
          const values = getInstallmentValues(commission, parseInt(num));
          detailedInstallments.push({
            commission,
            installmentNumber: num,
            values,
            creditValue: commission.value,
            saleDate: commission.date,
          });
          totalCommissions.consultant += values.cons;
          totalCommissions.manager += values.man;
          totalCommissions.angel += values.angel;
        }
      });
    });

    detailedInstallments.sort((a, b) => {
      const paidCountA = Object.values(a.commission.installmentDetails).filter(s => s.status === 'Pago').length;
      const paidCountB = Object.values(b.commission.installmentDetails).filter(s => s.status === 'Pago').length;

      if (paidCountA !== paidCountB) {
        return paidCountB - paidCountA;
      }

      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });

    totalCommissions.total = totalCommissions.consultant + totalCommissions.manager + totalCommissions.angel;

    setReportData({
      month: reportMonth,
      totalCommissions,
      detailedInstallments,
    });
  };

  const handleExportToExcel = () => {
    if (!reportData || reportData.detailedInstallments.length === 0) {
      alert('Não há dados para exportar. Gere um relatório primeiro.');
      return;
    }

    const dataToExport = reportData.detailedInstallments.map(item => ({
      'Data da Venda': item.saleDate ? new Date(item.saleDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
      'Valor do Crédito': item.creditValue,
      'Cliente': item.commission.clientName,
      'Consultor': item.commission.consultant,
      'Gestor': item.commission.managerName,
      'Anjo': item.commission.angelName || 'N/A',
      'Parcela': parseInt(item.installmentNumber),
      'PV': item.commission.pv,
      'Mês Competência': item.commission.installmentDetails[item.installmentNumber].competenceMonth ? formatMonthYear(item.commission.installmentDetails[item.installmentNumber].competenceMonth!) : 'N/A',
      'Valor (Consultor)': item.values.cons,
      'Valor (Gestor)': item.values.man,
      'Valor (Anjo)': item.values.angel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const currencyFormat = 'R$ #,##0.00';
    const currencyCols = ['B', 'J', 'K', 'L'];

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    Object.keys(worksheet).forEach(cellRef => {
      if (cellRef[0] === '!') return;
      const col = cellRef.replace(/[0-9]/g, '');
      if (currencyCols.includes(col)) {
        const cell = worksheet[cellRef];
        if (cell.t === 'n') {
          cell.z = currencyFormat;
        }
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comissões');
    XLSX.writeFile(workbook, `Relatorio_Comissoes_${reportData.month}.xlsx`);
  };

  const handleOpenEditCommissionModal = (commission: Commission) => {
    setCommissionToEdit(commission);
    setIsEditCommissionModalOpen(true);
  };

  const handleUpdateCommission = async (updatedCommission: Commission) => {
    setIsSaving(true);
    try {
      const credit = updatedCommission.value;
      const taxRate = updatedCommission.taxRate || 0;
      const hasAngelCommission = !!updatedCommission.angelName;
      const customRulesValue = updatedCommission.customRules || [];

      const recalculatedTotals = { consultant: 0, manager: 0, angel: 0, grandTotal: 0 };

      if (customRulesValue.length > 0) {
        const pct = (p: number) => credit * (p / 100);
        customRulesValue.forEach(rule => {
          const numInstallments = (rule.endInstallment - rule.startInstallment + 1);
          recalculatedTotals.consultant += pct(rule.consultantRate) * numInstallments;
          recalculatedTotals.manager += pct(rule.managerRate) * numInstallments;
          recalculatedTotals.angel += hasAngelCommission ? pct(rule.angelRate) * numInstallments : 0;
        });
      } else {
        const manRules = hasAngelCommission ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;
        recalculatedTotals.consultant = (credit * DEFAULT_RULES.consultant.p1_10 * 10) +
          (credit * DEFAULT_RULES.consultant.p11_13 * 3) +
          (credit * DEFAULT_RULES.consultant.p15 * 1);
        recalculatedTotals.manager = (credit * manRules.p1_10 * 10) +
          (credit * manRules.p11_13 * 3);
        recalculatedTotals.angel = hasAngelCommission ? ((credit * DEFAULT_RULES.angel.p1_10 * 10) +
          (credit * DEFAULT_RULES.angel.p11_13 * 3)) : 0;
      }

      recalculatedTotals.grandTotal = recalculatedTotals.consultant + recalculatedTotals.manager + recalculatedTotals.angel;

      const finalUpdates: Partial<Commission> = {
        ...updatedCommission,
        netValue: recalculatedTotals.grandTotal * (1 - (taxRate / 100)),
        consultantValue: recalculatedTotals.consultant,
        managerValue: recalculatedTotals.manager,
        angelValue: recalculatedTotals.angel,
        status: getOverallStatus(updatedCommission.installmentDetails),
      };

      await updateCommission(updatedCommission.db_id!, finalUpdates);
      toast.success('Comissão atualizada com sucesso!');
      setIsEditCommissionModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao atualizar comissão.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedPeriods = [...cutoffPeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const validateAndSaveCutoff = async () => {
    setCutoffError(null);
    const periodToSave = editingPeriod ? { ...editingPeriod, ...newPeriod } : { ...newPeriod, id: crypto.randomUUID() };

    if (!periodToSave.name || !periodToSave.startDate || !periodToSave.endDate || !periodToSave.competenceMonth) {
      setCutoffError('Todos os campos são obrigatórios.');
      return;
    }

    const start = new Date(periodToSave.startDate + 'T00:00:00');
    const end = new Date(periodToSave.endDate + 'T00:00:00');
    const competence = new Date(periodToSave.competenceMonth + '-01T00:00:00');

    if (start > end) {
      setCutoffError('A data de início não pode ser posterior à data de fim.');
      return;
    }

    if (competence <= end) {
      setCutoffError('O mês de competência deve ser posterior ao fim do período.');
      return;
    }

    const isOverlapping = cutoffPeriods.some(p => {
      if (editingPeriod && p.id === editingPeriod.id) return false;
      const pStart = new Date(p.startDate + 'T00:00:00');
      const pEnd = new Date(p.endDate + 'T00:00:00');
      return start <= pEnd && end >= pStart;
    });

    if (isOverlapping) {
      setCutoffError('Este período está sobrepondo um período existente.');
      return;
    }

    try {
      if (editingPeriod) {
        await updateCutoffPeriod(editingPeriod.id, newPeriod);
        toast.success('Período de corte atualizado com sucesso!');
      } else {
        await addCutoffPeriod(periodToSave as CutoffPeriod);
        toast.success('Período de corte adicionado com sucesso!');
      }
      setNewPeriod(emptyPeriod);
      setEditingPeriod(null);
    } catch (err: any) {
      setCutoffError(err.message);
    }
  };

  const handleEditCutoff = (period: CutoffPeriod) => {
    setEditingPeriod(period);
    setNewPeriod({
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      competenceMonth: period.competenceMonth,
    });
    setCutoffError(null);
  };

  const cancelEditCutoff = () => {
    setEditingPeriod(null);
    setNewPeriod(emptyPeriod);
    setCutoffError(null);
  };

  const handleDeleteCutoff = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este período?')) {
      await deleteCutoffPeriod(id);
      toast.success('Período de corte excluído com sucesso!');
    }
  };

  const formatDisplayDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  const formatCompetence = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-8 min-h-screen pb-20 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Comissões</h1>
          <p className="text-gray-500 dark:text-gray-400">Simule ganhos, gerencie recebíveis e configure períodos de corte.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-wrap gap-1">
          <button onClick={() => setActiveTab('calculator')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'calculator' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Calculator className="w-4 h-4 mr-2" />Simulador</button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'history' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><TableIcon className="w-4 h-4 mr-2" />Histórico</button>
          <button onClick={() => setActiveTab('reports')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'reports' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><FileText className="w-4 h-4 mr-2" />Relatórios</button>
          <button onClick={() => setActiveTab('links')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'links' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Link className="w-4 h-4 mr-2" />Links</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <button
          onClick={() => setShowCutoffManager(!showCutoffManager)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Settings2 className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Períodos de corte</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure aqui os períodos usados no cálculo automático da competência.
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showCutoffManager ? 'rotate-180' : ''}`} />
        </button>

        {showCutoffManager && (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-slate-900/40 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {editingPeriod ? 'Editando período' : 'Adicionar novo período'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome do período"
                  value={newPeriod.name}
                  onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                />
                <div>
                  <label className="text-xs text-gray-500">Mês de competência</label>
                  <input
                    type="month"
                    value={newPeriod.competenceMonth}
                    onChange={e => setNewPeriod({ ...newPeriod, competenceMonth: e.target.value })}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Data de início</label>
                  <input
                    type="date"
                    value={newPeriod.startDate}
                    onChange={e => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Data de fim</label>
                  <input
                    type="date"
                    value={newPeriod.endDate}
                    onChange={e => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                    className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                  />
                </div>
              </div>

              {cutoffError && (
                <p className="text-red-500 text-sm mt-4 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {cutoffError}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                {editingPeriod && (
                  <button
                    onClick={cancelEditCutoff}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={validateAndSaveCutoff}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  {editingPeriod ? (
                    <>
                      <Save className="w-4 h-4 inline mr-1" />
                      Salvar alterações
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 inline mr-1" />
                      Adicionar período
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Períodos configurados</h3>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                {sortedPeriods.length === 0 ? (
                  <li className="p-6 text-center text-gray-400">
                    Nenhum período configurado. O sistema usará a regra padrão por mês.
                  </li>
                ) : (
                  sortedPeriods.map(p => (
                    <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          De <span className="font-medium">{formatDisplayDate(p.startDate)}</span> até <span className="font-medium">{formatDisplayDate(p.endDate)}</span>
                        </p>
                        <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold">
                          → Competência: {formatCompetence(p.competenceMonth)}
                        </p>
                      </div>
                      <div className="flex items-center opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditCutoff(p)} className="p-2 text-gray-400 hover:text-blue-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCutoff(p.id)} className="p-2 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'calculator' && (
        <div key="calculator-tab-content" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-brand-500" />Entrada de Dados</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Valor do Crédito (R$)</label>
                  <input type="text" className="w-full text-2xl font-bold p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" placeholder="0,00" value={creditValue} onChange={formatAndSetCurrency(setCreditValue)} />
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                  <div><span className="block font-medium text-gray-900 dark:text-white">Existe Anjo?</span><span className="text-xs text-gray-500 dark:text-gray-400">Altera regras do Gestor</span></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={hasAngel} onChange={() => setHasAngel(!hasAngel)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div></label>
                </div>
                <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div><span className="block font-medium text-blue-900 dark:text-blue-200">Personalizar Regras?</span><span className="text-xs text-blue-600 dark:text-blue-400">Definir coeficientes por faixa</span></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isCustomRulesMode} onChange={() => setIsCustomRulesMode(!isCustomRulesMode)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div></label>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Salvar Venda</h3>
                <button type="button" onClick={resetCalculatorForm} className="flex items-center space-x-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                  <XCircle className="w-3 h-3" />
                  <span>Limpar Formulário</span>
                </button>
              </div>
              <form onSubmit={handleSaveCommission} className="space-y-4">
                <input required placeholder="Nome do Cliente" className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={clientName} onChange={e => setClientName(e.target.value)} />
                <div className="flex space-x-2">
                  <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Data da Venda</label><input type="date" required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
                  <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">PV (Ponto de Venda)</label><div className="flex gap-2">
                    <Select value={selectedPV} onValueChange={setSelectedPV} required>
                      <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                        <SelectItem value="default-pv">Selecione...</SelectItem>
                        {pvs.map(pv => <SelectItem key={pv} value={pv}>{pv}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button type="button" onClick={handleAddPV} className="p-2 bg-brand-100 text-brand-700 rounded dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-200" title="Adicionar novo PV"><Plus className="w-5 h-5" /></button></div></div>
                </div>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setSaleType('Imóvel')} className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md text-sm border ${saleType === 'Imóvel' ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-gray-300 dark:border-slate-600 text-gray-500'}`}><Home className="w-4 h-4" /><span>Imóvel</span></button>
                  <button type="button" onClick={() => setSaleType('Veículo')} className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-md text-sm border ${saleType === 'Veículo' ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-gray-300 dark:border-slate-600 text-gray-500'}`}><Car className="w-4 h-4" /><span>Veículo</span></button>
                </div>
                <div className="flex space-x-2">
                  <div className="w-1/3"><label className="text-xs text-gray-500 dark:text-gray-400">Grupo</label><input required placeholder="Ex: 5025" className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={group} onChange={e => setGroup(e.target.value)} /></div>
                  <div className="w-1/3"><label className="text-xs text-gray-500 dark:text-gray-400">Cota</label><input required placeholder="Ex: 150" className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={quota} onChange={e => setQuota(e.target.value)} /></div>
                  <div className="w-1/3 relative"><label className="text-xs text-gray-500 dark:text-gray-400 font-bold text-red-500">Imposto (%)</label><div className="relative"><input type="text" className="w-full border-red-200 dark:border-red-900/50 rounded-md text-sm bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-300 p-2 pl-2" value={taxRateInput} onChange={e => setTaxRateInput(e.target.value)} /><Percent className="w-3 h-3 text-red-400 absolute right-2 top-2.5" /></div></div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-slate-700 space-y-2">
                  <div>
                    <Label htmlFor="selectedConsultant">Prévia/Autorizado *</Label>
                    <Select value={selectedConsultant} onValueChange={setSelectedConsultant} required>
                      <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Selecione o Prévia/Autorizado" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                        <SelectItem value="default-consultant">Selecione o Prévia/Autorizado</SelectItem>
                        {consultants.map(c => <SelectItem key={c.id} value={c.name}>{c.isActive ? c.name : `${c.name} (Inativo)`}</SelectItem>)}
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
                        <SelectItem value="default-manager">Selecione o Gestor</SelectItem>
                        {managers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {hasAngel && (
                    <div>
                      <Label htmlFor="selectedAngel">Anjo</Label>
                      <Select value={selectedAngel} onValueChange={setSelectedAngel} required>
                        <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Selecione o Anjo" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                          <SelectItem value="default-angel">Selecione o Anjo</SelectItem>
                          {angels.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Salvando...</span>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-800">
                        <div className="h-full bg-green-300 animate-pulse"></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Registrar Venda</span>
                    </>
                  )}
                </button>
                {isSaving && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center animate-pulse">
                    ⚡ Salvando no banco de dados... Não feche esta página.
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
                <h2 className="font-bold text-gray-900 dark:text-white">Detalhamento da Simulação (Valores Brutos)</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-600">Base: {creditValue || 'R$ 0,00'}</span>
              </div>

              {isCustomRulesMode && (
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Editor de Regras Personalizadas</h3>
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
                          <input type="text" inputMode="numeric" placeholder="De" value={rule.startInstallment} onChange={e => handleUpdateRuleText(rule.id, 'startInstallment', e.target.value, false)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" />
                          <span className="text-xs">-</span>
                          <input type="text" inputMode="numeric" placeholder="Até" value={rule.endInstallment} onChange={e => handleUpdateRuleText(rule.id, 'endInstallment', e.target.value, false)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" />
                        </div>
                        <div className="col-span-2"><input type="text" inputMode="decimal" placeholder="Cons %" value={rule.consultantRate} onChange={e => handleUpdateRuleText(rule.id, 'consultantRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" /></div>
                        <div className="col-span-2"><input type="text" inputMode="decimal" placeholder="Gestor %" value={rule.managerRate} onChange={e => handleUpdateRuleText(rule.id, 'managerRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded" /></div>
                        <div className="col-span-2"><input type="text" inputMode="decimal" placeholder="Anjo %" disabled={!hasAngel} value={rule.angelRate} onChange={e => handleUpdateRuleText(rule.id, 'angelRate', e.target.value, true)} className="w-full p-1.5 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded disabled:bg-gray-100 dark:disabled:bg-slate-800" /></div>
                        <div className="col-span-2 flex justify-end"><button onClick={() => handleRemoveRule(rule.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddRule} className="text-xs text-blue-600 font-semibold mt-2 flex items-center"><Plus className="w-3 h-3 mr-1" />Adicionar Faixa</button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                    <tr>
                      <th className="px-6 py-3">Parcela</th>
                      <th className="px-6 py-3 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300"><div className="flex flex-col"><span>Prévia/Autorizado</span><span className="text-[10px] opacity-70">Coeficiente</span></div></th>
                      <th className="px-6 py-3"><div className="flex flex-col"><span>Gestor</span><span className="text-[10px] opacity-70">Coeficiente</span></div></th>
                      {hasAngel && (<th className="px-6 py-3 bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300"><div className="flex flex-col"><span>Anjo</span><span className="text-[10px] opacity-70">Coeficiente</span></div></th>)}
                      <th className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">Total Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-gray-300">
                    {simulation.breakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-6 py-4 font-medium">{row.label}<div className="text-xs text-gray-400 font-normal mt-0.5">{row.count}x parcelas</div></td>
                        <td className="px-6 py-4 bg-blue-50/30 dark:bg-blue-900/5 text-blue-900 dark:text-blue-100 font-medium"><div>{formatCurrency(row.cons.val)}</div><div className="text-xs text-blue-500 mt-1">{formatPercent(row.cons.rate)}</div></td>
                        <td className="px-6 py-4">{row.man.val > 0 ? (<><div>{formatCurrency(row.man.val)}</div><div className="text-xs text-gray-500 mt-1">{formatPercent(row.man.rate)}</div></>) : <span className="text-gray-400">-</span>}</td>
                        {hasAngel && (<td className="px-6 py-4 bg-yellow-50/30 dark:bg-yellow-900/5 text-yellow-900 dark:text-yellow-100">{row.angel.val > 0 ? (<><div>{formatCurrency(row.angel.val)}</div><div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{formatPercent(row.angel.rate)}</div></>) : <span className="text-gray-400">-</span>}</td>)}
                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(row.cons.val + row.man.val + row.angel.val)}<div className="text-xs text-gray-400 font-normal mt-0.5">por parcela</div></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-200 dark:border-slate-600 font-bold">
                    <tr>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">TOTAIS</td>
                      <td className="px-6 py-4 text-blue-700 dark:text-blue-300">{formatCurrency(simulation.totals.consultant)}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{formatCurrency(simulation.totals.manager)}</td>
                      {hasAngel && <td className="px-6 py-4 text-yellow-700 dark:text-yellow-300">{formatCurrency(simulation.totals.angel)}</td>}
                      <td className="px-6 py-4 text-right text-lg text-green-600 dark:text-green-400">{formatCurrency(simulation.totals.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div key="history-tab-content" className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtros Avançados</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsAngelMode(!isAngelMode)} className={`text-xs flex items-center px-3 py-1.5 rounded-full border transition-all font-medium ${isAngelMode ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                  {isAngelMode ? <Crown className="w-3.5 h-3.5 mr-1.5 fill-yellow-500 text-yellow-600" /> : <Crown className="w-3.5 h-3.5 mr-1.5" />}
                  {isAngelMode ? 'Modo Anjo Ativo' : 'Modo Pagamento Anjo'}
                </button>
                {(filterStartDate || filterEndDate || filterConsultant.length > 0 || filterAngel.length > 0 || filterPV.length > 0 || filterStatus.length > 0 || searchTerm) && (<button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition"><XCircle className="w-3 h-3 mr-1" />Limpar Filtros</button>)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Busca Geral</label><div className="relative"><input type="text" placeholder="Cliente, Grupo..." className="w-full pl-9 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" /></div></div>
              <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">De (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
              <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Até (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Prévia/Autorizado</label>
                <MultiSelectFilter
                  options={consultantOptions}
                  selected={filterConsultant}
                  onSelectionChange={setFilterConsultant}
                  placeholder="Todos"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Anjo (Participação)</label>
                <MultiSelectFilter
                  options={angels.map(a => ({ value: a.name, label: a.name }))}
                  selected={filterAngel}
                  onSelectionChange={setFilterAngel}
                  placeholder="Todos"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ponto de Venda (PV)</label>
                <MultiSelectFilter
                  options={pvs.map(pv => ({ value: pv, label: pv }))}
                  selected={filterPV}
                  onSelectionChange={setFilterPV}
                  placeholder="Todos"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status Geral</label>
                <MultiSelectFilter
                  options={[
                    { value: 'Em Andamento', label: 'Em Andamento' },
                    { value: 'Atraso', label: 'Atraso' },
                    { value: 'Concluído', label: 'Concluído' },
                    { value: 'Cancelado', label: 'Cancelado' },
                  ]}
                  selected={filterStatus}
                  onSelectionChange={setFilterStatus}
                  placeholder="Todos"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><MarkAllPaidIcon className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Concluídas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(summaryStats.completedPercentage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({summaryStats.completedCount})</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Em Andamento</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(summaryStats.inProgressPercentage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({summaryStats.inProgressCount})</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><Wand2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Próximas de Concluir</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(summaryStats.nearCompletionPercentage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({summaryStats.nearCompletionCount})</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><XCircle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atrasadas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(summaryStats.delayedPercentage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({summaryStats.delayedCount})</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
              <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-300" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Canceladas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPercent(summaryStats.cancelledPercentage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({summaryStats.cancelledCount})</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-4 mb-8">
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg flex-shrink-0">
              <DollarSign className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex flex-col justify-center text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total Vendido</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(summaryStats.totalValue)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Cliente / Produto</th>
                    <th className="px-4 py-3">Consultor & Equipe</th>
                    <th className="px-4 py-3">Valor do Crédito</th>
                    <th className="px-4 py-3">Progresso & Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma venda encontrada.</td></tr>
                  ) : (
                    filteredHistory.map(c => {
                      const paidCount = Object.values(c.installmentDetails).filter(s => s.status === 'Pago').length;
                      const totalInstallments = 15;
                      const progressPercent = (paidCount / totalInstallments) * 100;
                      const status = getOverallStatus(c.installmentDetails);
                      const statusColors: Record<CommissionStatus, string> = {
                        'Em Andamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                        'Atraso': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                        'Concluído': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                        'Cancelado': 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                      };
                      const progressColor = progressPercent === 100 ? 'bg-green-500' : progressPercent > 50 ? 'bg-blue-500' : 'bg-yellow-500';
                      const rowBgColor: Record<CommissionStatus, string> = {
                        'Em Andamento': 'bg-yellow-50 dark:bg-yellow-900/20',
                        'Atraso': 'bg-red-50 dark:bg-red-900/20',
                        'Concluído': 'bg-green-50 dark:bg-green-900/20',
                        'Cancelado': 'bg-gray-50 dark:bg-slate-800'
                      };

                      return (
                        <React.Fragment key={c.db_id}>
                          <tr className={`${rowBgColor[status]} hover:bg-gray-50 dark:hover:bg-slate-700/30 transition`}>
                            <td className="px-4 py-3 align-top"><div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div><div className="text-xs text-gray-500">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div></td>
                            <td className="px-4 py-3 align-top"><div className="font-bold text-gray-900 dark:text-white flex items-center">{c.clientName}{c.angelName && <span title={`Anjo: ${c.angelName}`}><Crown className="ml-2 h-3.5 w-3.5 text-yellow-500" /></span>}</div><div className="text-xs text-gray-500">{c.group} / {c.quota} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === 'Imóvel' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'}`}>{c.type === 'Imóvel' ? '🏠' : '🚗'} {c.type}</span></div></td>
                            <td className="px-4 py-3 align-top text-xs space-y-1">
                              <div className="flex items-center" title={`Consultor: ${c.consultant}`}>
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 shrink-0"></div>
                                <span className="truncate">{c.consultant}</span>
                              </div>
                              {c.managerName && c.managerName !== 'N/A' && (
                                <div className="pt-1">
                                  <div className="font-semibold text-gray-600 dark:text-gray-400">Equipe SART</div>
                                  <div className="flex items-center text-gray-500" title={`Gestor: ${c.managerName}`}>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2 shrink-0"></div>
                                    <span className="truncate">{c.managerName}</span>
                                  </div>
                                </div>
                              )}
                              {c.angelName && (
                                <div className="flex items-center text-yellow-700 dark:text-yellow-400" title={`Anjo: ${c.angelName}`}>
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 shrink-0"></div>
                                  <span className="truncate">{c.angelName}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top"><div className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(c.value)}</div><div className="text-xs text-gray-500">PV: {c.pv}</div></td>
                            <td className="px-4 py-3 align-top"><div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>{status}</div><div className="mt-2"><div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>{paidCount}/{totalInstallments}</span><span>{Math.round(progressPercent)}%</span></div><div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progressPercent}%` }}></div></div></div></td>
                            <td className="px-4 py-3 text-right align-top">
                              <div className="flex justify-end items-center">
                                {status !== 'Concluído' && (
                                  <button
                                    onClick={() => handleMarkAllAsPaid(c)}
                                    className="p-2 rounded-md hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-500"
                                    title="Marcar Todas as Parcelas como Pagas"
                                  >
                                    <MarkAllPaidIcon className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setQuickPayCommission(c);
                                    setQuickPayInstallment(getNextPendingInstallment(c));
                                    setPaymentDate(getQuickPayDate());
                                    setCalculatedCompetence(calculateCompetenceMonth(getQuickPayDate()));
                                    setIsQuickPayModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white font-medium text-xs shadow-sm hover:bg-green-700 transition"
                                  title="Confirmar Pagamento de Parcela"
                                >
                                  <DollarSign className="w-4 h-4" />
                                  <span>Pagar</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCommissionForRange(c);
                                    setIsRangeModalOpen(true);
                                  }}
                                  className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500"
                                  title="Marcar Faixa de Parcelas como Pagas"
                                >
                                  <CalendarCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditCommissionModal(c)}
                                  className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500"
                                  title="Editar Venda"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCommission(c.db_id!)}
                                  className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                                  title="Excluir Venda"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setExpandedRow(expandedRow === c.db_id ? null : c.db_id!)}
                                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500"
                                >
                                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedRow === c.db_id ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedRow === c.db_id && (
                            <tr className={`${rowBgColor[status]}`}>
                              <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {Object.entries(c.installmentDetails).map(([num, info]) => {
                                    const installmentInfo = info as InstallmentInfo;
                                    const statusValue = installmentInfo?.status || 'Pendente';
                                    const values = getInstallmentValues(c, parseInt(num));
                                    return (
                                      <div key={num} className="text-center p-2 rounded-md border bg-white dark:bg-slate-700">
                                        <div className="text-xs text-gray-400">
                                          Parcela {num}
                                          {installmentInfo.competenceMonth && (
                                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                              Comp: {installmentInfo.competenceMonth.slice(5, 7)}/{installmentInfo.competenceMonth.slice(2, 4)}
                                            </div>
                                          )}
                                        </div>
                                        <select value={statusValue} onChange={async (e) => await handleStatusChange(c.db_id!, parseInt(num), e.target.value as InstallmentStatus, c.clientName, c.type)} className={`mt-1 w-full text-xs font-bold py-1 px-2 rounded border cursor-pointer focus:outline-none ${getInstallmentStatusColor(statusValue)}`}>
                                          <option value="Pendente">Pendente</option>
                                          <option value="Pago">Pago</option>
                                          <option value="Atraso">Atraso</option>
                                          <option value="Cancelado">Cancelado</option>
                                        </select>
                                        {statusValue === 'Pago' && (
                                          <div className="mt-2 text-xs space-y-1 text-left text-gray-600 dark:text-gray-300">
                                            <div className="flex justify-between"><span>Consultor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.cons)}</span></div>
                                            <div className="flex justify-between"><span>Gestor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.man)}</span></div>
                                            {c.angelName && <div className="flex justify-between"><span>Anjo:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.angel)}</span></div>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div key="reports-tab-content" className="animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Relatório por Mês de Competência</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Selecione o Mês:</label>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Consultor:</label>
                <MultiSelectFilter
                  options={consultantOptions}
                  selected={reportConsultant}
                  onSelectionChange={setReportConsultant}
                  placeholder="Todos os Consultores"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Gestor:</label>
                <MultiSelectFilter
                  options={managers.map(m => ({ value: m.name, label: m.name }))}
                  selected={reportManager}
                  onSelectionChange={setReportManager}
                  placeholder="Todos os Gestores"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Anjo:</label>
                <MultiSelectFilter
                  options={angels.map(a => ({ value: a.name, label: a.name }))}
                  selected={reportAngel}
                  onSelectionChange={setReportAngel}
                  placeholder="Todos os Anjos"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por PV:</label>
                <MultiSelectFilter
                  options={pvs.map(pv => ({ value: pv, label: pv }))}
                  selected={reportPV}
                  onSelectionChange={setReportPV}
                  placeholder="Todos os PVs"
                />
              </div>
              <button onClick={generateReport} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
                Gerar Relatório
              </button>
            </div>
          </div>

          {reportData && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm animate-fade-in">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                Comissões de {formatMonthYear(reportData.month)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"><div className="text-sm text-green-600 dark:text-green-300">Prévias/Autorizados</div><div className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(reportData.totalCommissions.consultant)}</div></div>
                <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg"><div className="text-sm text-gray-600 dark:text-gray-300">Gestores</div><div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(reportData.totalCommissions.manager)}</div></div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg"><div className="text-sm text-yellow-600 dark:text-yellow-300">Anjos</div><div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{formatCurrency(reportData.totalCommissions.angel)}</div></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg"><div className="text-sm text-purple-600 dark:text-purple-300">Total do Mês</div><div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(reportData.totalCommissions.total)}</div></div>
              </div>

              {reportConsultantSummary.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Comprovantes de Pagamento</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {reportConsultantSummary.map(cs => {
                      const receipt = getReceiptFor(cs.name, reportData.month);
                      const uploadKey = `${cs.name}-${reportData.month}`;
                      const isUploading = uploadingReceipt === uploadKey;
                      return (
                        <div key={cs.name} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{cs.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(cs.total)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {receipt && (
                              <a href={receipt.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800">
                                <Eye className="h-3.5 w-3.5" /> Ver
                              </a>
                            )}
                            {receipt && (
                              <button
                                onClick={() => handleDeleteReceipt(receipt)}
                                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              ref={el => { fileInputRefs.current[uploadKey] = el; }}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadReceipt(cs.name, reportData.month, file);
                                e.target.value = '';
                              }}
                            />
                            <button
                              onClick={() => fileInputRefs.current[uploadKey]?.click()}
                              disabled={isUploading}
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              {receipt ? 'Trocar' : 'Anexar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <hr className="my-6 border-gray-200 dark:border-slate-700" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead className="text-left text-gray-500 dark:text-gray-400">
                    <tr className="border-b dark:border-slate-700">
                      <th className="py-2 px-4">Data Venda</th>
                      <th className="py-2 px-4">Valor Crédito</th>
                      <th className="py-2 px-4">Cliente</th>
                      <th className="py-2 px-4">Consultor</th>
                      <th className="py-2 px-4">Gestor</th>
                      <th className="py-2 px-4">Anjo</th>
                      <th className="py-2 px-4">Parcela</th>
                      <th className="py-2 px-4">PV</th>
                      <th className="py-2 px-4">Mês Competência</th>
                      <th className="py-2 px-4 text-right">Valor (Consultor)</th>
                      <th className="py-2 px-4 text-right">Valor (Gestor)</th>
                      <th className="py-2 px-4 text-right">Valor (Anjo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {reportData.detailedInstallments.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-4">{new Date(item.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 px-4">{formatCurrency(item.creditValue)}</td>
                        <td className="py-2 px-4 font-medium text-gray-800 dark:text-gray-200">{item.commission.clientName}</td>
                        <td className="py-2 px-4">{item.commission.consultant}</td>
                        <td className="py-2 px-4">{item.commission.managerName}</td>
                        <td className="py-2 px-4">{item.commission.angelName || 'N/A'}</td>
                        <td className="py-2 px-4">{item.installmentNumber}</td>
                        <td className="py-2 px-4">{item.commission.pv}</td>
                        <td className="py-2 px-4">{item.commission.installmentDetails[item.installmentNumber].competenceMonth ? formatMonthYear(item.commission.installmentDetails[item.installmentNumber].competenceMonth!) : 'N/A'}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(item.values.cons)}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(item.values.man)}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(item.values.angel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleExportToExcel} className="mt-6 flex items-center text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-300"><Download className="w-4 h-4 mr-2" />Exportar para Excel</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'links' && (
        <div key="links-tab-content" className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Links de Conferência de Comissões</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Copie o link e envie para o consultor ou anjo conferir suas comissões. Não é necessário login.</p>

            {consultantNames.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Consultores</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {consultantNames.map(name => (
                    <div key={name} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                      <button onClick={() => handleCopyLink(name)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <Copy className="h-3.5 w-3.5" /> Copiar link
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {angelNames.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Anjos</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {angelNames.map(name => (
                    <div key={name} className="flex items-center justify-between rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
                      <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        <Crown className="h-3.5 w-3.5 text-yellow-600" /> {name}
                      </span>
                      <button onClick={() => handleCopyLink(name)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <Copy className="h-3.5 w-3.5" /> Copiar link
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consultantNames.length === 0 && angelNames.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">Nenhum consultor ou anjo encontrado. Cadastre consultores na gestão de equipe.</p>
            )}
          </div>
        </div>
      )}

      {editingInstallment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Confirmar Pagamento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Parcela {editingInstallment.number} de {editingInstallment.clientName}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Pagamento</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <p className="text-xs text-purple-800 dark:text-purple-300 font-medium">Mês de Competência Calculado</p>
                <p className="font-bold text-purple-900 dark:text-purple-100">{calculatedCompetence ? formatMonthYear(calculatedCompetence) : '...'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={confirmPayment} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition font-medium">Confirmar</button>
              <button onClick={() => { setEditingInstallment(null); setPaymentDate(''); setCalculatedCompetence(''); }} className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-300 dark:hover:bg-slate-500 transition font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isEditCommissionModalOpen && (
        <EditCommissionModal
          isOpen={isEditCommissionModalOpen}
          onClose={() => setIsEditCommissionModalOpen(false)}
          commissionToEdit={commissionToEdit}
          onSave={handleUpdateCommission}
          teamMembers={teamMembers}
          pvs={pvs}
        />
      )}

      {isRangeModalOpen && selectedCommissionForRange && (
        <MarkInstallmentRangeModal
          isOpen={isRangeModalOpen}
          onClose={() => setIsRangeModalOpen(false)}
          commission={selectedCommissionForRange}
          onSaveRange={handleSaveInstallmentRange}
        />
      )}

      {isQuickPayModalOpen && quickPayCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={(e) => { if (e.key === 'Enter') handleQuickPay(); }}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Confirmar Pagamento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{quickPayCommission.clientName}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Número da Parcela</label>
                <input type="number" min={1} max={15} autoFocus value={quickPayInstallment} onChange={(e) => setQuickPayInstallment(e.target.value)} placeholder="Ex: 3" className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Pagamento</label>
                <input type="date" value={paymentDate} onChange={(e) => { setPaymentDate(e.target.value); setCalculatedCompetence(calculateCompetenceMonth(e.target.value)); }} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" />
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <p className="text-xs text-purple-800 dark:text-purple-300 font-medium">Mês de Competência Calculado</p>
                <p className="font-bold text-purple-900 dark:text-purple-100">{calculatedCompetence ? formatMonthYear(calculatedCompetence) : '...'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleQuickPay} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition font-medium">Confirmar</button>
              <button onClick={() => { setIsQuickPayModalOpen(false); setQuickPayCommission(null); setQuickPayInstallment(''); setPaymentDate(''); setCalculatedCompetence(''); }} className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-300 dark:hover:bg-slate-500 transition font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};