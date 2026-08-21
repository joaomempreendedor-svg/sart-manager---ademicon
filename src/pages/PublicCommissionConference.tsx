import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Crown, DollarSign, Filter, Home, Loader2, Moon, Sun, TrendingUp, User, Paperclip } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Commission, InstallmentInfo } from '@/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getInstallmentValues = (commission: Commission, installment: number) => {
  const credit = commission.value;
  const taxRate = commission.taxRate || 0;
  const taxMultiplier = 1 - (taxRate / 100);
  const hasAngel = !!commission.angelName;
  let consRate = 0, manRate = 0, angelRate = 0;

  if (commission.customRules && commission.customRules.length > 0) {
    const rule = commission.customRules.find(r => installment >= r.startInstallment && installment <= r.endInstallment);
    if (rule) {
      consRate = rule.consultantRate / 100;
      manRate = rule.managerRate / 100;
      angelRate = hasAngel ? rule.angelRate / 100 : 0;
    }
  } else {
    const manRules = hasAngel
      ? { p1_10: 0.000194, p11_13: 0.000356 }
      : { p1_10: 0.000322, p11_13: 0.000593 };
    if (installment <= 10) {
      consRate = 0.001288; manRate = manRules.p1_10;
      if (hasAngel) angelRate = 0.0001288;
    } else if (installment <= 13) {
      consRate = 0.002374; manRate = manRules.p11_13;
      if (hasAngel) angelRate = 0.0002374;
    } else if (installment === 15) {
      consRate = 0.003;
    }
  }

  return {
    cons: credit * consRate * taxMultiplier,
    man: credit * manRate * taxMultiplier,
    angel: credit * angelRate * taxMultiplier,
  };
};

const getOverallStatus = (installmentDetails: Record<string, InstallmentInfo>): string => {
  const statuses = Object.values(installmentDetails).map(info => info.status);
  if (statuses.every(s => s === 'Pago')) return 'Concluído';
  if (statuses.some(s => s === 'Atraso')) return 'Atraso';
  if (statuses.some(s => s === 'Cancelado')) return 'Cancelado';
  return 'Em Andamento';
};

const getInstallmentStatusColor = (status: string) => {
  switch (status) {
    case 'Pago': return 'bg-green-100 text-green-800 border-green-200';
    case 'Atraso': return 'bg-red-100 text-red-800 border-red-200';
    case 'Cancelado': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  }
};

const statusColors: Record<string, string> = {
  'Em Andamento': 'bg-blue-100 text-blue-800',
  'Atraso': 'bg-red-100 text-red-800',
  'Concluído': 'bg-green-100 text-green-800',
  'Cancelado': 'bg-gray-100 text-gray-800',
};

const rowBgColor: Record<string, string> = {
  'Em Andamento': 'bg-yellow-50',
  'Atraso': 'bg-red-50',
  'Concluído': 'bg-green-50',
  'Cancelado': 'bg-gray-50',
};

type RoleType = 'consultant' | 'angel';

interface CommissionWithRole extends Commission {
  myRole: RoleType;
  myValue: number;
}

