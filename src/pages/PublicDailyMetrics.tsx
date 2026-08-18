import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Send, TrendingUp, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetricConfig } from '@/types';

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

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().split('T')[0];
};

const formatValue = (value: number, type: DailyMetricConfig['type']) => {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  }
  return new Intl.NumberFormat('pt-BR').format(value);
};

const parseInputValue = (value: string, type: DailyMetricConfig['type']) => {
  const numericValue = Number(value.replace(',', '.')) || 0;
  return type === 'currency' ? Math.round(numericValue * 100) : Math.round(numericValue);
};

const PublicDailyMetrics = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [view, setView] = useState<ViewMode>('form');
  const [consultants, setConsultants] = useState<PublicMetricConsultant[]>([]);
  const [metrics, setMetrics] = useState<DailyMetricConfig[]>([]);
  const [entries, setEntries] = useState<PublicMetricEntry[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const { data, error } = await supabase
        .from('public_metric_entries')
        .select('*')
        .eq('entry_date', selectedDate)
        .in('metric_config_id', loadedMetrics.map(metric => metric.id));

      if (!error) setEntries(data || []);
    } else {
      setEntries([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [ownerId, selectedDate]);

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
        existingValues[metric.id] = metric.type === 'currency' ? String(entry.value / 100) : String(entry.value);
      }
    });
    setValues(existingValues);
  }, [selectedConsultantId, metrics, entries]);

  const selectedConsultant = consultants.find(consultant => consultant.id === selectedConsultantId);

  const metricSummaries = useMemo(() => metrics.map(metric => {
    const total = entries
      .filter(entry => entry.metric_config_id === metric.id)
      .reduce((sum, entry) => sum + Number(entry.value), 0);
    const teamTarget = Number(metric.target_value || 0) * consultants.length;
    const progress = teamTarget > 0 ? Math.min(100, Math.round((total / teamTarget) * 100)) : 0;
    return { metric, total, teamTarget, progress };
  }), [metrics, entries, consultants.length]);

  const submittedConsultants = useMemo(() => new Set(entries.map(entry => entry.consultant_id)).size, [entries]);

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
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setView('form')}
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
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-brand-600" /> Data dos resultados
          </div>
          <div className="flex gap-2">
            <Input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" onClick={() => loadPublicData(true)} disabled={isRefreshing}>
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
                      {metric.type === 'currency' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>}
                      <Input
                        id={metric.id}
                        type="number"
                        min="0"
                        step={metric.type === 'currency' ? '0.01' : '1'}
                        inputMode={metric.type === 'currency' ? 'decimal' : 'numeric'}
                        value={values[metric.id] || ''}
                        onChange={event => setValues(prev => ({ ...prev, [metric.id]: event.target.value }))}
                        className={metric.type === 'currency' ? 'pl-10' : ''}
                        placeholder="0"
                      />
                    </div>
                    {metric.target_value > 0 && (
                      <p className="text-xs text-slate-500">Meta diária: {formatValue(metric.target_value, metric.type)}</p>
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><UserRound className="h-5 w-5" /></div>
                  <div><p className="text-sm text-slate-500">Equipe</p><p className="text-2xl font-bold">{consultants.length}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" /></div>
                  <div><p className="text-sm text-slate-500">Responderam</p><p className="text-2xl font-bold">{submittedConsultants}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-lg bg-violet-100 p-3 text-violet-600 dark:bg-violet-950 dark:text-violet-300"><BarChart3 className="h-5 w-5" /></div>
                  <div><p className="text-sm text-slate-500">Métricas</p><p className="text-2xl font-bold">{metrics.length}</p></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {metricSummaries.map(({ metric, total, teamTarget, progress }) => (
                <Card key={metric.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><CardTitle className="text-base">{metric.label}</CardTitle><CardDescription>Total da equipe no dia</CardDescription></div>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{progress}%</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <strong className="text-2xl text-slate-900 dark:text-white">{formatValue(total, metric.type)}</strong>
                      <span className="text-xs text-slate-500">Meta da equipe: {formatValue(teamTarget, metric.type)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultado por consultor</CardTitle>
                <CardDescription>Detalhamento dos valores informados em {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500 dark:border-slate-800">
                      <th className="pb-3 pr-4 font-medium">Consultor</th>
                      {metrics.map(metric => <th key={metric.id} className="px-3 pb-3 text-right font-medium">{metric.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {consultants.map(consultant => (
                      <tr key={consultant.id} className="border-b last:border-0 dark:border-slate-800">
                        <td className="py-4 pr-4 font-medium">{consultant.name}</td>
                        {metrics.map(metric => {
                          const entry = entries.find(item => item.consultant_id === consultant.id && item.metric_config_id === metric.id);
                          return <td key={metric.id} className="px-3 py-4 text-right">{entry ? formatValue(Number(entry.value), metric.type) : '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicDailyMetrics;
