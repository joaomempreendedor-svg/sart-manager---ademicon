import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Commission, CommissionStatus, CommissionRule, InstallmentStatus, InstallmentInfo, CommissionReport } from '@/types';
import { Trash2, Search, DollarSign, Calendar, Calculator, Save, Table as TableIcon, Car, Home, ChevronDown, MapPin, Percent, Filter, XCircle, Crown, Plus, Wand2, Loader2, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => {
  return (value || 0).toFixed(4).replace('.', ',') + '%';
};

// --- REGRAS DE NEGÓCIO PADRÃO ---
const DEFAULT_RULES = {
  consultant: { p1_10: 0.1288, p11_13: 0.2374, p15: 0.30 },
  manager: { noAngel: { p1_10: 0.0322, p11_13: 0.0593 }, withAngel: { p1_10: 0.0194, p11_13: 0.0356 } },
  angel: { p1_10: 0.0128, p11_13: 0.0237 }
};

// ⚠️ CONFIGURAÇÃO DOS DIAS DE CORTE POR MÊS ⚠️
const MONTHLY_CUTOFF_DAYS: Record<number, number> = {
  1: 19, 2: 18, 3: 19, 4: 19, 5: 19, 6: 17, 7: 19, 8: 19, 9: 19, 10: 19, 11: 19, 12: 19,
};

const calculateCompetenceMonth = (paidDate: string): string => {
  const date = new Date(paidDate + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const cutoffDay = MONTHLY_CUTOFF_DAYS[month] || 19;
  let competenceDate = new Date(date);
  if (day <= cutoffDay) {
    competenceDate.setMonth(competenceDate.getMonth() + 1);
  } else {
    competenceDate.setMonth(competenceDate.getMonth() + 2);
  }
  const compYear = competenceDate.getFullYear();
  const compMonth = String(competenceDate.getMonth() + 1).padStart(2, '0');
  return `${compYear}-${compMonth}`;
};

const getOverallStatus = (details: Record<string, InstallmentInfo>): CommissionStatus => {
    const statuses = Object.values(details).map(info => info.status);
    if (statuses.some(s => s === 'Cancelado')) return 'Cancelado';
    if (statuses.some(s => s === 'Atraso')) return 'Atraso';
    if (statuses.every(s => s === 'Pago')) return 'Concluído';
    return 'Em Andamento';
};

const getInstallmentStatusColor = (status: InstallmentStatus) => {
    switch(status) {
        case 'Pago': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case 'Atraso': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        case 'Pendente': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'Cancelado': return 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-500';
        default: return 'bg-gray-100 text-gray-800';
    }
};

type CustomRuleText = {
    id: string;
    startInstallment: string;
    endInstallment: string;
    consultantRate: string;
    managerRate: string;
    angelRate: string;
}

interface DetailedInstallment {
  commission: Commission;
  installmentNumber: string;
  values: { cons: number; man: number; angel: number; };
}

export const Commissions = () => {
  const { commissions, addCommission, updateCommission, deleteCommission, teamMembers, pvs, addPV, updateInstallmentStatus } = useApp();
  
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'reports'>('calculator');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAngelMode, setIsAngelMode] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterConsultant, setFilterConsultant] = useState('');
  const [filterAngel, setFilterAngel] = useState('');
  const [filterPV, setFilterPV] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Estado do Simulador
  const [creditValue, setCreditValue] = useState<string>('');
  const [hasAngel, setHasAngel] = useState(false);
  const [isCustomRulesMode, setIsCustomRulesMode] = useState(false);
  
  const [customRules, setCustomRules] = useState<CommissionRule[]>([]);
  const [customRulesText, setCustomRulesText] = useState<CustomRuleText[]>([]);

  // Estado para Salvar Venda
  const [clientName, setClientName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState<'Imóvel' | 'Veículo'>('Imóvel');
  const [group, setGroup] = useState('');
  const [quota, setQuota] = useState('');
  const [selectedPV, setSelectedPV] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedAngel, setSelectedAngel] = useState('');
  const [taxRateInput, setTaxRateInput] = useState('6');

  const [editingInstallment, setEditingInstallment] = useState<{
    commissionId: string;
    number: number;
    clientName: string;
    saleType: 'Imóvel' | 'Veículo';
  } | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [calculatedCompetence, setCalculatedCompetence] = useState('');

  // Relatórios
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportConsultant, setReportConsultant] = useState('');
  const [reportManager, setReportManager] = useState('');
  const [reportAngel, setReportAngel] = useState('');
  const [reportPV, setReportPV] = useState(''); // NOVO: Estado para o filtro de PV no relatório
  const [reportData, setReportData] = useState<{
    month: string;
    totalCommissions: { consultant: number; manager: number; angel: number; total: number; };
    detailedInstallments: DetailedInstallment[];
  } | null>(null);

  const resetCalculatorForm = () => {
    setCreditValue('');
    setClientName('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleType('Imóvel');
    setGroup('');
    setQuota('');
    setSelectedPV('');
    setSelectedConsultant('');
    setSelectedManager('');
    setSelectedAngel('');
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

  const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  const simulation = useMemo(() => {
    const credit = parseCurrency(creditValue);
    const calc = (pct: number) => credit * (pct / 100);
    let breakdown: any[] = [];
    let totals = { consultant: 0, manager: 0, angel: 0, grandTotal: 0 };

    if (isCustomRulesMode) {
      customRules.forEach(rule => {
        const numInstallments = (rule.endInstallment - rule.startInstallment + 1);
        const consVal = calc(rule.consultantRate) * numInstallments;
        const manVal = calc(rule.managerRate) * numInstallments;
        const angelVal = hasAngel ? calc(rule.angelRate) * numInstallments : 0;
        
        totals.consultant += consVal;
        totals.manager += manVal;
        totals.angel += angelVal;

        breakdown.push({
          label: `Parcelas ${rule.startInstallment} a ${rule.endInstallment}`,
          count: numInstallments,
          cons: { rate: rule.consultantRate, val: calc(rule.consultantRate) },
          man: { rate: rule.managerRate, val: calc(rule.managerRate) },
          angel: { rate: hasAngel ? rule.angelRate : 0, val: hasAngel ? calc(rule.angelRate) : 0 }
        });
      });
    } else {
      const manRules = hasAngel ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;
      const p1_10 = {
        label: 'Parcelas 1 a 10', count: 10,
        cons: { rate: DEFAULT_RULES.consultant.p1_10, val: calc(DEFAULT_RULES.consultant.p1_10) },
        man: { rate: manRules.p1_10, val: calc(manRules.p1_10) },
        angel: { rate: hasAngel ? DEFAULT_RULES.angel.p1_10 : 0, val: hasAngel ? calc(DEFAULT_RULES.angel.p1_10) : 0 }
      };
      const p11_13 = {
        label: 'Parcelas 11 a 13', count: 3,
        cons: { rate: DEFAULT_RULES.consultant.p11_13, val: calc(DEFAULT_RULES.consultant.p11_13) },
        man: { rate: manRules.p11_13, val: calc(manRules.p11_13) },
        angel: { rate: hasAngel ? DEFAULT_RULES.angel.p11_13 : 0, val: hasAngel ? calc(DEFAULT_RULES.angel.p11_13) : 0 }
      };
      const p15 = {
        label: 'Parcela 15', count: 1,
        cons: { rate: DEFAULT_RULES.consultant.p15, val: calc(DEFAULT_RULES.consultant.p15) },
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
    const hasAngel = !!commission.angelName;
    let consRate = 0, manRate = 0, angelRate = 0;

    if (commission.customRules) {
      const rule = commission.customRules.find(r => installment >= r.startInstallment && installment <= r.endInstallment);
      if (rule) {
        consRate = rule.consultantRate;
        manRate = rule.managerRate;
        angelRate = hasAngel ? rule.angelRate : 0;
      }
    } else {
      const manRules = hasAngel ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;
      if (installment <= 10) { consRate = DEFAULT_RULES.consultant.p1_10; manRate = manRules.p1_10; if (hasAngel) angelRate = DEFAULT_RULES.angel.p1_10; }
      else if (installment <= 13) { consRate = DEFAULT_RULES.consultant.p11_13; manRate = manRules.p11_13; if (hasAngel) angelRate = DEFAULT_RULES.angel.p11_13; }
      else if (installment === 15) { consRate = DEFAULT_RULES.consultant.p15; }
    }

    return {
        cons: (credit * (consRate / 100)) * taxMultiplier,
        man: (credit * (manRate / 100)) * taxMultiplier,
        angel: (credit * (angelRate / 100)) * taxMultiplier
    };
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();

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
        alert(`Por favor, preencha os seguintes campos obrigatórios:\n\n- ${errors.join('\n- ')}`);
        return;
    }

    setIsSaving(true);
    try {
      const taxValue = parseFloat(taxRateInput.replace(',', '.')) || 0;
      const initialInstallments: Record<string, InstallmentInfo> = {};
      for (let i = 1; i <= 15; i++) { initialInstallments[i] = { status: 'Pendente' }; }

      const payload: Commission = {
        id: crypto.randomUUID(), date: saleDate, clientName, type: saleType, group, quota, consultant: selectedConsultant, managerName: selectedManager || 'N/A', angelName: hasAngel ? selectedAngel : undefined, pv: selectedPV, value: credit, taxRate: taxValue, 
        netValue: simulation.totals.grandTotal * (1 - (taxValue/100)),
        installments: 15, status: 'Em Andamento', installmentDetails: initialInstallments,
        consultantValue: simulation.totals.consultant, managerValue: simulation.totals.manager, angelValue: simulation.totals.angel,
        receivedValue: 0,
        customRules: isCustomRulesMode ? customRules : undefined
      };
      
      await addCommission(payload);
      
      alert("Venda registrada com sucesso!");
      resetCalculatorForm();
      setActiveTab('history');

    } catch (error: any) {
      alert(error.message || "Falha ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de comissão? Esta ação não pode ser desfeita.')) {
      try {
        await deleteCommission(id);
      } catch (error: any) {
        alert(`Erro ao excluir comissão: ${error.message}`);
      }
    }
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

  const clearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterConsultant(''); setFilterAngel(''); setFilterPV(''); setFilterStatus(''); setSearchTerm(''); };
  const handleAddPV = () => { const newPVName = prompt("Digite o nome do novo Ponto de Venda (PV):"); if (newPVName && newPVName.trim()) { addPV(newPVName.trim()); setSelectedPV(newPVName.trim()); } };

  const activeMembers = teamMembers.filter(m => m.isActive);
  const consultants = activeMembers.filter(m => m.roles.includes('Prévia') || m.roles.includes('Autorizado'));
  const managers = activeMembers.filter(m => m.roles.includes('Gestor'));
  const angels = activeMembers.filter(m => m.roles.includes('Anjo'));

  const filteredHistory = useMemo(() => {
    const startFilterDate = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
    const endFilterDate = filterEndDate ? new Date(filterEndDate + 'T00:00:00') : null;

    return commissions.filter(c => {
      if (isAngelMode && !c.angelName) return false;
      
      const commissionDate = new Date(c.date + 'T00:00:00');
      const overallStatus = getOverallStatus(c.installmentDetails);

      const matchesSearch = searchTerm === '' || c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || c.consultant.toLowerCase().includes(searchTerm.toLowerCase()) || c.pv.toLowerCase().includes(searchTerm.toLowerCase()) || c.group.includes(searchTerm);
      const matchesStart = !startFilterDate || commissionDate >= startFilterDate;
      const matchesEnd = !endFilterDate || commissionDate <= endFilterDate;
      const matchesConsultant = filterConsultant ? c.consultant === filterConsultant : true;
      const matchesAngel = filterAngel ? c.angelName === filterAngel : true;
      const matchesPV = filterPV ? c.pv === filterPV : true;
      const matchesStatus = filterStatus ? overallStatus === filterStatus : true;
      
      return matchesSearch && matchesStart && matchesEnd && matchesConsultant && matchesAngel && matchesPV && matchesStatus;
    });
  }, [commissions, searchTerm, filterStartDate, filterEndDate, filterConsultant, filterAngel, filterPV, filterStatus, isAngelMode]);

  const summaryStats = useMemo(() => {
    return filteredHistory.reduce((acc, c) => {
        const status = getOverallStatus(c.installmentDetails);
        if (status === 'Em Andamento') acc.inProgress++;
        else if (status === 'Atraso') acc.delayed++;
        else if (status === 'Concluído') acc.completed++;
        acc.totalValue += c.value;
        return acc;
    }, { inProgress: 0, delayed: 0, completed: 0, totalValue: 0 });
  }, [filteredHistory]);

  const formatAndSetCurrency = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    if (v === 'NaN,NaN') v = '';
    setter(v);
  };

  const handleStatusChange = async (
    commissionId: string, 
    installmentNumber: number, 
    newStatus: InstallmentStatus,
    clientName: string,
    saleType: 'Imóvel' | 'Veículo'
  ) => {
    if (newStatus === 'Pago') {
      const today = new Date().toISOString().split('T')[0];
      setEditingInstallment({ commissionId, number: installmentNumber, clientName, saleType });
      setPaymentDate(today);
      setCalculatedCompetence(calculateCompetenceMonth(today));
    } else {
      await updateInstallmentStatus(commissionId, installmentNumber, newStatus);
    }
  };

  useEffect(() => {
    if (paymentDate && editingInstallment) {
      setCalculatedCompetence(calculateCompetenceMonth(paymentDate));
    }
  }, [paymentDate, editingInstallment]);

  const confirmPayment = async () => {
    if (!editingInstallment) return;
  
    // 1. Store data and close modal immediately for better UX
    const installmentToUpdate = { ...editingInstallment };
    const dateOfPayment = paymentDate;
    setEditingInstallment(null);
  
    try {
      // 2. Process the update in the background
      await updateInstallmentStatus(
        installmentToUpdate.commissionId,
        installmentToUpdate.number,
        'Pago',
        dateOfPayment,
        installmentToUpdate.saleType
      );
  
      // 3. Clean up remaining states on success
      setPaymentDate('');
      setCalculatedCompetence('');
  
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      alert("Erro ao salvar o pagamento. Por favor, verifique o histórico e tente novamente.");
    }
  };

  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const generateReport = () => {
    const filteredCommissions = commissions.filter(c => {
      if (reportConsultant && c.consultant !== reportConsultant) return false;
      if (reportManager && c.managerName !== reportManager) return false;
      if (reportAngel && c.angelName !== reportAngel) return false;
      if (reportPV && c.pv !== reportPV) return false; // NOVO: Filtrar por PV
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
          });
          totalCommissions.consultant += values.cons;
          totalCommissions.manager += values.man;
          totalCommissions.angel += values.angel;
        }
      });
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
      alert("Não há dados para exportar. Gere um relatório primeiro.");
      return;
    }

    const dataToExport = reportData.detailedInstallments.map(item => ({
      'Cliente': item.commission.clientName,
      'Consultor': item.commission.consultant,
      'Gestor': item.commission.managerName,
      'Anjo': item.commission.angelName || 'N/A',
      'Parcela': parseInt(item.installmentNumber),
      'Valor (Consultor)': item.values.cons,
      'Valor (Gestor)': item.values.man,
      'Valor (Anjo)': item.values.angel,
      'Data Venda': new Date(item.commission.date + 'T00:00:00').toLocaleDateString('pt-BR'),
      'Mês Competência': formatMonthYear(item.commission.installmentDetails[item.installmentNumber].competenceMonth!),
      'PV': item.commission.pv, // Adicionado PV ao export
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    const currencyFormat = 'R$ #,##0.00';
    const currencyCols = ['F', 'G', 'H'];
    
    worksheet['!cols'] = [
        { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, // Ajustado para incluir PV
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comissões");

    XLSX.writeFile(workbook, `Relatorio_Comissoes_${reportData.month}.xlsx`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Comissões</h1>
          <p className="text-gray-500 dark:text-gray-400">Simule ganhos e gerencie o fluxo mensal de recebíveis.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex">
            <button onClick={() => setActiveTab('calculator')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'calculator' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Calculator className="w-4 h-4 mr-2" />Simulador</button>
            <button onClick={() => setActiveTab('history')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'history' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><TableIcon className="w-4 h-4 mr-2" />Histórico</button>
            <button onClick={() => setActiveTab('reports')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'reports' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><FileText className="w-4 h-4 mr-2" />Relatórios</button>
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
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
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isCustomRulesMode} onChange={() => setIsCustomRulesMode(!isCustomRulesMode)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div></label>
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
                    <form onSubmit={handleSaveCommission} className="space-y-3">
                        <input required placeholder="Nome do Cliente" className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={clientName} onChange={e => setClientName(e.target.value)} />
                         <div className="flex space-x-2">
                             <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Data da Venda</label><input type="date" required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
                             <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">PV (Ponto de Venda)</label><div className="flex gap-2"><select required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={selectedPV} onChange={e => setSelectedPV(e.target.value)}><option value="">Selecione...</option>{pvs.map(pv => <option key={pv} value={pv}>{pv}</option>)}</select><button type="button" onClick={handleAddPV} className="p-2 bg-brand-100 text-brand-700 rounded dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-200" title="Adicionar novo PV"><Plus className="w-5 h-5" /></button></div></div>
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
                        <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                            <select required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2 mb-2" value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)}><option value="">Selecione o Prévia/Autorizado</option>{consultants.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            <select className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2 mb-2" value={selectedManager} onChange={e => setSelectedManager(e.target.value)}><option value="">Selecione o Gestor</option>{managers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select>
                            {hasAngel && (<select required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={selectedAngel} onChange={e => setSelectedAngel(e.target.value)}><option value="">Selecione o Anjo</option>{angels.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select>)}
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
                                        <td className="px-6 py-4">{row.man.val > 0 ? ( <><div>{formatCurrency(row.man.val)}</div><div className="text-xs text-gray-500 mt-1">{formatPercent(row.man.rate)}</div></> ) : <span className="text-gray-400">-</span>}</td>
                                        {hasAngel && (<td className="px-6 py-4 bg-yellow-50/30 dark:bg-yellow-900/5 text-yellow-900 dark:text-yellow-100">{row.angel.val > 0 ? ( <><div>{formatCurrency(row.angel.val)}</div><div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{formatPercent(row.angel.rate)}</div></> ) : <span className="text-gray-400">-</span>}</td>)}
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
        <div className="animate-fade-in space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtros Avançados</h3>
                    <div className="flex items-center gap-3">
                         <button onClick={() => setIsAngelMode(!isAngelMode)} className={`text-xs flex items-center px-3 py-1.5 rounded-full border transition-all font-medium ${isAngelMode ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                            {isAngelMode ? <Crown className="w-3.5 h-3.5 mr-1.5 fill-yellow-500 text-yellow-600" /> : <Crown className="w-3.h-5 mr-1.5" />}
                            {isAngelMode ? 'Modo Anjo Ativo' : 'Modo Pagamento Anjo'}
                         </button>
                        {(filterStartDate || filterEndDate || filterConsultant || filterAngel || filterPV || filterStatus || searchTerm) && (<button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition"><XCircle className="w-3 h-3 mr-1" />Limpar Filtros</button>)}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Busca Geral</label><div className="relative"><input type="text" placeholder="Cliente, Grupo..." className="w-full pl-9 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" /></div></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">De (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Até (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Prévia/Autorizado</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterConsultant} onChange={e => setFilterConsultant(e.target.value)}><option value="">Todos</option>{teamMembers.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Anjo (Participação)</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterAngel} onChange={e => setFilterAngel(e.target.value)}><option value="">Todos</option>{angels.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ponto de Venda (PV)</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterPV} onChange={e => setFilterPV(e.target.value)}><option value="">Todos</option>{pvs.map(pv => (<option key={pv} value={pv}>{pv}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status Geral</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Todos</option><option value="Em Andamento">Em Andamento</option><option value="Atraso">Atraso</option><option value="Concluído">Concluído</option><option value="Cancelado">Cancelado</option></select></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"><div className="text-sm text-gray-500 dark:text-gray-400">Vendas em Andamento</div><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summaryStats.inProgress}</div></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"><div className="text-sm text-gray-500 dark:text-gray-400">Com Atraso</div><div className="text-2xl font-bold text-red-600 dark:text-red-400">{summaryStats.delayed}</div></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"><div className="text-sm text-gray-500 dark:text-gray-400">Concluídas</div><div className="text-2xl font-bold text-green-600 dark:text-green-400">{summaryStats.completed}</div></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"><div className="text-sm text-gray-500 dark:text-gray-400">Valor Total (Filtro)</div><div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(summaryStats.totalValue)}</div></div>
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
                            {filteredHistory.length === 0 ? (<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma venda encontrada.</td></tr>) : (
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

                                    return (
                                        <React.Fragment key={c.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                                            <td className="px-4 py-3 align-top"><div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div><div className="text-xs text-gray-500">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div></td>
                                            <td className="px-4 py-3 align-top"><div className="font-bold text-gray-900 dark:text-white flex items-center">{c.clientName}{c.angelName && <Crown className="w-3.5 h-3.5 text-yellow-500 ml-2" title={`Anjo: ${c.angelName}`} />}</div><div className="text-xs text-gray-500">{c.group} / {c.quota} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === 'Imóvel' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'}`}>{c.type === 'Imóvel' ? '🏠' : '🚗'} {c.type}</span></div></td>
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
                                                    <button 
                                                        onClick={() => handleDeleteCommission(c.id)} 
                                                        className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                                                        title="Excluir Venda"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)} 
                                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500"
                                                    >
                                                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedRow === c.id ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRow === c.id && (
                                            <tr className="bg-gray-50 dark:bg-slate-800">
                                                <td colSpan={6} className="p-4">
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                                        {Object.entries(c.installmentDetails).map(([num, info]) => {
                                                            const installmentInfo = info as InstallmentInfo;
                                                            const status = installmentInfo?.status || 'Pendente';
                                                            const values = getInstallmentValues(c, parseInt(num));
                                                            return (
                                                            <div key={num} className="text-center p-2 rounded-md border bg-white dark:bg-slate-700">
                                                                <div className="text-xs text-gray-400">
                                                                    Parcela {num}
                                                                    {installmentInfo.competenceMonth && (
                                                                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                                                        Comp: {installmentInfo.competenceMonth.slice(5,7)}/{installmentInfo.competenceMonth.slice(2,4)}
                                                                    </div>
                                                                    )}
                                                                </div>
                                                                <select value={status} onChange={async (e) => await handleStatusChange(c.id, parseInt(num), e.target.value as InstallmentStatus, c.clientName, c.type)} className={`mt-1 w-full text-xs font-bold py-1 px-2 rounded border cursor-pointer focus:outline-none ${getInstallmentStatusColor(status)}`}>
                                                                    <option value="Pendente">Pendente</option>
                                                                    <option value="Pago">Pago</option>
                                                                    <option value="Atraso">Atraso</option>
                                                                    <option value="Cancelado">Cancelado</option>
                                                                </select>
                                                                {status === 'Pago' && (
                                                                    <div className="mt-2 text-xs space-y-1 text-left text-gray-600 dark:text-gray-300">
                                                                        <div className="flex justify-between"><span>Consultor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.cons)}</span></div>
                                                                        <div className="flex justify-between"><span>Gestor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.man)}</span></div>
                                                                        {c.angelName && <div className="flex justify-between"><span>Anjo:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.angel)}</span></div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )})}
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
        <div className="animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Relatório por Mês de Competência</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Selecione o Mês:</label>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Consultor:</label>
                <select value={reportConsultant} onChange={e => setReportConsultant(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Todos</option>{consultants.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Gestor:</label>
                <select value={reportManager} onChange={e => setReportManager(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Todos</option>{managers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por Anjo:</label>
                <select value={reportAngel} onChange={e => setReportAngel(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Todos</option>{angels.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select>
              </div>
              {/* NOVO: Filtro por PV */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Filtrar por PV:</label>
                <select value={reportPV} onChange={e => setReportPV(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"><option value="">Todos</option>{pvs.map(pv => <option key={pv} value={pv}>{pv}</option>)}</select>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400"><tr className="border-b dark:border-slate-700"><th className="py-2">Cliente</th><th className="py-2">Consultor</th><th className="py-2">Gestor</th><th className="py-2">Anjo</th><th className="py-2">Parcela</th><th className="py-2">PV</th><th className="py-2 text-right">Valor (Consultor)</th><th className="py-2 text-right">Valor (Gestor)</th><th className="py-2 text-right">Valor (Anjo)</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {reportData.detailedInstallments.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{item.commission.clientName}</td>
                        <td>{item.commission.consultant}</td>
                        <td>{item.commission.managerName}</td>
                        <td>{item.commission.angelName || 'N/A'}</td>
                        <td>{item.installmentNumber}</td>
                        <td>{item.commission.pv}</td> {/* Adicionado PV na tabela */}
                        <td className="text-right font-mono">{formatCurrency(item.values.cons)}</td>
                        <td className="text-right font-mono">{formatCurrency(item.values.man)}</td>
                        <td className="text-right font-mono">{formatCurrency(item.values.angel)}</td>
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
    </div>
  );
};