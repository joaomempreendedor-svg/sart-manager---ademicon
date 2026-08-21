import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Edit3, Loader2, Moon, RefreshCw, Send, ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetricConfig } from '@/types';
import { formatBRLFromCents, formatBRLInput, parseBRLInputToCents } from '@/utils/currencyUtils';
import { EditMetricEntryModal } from '@/components/gestor/EditMetricEntryModal';

interface PublicMetricConsultant {
  id: string;
  name: string;
  order_index: number;
}

interface PublicMetricEntry {
  id: string;
  consultant_id: string;
  metric_config_id: string;
  entry_date: string;
  value: number;
}

type ViewMode = 'form' | 'dashboard';
type PeriodMode = 'daily' | 'weekly';

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().split('T')[0];
};

const getISOWeekValue = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getWeekRange = (weekValue: string) => {
  const normalizedWeek = /^\d{4}-W\d{2}$/.test(weekValue) ? weekValue : getISOWeekValue();
  const [year, week] = normalizedWeek.split('-W').map(Number);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
};

const formatValue = (value: number, type: DailyMetricConfig['type']) => {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  }
  return new Intl.NumberFormat('pt-BR').format(value);
};

const parseInputValue = (value: string, type: DailyMetricConfig['type']) => {
  if (type === 'currency') return parseBRLInputToCents(value);
  return Math.round(Number(value) || 0);
};

