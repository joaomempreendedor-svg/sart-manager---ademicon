import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, DollarSign, Home, Loader2, Moon, Sun, TrendingUp, User } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Commission, InstallmentInfo } from '@/types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getInstallmentValues = (credit: number, installment: number, taxRate: number = 0) => {
  const rules = { p1_10: 0.001288, p11_13: 0.002374, p15: 0.003 };
  let rate = 0;
  if (installment <= 10) rate = rules.p1_10;
  else if (installment <= 13) rate = rules.p11_13;
  else if (installment === 15) rate = rules.p15;
  const taxMultiplier = 1 - (taxRate / 100);
  const value = credit * rate * taxMultiplier;
  return value;
};

const getOverallStatus = (installmentDetails: Record<string, InstallmentInfo>): string => {
  const statuses = Object.values(installmentDetails).map(info => info.status);
  if (statuses.every(s => s === 'Pago')) return 'Concluído';
  if (statuses.some(s => s === 'Atraso')) return 'Atraso';
  if (statuses.some(s => s === 'Cancelado')) return 'Cancelado';
  return 'Em Andamento';
};

const statusColors: Record<string, string> = {
  'Em Andamento': 'bg-blue-100 text-blue-800',
  'Atraso': 'bg-red-100 text-red-800',
  'Concluído': 'bg-green-100 text-green-800',
  'Cancelado': 'bg-gray-100 text-gray-800',
};

const installmentStatusColors: Record<string, string> = {
  'Pago': 'bg-emerald-500',
  'Pendente': 'bg-amber-400',
  'Atraso': 'bg-red-500',
  'Cancelado': 'bg-gray-400',
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
        const installmentInfo = info as InstallmentInfo;
        totalInstallmentsCount++;
        if (installmentInfo.status === 'Pago') {
          totalPaidInstallments++;
          totalPaid += getInstallmentValues(c.value, parseInt(num), c.taxRate || 0);
        } else if (installmentInfo.status === 'Pendente' || installmentInfo.status === 'Atraso') {
          totalPending += getInstallmentValues(c.value, parseInt(num), c.taxRate || 0);
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
          <Button variant="outline" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
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
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-blue-100 p-3.5 text-blue-600"><Home className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-slate-500">Total de Vendas</p>
                <p className="text-3xl font-bold">{commissions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-violet-100 p-3.5 text-violet-600"><DollarSign className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-slate-500">Crédito Total</p>
                <p className="text-3xl font-bold">{formatCurrency(commissions.reduce((s, c) => s + c.value, 0))}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-100 p-3.5 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-slate-500">Recebido</p>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(stats.totalPaid)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-amber-100 p-3.5 text-amber-600"><Calendar className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-slate-500">A Receber</p>
                <p className="text-3xl font-bold text-amber-700">{formatCurrency(stats.totalPending)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-slate-600">Progresso Geral</p>
              <p className="text-sm font-bold">{stats.totalPaidInstallments}/{stats.totalInstallmentsCount} parcelas ({stats.totalInstallmentsCount > 0 ? Math.round((stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100) : 0}%)</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${stats.totalPaidInstallments === stats.totalInstallmentsCount ? 'bg-emerald-500' : stats.totalPaidInstallments / stats.totalInstallmentsCount > 0.5 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${stats.totalInstallmentsCount > 0 ? (stats.totalPaidInstallments / stats.totalInstallmentsCount) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {commissions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-semibold">Nenhuma venda encontrada</h2>
              <p className="mt-1 text-sm text-slate-500">Não há comissões registradas para este consultor.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {commissions.map(c => {
              const paidCount = Object.values(c.installmentDetails).filter(s => s.status === 'Pago').length;
              const status = getOverallStatus(c.installmentDetails);
              const isExpanded = expandedRow === c.db_id;
              let paidValue = 0;
              Object.entries(c.installmentDetails).forEach(([num, info]) => {
                if (info.status === 'Pago') {
                  paidValue += getInstallmentValues(c.value, parseInt(num), c.taxRate || 0);
                }
              });
              const consultantTotal = c.consultantValue || 0;

              return (
                <Card key={c.db_id} className="overflow-hidden">
                  <div className="cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : c.db_id!)}>
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`rounded-xl p-3 ${c.type === 'Imóvel' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            <Home className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{c.clientName}</h3>
                            <p className="text-sm text-slate-500">{c.group}/{c.quota} · {new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')} · {c.pv}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Crédito</p>
                            <p className="font-bold">{formatCurrency(c.value)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Meu valor</p>
                            <p className="font-bold text-emerald-700">{formatCurrency(consultantTotal)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Recebido</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(paidValue)}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status] || ''}`}>{status}</span>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{paidCount}/15 parcelas pagas</span>
                          <span>{Math.round((paidCount / 15) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${paidCount === 15 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${(paidCount / 15) * 100}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-slate-50 px-5 py-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Parcelas</h4>
                      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-2">
                        {Object.entries(c.installmentDetails).map(([num, info]) => {
                          const installmentInfo = info as InstallmentInfo;
                          const st = installmentInfo?.status || 'Pendente';
                          const dotColor = installmentStatusColors[st] || 'bg-gray-400';
                          const val = getInstallmentValues(c.value, parseInt(num), c.taxRate || 0);
                          return (
                            <div key={num} className={`text-center p-2 rounded-lg text-xs border ${
                              st === 'Pago' ? 'bg-emerald-50 border-emerald-200' : st === 'Atraso' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                            }`}>
                              <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1 ${dotColor}`} />
                              <div className="font-semibold text-slate-700">{num}</div>
                              <div className="text-slate-500 text-[10px]">{formatCurrency(val)}</div>
                              {installmentInfo.competenceMonth && (
                                <div className="text-[9px] text-purple-600 font-medium mt-0.5">
                                  {installmentInfo.competenceMonth.slice(5, 7)}/{installmentInfo.competenceMonth.slice(2, 4)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const Button = ({ children, variant, size, onClick, title, className, ...props }: any) => {
  return (
    <button onClick={onClick} title={title} className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition ${variant === 'outline' ? 'border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700' : 'bg-brand-600 text-white hover:bg-brand-700'} ${size === 'icon' ? 'h-9 w-9' : 'h-9 px-4'} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className || ''}`}>{children}</div>
);

const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export default PublicCommissionConference;
