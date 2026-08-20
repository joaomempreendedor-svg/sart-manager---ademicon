import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Crown, DollarSign, Home, Loader2, Moon, Sun, User } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Commission, InstallmentInfo } from '@/types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

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

const PublicCommissionConference = () => {
  const { ownerId, consultantName } = useParams<{ ownerId: string; consultantName: string }>();
  const { theme, toggleTheme } = useApp();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!ownerId || !consultantName) return;
    setIsLoading(true);

    const decodedName = decodeURIComponent(consultantName);

    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('user_id', ownerId)
      .eq('consultant', decodedName)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao carregar comissões:', error);
      setIsLoading(false);
      return;
    }

    const normalized = (data || []).map(row => ({
      ...row,
      db_id: row.id,
      installmentDetails: (row.installment_details || {}) as Record<string, InstallmentInfo>,
      customRules: (row.custom_rules || []) as any[],
    })) as Commission[];

    setCommissions(normalized);
    setIsLoading(false);
  }, [ownerId, consultantName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalPaidInstallments = 0;
    let totalInstallmentsCount = 0;

    commissions.forEach(c => {
      Object.entries(c.installmentDetails).forEach(([num, info]) => {
        totalInstallmentsCount++;
        if (info.status === 'Pago') {
          totalPaidInstallments++;
          totalPaid += getInstallmentValues(c, parseInt(num)).cons;
        } else if (info.status === 'Pendente' || info.status === 'Atraso') {
          totalPending += getInstallmentValues(c, parseInt(num)).cons;
        }
      });
    });

    return { totalPaid, totalPending, totalPaidInstallments, totalInstallmentsCount };
  }, [commissions]);

  const decodedName = consultantName ? decodeURIComponent(consultantName) : '';

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
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
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
            <p className="mt-2 text-sm text-white/75">{commissions.length} venda{commissions.length !== 1 ? 's' : ''} registrada{commissions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Home className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total de Vendas</p>
              <p className="text-xl font-bold text-gray-900">{commissions.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-violet-50 rounded-lg"><DollarSign className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Crédito Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(commissions.reduce((s, c) => s + c.value, 0))}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Recebido (Consultor)</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totalPaid)}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Calendar className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">A Receber (Consultor)</p>
              <p className="text-xl font-bold text-yellow-700">{formatCurrency(stats.totalPending)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
            <p className="text-sm font-bold text-gray-900">{stats.totalPaidInstallments}/{stats.totalInstallmentsCount} parcelas ({stats.totalInstallmentsCount > 0 ? Math.round((stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100) : 0}%)</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${stats.totalPaidInstallments === stats.totalInstallmentsCount ? 'bg-green-500' : stats.totalPaidInstallments / stats.totalInstallmentsCount > 0.5 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${stats.totalInstallmentsCount > 0 ? (stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {commissions.length === 0 ? (
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
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Cliente / Produto</th>
                    <th className="px-4 py-3">Valor do Crédito</th>
                    <th className="px-4 py-3">Progresso & Status</th>
                    <th className="px-4 py-3 text-right">Meu Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map(c => {
                    const paidCount = Object.values(c.installmentDetails).filter(s => s.status === 'Pago').length;
                    const status = getOverallStatus(c.installmentDetails);
                    const isExpanded = expandedRow === c.db_id;
                    const progressPercent = (paidCount / 15) * 100;
                    const progressColor = progressPercent === 100 ? 'bg-green-500' : progressPercent > 50 ? 'bg-blue-500' : 'bg-yellow-500';

                    return (
                      <React.Fragment key={c.db_id}>
                        <tr className={`${rowBgColor[status]} hover:bg-gray-50 transition`}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900 flex items-center">
                              {c.clientName}
                              {c.angelName && <Crown className="ml-2 h-3.5 w-3.5 text-yellow-500" />}
                            </div>
                            <div className="text-xs text-gray-500">
                              {c.group} / {c.quota} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === 'Imóvel' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{c.type === 'Imóvel' ? '🏠' : '🚗'} {c.type}</span>
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
                                <span>{paidCount}/15</span>
                                <span>{Math.round(progressPercent)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progressPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(c.consultantValue)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : c.db_id!)}
                              className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
                            >
                              <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className={rowBgColor[status]}>
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {Object.entries(c.installmentDetails).map(([num, info]) => {
                                  const installmentInfo = info as InstallmentInfo;
                                  const statusValue = installmentInfo?.status || 'Pendente';
                                  const values = getInstallmentValues(c, parseInt(num));
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
                                        <div className="mt-2 text-xs space-y-1 text-left text-gray-600">
                                          <div className="flex justify-between"><span>Consultor:</span> <span className="font-medium text-gray-800">{formatCurrency(values.cons)}</span></div>
                                          <div className="flex justify-between"><span>Gestor:</span> <span className="font-medium text-gray-800">{formatCurrency(values.man)}</span></div>
                                          {c.angelName && <div className="flex justify-between"><span>Anjo:</span> <span className="font-medium text-gray-800">{formatCurrency(values.angel)}</span></div>}
                                        </div>
                                      )}
                                      {statusValue !== 'Pago' && (
                                        <div className="mt-2 text-xs text-left text-gray-500">
                                          <div className="flex justify-between"><span>Consultor:</span> <span className="font-medium">{formatCurrency(values.cons)}</span></div>
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicCommissionConference;