const PublicDailyMetrics = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { user } = useAuth();
  const { theme, toggleTheme } = useApp();
  const isManager = Boolean(user && user.id === ownerId && (user.role === 'GESTOR' || user.role === 'ADMIN'));
  const [view, setView] = useState<ViewMode>('form');
  const [period, setPeriod] = useState<PeriodMode>('daily');
  const [consultants, setConsultants] = useState<PublicMetricConsultant[]>([]);
  const [metrics, setMetrics] = useState<DailyMetricConfig[]>([]);
  const [entries, setEntries] = useState<PublicMetricEntry[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedWeek, setSelectedWeek] = useState(getISOWeekValue());
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConsultantId, setEditingConsultantId] = useState('');
  const [editingConsultantName, setEditingConsultantName] = useState('');

  const loadPublicData = useCallback(async (showRefresh = false) => {
    if (!ownerId) return;
    if (showRefresh) setIsRefreshing(true);

    const [consultantsResult, metricsResult] = await Promise.all([
      supabase
        .from('public_metric_consultants')
        .select('id, name, order_index')
        .eq('user_id', ownerId)
        .eq('is_active', true)
        .order('order_index'),
      supabase
        .from('daily_metrics_config')
        .select('*')
        .eq('user_id', ownerId)
        .eq('is_active', true)
        .order('order_index'),
    ]);

    if (consultantsResult.error || metricsResult.error) {
      toast.error('Não foi possível carregar este painel de métricas.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const loadedConsultants = consultantsResult.data || [];
    const loadedMetrics = (metricsResult.data || []) as DailyMetricConfig[];
    setConsultants(loadedConsultants);
    setMetrics(loadedMetrics);

    if (loadedMetrics.length > 0) {
      const range = period === 'daily'
        ? { start: selectedDate, end: selectedDate }
        : getWeekRange(selectedWeek);
      const { data, error } = await supabase
        .from('public_metric_entries')
        .select('*')
        .gte('entry_date', range.start)
        .lte('entry_date', range.end)
        .in('metric_config_id', loadedMetrics.map(metric => metric.id));

      if (!error) setEntries(data || []);
    } else {
      setEntries([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [ownerId, period, selectedDate, selectedWeek]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const existingValues: Record<string, string> = {};
    metrics.forEach(metric => {
      const entry = entries.find(item => item.consultant_id === selectedConsultantId && item.metric_config_id === metric.id);
      if (!entry) {
        existingValues[metric.id] = '';
      } else {
        existingValues[metric.id] = metric.type === 'currency' ? formatBRLFromCents(entry.value) : String(entry.value);
      }
    });
    setValues(existingValues);
  }, [selectedConsultantId, metrics, entries]);

  const selectedConsultant = consultants.find(consultant => consultant.id === selectedConsultantId);

  const metricSummaries = useMemo(() => metrics.map(metric => {
    const total = entries
      .filter(entry => entry.metric_config_id === metric.id)
      .reduce((sum, entry) => sum + Number(entry.value), 0);
    const teamTarget = period === 'weekly'
      ? Number(metric.weekly_target_value || 0)
      : Number(metric.target_value || 0);
    const progress = teamTarget > 0 ? Math.round((total / teamTarget) * 100) : 0;
    const remaining = Math.max(0, teamTarget - total);
    return { metric, total, teamTarget, progress, remaining };
  }), [metrics, entries, period]);

  const submittedConsultants = useMemo(() => new Set(entries.map(entry => entry.consultant_id)).size, [entries]);
  const selectedWeekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);
  const periodLabel = period === 'daily'
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')
    : `${new Date(`${selectedWeekRange.start}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${selectedWeekRange.end}T12:00:00`).toLocaleDateString('pt-BR')}`;

  const handleSave = async () => {
    if (!selectedConsultantId) {
      toast.error('Selecione quem está preenchendo.');
      return;
    }
    if (metrics.length === 0) {
      toast.error('Ainda não existem métricas configuradas.');
      return;
    }

    setIsSaving(true);
    const payload = metrics.map(metric => ({
      consultant_id: selectedConsultantId,
      metric_config_id: metric.id,
      entry_date: selectedDate,
      value: parseInputValue(values[metric.id] || '0', metric.type),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('public_metric_entries')
      .upsert(payload, { onConflict: 'consultant_id,metric_config_id,entry_date' });

    setIsSaving(false);
    if (error) {
      toast.error('Não foi possível salvar os resultados. Tente novamente.');
      return;
    }

    toast.success(`Resultados de ${selectedConsultant?.name} salvos!`);
    await loadPublicData();
    setView('dashboard');
  };

  const handleManagerEdit = (consultantId: string, consultantName: string) => {
    setEditingConsultantId(consultantId);
    setEditingConsultantName(consultantName);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedEntries = async (updatedEntries: { metric_config_id: string; value: number }[]) => {
    const payload = updatedEntries.map(entry => ({
      consultant_id: editingConsultantId,
      metric_config_id: entry.metric_config_id,
      entry_date: selectedDate,
      value: entry.value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('public_metric_entries')
      .upsert(payload, { onConflict: 'consultant_id,metric_config_id,entry_date' });

    if (error) {
      throw error;
    }

    await loadPublicData();
  };

  const handleManagerDelete = async (consultant: PublicMetricConsultant) => {
    if (!window.confirm(`Excluir todos os resultados de ${consultant.name} em ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}?`)) return;

    const { error } = await supabase
      .from('public_metric_entries')
      .delete()
      .eq('consultant_id', consultant.id)
      .eq('entry_date', selectedDate)
      .in('metric_config_id', metrics.map(metric => metric.id));

    if (error) {
      toast.error('Não foi possível excluir os resultados.');
      return;
    }

    toast.success(`Resultados de ${consultant.name} excluídos.`);
    await loadPublicData();
  };

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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-600 p-2.5 text-white shadow-lg shadow-brand-600/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Resultados diários</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lançamento e acompanhamento da equipe</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Modo gestor
              </span>
            )}
            <Button variant="outline" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => { setView('form'); setPeriod('daily'); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${view === 'form' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <ClipboardCheck className="h-4 w-4" /> Preencher
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${view === 'dashboard' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <BarChart3 className="h-4 w-4" /> Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              {view === 'form' ? 'Data dos resultados' : 'Período do dashboard'}
            </div>
            {view === 'dashboard' && <p className="mt-1 text-xs text-slate-500">Visualizando {periodLabel}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {view === 'dashboard' && (
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button onClick={() => setPeriod('daily')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${period === 'daily' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}>Dia</button>
                <button onClick={() => setPeriod('weekly')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${period === 'weekly' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}>Semana</button>
              </div>
            )}
            {period === 'weekly' && view === 'dashboard' ? (
              <Input type="week" value={selectedWeek} onChange={event => setSelectedWeek(event.target.value)} className="w-full sm:w-auto" />
            ) : (
              <Input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-full sm:w-auto" />
            )}
            <Button variant="outline" size="icon" onClick={() => loadPublicData(true)} disabled={isRefreshing} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {consultants.length === 0 || metrics.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-semibold">Painel ainda não configurado</h2>
              <p className="mt-1 text-sm text-slate-500">O gestor precisa cadastrar consultores e métricas antes do primeiro lançamento.</p>
            </CardContent>
          </Card>
        ) : view === 'form' ? (
          <Card className="mx-auto max-w-2xl overflow-hidden">
            <CardHeader className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-brand-600" /> Informe seus resultados
              </CardTitle>
              <CardDescription>Selecione seu nome. Um novo envio na mesma data atualizará os valores anteriores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label>Quem está preenchendo?</Label>
                <Select value={selectedConsultantId} onValueChange={setSelectedConsultantId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione seu nome" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(consultant => (
                      <SelectItem key={consultant.id} value={consultant.id}>{consultant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {metrics.map(metric => (
                  <div key={metric.id} className="space-y-2">
                    <Label htmlFor={metric.id}>{metric.label}</Label>
                    <div className="relative">
                      <Input
                        id={metric.id}
                        type={metric.type === 'currency' ? 'text' : 'number'}
                        min={metric.type === 'currency' ? undefined : '0'}
                        step={metric.type === 'currency' ? undefined : '1'}
                        inputMode={metric.type === 'currency' ? 'numeric' : 'numeric'}
                        value={values[metric.id] || ''}
                        onChange={event => setValues(prev => ({
                          ...prev,
                          [metric.id]: metric.type === 'currency' ? formatBRLInput(event.target.value) : event.target.value,
                        }))}
                        placeholder={metric.type === 'currency' ? 'R$ 0,00' : '0'}
                      />
                    </div>
                    {metric.target_value > 0 && (
                      <p className="text-xs text-slate-500">Meta diária da equipe: {formatValue(metric.target_value, metric.type)}</p>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={!selectedConsultantId || isSaving} className="h-11 w-full text-base">
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {isSaving ? 'Salvando...' : 'Salvar resultados'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-violet-600 px-8 py-8 text-white shadow-xl shadow-brand-600/20">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <Sparkles className="h-4 w-4" /> Desempenho {period === 'weekly' ? 'semanal' : 'diário'}
                  </div>
                  <h2 className="text-3xl font-bold sm:text-4xl">Progresso da equipe</h2>
                  <p className="mt-2 text-sm text-white/75">{periodLabel}</p>
                </div>
                <div className="flex items-center gap-4 rounded-2xl bg-white/15 px-6 py-4 backdrop-blur">
                  <Trophy className="h-8 w-8 text-amber-300" />
                  <div>
                    <p className="text-xs text-white/70">Metas atingidas</p>
                    <p className="text-2xl font-bold">{metricSummaries.filter(item => item.teamTarget > 0 && item.progress >= 100).length} de {metrics.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-xl bg-blue-100 p-3.5 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><UserRound className="h-6 w-6" /></div>
                  <div><p className="text-sm text-slate-500">Equipe</p><p className="text-3xl font-bold">{consultants.length}</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-xl bg-emerald-100 p-3.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-6 w-6" /></div>
                  <div><p className="text-sm text-slate-500">{period === 'weekly' ? 'Participaram' : 'Responderam'}</p><p className="text-3xl font-bold">{submittedConsultants}</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-xl bg-violet-100 p-3.5 text-violet-600 dark:bg-violet-950 dark:text-violet-300"><BarChart3 className="h-6 w-6" /></div>
                  <div><p className="text-sm text-slate-500">Métricas</p><p className="text-3xl font-bold">{metrics.length}</p></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metricSummaries.map(({ metric, total, teamTarget, progress, remaining }) => {
                const hasTarget = teamTarget > 0;
                const reached = hasTarget && progress >= 100;
                const exceeded = Math.max(0, total - teamTarget);
                const balanceLabel = !hasTarget ? 'Sem meta' : reached ? 'Superou' : 'Falta';
                const balanceValue = !hasTarget
                  ? '—'
                  : reached
                    ? (exceeded > 0 ? `+${formatValue(exceeded, metric.type)}` : 'Atingida')
                    : formatValue(remaining, metric.type);

                return (
                  <Card key={metric.id} className={`relative overflow-hidden border-0 shadow-lg ring-1 transition-all hover:shadow-xl ${reached ? 'ring-emerald-300 dark:ring-emerald-800' : 'ring-slate-200 dark:ring-slate-800'}`}>
                    <div className={`absolute inset-y-0 left-0 w-1.5 ${reached ? 'bg-emerald-500' : 'bg-gradient-to-b from-brand-500 to-violet-500'}`} />
                    <CardContent className="p-5 pl-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`shrink-0 rounded-xl p-2.5 ${reached ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'}`}>
                            {reached ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{metric.label}</h3>
                            <p className="text-xs text-slate-500">Meta {period === 'weekly' ? 'semanal' : 'diária'} da equipe</p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${reached ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'}`}>
                          {progress}%
                        </span>
                      </div>

                      <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feito</p>
                          <p className="text-base font-bold text-slate-800 dark:text-white">{formatValue(total, metric.type)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meta</p>
                          <p className="text-base font-bold text-slate-800 dark:text-white">{formatValue(teamTarget, metric.type)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold uppercase tracking-wider ${reached ? 'text-emerald-500' : hasTarget ? 'text-amber-500' : 'text-slate-400'}`}>{balanceLabel}</p>
                          <p className={`text-base font-black ${reached ? 'text-emerald-600 dark:text-emerald-300' : hasTarget ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500'}`}>{balanceValue}</p>
                        </div>
                      </div>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${reached ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-violet-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Resultado por consultor</CardTitle>
                <CardDescription>
                  Detalhamento dos valores informados no período de {periodLabel}.
                  {isManager && period === 'weekly' && ' Selecione a visão diária para editar ou excluir lançamentos.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500 dark:border-slate-800">
                      <th className="pb-3 pr-4 font-semibold">Consultor</th>
                      {metrics.map(metric => <th key={metric.id} className="px-4 pb-3 text-right font-semibold">{metric.label}</th>)}
                      {isManager && period === 'daily' && <th className="pb-3 pl-4 text-right font-semibold">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {consultants.map(consultant => {
                      const consultantEntries = entries.filter(item => item.consultant_id === consultant.id);
                      const hasEntries = consultantEntries.length > 0;
                      return (
                        <tr key={consultant.id} className="border-b transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50">
                          <td className="py-4 pr-4 font-medium">{consultant.name}</td>
                          {metrics.map(metric => {
                            const metricEntries = consultantEntries.filter(item => item.metric_config_id === metric.id);
                            const consultantTotal = metricEntries.reduce((sum, entry) => sum + Number(entry.value), 0);
                            return <td key={metric.id} className="px-4 py-4 text-right font-semibold">{metricEntries.length > 0 ? formatValue(consultantTotal, metric.type) : '—'}</td>;
                          })}
                          {isManager && period === 'daily' && (
                            <td className="py-3 pl-4">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" disabled={!hasEntries} onClick={() => handleManagerEdit(consultant.id, consultant.name)} title="Editar lançamento">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" disabled={!hasEntries} onClick={() => handleManagerDelete(consultant)} className="text-red-500 hover:text-red-600" title="Excluir lançamento">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <EditMetricEntryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        consultantId={editingConsultantId}
        consultantName={editingConsultantName}
        entryDate={selectedDate}
        metrics={metrics}
        entries={entries}
        onSave={handleSaveEditedEntries}
      />
    </div>
  );
};

export default PublicDailyMetrics;