const PublicCommissionConference = () => {
  const { ownerId, consultantName } = useParams<{ ownerId: string; consultantName: string }>();
  const { theme, toggleTheme } = useApp();
  const [allCommissions, setAllCommissions] = useState<CommissionWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'vendas' | 'proventos'>('vendas');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'consultant' | 'angel'>('all');
  const [displayName, setDisplayName] = useState('');
  const [receipts, setReceipts] = useState<{ consultant_name: string; competence_month: string; file_url: string; file_name: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!ownerId || !consultantName) return;
    setIsLoading(true);
    const decodedName = decodeURIComponent(consultantName);

    const { data: teamData } = await supabase
      .from('public_metric_consultants')
      .select('name')
      .eq('user_id', ownerId);

    const registeredNames = (teamData || []).map(t => t.name);
    const matchedName = registeredNames.find(n => n.toLowerCase() === decodedName.toLowerCase()) || decodedName;

    const { data, error } = await supabase
      .from('commissions')
      .select('id, data, created_at')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar comissões:', error);
      setIsLoading(false);
      return;
    }

    const results: CommissionWithRole[] = [];

    (data || []).forEach(item => {
      const commission = item.data as Commission;
      if (!commission.installmentDetails) {
        const details: Record<string, InstallmentInfo> = {};
        for (let i = 1; i <= 15; i++) details[i.toString()] = { status: 'Pendente' };
        commission.installmentDetails = details;
      }

      const full = { ...commission, db_id: item.id, criado_em: item.created_at } as Commission;

      if (commission.consultant === matchedName) {
        results.push({ ...full, myRole: 'consultant', myValue: commission.consultantValue || 0 });
      }

      if (commission.angelName === matchedName) {
        results.push({ ...full, myRole: 'angel', myValue: commission.angelValue || 0 });
      }
    });

    setAllCommissions(results);
    setDisplayName(matchedName);

    const { data: receiptsData } = await supabase
      .from('payment_receipts')
      .select('consultant_name, competence_month, file_url, file_name')
      .eq('gestor_id', ownerId)
      .eq('consultant_name', matchedName);
    setReceipts(receiptsData || []);

    setIsLoading(false);
  }, [ownerId, consultantName]);

  useEffect(() => { loadData(); }, [loadData]);

  const decodedName = displayName || (consultantName ? decodeURIComponent(consultantName) : '');

  const hasBothRoles = useMemo(() => {
    const hasConsultant = allCommissions.some(c => c.myRole === 'consultant');
    const hasAngel = allCommissions.some(c => c.myRole === 'angel');
    return hasConsultant && hasAngel;
  }, [allCommissions]);

  const filteredCommissions = useMemo(() => {
    if (!hasBothRoles || selectedRole === 'all') return allCommissions;
    return allCommissions.filter(c => c.myRole === selectedRole);
  }, [allCommissions, selectedRole, hasBothRoles]);

  const getReceiptForMonth = (month: string) => {
    return receipts.find(r => r.competence_month === month);
  };

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    allCommissions.forEach(c => {
      Object.values(c.installmentDetails).forEach(info => {
        if (info.competenceMonth) months.add(info.competenceMonth);
      });
    });
    return Array.from(months).sort();
  }, [filteredCommissions]);

  const monthlyForecast = useMemo(() => {
    const monthMap: Record<string, { paid: number; pending: number; delayed: number; details: { client: string; installment: number; value: number; status: string; role: RoleType }[] }> = {};

    filteredCommissions.forEach(c => {
      Object.entries(c.installmentDetails).forEach(([num, info]) => {
        const installmentInfo = info as InstallmentInfo;
        const month = installmentInfo.competenceMonth || 'sem-competencia';
        if (!monthMap[month]) monthMap[month] = { paid: 0, pending: 0, delayed: 0, details: [] };

        const values = getInstallmentValues(c, parseInt(num));
        const myVal = c.myRole === 'angel' ? values.angel : values.cons;

        if (installmentInfo.status === 'Pago') {
          monthMap[month].paid += myVal;
        } else if (installmentInfo.status === 'Atraso') {
          monthMap[month].delayed += myVal;
        } else {
          monthMap[month].pending += myVal;
        }

        if (!selectedMonth || month === selectedMonth) {
          monthMap[month].details.push({
            client: c.clientName,
            installment: parseInt(num),
            value: myVal,
            status: installmentInfo.status || 'Pendente',
            role: c.myRole,
          });
        }
      });
    });

    return monthMap;
  }, [filteredCommissions, selectedMonth]);

  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalPaidInstallments = 0;
    let totalInstallmentsCount = 0;
    let totalVolume = 0;

    filteredCommissions.forEach(c => {
      totalVolume += c.value || 0;
      Object.entries(c.installmentDetails).forEach(([num, info]) => {
        totalInstallmentsCount++;
        const values = getInstallmentValues(c, parseInt(num));
        const myVal = c.myRole === 'angel' ? values.angel : values.cons;
        if (info.status === 'Pago') {
          totalPaidInstallments++;
          totalPaid += myVal;
        } else if (info.status === 'Pendente' || info.status === 'Atraso') {
          totalPending += myVal;
        }
      });
    });

    return { totalPaid, totalPending, totalPaidInstallments, totalInstallmentsCount, totalVolume };
  }, [filteredCommissions]);

  const displayCommissions = useMemo(() => {
    if (!selectedMonth) return filteredCommissions;
    return filteredCommissions.filter(c => {
      return Object.values(c.installmentDetails).some(
        info => (info as InstallmentInfo).competenceMonth === selectedMonth
      );
    });
  }, [filteredCommissions, selectedMonth]);

  const filteredMonthData = selectedMonth ? monthlyForecast[selectedMonth] : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-lg shadow-emerald-600/20">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Minhas Comissões</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{decodedName}</p>
            </div>
          </div>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-8 py-8 text-white shadow-xl shadow-emerald-600/20">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
              <User className="h-4 w-4" /> Consultor
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">{decodedName}</h2>
            <p className="mt-2 text-sm text-white/75">{allCommissions.length} registro{allCommissions.length !== 1 ? 's' : ''} (vendas + anjo)</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><Home className="w-4 h-4 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 whitespace-nowrap">Total Vendas</p>
              <p className="text-base font-bold text-gray-900 whitespace-nowrap">{filteredCommissions.filter(c => c.myRole === 'consultant').length}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="p-2 bg-yellow-50 rounded-lg shrink-0"><Crown className="w-4 h-4 text-yellow-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 whitespace-nowrap">Vendas Anjo</p>
              <p className="text-base font-bold text-gray-900 whitespace-nowrap">{filteredCommissions.filter(c => c.myRole === 'angel').length}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0"><DollarSign className="w-4 h-4 text-purple-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 whitespace-nowrap">Volume Vendas</p>
              <p className="text-base font-bold text-purple-700 whitespace-nowrap">{formatCurrency(stats.totalVolume)}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg shrink-0"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 whitespace-nowrap">Recebido</p>
              <p className="text-base font-bold text-green-700 whitespace-nowrap">{formatCurrency(stats.totalPaid)}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="p-2 bg-yellow-50 rounded-lg shrink-0"><Calendar className="w-4 h-4 text-yellow-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 whitespace-nowrap">A Receber</p>
              <p className="text-base font-bold text-yellow-700 whitespace-nowrap">{formatCurrency(stats.totalPending)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
            <p className="text-sm font-bold text-gray-900">{stats.totalPaidInstallments}/{stats.totalInstallmentsCount} parcelas ({stats.totalInstallmentsCount > 0 ? Math.round((stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100) : 0}%)</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${stats.totalPaidInstallments === stats.totalInstallmentsCount ? 'bg-green-500' : stats.totalPaidInstallments / stats.totalInstallmentsCount > 0.5 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${stats.totalInstallmentsCount > 0 ? (stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button onClick={() => setViewMode('vendas')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${viewMode === 'vendas' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Home className="h-4 w-4" /> Vendas
            </button>
            <button onClick={() => setViewMode('proventos')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${viewMode === 'proventos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <TrendingUp className="h-4 w-4" /> Proventos por Mês
            </button>
          </div>
          {hasBothRoles && (
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button onClick={() => setSelectedRole('all')} className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition ${selectedRole === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Todos
              </button>
              <button onClick={() => setSelectedRole('consultant')} className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition ${selectedRole === 'consultant' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <User className="h-3 w-3" /> Consultor
              </button>
              <button onClick={() => setSelectedRole('angel')} className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition ${selectedRole === 'angel' ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Crown className="h-3 w-3" /> Anjo
              </button>
            </div>
          )}
          {viewMode === 'vendas' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">Todos os meses</option>
                {uniqueMonths.map(m => {
                  const [y, mo] = m.split('-');
                  const label = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return <option key={m} value={m}>{label}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        {viewMode === 'vendas' ? (
          displayCommissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
              <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-900">Nenhuma venda encontrada</h2>
              <p className="mt-1 text-sm text-gray-500">Não há comissões registradas para este consultor.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Função</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cliente / Produto</th>
                      <th className="px-4 py-3">Valor do Crédito</th>
                      <th className="px-4 py-3">Progresso & Status</th>
                      <th className="px-4 py-3 text-right">Meu Valor</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayCommissions.map(c => {
                      const paidCount = Object.values(c.installmentDetails).filter(s => s.status === 'Pago').length;
                      const status = getOverallStatus(c.installmentDetails);
                      const isExpanded = expandedRow === c.db_id;
                      const progressPercent = (paidCount / 15) * 100;
                      const progressColor = progressPercent === 100 ? 'bg-green-500' : progressPercent > 50 ? 'bg-blue-500' : 'bg-yellow-500';

                      let myPaid = 0;
                      Object.entries(c.installmentDetails).forEach(([num, info]) => {
                        if (info.status === 'Pago') {
                          const v = getInstallmentValues(c, parseInt(num));
                          myPaid += c.myRole === 'angel' ? v.angel : v.cons;
                        }
                      });

                      return (
                        <React.Fragment key={`${c.db_id}-${c.myRole}`}>
                          <tr className={`${rowBgColor[status]} hover:bg-gray-50 transition`}>
                            <td className="px-4 py-3">
                              {c.myRole === 'angel' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  <Crown className="h-3 w-3" /> Anjo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  <User className="h-3 w-3" /> Consultor
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-gray-900 flex items-center">
                                {c.clientName}
                                {c.angelName && c.myRole === 'angel' && <span className="ml-2 text-xs text-yellow-600">(sua comissão)</span>}
                              </div>
                              <div className="text-xs text-gray-500">
                                {c.group}/{c.quota} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === 'Imóvel' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{c.type === 'Imóvel' ? '🏠' : '🚗'} {c.type}</span>
                                {c.myRole === 'consultant' && <span className="ml-2 text-gray-400">· {c.consultant}</span>}
                                {c.myRole === 'angel' && <span className="ml-2 text-yellow-600">· Anjo: {c.angelName}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-base font-bold text-gray-900">{formatCurrency(c.value)}</div>
                              <div className="text-xs text-gray-500">PV: {c.pv}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>{status}</span>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{paidCount}/15</span><span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progressPercent}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-gray-900">{formatCurrency(c.myValue)}</div>
                              <div className="text-xs text-green-600">Recebido: {formatCurrency(myPaid)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => setExpandedRow(isExpanded ? null : c.db_id!)} className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
                                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={rowBgColor[status]}>
                              <td colSpan={7} className="p-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {Object.entries(c.installmentDetails).map(([num, info]) => {
                                    const installmentInfo = info as InstallmentInfo;
                                    const statusValue = installmentInfo?.status || 'Pendente';
                                    const values = getInstallmentValues(c, parseInt(num));
                                    const myVal = c.myRole === 'angel' ? values.angel : values.cons;
                                    return (
                                      <div key={num} className="text-center p-2 rounded-md border bg-white">
                                        <div className="text-xs text-gray-400">
                                          Parcela {num}
                                          {installmentInfo.competenceMonth && (
                                            <div className="text-[10px] text-purple-600 font-semibold">
                                              Comp: {installmentInfo.competenceMonth.slice(5, 7)}/{installmentInfo.competenceMonth.slice(2, 4)}
                                            </div>
                                          )}
                                        </div>
                                        <div className={`mt-1 w-full text-xs font-bold py-1 px-2 rounded border ${getInstallmentStatusColor(statusValue)}`}>
                                          {statusValue}
                                        </div>
                                        {statusValue === 'Pago' && (
                                          <div className="mt-1 text-[10px] font-semibold text-green-700">
                                            Receber até dia 05
                                          </div>
                                        )}
                                        <div className="mt-2 text-xs space-y-1 text-left text-gray-600">
                                          <div className="flex justify-between">
                                            <span>{c.myRole === 'angel' ? 'Anjo:' : 'Consultor:'}</span>
                                            <span className="font-medium text-gray-800">{formatCurrency(myVal)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {uniqueMonths.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-900">Nenhum mês com competência</h2>
                <p className="mt-1 text-sm text-gray-500">Aguarde o gestor registrar os pagamentos.</p>
              </div>
            ) : (
              uniqueMonths.map(month => {
                const data = monthlyForecast[month];
                const [y, mo] = month.split('-');
                const label = month === 'sem-competencia' ? 'Sem competência' : new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                const total = data.paid + data.pending + data.delayed;
                const isSelected = selectedMonth === month;

                return (
                  <div key={month} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}>
                    <div className="cursor-pointer p-5 flex items-center justify-between" onClick={() => setSelectedMonth(isSelected ? '' : month)}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50">
                          <Calendar className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 capitalize">{label}</h3>
                          <p className="text-xs text-gray-500">{data.details.length} parcela{data.details.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-green-600">Recebido</p>
                          <p className="font-bold text-green-700">{formatCurrency(data.paid)}</p>
                          {data.paid > 0 && (
                            <p className="text-[10px] text-green-600 font-medium">Esse valor será pago até o dia 05</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-900">{formatCurrency(total)}</p>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {data.details.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{d.client}</p>
                                <p className="text-xs text-gray-500">Parcela {d.installment} · {d.role === 'angel' ? '👑 Anjo' : '👤 Consultor'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">{formatCurrency(d.value)}</p>
                                <span className={`text-xs font-semibold ${d.status === 'Pago' ? 'text-green-600' : d.status === 'Atraso' ? 'text-red-600' : 'text-yellow-600'}`}>{d.status}</span>
                                {d.status === 'Pago' && (
                                  <p className="text-[10px] font-semibold text-green-700">Receber até dia 05</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {(() => {
                          const receipt = getReceiptForMonth(month);
                          if (!receipt) return null;
                          return (
                            <a
                              href={receipt.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 transition"
                            >
                              <Paperclip className="h-4 w-4" />
                              Ver comprovante de pagamento
                            </a>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicCommissionConference;
