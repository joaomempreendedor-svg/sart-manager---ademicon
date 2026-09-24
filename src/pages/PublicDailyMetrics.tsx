import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, CalendarCheck2, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Edit3, Info, Loader2, Lock, Moon, Phone, Plus, RefreshCw, Save, Send, ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, Trophy, UserRound, Users, X } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DailyMetricConfig } from '@/types';
import { EditMetricEntryModal } from '@/components/gestor/EditMetricEntryModal';

class MetricsErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error('PublicDailyMetrics crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
              <X className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">Algo deu errado ao abrir esta tela</h2>
            <p className="mt-1 text-sm break-words text-slate-500">{this.state.message || 'Erro desconhecido.'}</p>
            <Button onClick={() => this.setState({ hasError: false, message: '' })} className="mt-4 bg-brand-600 hover:bg-brand-700 text-white">
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PublicMetricConsultant {
  id: string;
  name: string;
  order_index: number;
  indication_token?: string | null;
}

interface PublicMetricEntry {
  id: string;
  consultant_id: string;
  metric_config_id: string;
  entry_date: string;
  value: number;
}

type ViewMode = 'form' | 'dashboard' | 'indications';
type PeriodMode = 'daily' | 'weekly' | 'monthly';

interface PublicMetricIndication {
  id: string;
  consultant_id: string;
  name: string;
  phone: string | null;
  entry_date: string;
  created_at: string;
}

const formatPhone = (phone: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
};

const isIndicationsMetric = (metric: DailyMetricConfig) => {
  const key = metric.metric_key.toLowerCase();
  return key === 'indicacoes' || key === 'indications' || key.includes('indicac') || metric.label.toLowerCase().includes('indicaç');
};

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

const getISOYearMonth = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthRange = (monthValue: string) => {
  const normalized = /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : getISOYearMonth();
  const [year, month] = normalized.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
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

const MONTHLY_TARGET_DAYS = 20;

const formatValue = (value: number, type: DailyMetricConfig['type']) => {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  }
  return new Intl.NumberFormat('pt-BR').format(value);
};

const parseInputValue = (value: string, type: DailyMetricConfig['type']) => {
  if (type === 'currency') {
    const str = String(value ?? '0').trim();
    const n = Number(str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str);
    return Math.round((Number.isFinite(n) ? n : 0) * 100);
  }
  return Math.round(Number(value) || 0);
};

const plainReais = (str: string) => {
  const s = String(str || '').trim();
  if (!s) return '';
  if (s.includes(',')) return s.replace(/\./g, '').replace(',', '.');
  if ((s.match(/\./g) || []).length > 1) return s.replace(/\./g, '');
  return s;
};

const formatReais = (value: string | number) => {
  const str = String(value ?? '');
  if (!str.trim() || !/\d/.test(str)) return '';
  const n = Number(str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toLocalISODate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().split('T')[0];
};

const shiftDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
};

const formatDayLabel = (isoDate: string, withYear = false) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR', withYear
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { day: '2-digit', month: '2-digit' });

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const getWeekdayShort = (isoDate: string) => WEEKDAYS[new Date(`${isoDate}T12:00:00`).getDay()];

const STATUS_WINDOW_DAYS = 7;

