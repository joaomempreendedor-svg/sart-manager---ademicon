import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Commission, CommissionStatus } from '../types';
import { Trash2, Search, DollarSign, Calendar, Calculator, Save, Table as TableIcon, Car, Home, ChevronLeft, ChevronRight, MapPin, Percent, Filter, XCircle, Crown, Eye, EyeOff, Plus, Wand2 } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatPercent = (value: number) => {
  return value.toFixed(4).replace('.', ',') + '%';
};

// --- REGRAS DE NEGÓCIO ---
const RULES = {
  consultant: {
    p1_10: 0.1288,   // 0.1288%
    p11_13: 0.2374,  // 0.2374%
    p15: 0.30        // 0.30%
  },
  manager: {
    noAngel: {
      p1_10: 0.0322,
      p11_13: 0.0593
    },
    withAngel: {
      p1_10: 0.0194,
      p11_13: 0.0356
    }
  },
  angel: {
    p1_10: 0.0128,
    p11_13: 0.0237
  }
};

const getStatusColor = (status: CommissionStatus) => {
    switch(status) {
        case 'Pago': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case 'Atraso': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        case 'Prox Mês': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'Concluído': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        case 'Cancelado': return 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-500';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const Commissions = () => {
  const { commissions, addCommission, updateCommission, deleteCommission, teamMembers, pvs, addPV } = useApp();
  
  // Estado da View
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAngelMode, setIsAngelMode] = useState(false);

  // Filtros Avançados
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterConsultant, setFilterConsultant] = useState('');
  const [filterAngel, setFilterAngel] = useState('');
  const [filterPV, setFilterPV] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Estado do Simulador
  const [creditValue, setCreditValue] = useState<string>('');
  const [hasAngel, setHasAngel] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false); // NOVO: Modo Manual

  // NOVO: Estados para valores manuais
  const [manualConsultantTotal, setManualConsultantTotal] = useState('');
  const [manualManagerTotal, setManualManagerTotal] = useState('');
  const [manualAngelTotal, setManualAngelTotal] = useState('');
  
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

  const parseCurrency = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  // --- LÓGICA DE CÁLCULO ---
  const simulation = useMemo(() => {
    const credit = parseCurrency(creditValue);
    const calc = (pct: number) => credit * (pct / 100);

    const cons_p1_10_val = calc(RULES.consultant.p1_10);
    const cons_p11_13_val = calc(RULES.consultant.p11_13);
    const cons_p15_val = calc(RULES.consultant.p15);
    const cons_total = (cons_p1_10_val * 10) + (cons_p11_13_val * 3) + cons_p15_val;

    const man_rules = hasAngel ? RULES.manager.withAngel : RULES.manager.noAngel;
    const man_p1_10_val = calc(man_rules.p1_10);
    const man_p11_13_val = calc(man_rules.p11_13);
    const man_total = (man_p1_10_val * 10) + (man_p11_13_val * 3);

    let angel_p1_10_val = 0, angel_p11_13_val = 0, angel_total = 0;
    if (hasAngel) {
      angel_p1_10_val = calc(RULES.angel.p1_10);
      angel_p11_13_val = calc(RULES.angel.p11_13);
      angel_total = (angel_p1_10_val * 10) + (angel_p11_13_val * 3);
    }

    return {
      credit,
      breakdown: [
        { label: 'Parcelas 1 a 10', count: 10, cons: { rate: RULES.consultant.p1_10, val: cons_p1_10_val }, man: { rate: man_rules.p1_10, val: man_p1_10_val }, angel: { rate: hasAngel ? RULES.angel.p1_10 : 0, val: angel_p1_10_val } },
        { label: 'Parcelas 11 a 13', count: 3, cons: { rate: RULES.consultant.p11_13, val: cons_p11_13_val }, man: { rate: man_rules.p11_13, val: man_p11_13_val }, angel: { rate: hasAngel ? RULES.angel.p11_13 : 0, val: angel_p11_13_val } },
        { label: 'Parcela 15', count: 1, cons: { rate: RULES.consultant.p15, val: cons_p15_val }, man: { rate: 0, val: 0 }, angel: { rate: 0, val: 0 } }
      ],
      totals: { consultant: cons_total, manager: man_total, angel: angel_total, grandTotal: cons_total + man_total + angel_total }
    };
  }, [creditValue, hasAngel]);

  const manualTotals = useMemo(() => {
    const consultant = parseCurrency(manualConsultantTotal);
    const manager = parseCurrency(manualManagerTotal);
    const angel = parseCurrency(manualAngelTotal);
    return { consultant, manager, angel, grandTotal: consultant + manager + angel };
  }, [manualConsultantTotal, manualManagerTotal, manualAngelTotal]);

  const displayTotals = isManualMode ? manualTotals : simulation.totals;

  const getInstallmentValues = (commission: Commission) => {
    if (commission.status === 'Concluído' || commission.status === 'Cancelado' || (commission.currentInstallment ?? 1) === 0) {
        return { cons: 0, man: 0, angel: 0 };
    }

    const installment = commission.currentInstallment ?? 1;
    const taxMultiplier = 1 - ((commission.taxRate || 0) / 100);

    // NOVO: Lógica para comissões manuais
    if (commission.isManual) {
        const PAYING_INSTALLMENTS = 14; // 10 (1-10) + 3 (11-13) + 1 (15)
        if (installment === 14) return { cons: 0, man: 0, angel: 0 }; // Parcela 14 não tem pagamento

        return {
            cons: (commission.consultantValue / PAYING_INSTALLMENTS) * taxMultiplier,
            man: (commission.managerValue / PAYING_INSTALLMENTS) * taxMultiplier,
            angel: (commission.angelValue / PAYING_INSTALLMENTS) * taxMultiplier,
        };
    }

    // Lógica original para comissões calculadas
    const credit = commission.value;
    const hasAngel = !!commission.angelName;
    let consRate = 0, manRate = 0, angelRate = 0;

    if (installment <= 10) { consRate = RULES.consultant.p1_10; manRate = hasAngel ? RULES.manager.withAngel.p1_10 : RULES.manager.noAngel.p1_10; if (hasAngel) angelRate = RULES.angel.p1_10; }
    else if (installment <= 13) { consRate = RULES.consultant.p11_13; manRate = hasAngel ? RULES.manager.withAngel.p11_13 : RULES.manager.noAngel.p11_13; if (hasAngel) angelRate = RULES.angel.p11_13; }
    else if (installment === 15) { consRate = RULES.consultant.p15; }

    return {
        cons: (credit * (consRate / 100)) * taxMultiplier,
        man: (credit * (manRate / 100)) * taxMultiplier,
        angel: (credit * (angelRate / 100)) * taxMultiplier
    };
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    const credit = parseCurrency(creditValue);
    if (!credit || !clientName || !selectedConsultant || !group || !quota || !selectedPV) {
      alert("Preencha todos os dados obrigatórios (Crédito, Cliente, Data, PV, Grupo, Cota, Consultor)");
      return;
    }

    const taxValue = parseFloat(taxRateInput.replace(',', '.')) || 0;
    const totals = isManualMode ? manualTotals : simulation.totals;

    const newCommission: Commission = {
      id: crypto.randomUUID(),
      date: saleDate,
      clientName: clientName,
      type: saleType,
      group: group,
      quota: quota,
      consultant: selectedConsultant,
      managerName: selectedManager || 'N/A',
      angelName: hasAngel ? selectedAngel : undefined,
      pv: selectedPV,
      value: credit,
      coefficient: 0,
      discount: 0,
      taxRate: taxValue, 
      netValue: totals.grandTotal * (1 - (taxValue/100)),
      installments: 15,
      currentInstallment: 1,
      status: 'Prox Mês',
      consultantValue: totals.consultant,
      managerValue: totals.manager,
      angelValue: totals.angel,
      receivedValue: 0,
      isManual: isManualMode
    };

    addCommission(newCommission);
    setActiveTab('history');
    
    setClientName(''); setCreditValue(''); setGroup(''); setQuota(''); setSelectedPV('');
    alert("Venda registrada com sucesso!");
  };

  const handleUpdateStatus = (id: string, newStatus: CommissionStatus) => { updateCommission(id, { status: newStatus }); };
  const handleUpdateInstallment = (id: string, current: number, delta: number) => { const newVal = Math.max(0, Math.min(15, current + delta)); updateCommission(id, { currentInstallment: newVal }); };
  const clearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterConsultant(''); setFilterAngel(''); setFilterPV(''); setFilterStatus(''); setSearchTerm(''); };
  const handleAddPV = () => { const newPVName = prompt("Digite o nome do novo Ponto de Venda (PV):"); if (newPVName && newPVName.trim()) { addPV(newPVName.trim()); setSelectedPV(newPVName.trim()); } };

  const consultants = teamMembers.filter(m => m.role === 'Consultor' || m.role === 'Autorizado');
  const managers = teamMembers.filter(m => m.role === 'Gestor');
  const angels = teamMembers.filter(m => m.role === 'Anjo');

  const filteredHistory = useMemo(() => {
    return commissions.filter(c => {
        if (isAngelMode && !c.angelName) return false;
        const matchesSearch = searchTerm === '' || c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || c.consultant.toLowerCase().includes(searchTerm.toLowerCase()) || c.pv.toLowerCase().includes(searchTerm.toLowerCase()) || c.group.includes(searchTerm);
        const matchesStart = filterStartDate ? c.date >= filterStartDate : true;
        const matchesEnd = filterEndDate ? c.date <= filterEndDate : true;
        const matchesConsultant = filterConsultant ? c.consultant === filterConsultant : true;
        const matchesAngel = filterAngel ? c.angelName === filterAngel : true;
        const matchesPV = filterPV ? c.pv === filterPV : true;
        const matchesStatus = filterStatus ? c.status === filterStatus : true;
        return matchesSearch && matchesStart && matchesEnd && matchesConsultant && matchesAngel && matchesPV && matchesStatus;
    });
  }, [commissions, searchTerm, filterStartDate, filterEndDate, filterConsultant, filterAngel, filterPV, filterStatus, isAngelMode]);

  const filteredTotals = useMemo(() => {
      return filteredHistory.reduce((acc, c) => {
          const monthVals = getInstallmentValues(c);
          return { totalSold: acc.totalSold + c.value, totalCons: acc.totalCons + monthVals.cons, totalMan: acc.totalMan + monthVals.man, totalAngel: acc.totalAngel + monthVals.angel };
      }, { totalSold: 0, totalCons: 0, totalMan: 0, totalAngel: 0 });
  }, [filteredHistory]);

  const formatAndSetCurrency = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    if (v === 'NaN,NaN') v = '';
    setter(v);
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
                        {/* NOVO: Seletor de Modo Manual */}
                        <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <div><span className="block font-medium text-blue-900 dark:text-blue-200">Cálculo Manual?</span><span className="text-xs text-blue-600 dark:text-blue-400">Insira os valores totais</span></div>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isManualMode} onChange={() => setIsManualMode(!isManualMode)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div></label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                     <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <p className="text-blue-100 text-xs font-bold uppercase">Total Consultor (Bruto)</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(displayTotals.consultant)}</p>
                        {!isManualMode && <p className="text-xs opacity-80 mt-1">~{((displayTotals.consultant / simulation.credit) * 100 || 0).toFixed(2)}% do crédito</p>}
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Total Gestor (Bruto)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(displayTotals.manager)}</p>
                     </div>
                     {hasAngel && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50 shadow-sm">
                            <p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold uppercase">Total Anjo (Bruto)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(displayTotals.angel)}</p>
                        </div>
                     )}
                </div>

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Salvar Venda</h3>
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
                            <select required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2 mb-2" value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)}><option value="">Selecione o Consultor</option>{consultants.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            <select className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2 mb-2" value={selectedManager} onChange={e => setSelectedManager(e.target.value)}><option value="">Selecione o Gestor</option>{managers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select>
                            {hasAngel && (<select required className="w-full border-gray-300 dark:border-slate-600 rounded-md text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white p-2" value={selectedAngel} onChange={e => setSelectedAngel(e.target.value)}><option value="">Selecione o Anjo</option>{angels.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select>)}
                        </div>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg shadow-green-600/20"><Save className="w-4 h-4" /><span>Registrar Venda</span></button>
                    </form>
                 </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900 dark:text-white">Detalhamento por Parcela (Valores Brutos)</h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-600">Base: {creditValue || 'R$ 0,00'}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                                <tr>
                                    <th className="px-6 py-3">{isManualMode ? 'Total Bruto' : 'Parcela'}</th>
                                    <th className="px-6 py-3 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300"><div className="flex flex-col"><span>Consultor</span><span className="text-[10px] opacity-70">{isManualMode ? 'Valor Total' : 'Coeficiente'}</span></div></th>
                                    <th className="px-6 py-3"><div className="flex flex-col"><span>Gestor</span><span className="text-[10px] opacity-70">{isManualMode ? 'Valor Total' : 'Coeficiente'}</span></div></th>
                                    {hasAngel && (<th className="px-6 py-3 bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300"><div className="flex flex-col"><span>Anjo</span><span className="text-[10px] opacity-70">{isManualMode ? 'Valor Total' : 'Coeficiente'}</span></div></th>)}
                                    <th className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">Total Pago</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-700 dark:text-gray-300">
                                {isManualMode ? (
                                    <tr className="bg-blue-50/20 dark:bg-blue-900/10">
                                        <td className="px-6 py-4 font-medium">Valores Totais</td>
                                        <td className="px-6 py-4"><input type="text" placeholder="0,00" value={manualConsultantTotal} onChange={formatAndSetCurrency(setManualConsultantTotal)} className="w-full p-2 rounded border border-blue-200 bg-white dark:bg-slate-700 dark:border-slate-600" /></td>
                                        <td className="px-6 py-4"><input type="text" placeholder="0,00" value={manualManagerTotal} onChange={formatAndSetCurrency(setManualManagerTotal)} className="w-full p-2 rounded border border-gray-200 bg-white dark:bg-slate-700 dark:border-slate-600" /></td>
                                        {hasAngel && <td className="px-6 py-4"><input type="text" placeholder="0,00" value={manualAngelTotal} onChange={formatAndSetCurrency(setManualAngelTotal)} className="w-full p-2 rounded border border-yellow-200 bg-white dark:bg-slate-700 dark:border-slate-600" /></td>}
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(manualTotals.grandTotal)}</td>
                                    </tr>
                                ) : (
                                    simulation.breakdown.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-medium">{row.label}<div className="text-xs text-gray-400 font-normal mt-0.5">{row.count}x parcelas</div></td>
                                            <td className="px-6 py-4 bg-blue-50/30 dark:bg-blue-900/5 text-blue-900 dark:text-blue-100 font-medium"><div>{formatCurrency(row.cons.val)}</div><div className="text-xs text-blue-500 mt-1">{formatPercent(row.cons.rate)}</div></td>
                                            <td className="px-6 py-4">{row.man.val > 0 ? ( <><div>{formatCurrency(row.man.val)}</div><div className="text-xs text-gray-500 mt-1">{formatPercent(row.man.rate)}</div></> ) : <span className="text-gray-400">-</span>}</td>
                                            {hasAngel && (<td className="px-6 py-4 bg-yellow-50/30 dark:bg-yellow-900/5 text-yellow-900 dark:text-yellow-100">{row.angel.val > 0 ? ( <><div>{formatCurrency(row.angel.val)}</div><div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{formatPercent(row.angel.rate)}</div></> ) : <span className="text-gray-400">-</span>}</td>)}
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(row.cons.val + row.man.val + row.angel.val)}<div className="text-xs text-gray-400 font-normal mt-0.5">por parcela</div></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-200 dark:border-slate-600 font-bold">
                                <tr>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">TOTAIS {isManualMode ? '' : '(15 Parc.)'}</td>
                                    <td className="px-6 py-4 text-blue-700 dark:text-blue-300">{formatCurrency(displayTotals.consultant)}</td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">{formatCurrency(displayTotals.manager)}</td>
                                    {hasAngel && <td className="px-6 py-4 text-yellow-700 dark:text-yellow-300">{formatCurrency(displayTotals.angel)}</td>}
                                    <td className="px-6 py-4 text-right text-lg text-green-600 dark:text-green-400">{formatCurrency(displayTotals.grandTotal)}</td>
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
                         <button onClick={() => setIsAngelMode(!isAngelMode)} className={`text-xs flex items-center px-3 py-1.5 rounded-full border transition-all font-medium ${isAngelMode ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>{isAngelMode ? <Crown className="w-3.5 h-3.5 mr-1.5 fill-yellow-500 text-yellow-600" /> : <Crown className="w-3.5 h-3.5 mr-1.5" />}{isAngelMode ? 'Modo Anjo Ativo' : 'Modo Pagamento Anjo'}</button>
                        {(filterStartDate || filterEndDate || filterConsultant || filterAngel || filterPV || filterStatus || searchTerm) && (<button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition"><XCircle className="w-3 h-3 mr-1" />Limpar Filtros</button>)}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Busca Geral</label><div className="relative"><input type="text" placeholder="Cliente, Grupo..." className="w-full pl-9 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" /></div></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">De (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Até (Data)</label><input type="date" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Consultor</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterConsultant} onChange={e => setFilterConsultant(e.target.value)}><option value="">Todos</option>{teamMembers.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Anjo (Participação)</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterAngel} onChange={e => setFilterAngel(e.target.value)}><option value="">Todos</option>{angels.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ponto de Venda (PV)</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterPV} onChange={e => setFilterPV(e.target.value)}><option value="">Todos</option>{pvs.map(pv => (<option key={pv} value={pv}>{pv}</option>))}</select></div>
                    <div className="col-span-1"><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status Mês</label><select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Todos</option><option value="Prox Mês">Prox Mês</option><option value="Pago">Pago</option><option value="Atraso">Atraso</option><option value="Concluído">Concluído</option><option value="Cancelado">Cancelado</option></select></div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${isAngelMode ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4`}>
                 <div className="bg-brand-500 text-white p-4 rounded-xl shadow-md"><p className="text-blue-100 text-xs font-bold uppercase">Total Vendas (Seleção)</p><p className="text-2xl font-bold mt-1">{formatCurrency(filteredTotals.totalSold)}</p></div>
                 {!isAngelMode && (<><div className="bg-blue-600 text-white p-4 rounded-xl shadow-md"><p className="text-blue-100 text-xs font-bold uppercase">Liq. Consultores (Mês)</p><p className="text-2xl font-bold mt-1">{formatCurrency(filteredTotals.totalCons)}</p></div><div className="bg-gray-700 text-white p-4 rounded-xl shadow-md"><p className="text-gray-300 text-xs font-bold uppercase">Liq. Gestores (Mês)</p><p className="text-2xl font-bold mt-1">{formatCurrency(filteredTotals.totalMan)}</p></div></>)}
                 <div className={`text-white p-4 rounded-xl shadow-md ${isAngelMode ? 'bg-yellow-500 ring-4 ring-yellow-200 dark:ring-yellow-900/50 scale-105' : 'bg-yellow-600'}`}><p className="text-yellow-100 text-xs font-bold uppercase flex items-center">{isAngelMode && <Crown className="w-4 h-4 mr-2" />}Liq. Anjos (Mês)</p><p className="text-3xl font-bold mt-1">{formatCurrency(filteredTotals.totalAngel)}</p></div>
            </div>

            <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden ${isAngelMode ? 'border-yellow-300 dark:border-yellow-700/50' : 'border-gray-200 dark:border-slate-700'}`}>
                {isAngelMode && (<div className="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-2 text-xs text-yellow-800 dark:text-yellow-200 font-bold border-b border-yellow-100 dark:border-yellow-900/30 text-center uppercase tracking-wider">Visualização Exclusiva de Pagamentos para Investidores (Anjos)</div>)}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className={`text-gray-900 dark:text-white font-medium uppercase tracking-wider text-xs ${isAngelMode ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                            <tr>
                                <th className="px-6 py-3">Data Venda</th><th className="px-6 py-3">Cliente / Detalhes</th><th className="px-6 py-3">Parcela Atual</th>
                                <th className={`px-6 py-3 w-48 ${isAngelMode ? 'bg-yellow-100/50 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}><div className="flex flex-col"><span>{isAngelMode ? 'Pagamento Anjo' : 'Recebimento Líquido'}</span><span className="text-[10px] normal-case opacity-70">Descontado Imposto</span></div></th>
                                <th className="px-6 py-3 text-center">Status Mês</th><th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredHistory.length === 0 ? (<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">{isAngelMode ? 'Nenhuma venda com Anjo encontrada.' : 'Nenhuma venda encontrada com os filtros selecionados.'}</td></tr>) : (
                                filteredHistory.map(c => {
                                    const monthlyValues = getInstallmentValues(c);
                                    const currentInstallment = c.currentInstallment ?? 1;
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-gray-900 dark:text-white"><Calendar className="w-4 h-4 mr-2 text-gray-400" />{new Date(c.date).toLocaleDateString()}</div><div className="flex items-center text-gray-400 dark:text-gray-500 text-xs mt-1 ml-6"><MapPin className="w-3 h-3 mr-1" />{c.pv}</div></td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white flex items-center">{c.clientName} {c.isManual && <Wand2 className="w-3 h-3 ml-2 text-blue-400" title="Comissão Manual" />}</div>
                                                <div className="text-xs text-gray-500 mb-1">{formatCurrency(c.value)}</div>
                                                <div className="flex flex-col text-xs space-y-1"><span className="flex items-center text-gray-600 dark:text-gray-300">{c.type === 'Veículo' ? <Car className="w-3 h-3 mr-1" /> : <Home className="w-3 h-3 mr-1" />}{c.group} / {c.quota}</span>{!isAngelMode && <span className="text-gray-400">Imp: {c.taxRate}%</span>}</div>
                                            </td>
                                            <td className="px-6 py-4"><div className="flex items-center justify-start space-x-2"><button onClick={() => handleUpdateInstallment(c.id, currentInstallment, -1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 disabled:opacity-30" disabled={currentInstallment <= 0}><ChevronLeft className="w-4 h-4" /></button><span className={`font-mono font-medium w-12 text-center ${currentInstallment === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{currentInstallment} / 15</span><button onClick={() => handleUpdateInstallment(c.id, currentInstallment, 1)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 disabled:opacity-30" disabled={currentInstallment >= 15}><ChevronRight className="w-4 h-4" /></button></div>{currentInstallment === 0 && <span className="text-[10px] text-gray-400 block mt-1 ml-1">Aguardando...</span>}</td>
                                            <td className={`px-6 py-4 border-l border-r border-gray-100 dark:border-slate-700/50 ${isAngelMode ? 'bg-yellow-50/20 dark:bg-yellow-900/10' : 'bg-blue-50/20 dark:bg-blue-900/5'}`}>
                                                <div className="space-y-1.5 text-xs">
                                                    {!isAngelMode && (<><div className="flex justify-between items-center"><span className="text-blue-600 dark:text-blue-400 font-medium truncate w-20" title={c.consultant}>{c.consultant.split(' ')[0]}</span><span className={`font-bold ${monthlyValues.cons === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(monthlyValues.cons)}</span></div><div className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400 truncate w-20" title={c.managerName}>{c.managerName.split(' ')[0]}</span><span className={`font-medium ${monthlyValues.man === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(monthlyValues.man)}</span></div></>)}
                                                    {c.angelName && (<div className="flex justify-between items-center"><span className="text-yellow-600 dark:text-yellow-400 truncate w-20 font-bold" title={c.angelName}>{c.angelName.split(' ')[0]}</span><span className={`font-bold text-sm ${monthlyValues.angel === 0 ? 'text-gray-400' : 'text-yellow-700 dark:text-yellow-300'}`}>{formatCurrency(monthlyValues.angel)}</span></div>)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><select value={c.status} onChange={(e) => handleUpdateStatus(c.id, e.target.value as CommissionStatus)} className={`text-xs font-bold py-1 px-3 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${getStatusColor(c.status)}`}><option value="Prox Mês">Prox Mês</option><option value="Pago">Pago</option><option value="Atraso">Atraso</option><option value="Cancelado">Cancelado</option><option value="Concluído">Concluído</option></select></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => { if(confirm('Excluir este registro?')) deleteCommission(c.id) }} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};