interface PublicMetricStatusEntry {
  consultant_id: string;
  entry_date: string;
}

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
  const [selectedMonthRange, setSelectedMonthRange] = useState(() => getMonthRange(getISOYearMonth()));
  const monthStart = selectedMonthRange.start;
  const monthEnd = selectedMonthRange.end;
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConsultantId, setEditingConsultantId] = useState('');
  const [editingConsultantName, setEditingConsultantName] = useState('');
  const [step, setStep] = useState(0);
  const [statusEntries, setStatusEntries] = useState<PublicMetricStatusEntry[]>([]);
  const [indications, setIndications] = useState<PublicMetricIndication[]>([]);
  const [isIndicationModalOpen, setIsIndicationModalOpen] = useState(false);
  const [indicationConsultantId, setIndicationConsultantId] = useState('');
  const [indicationName, setIndicationName] = useState('');
  const [indicationPhone, setIndicationPhone] = useState('');
  const [isSavingIndication, setIsSavingIndication] = useState(false);
  const [indicationsFilter, setIndicationsFilter] = useState('');
  const [indicationRows, setIndicationRows] = useState<{ name: string; phone: string }[]>([]);
  const [editingIndicationId, setEditingIndicationId] = useState<string | null>(null);
  const [lockedConsultant, setLockedConsultant] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadPublicData = useCallback(async (showRefresh = false) => {
    if (!ownerId) return;
    if (showRefresh) setIsRefreshing(true);

    const [consultantsResult, metricsResult] = await Promise.all([
      supabase
        .from('public_metric_consultants')
        .select('id, name, order_index, indication_token')
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
      const metricIds = loadedMetrics.map(metric => metric.id);
      const range = period === 'daily'
        ? { start: selectedDate, end: selectedDate }
        : period === 'weekly'
          ? getWeekRange(selectedWeek)
          : { start: monthStart, end: monthEnd };
      const statusStart = shiftDays(selectedDate, -(STATUS_WINDOW_DAYS - 1));

      const [periodResult, statusResult] = await Promise.all([
        supabase
          .from('public_metric_entries')
          .select('*')
          .gte('entry_date', range.start)
          .lte('entry_date', range.end)
          .in('metric_config_id', metricIds),
        supabase
          .from('public_metric_entries')
          .select('consultant_id, entry_date')
          .gte('entry_date', statusStart)
          .lte('entry_date', selectedDate)
          .in('metric_config_id', metricIds),
      ]);

      setEntries(periodResult.error ? [] : periodResult.data || []);
      setStatusEntries(statusResult.error ? [] : statusResult.data || []);
    } else {
      setEntries([]);
      setStatusEntries([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [ownerId, period, selectedDate, selectedWeek, monthStart, monthEnd]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const loadIndications = useCallback(async () => {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from('public_metric_indications')
      .select('*')
      .eq('user_id', ownerId)
      .order('entry_date', { ascending: false });
    if (!error) setIndications(data || []);
  }, [ownerId]);

  useEffect(() => {
    loadIndications();
  }, [loadIndications]);

  const tryUnlock = useCallback((consultorId: string, token: string) => {
    if (!consultorId || !token) return false;
    const match = consultants.find(consultant => consultant.id === consultorId && consultant.indication_token && consultant.indication_token === token);
    if (match) {
      setLockedConsultant(match.id);
      sessionStorage.setItem(`mm-ind-token-${ownerId}`, `${match.id}::${match.indication_token}`);
      return true;
    }
    return false;
  }, [consultants, ownerId]);

  useEffect(() => {
    if (!ownerId || consultants.length === 0 || lockedConsultant) return;
    const stored = sessionStorage.getItem(`mm-ind-token-${ownerId}`);
    if (stored) {
      const [storedId, storedToken] = stored.split('::');
      if (tryUnlock(storedId, storedToken)) return;
    }
    const urlConsultor = searchParams.get('consultor');
    const urlToken = searchParams.get('token');
    if (urlConsultor && urlToken) tryUnlock(urlConsultor, urlToken);
  }, [consultants, ownerId, lockedConsultant, searchParams, tryUnlock]);

  const handleAccess = () => {
    const token = accessCode.trim().toUpperCase();
    const match = consultants.find(consultant => consultant.indication_token && consultant.indication_token === token);
    if (!match) {
      setAccessError(true);
      return;
    }
    setAccessError(false);
    setLockedConsultant(match.id);
    sessionStorage.setItem(`mm-ind-token-${ownerId}`, `${match.id}::${match.indication_token}`);
    setSearchParams({ consultor: match.id, token: match.indication_token as string }, { replace: true });
    setAccessCode('');
    toast.success(`Olá, ${match.name}! Mostrando suas indicações.`);
  };

  const handleLockout = () => {
    setLockedConsultant(null);
    sessionStorage.removeItem(`mm-ind-token-${ownerId}`);
    setSearchParams({}, { replace: true });
  };

  const openIndicationModal = () => {
    setEditingIndicationId(null);
    setIndicationConsultantId(lockedConsultant || selectedConsultantId);
    setIndicationName('');
    setIndicationPhone('');
    setIsIndicationModalOpen(true);
  };

  const startEditIndication = (item: PublicMetricIndication) => {
    setEditingIndicationId(item.id);
    setIndicationConsultantId(item.consultant_id);
    setIndicationName(item.name);
    setIndicationPhone(item.phone || '');
    setIsIndicationModalOpen(true);
  };

  const handleRemoveIndication = async (item: PublicMetricIndication) => {
    if (!window.confirm(`Remover a indicação de ${item.name}?`)) return;
    const { data, error } = await supabase
      .from('public_metric_indications')
      .delete()
      .eq('id', item.id)
      .select('id');
    if (error || !data || data.length === 0) {
      toast.error('Não foi possível remover a indicação. Tente novamente.');
      return;
    }
    toast.success('Indicação removida.');
    await loadIndications();
  };

  const handleRegisterIndication = async () => {
    if (!indicationConsultantId) {
      toast.error('Selecione o consultor que registrou a indicação.');
      return;
    }
    if (!indicationName.trim()) {
      toast.error('Informe o nome da pessoa indicada.');
      return;
    }
    setIsSavingIndication(true);
    const payload = {
      consultant_id: indicationConsultantId,
      name: indicationName.trim(),
      phone: indicationPhone.trim() || null,
    };
    const { error } = editingIndicationId
      ? await supabase
          .from('public_metric_indications')
          .update(payload)
          .eq('id', editingIndicationId)
      : await supabase
          .from('public_metric_indications')
          .insert({ ...payload, user_id: ownerId, entry_date: selectedDate });
    setIsSavingIndication(false);
    if (error) {
      toast.error('Não foi possível salvar a indicação. Tente novamente.');
      return;
    }
    toast.success(editingIndicationId ? 'Indicação atualizada!' : 'Indicação registrada!');
    setEditingIndicationId(null);
    setIndicationName('');
    setIndicationPhone('');
    setIsIndicationModalOpen(false);
    await loadIndications();
  };

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

  const indicationsMetric = metrics.find(isIndicationsMetric);
  const isOnIndicationsStep = step >= 1 && step <= metrics.length && Boolean(metrics[step - 1] && isIndicationsMetric(metrics[step - 1]));
  const indicationPreloadKeyRef = useRef('');

  useEffect(() => {
    if (!isOnIndicationsStep) return;
    const key = `${selectedConsultantId}|${selectedDate}`;
    if (indicationPreloadKeyRef.current === key) return;
    indicationPreloadKeyRef.current = key;
    setIndicationRows(
      indications
        .filter(item => item.consultant_id === selectedConsultantId && item.entry_date === selectedDate)
        .map(item => ({ name: item.name, phone: item.phone || '' }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnIndicationsStep, selectedConsultantId, selectedDate]);

  const selectedConsultant = consultants.find(consultant => consultant.id === selectedConsultantId);

  const rangeDays = useMemo(() => {
    const start = new Date(`${monthStart}T12:00:00`).getTime();
    const end = new Date(`${monthEnd}T12:00:00`).getTime();
    return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  }, [monthStart, monthEnd]);

  const metricSummaries = useMemo(() => metrics.map(metric => {
    const total = entries
      .filter(entry => entry.metric_config_id === metric.id)
      .reduce((sum, entry) => sum + Number(entry.value), 0);
    const teamTarget = period === 'weekly'
      ? Number(metric.weekly_target_value || 0)
      : period === 'monthly'
        ? Number(metric.target_value || 0) * MONTHLY_TARGET_DAYS
        : Number(metric.target_value || 0);
    const progress = teamTarget > 0 ? Math.round((total / teamTarget) * 100) : 0;
    const remaining = Math.max(0, teamTarget - total);
    return { metric, total, teamTarget, progress, remaining };
  }), [metrics, entries, period]);

  const submittedConsultants = useMemo(() => new Set(entries.map(entry => entry.consultant_id)).size, [entries]);
  const selectedWeekRange = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  const periodLabel = period === 'daily'
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')
    : period === 'weekly'
      ? `${new Date(`${selectedWeekRange.start}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${selectedWeekRange.end}T12:00:00`).toLocaleDateString('pt-BR')}`
      : `${formatDayLabel(monthStart, true)} a ${formatDayLabel(monthEnd, true)} · meta por ${MONTHLY_TARGET_DAYS} dias`;

  const statusWindowDays = useMemo(() => {
    const days: string[] = [];
    for (let i = STATUS_WINDOW_DAYS - 1; i >= 0; i -= 1) days.push(shiftDays(selectedDate, -i));
    return days;
  }, [selectedDate]);

  const filteredIndications = useMemo(() => {
    const base = lockedConsultant
      ? indications.filter(item => item.consultant_id === lockedConsultant)
      : indications;
    if (!indicationsFilter) return base;
    return base.filter(item => item.consultant_id === indicationsFilter);
  }, [indications, indicationsFilter, lockedConsultant]);

  const consultantIndicationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    indications.forEach(item => counts.set(item.consultant_id, (counts.get(item.consultant_id) || 0) + 1));
    return counts;
  }, [indications]);

  const todayIso = toLocalISODate(new Date());

  const goPrevDay = () => setSelectedDate(shiftDays(selectedDate, -1));
  const goNextDay = () => setSelectedDate(shiftDays(selectedDate, 1));

  const goPrevWeek = () => {
    const { start } = getWeekRange(selectedWeek);
    setSelectedWeek(getISOWeekValue(new Date(`${shiftDays(start, -7)}T12:00:00`)));
  };
  const goNextWeek = () => {
    const { start } = getWeekRange(selectedWeek);
    setSelectedWeek(getISOWeekValue(new Date(`${shiftDays(start, 7)}T12:00:00`)));
  };

  const shiftMonthOffset = (offset: number) => {
    const days = offset * Math.max(1, rangeDays);
    setSelectedMonthRange(prev => ({
      start: shiftDays(prev.start, days),
      end: shiftDays(prev.end, days),
    }));
  };

  const filledDaysSet = useMemo(() => new Set<string>(statusEntries.map(e => `${e.consultant_id}|${e.entry_date}`)), [statusEntries]);

  const hasFilled = useCallback((consultantId: string, day: string) => filledDaysSet.has(`${consultantId}|${day}`), [filledDaysSet]);

  const totalFormSteps = 1 + metrics.length + 1;
  const currentFormStep = Math.min(step, totalFormSteps - 1);
  const wizardProgress = metrics.length > 0 ? Math.round(((step + 1) / totalFormSteps) * 100) : 0;

  const canProceed = () => {
    if (step === 0) return Boolean(selectedConsultantId);
    if (step <= metrics.length) {
      const metric = metrics[step - 1];
      if (!metric) return false;
      return (values[metric.id] || '').trim() !== '';
    }
    return true;
  };

  const goNext = () => {
    if (!canProceed()) {
      if (step === 0) toast.error('Selecione quem está preenchendo.');
      else {
        const metric = metrics[step - 1];
        if (metric) toast.error(`Informe o valor de ${metric.label}.`);
      }
      return;
    }
    setStep(current => Math.min(current + 1, totalFormSteps - 1));
  };

  const goBack = () => setStep(current => Math.max(current - 1, 0));

  const setIndicationRow = (index: number, field: 'name' | 'phone', value: string) => {
    setIndicationRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleIndicationsCountChange = (metricId: string, raw: string) => {
    const count = Math.max(0, Math.min(30, Math.round(Number(raw) || 0)));
    setValues(prev => ({ ...prev, [metricId]: String(count) }));
    setIndicationRows(prev => {
      if (count >= prev.length) return [...prev, ...Array.from({ length: count - prev.length }, () => ({ name: '', phone: '' }))];
      return prev.slice(0, count);
    });
  };

  const addIndicationRow = () => {
    setIndicationRows(prev => [...prev, { name: '', phone: '' }]);
    if (indicationsMetric && isOnIndicationsStep) {
      const count = Math.min(30, indicationRows.length + 1);
      setValues(prev => ({ ...prev, [indicationsMetric.id]: String(count) }));
    }
  };

  const removeIndicationRow = (index: number) => {
    setIndicationRows(prev => prev.filter((_, i) => i !== index));
    if (indicationsMetric && isOnIndicationsStep) {
      const count = Math.max(0, indicationRows.length - 1);
      setValues(prev => ({ ...prev, [indicationsMetric.id]: String(count) }));
    }
  };

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

    if (error) {
      setIsSaving(false);
      toast.error('Não foi possível salvar os resultados. Tente novamente.');
      return;
    }

    if (indicationsMetric) {
      const { error: deleteError } = await supabase
        .from('public_metric_indications')
        .delete()
        .eq('consultant_id', selectedConsultantId)
        .eq('entry_date', selectedDate);

      if (!deleteError) {
        const rowsToSave = indicationRows
          .map(row => ({ name: row.name.trim(), phone: row.phone.trim() }))
          .filter(row => row.name !== '');

        if (rowsToSave.length > 0) {
          const { error: insertError } = await supabase
            .from('public_metric_indications')
            .insert(rowsToSave.map(row => ({
              user_id: ownerId,
              consultant_id: selectedConsultantId,
              name: row.name,
              phone: row.phone || null,
              entry_date: selectedDate,
            })));

          if (insertError) {
            toast.error('Resultados salvos, mas houve erro ao registrar as indicações.');
            await loadPublicData();
            setStep(0);
            setView('dashboard');
            return;
          }
        }
      }
    }

    setIsSaving(false);
    await loadPublicData();
    toast.success(`Resultados de ${selectedConsultant?.name} salvos!`);
    setStep(0);
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
    <MetricsErrorBoundary>
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
                onClick={() => { setView('form'); setPeriod('daily'); setStep(0); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${view === 'form' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <ClipboardCheck className="h-4 w-4" /> Preencher
              </button>
              <button
                onClick={() => { setView('dashboard'); setStep(0); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${view === 'dashboard' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <BarChart3 className="h-4 w-4" /> Dashboard
              </button>
              <button
                onClick={() => setView('indications')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${view === 'indications' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Users className="h-4 w-4" /> Indicações
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
              {view === 'form' ? 'Data dos resultados' : view === 'indications' ? 'Indicações registradas' : 'Período do dashboard'}
            </div>
            {view === 'dashboard' && <p className="mt-1 text-xs text-slate-500">Visualizando {periodLabel}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {view === 'dashboard' && (
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button onClick={() => setPeriod('daily')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${period === 'daily' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}>Dia</button>
                <button onClick={() => setPeriod('weekly')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${period === 'weekly' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}>Semana</button>
                <button onClick={() => setPeriod('monthly')} className={`rounded-md px-4 py-2 text-sm font-medium transition ${period === 'monthly' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}>Mês</button>
              </div>
            )}
            {view === 'dashboard' && (period === 'weekly' ? (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" onClick={goPrevWeek} title="Semana anterior" className="h-9 w-9 shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input type="week" value={selectedWeek} onChange={event => setSelectedWeek(event.target.value)} className="w-full sm:w-auto" />
                <Button variant="outline" size="icon" onClick={goNextWeek} title="Próxima semana" className="h-9 w-9 shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : period === 'monthly' ? (
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" onClick={() => shiftMonthOffset(-1)} title="Período anterior" className="h-9 w-9 shrink-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-400">De</span>
                      <Input type="date" value={monthStart} onChange={event => setSelectedMonthRange(prev => ({ ...prev, start: event.target.value }))} className="w-full sm:w-auto" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-400">até</span>
                      <Input type="date" value={monthEnd} onChange={event => setSelectedMonthRange(prev => ({ ...prev, end: event.target.value }))} className="w-full sm:w-auto" />
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => shiftMonthOffset(1)} title="Próximo período" className="h-9 w-9 shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" onClick={goPrevDay} title="Dia anterior" className="h-9 w-9 shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-full sm:w-auto" />
                <Button variant="outline" size="icon" onClick={goNextDay} title="Dia seguinte" className="h-9 w-9 shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="icon" onClick={() => loadPublicData(true)} disabled={isRefreshing} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {consultants.length === 0 || (view !== 'indications' && metrics.length === 0) ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-semibold">Painel ainda não configurado</h2>
              <p className="mt-1 text-sm text-slate-500">O gestor precisa cadastrar consultores e métricas antes do primeiro lançamento.</p>
            </CardContent>
          </Card>
        ) : view === 'form' ? (
          <>
            <Card className="mx-auto max-w-2xl overflow-hidden">
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${wizardProgress}%` }}
                />
              </div>
              <CardHeader className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-brand-600" /> Informe seus resultados
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-400">{step + 1} de {totalFormSteps}</span>
                  </span>
                </CardTitle>
                <CardDescription>
                  {step === 0 && 'Para começar, selecione quem está preenchendo.'}
                  {step > 0 && step <= metrics.length && `Pergunta ${step + 1}: informe o resultado de "${metrics[step - 1]?.label}".`}
                  {step > metrics.length && 'Confira os valores informados e salve.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <Button variant="outline" size="icon" onClick={goPrevDay} disabled={isSaving} title="Dia anterior" className="dark:bg-slate-700 dark:text-white dark:border-slate-600 shrink-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center gap-1 px-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <CalendarDays className="h-3 w-3" /> Preenchendo o dia
                    </span>
                    <span className="text-sm font-bold capitalize text-slate-800 dark:text-white">
                      {selectedDate === todayIso ? 'Hoje · ' : ''}{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </span>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={event => setSelectedDate(event.target.value)}
                      className="h-8 w-44 text-center text-xs"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={goNextDay} disabled={isSaving || selectedDate >= todayIso} title="Dia seguinte" className="dark:bg-slate-700 dark:text-white dark:border-slate-600 shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {step === 0 && (
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
                    <p className="text-xs text-slate-500">Um novo envio na mesma data atualizará os valores anteriores.</p>

                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-brand-600" /> Últimos {STATUS_WINDOW_DAYS} dias
                        </span>
                        <span className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Preencheu</span>
                          <span className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> Não preencheu</span>
                          <span className="flex items-center gap-1"><span className="text-slate-300">—</span> Futuro</span>
                        </span>
                      </p>
                      <div className="grid grid-cols-7 gap-1.5">
                        {statusWindowDays.map(day => {
                          const filled = selectedConsultantId ? hasFilled(selectedConsultantId, day) : false;
                          const isFuture = day > todayIso;
                          const cellColor = filled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900'
                            : isFuture
                              ? 'text-slate-300 border-slate-200 dark:text-slate-600 dark:border-slate-700'
                              : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900';
                          return (
                            <div
                              key={day}
                              title={`${formatDayLabel(day, true)} · ${getWeekdayShort(day)}${selectedConsultantId ? (filled ? ' — preencheu' : isFuture ? ' — dia futuro' : ' — não preencheu') : ''}`}
                              className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] leading-tight ${day === selectedDate ? 'ring-2 ring-brand-500' : ''} ${cellColor}`}
                            >
                              <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">{getWeekdayShort(day)}</span>
                              <span className="text-sm font-bold leading-none">{formatDayLabel(day).split('/')[0]}</span>
                              {filled ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : isFuture ? (
                                <span className="text-[8px] opacity-60">—</span>
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {selectedConsultantId
                          ? (hasFilled(selectedConsultantId, selectedDate)
                              ? 'Você já preencheu nesta data. Um novo envio atualizará os valores.'
                              : <span className="font-semibold text-red-600 dark:text-red-400">Atenção: você ainda não preencheu nesta data.</span>)
                          : 'Selecione seu nome para ver seus dias preenchidos.'}
                      </p>
                    </div>
                  </div>
                )}

                {step > 0 && step <= metrics.length && (() => {
                  const metric = metrics[step - 1];
                  if (!metric) return null;
                  const isIndicationStep = isIndicationsMetric(metric);
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={metric.id}>{metric.label} *</Label>
                      <div className="relative">
                        <Input
                          id={metric.id}
                          autoFocus
                          type={metric.type === 'currency' ? 'text' : 'number'}
                          min={metric.type === 'currency' ? undefined : '0'}
                          step={metric.type === 'currency' ? undefined : '1'}
                          inputMode={metric.type === 'currency' ? 'decimal' : 'numeric'}
                          value={isIndicationStep ? (values[metric.id] || '') : metric.type === 'currency' ? formatReais(values[metric.id] || '') : (values[metric.id] || '')}
                          onChange={event => isIndicationStep
                            ? handleIndicationsCountChange(metric.id, event.target.value)
                            : setValues(prev => ({ ...prev, [metric.id]: metric.type === 'currency' ? plainReais(event.target.value) : event.target.value }))}
                          onKeyDown={event => { if (event.key === 'Enter') goNext(); }}
                          placeholder={metric.type === 'currency' ? '0,00' : '0'}
                          className="h-12 text-lg"
                        />
                      </div>
                      {metric.target_value > 0 && (
                        <p className="text-xs text-slate-500">Meta diária da equipe: {formatValue(metric.target_value, metric.type)}</p>
                      )}
                      {isIndicationStep && (
                        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            <Users className="h-4 w-4" /> Nome e telefone das indicações
                          </p>
                          <p className="mb-3 text-xs text-slate-500">
                            Quando informar a quantidade acima, abra os campos para registrar nome e telefone (opcional).
                          </p>
                          <div className="space-y-2">
                            {indicationRows.map((row, index) => (
                              <div key={index} className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  value={row.name}
                                  onChange={e => setIndicationRow(index, 'name', e.target.value)}
                                  placeholder={`Nome da ${index + 1}ª indicação`}
                                  className="h-10 flex-1"
                                />
                                <Input
                                  value={row.phone}
                                  onChange={e => setIndicationRow(index, 'phone', e.target.value)}
                                  placeholder="Telefone (opcional)"
                                  inputMode="tel"
                                  className="h-10 w-full sm:w-44"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => removeIndicationRow(index)}
                                  className="text-red-500 hover:text-red-600"
                                  aria-label="Remover indicação"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {indicationRows.length < 30 && (
                              <Button variant="outline" size="sm" type="button" onClick={addIndicationRow} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar nome
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {step > metrics.length && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                      {metrics.map(metric => (
                        <div key={metric.id} className="flex items-center justify-between border-b px-4 py-3 last:border-0 dark:border-slate-700">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{metric.label}</span>
                          <span className="text-sm font-bold">{values[metric.id] ? formatValue(parseInputValue(values[metric.id], metric.type), metric.type) : '—'}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Salvando os resultados de <span className="font-semibold">{selectedConsultant?.name}</span> para{' '}
                      <span className="font-semibold">{formatDayLabel(selectedDate, true)}</span>.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button variant="outline" onClick={goBack} disabled={step === 0} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  {step < totalFormSteps - 1 ? (
                    <Button onClick={goNext} disabled={(step === 0 && !selectedConsultantId) || isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                      {step === totalFormSteps - 2 ? 'Revisar' : 'Continuar'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={isSaving} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                      {isSaving ? 'Salvando...' : 'Salvar resultados'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mx-auto max-w-2xl">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="flex items-center gap-2 font-semibold">
                  <Info className="h-4 w-4" /> Controle de preenchimento
                </p>
                <p className="mt-1 text-xs">
                  No card acima, dias <span className="font-semibold text-emerald-600 dark:text-emerald-400">verdes</span> = a pessoa preencheu;{' '}
                  <span className="font-semibold text-red-600 dark:text-red-400">vermelhos</span> = não preencheu; cinza = dia futuro.
                </p>
              </div>
            </div>
          </>
        ) : view === 'indications' ? (
          !isManager && !lockedConsultant ? (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Lock className="h-5 w-5" /></div>
                  Indicações protegidas
                </CardTitle>
                <CardDescription>Cada consultor tem um código de acesso. Informe o seu para ver apenas as suas indicações.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mx-auto flex max-w-md flex-col gap-3">
                  <Input
                    value={accessCode}
                    onChange={event => { setAccessCode(event.target.value); setAccessError(false); }}
                    onKeyDown={event => event.key === 'Enter' && handleAccess()}
                    placeholder="Informe seu código de acesso"
                    className="h-11 text-center font-mono uppercase"
                  />
                  {accessError && <p className="text-sm text-red-500">Código inválido. Peça o código certo ao gestor.</p>}
                  <Button onClick={handleAccess} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Lock className="mr-2 h-4 w-4" /> Ver minhas indicações
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Users className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-lg">Indicações da equipe</CardTitle>
                  <CardDescription>{lockedConsultant ? 'Somente as suas indicações aparecem abaixo.' : 'Registre aqui o nome e o telefone de quem você indicou.'}</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {lockedConsultant ? (
                  <>
                    <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-100 px-3 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <UserRound className="h-4 w-4" /> {consultants.find(consultant => consultant.id === lockedConsultant)?.name}
                    </span>
                    <Button variant="outline" className="h-10" onClick={handleLockout}>Sair</Button>
                    <Button onClick={openIndicationModal} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="mr-2 h-4 w-4" /> Registrar indicação
                    </Button>
                  </>
                ) : (
                  <>
                    <Select value={indicationsFilter} onValueChange={setIndicationsFilter}>
                      <SelectTrigger className="h-10 gap-2 w-full sm:w-auto">
                        <SelectValue placeholder="Todos os consultores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os consultores</SelectItem>
                        {consultants.map(consultant => (
                          <SelectItem key={consultant.id} value={consultant.id}>{consultant.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={openIndicationModal} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="mr-2 h-4 w-4" /> Registrar indicação
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {lockedConsultant ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Suas indicações: {consultantIndicationCounts.get(lockedConsultant) || 0}
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Total: {indications.length} indicação{indications.length === 1 ? '' : 'ões'}
                    </span>
                    {consultants
                      .filter(consultant => (consultantIndicationCounts.get(consultant.id) || 0) > 0)
                      .map(consultant => (
                        <span key={consultant.id} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {consultant.name}: {consultantIndicationCounts.get(consultant.id)}
                        </span>
                      ))}
                  </>
                )}
              </div>

              {filteredIndications.length === 0 ? (
                <div className="py-14 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <h3 className="text-base font-semibold">
                    {indications.length === 0 ? 'Nenhuma indicação registrada ainda' : 'Nenhuma indicação para este filtro'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Toque em "Registrar indicação" para adicionar o nome e o telefone de quem você indicou.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500 dark:border-slate-800">
                        <th className="pb-3 pr-4 font-semibold">Indicado(a)</th>
                        <th className="px-4 pb-3 font-semibold">Telefone</th>
                        <th className="px-4 pb-3 font-semibold">Consultor</th>
                        <th className="px-4 pb-3 font-semibold">Dia</th>
                        <th className="pb-3 pl-4 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIndications.map(item => (
                        <tr key={item.id} className="border-b transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50">
                          <td className="py-3 pr-4 font-medium">{item.name}</td>
                          <td className="px-4 py-3">
                            {item.phone ? (
                              <a href={`https://wa.me/55${(item.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand-600 hover:underline dark:text-brand-300">
                                <Phone className="h-3.5 w-3.5" /> {formatPhone(item.phone)}
                              </a>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">{consultants.find(consultant => consultant.id === item.consultant_id)?.name || '—'}</td>
                          <td className="px-4 py-3">{formatDayLabel(item.entry_date, true)}</td>
                          <td className="py-3 pl-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEditIndication(item)} title="Editar indicação">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveIndication(item)} className="text-red-500 hover:text-red-600" title="Remover indicação">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          )
        ) : (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-violet-600 px-8 py-8 text-white shadow-xl shadow-brand-600/20">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <Sparkles className="h-4 w-4" /> Desempenho {period === 'weekly' ? 'semanal' : period === 'monthly' ? 'mensal' : 'diário'}
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
                  <div><p className="text-sm text-slate-500">{period !== 'daily' ? 'Participaram' : 'Responderam'}</p><p className="text-3xl font-bold">{submittedConsultants}</p></div>
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
                            <p className="text-xs text-slate-500">Meta {period === 'weekly' ? 'semanal' : period === 'monthly' ? 'mensal' : 'diária'} da equipe</p>
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
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-300"><CalendarCheck2 className="h-5 w-5" /></div>
                  <div>
                    <CardTitle className="text-lg">Preenchimento da equipe</CardTitle>
                    <CardDescription>Quem preencheu nos últimos {STATUS_WINDOW_DAYS} dias (até {formatDayLabel(selectedDate, true)}).</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Preencheu</span>
                  <span className="flex items-center gap-1.5"><X className="h-4 w-4 text-red-400" /> Não preencheu</span>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 dark:border-slate-800">
                      <th className="pb-3 pr-4 text-left font-semibold">Consultor</th>
                      {statusWindowDays.map(day => (
                        <th key={day} className={`pb-3 px-1 text-center font-semibold ${day === selectedDate ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          <span className="block text-[10px] uppercase tracking-wide">{getWeekdayShort(day)}</span>
                          <span className="block text-xs">{formatDayLabel(day).split('/')[0]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consultants.map(consultant => (
                      <tr key={consultant.id} className="border-b transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50">
                        <td className="py-3 pr-4 font-medium">{consultant.name}</td>
                        {statusWindowDays.map(day => {
                          const filled = hasFilled(consultant.id, day);
                          return (
                            <td key={day} className="px-1 py-3 text-center">
                              <span
                                title={`${consultant.name} — ${formatDayLabel(day, true)}: ${filled ? 'preencheu' : 'não preencheu'}`}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${filled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-50 text-red-400 dark:bg-red-950/50'}`}
                              >
                                {filled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

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

      <Dialog open={isIndicationModalOpen} onOpenChange={setIsIndicationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIndicationId ? 'Editar indicação' : 'Registrar indicação'}</DialogTitle>
            <DialogDescription>
              {editingIndicationId
                ? `Atualize o nome ou telefone da pessoa indicada (dia ${formatDayLabel(selectedDate, true)}).`
                : `Nome e telefone de quem você indicou. Fica vinculado ao dia ${formatDayLabel(selectedDate, true)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Consultor que indicou</Label>
              {editingIndicationId ? (
                <Input value={consultants.find(consultant => consultant.id === indicationConsultantId)?.name || '—'} readOnly className="h-10 bg-slate-100 dark:bg-slate-800" />
              ) : (
                <Select value={indicationConsultantId} onValueChange={setIndicationConsultantId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(consultant => (
                      <SelectItem key={consultant.id} value={consultant.id}>{consultant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="indication-name">Nome da pessoa indicada *</Label>
              <Input
                id="indication-name"
                value={indicationName}
                onChange={event => setIndicationName(event.target.value)}
                placeholder="Nome completo"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="indication-phone">Telefone</Label>
              <Input
                id="indication-phone"
                value={indicationPhone}
                onChange={event => setIndicationPhone(event.target.value)}
                placeholder="(00) 00000-0000"
                inputMode="tel"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsIndicationModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegisterIndication} disabled={isSavingIndication} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSavingIndication ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingIndicationId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {isSavingIndication ? 'Salvando...' : editingIndicationId ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MetricsErrorBoundary>
  );
};

export default PublicDailyMetrics;
