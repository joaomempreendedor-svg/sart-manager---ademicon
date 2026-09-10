import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PhoneCall, CalendarCheck, Star, Loader2, Sun, Moon,
  UserRound, PhoneOff, XCircle, ThumbsDown, RotateCcw, ChevronRight,
  Clock, BarChart3, Save, PhoneForwarded, Building2, MapPin, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ColdCallLead, ColdCallLog, ColdCallResult } from '@/types';

interface PublicTeamMember {
  id: string;
  name: string;
  roles: string[];
  isActive: boolean;
  consultantKey: string;
}

const RESULT_TO_STAGE: Record<ColdCallResult, ColdCallLead['current_stage']> = {
  'Agendar Reunião': 'Reunião Agendada',
  'Demonstrou Interesse': 'Conversou',
  'Foi para o WhatsApp': 'Conversou',
  'Conversou': 'Conversou',
  'Pedir retorno': 'Tentativa de Contato',
  'Não atendeu': 'Tentativa de Contato',
  'Sem interesse': 'Tentativa de Contato',
  'Número inválido': 'Tentativa de Contato',
};

const STAGE_ORDER: Record<ColdCallLead['current_stage'], number> = {
  'Base Fria': 0,
  'Tentativa de Contato': 1,
  'Conversou': 2,
  'Reunião Agendada': 3,
};

const CALL_RESULTS: { result: ColdCallResult; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { result: 'Não atendeu', label: 'Não atendeu', icon: PhoneOff, color: 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200' },
  { result: 'Número inválido', label: 'Nº inválido', icon: XCircle, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { result: 'Sem interesse', label: 'Sem interesse', icon: ThumbsDown, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { result: 'Pedir retorno', label: 'Pedir retorno', icon: RotateCcw, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { result: 'Foi para o WhatsApp', label: 'Foi para o WhatsApp', icon: MessageCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { result: 'Agendar Reunião', label: 'Agendar reunião', icon: CalendarCheck, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
];

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return t >= todayStart.getTime() && t < todayStart.getTime() + 86400000;
};

const PublicColdCall = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { theme, toggleTheme } = useApp();
  const [consultants, setConsultants] = useState<PublicTeamMember[]>([]);
  const [leads, setLeads] = useState<ColdCallLead[]>([]);
  const [logs, setLogs] = useState<ColdCallLog[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ColdCallResult>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogResult, setDialogResult] = useState<ColdCallResult>('Agendar Reunião');
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingModality, setMeetingModality] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const selectedConsultant = consultants.find(c => c.id === selectedConsultantId);
  const selectedConsultantKey = selectedConsultant?.consultantKey || null;

  const loadBaseData = useCallback(async () => {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from('cold_call_consultants')
      .select('id, name, email, user_id, is_active');

    if (error) {
      toast.error('Não foi possível carregar os consultores. Verifique se a tabela cold_call_consultants foi criada no banco.');
      setIsLoading(false);
      return;
    }

    const members: PublicTeamMember[] = (data || [])
      .map((row: any) => ({
        id: row.id,
        name: String(row.name || ''),
        roles: ['CONSULTOR'],
        isActive: row.is_active !== false,
        consultantKey: row.user_id,
      }))
      .filter(m => m.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));

    setConsultants(members);

    const stored = localStorage.getItem(`cold_call_consultant_${ownerId}`);
    const validStored = stored && members.some(m => m.id === stored) ? stored : '';
    const initial = validStored || (members.length === 1 ? members[0].id : '');
    setSelectedConsultantId(initial);
    if (initial) localStorage.setItem(`cold_call_consultant_${ownerId}`, initial);

    setIsLoading(false);
  }, [ownerId]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const loadConsultantData = useCallback(async (consultantKey: string) => {
    const [leadsRes, logsRes] = await Promise.all([
      supabase.from('cold_call_leads').select('*').eq('user_id', consultantKey),
      supabase.from('cold_call_logs').select('*').eq('user_id', consultantKey),
    ]);
    if (leadsRes.error) toast.error('Não foi possível carregar a fila de prospects.');
    if (logsRes.error) toast.error('Não foi possível carregar os registros do dia.');
    setLeads((leadsRes.data || []) as ColdCallLead[]);
    setLogs((logsRes.data || []) as ColdCallLog[]);
  }, []);

  useEffect(() => {
    if (!selectedConsultantKey) {
      setLeads([]);
      setLogs([]);
      setActiveLeadId(null);
      return;
    }
    setLeads([]);
    setLogs([]);
    setActiveLeadId(null);
    loadConsultantData(selectedConsultantKey);
  }, [selectedConsultantKey, loadConsultantData]);

  const handleSelectConsultant = (id: string) => {
    setSelectedConsultantId(id);
    if (id) localStorage.setItem(`cold_call_consultant_${ownerId}`, id);
    else localStorage.removeItem(`cold_call_consultant_${ownerId}`);
  };

  const calledLeadIds = useMemo(() => new Set(logs.map(l => l.cold_call_lead_id)), [logs]);

  const queue = useMemo(() => {
    return leads
      .filter(l => !calledLeadIds.has(l.id))
      .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  }, [leads, calledLeadIds]);

  const activeLead = useMemo(() => {
    return queue.find(l => l.id === activeLeadId) || queue[0] || null;
  }, [queue, activeLeadId]);

  const todaysMetrics = useMemo(() => {
    let calls = 0, contacts = 0, interested = 0, meetings = 0;
    logs.filter(l => isToday(l.start_time || l.created_at)).forEach(l => {
      calls += 1;
      if (l.result !== 'Não atendeu' && l.result !== 'Número inválido') contacts += 1;
      if (l.result === 'Demonstrou Interesse' || l.result === 'Foi para o WhatsApp') interested += 1;
      if (l.result === 'Agendar Reunião') meetings += 1;
    });
    return { calls, contacts, interested, meetings };
  }, [logs]);

  const lastLogForLead = useCallback((leadId: string) => {
    const sorted = logs
      .filter(l => l.cold_call_lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0] || null;
  }, [logs]);

  const realizedLeads = useMemo(() => {
    return leads
      .filter(l => calledLeadIds.has(l.id))
      .map(l => ({ lead: l, lastLog: lastLogForLead(l.id) }))
      .sort((a, b) => {
        const aT = a.lastLog ? new Date(a.lastLog.created_at).getTime() : 0;
        const bT = b.lastLog ? new Date(b.lastLog.created_at).getTime() : 0;
        return bT - aT;
      });
  }, [leads, calledLeadIds, lastLogForLead]);

  const filteredRealized = useMemo(() => {
    if (statusFilter === 'all') return realizedLeads;
    return realizedLeads.filter(({ lastLog }) => lastLog?.result === statusFilter);
  }, [realizedLeads, statusFilter]);

  const resultColor = useCallback((result: string) => {
    return CALL_RESULTS.find(c => c.result === result)?.color || 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300';
  }, []);

  const todayLogsWithLead = useMemo(() => {
    const leadById = new Map(leads.map(l => [l.id, l]));
    return logs
      .filter(l => isToday(l.start_time || l.created_at))
      .map(l => ({ log: l, lead: leadById.get(l.cold_call_lead_id) || null }))
      .sort((a, b) => new Date(b.log.start_time || b.log.created_at).getTime() - new Date(a.log.start_time || a.log.created_at).getTime());
  }, [logs, leads]);

  const todayResultSummary = useMemo(() => {
    return CALL_RESULTS.map(c => ({
      result: c.result,
      count: logs.filter(l => isToday(l.start_time || l.created_at) && l.result === c.result).length,
    }));
  }, [logs]);

  const refreshAfterWrite = async () => {
    if (!selectedConsultantKey) return;
    const [leadsRes, logsRes] = await Promise.all([
      supabase.from('cold_call_leads').select('*').eq('user_id', selectedConsultantKey),
      supabase.from('cold_call_logs').select('*').eq('user_id', selectedConsultantKey),
    ]);
    if (!leadsRes.error) setLeads((leadsRes.data || []) as ColdCallLead[]);
    if (!logsRes.error) setLogs((logsRes.data || []) as ColdCallLog[]);
  };

  const openDialog = (result: ColdCallResult, lead: ColdCallLead) => {
    setDialogResult(result);
    const hasName = lead.name && lead.name !== lead.phone;
    setContactName(hasName ? lead.name! : '');
    setMeetingDate('');
    setMeetingTime('');
    setMeetingModality('Online');
    setMeetingNotes('');
    setIsDialogOpen(true);
  };

  const recordResult = async (lead: ColdCallLead, result: ColdCallResult, meeting?: { date?: string; time?: string; modality?: string; notes?: string }) => {
    if (!selectedConsultantKey) return false;
    setIsSaving(true);
    const now = new Date().toISOString();
    try {
      const { error: logError } = await supabase.from('cold_call_logs').insert({
        cold_call_lead_id: lead.id,
        user_id: selectedConsultantKey,
        start_time: now,
        end_time: now,
        duration_seconds: 0,
        result,
        meeting_date: result === 'Agendar Reunião' ? meeting?.date || null : null,
        meeting_time: result === 'Agendar Reunião' ? meeting?.time || null : null,
        meeting_modality: result === 'Agendar Reunião' ? meeting?.modality || null : null,
        meeting_notes: (result === 'Agendar Reunião' || result === 'Pedir retorno') ? meeting?.notes || null : null,
      });
      if (logError) throw logError;

      const { error: leadError } = await supabase.from('cold_call_leads').update({
        current_stage: RESULT_TO_STAGE[result],
      }).eq('id', lead.id);
      if (leadError) throw leadError;

      toast.success('Resultado registrado!');
      await refreshAfterWrite();
      return true;
    } catch (err: any) {
      toast.error(`Erro ao registrar: ${err.message || err}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCallResult = async (result: ColdCallResult) => {
    if (!activeLead || isSaving) return;
    setIsResultDialogOpen(false);
    if (result === 'Agendar Reunião' || result === 'Pedir retorno') {
      openDialog(result, activeLead);
      return;
    }
    await recordResult(activeLead, result);
  };

  const handleDialogSave = async () => {
    if (!activeLead) return;
    if (dialogResult === 'Agendar Reunião' && (!meetingDate || !meetingTime)) {
      toast.error('Informe data e horário da reunião.');
      return;
    }
    const ok = await recordResult(activeLead, dialogResult, {
      date: meetingDate || undefined,
      time: meetingTime || undefined,
      modality: meetingModality || undefined,
      notes: meetingNotes || undefined,
    });
    if (ok) {
      if (contactName.trim() && contactName.trim() !== activeLead.name) {
        await supabase.from('cold_call_leads').update({ name: contactName.trim() }).eq('id', activeLead.id);
        await refreshAfterWrite();
      }
      setIsDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const stageBadgeClass = (stage: ColdCallLead['current_stage']) => {
    switch (stage) {
      case 'Reunião Agendada': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Conversou': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Tentativa de Contato': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-600 p-2.5 text-white shadow-lg shadow-brand-600/20">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Operação de Cold Call</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ligação fria e qualificação de prospects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        {consultants.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <UserRound className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-lg font-semibold">Nenhum consultor configurado</h2>
            <p className="mt-1 text-sm text-slate-500">
              O gestor precisa cadastrar consultores com perfil CONSULTOR no sistema e rodar o script{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">supabase/cold_call_public.sql</code> no Supabase.
            </p>
          </div>
        ) : !selectedConsultant ? (
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <UserRound className="h-5 w-5 text-brand-600" /> Quem está operando?
              </h2>
              <p className="mt-1 text-sm text-slate-500">Selecione seu nome para abrir sua fila de prospects.</p>
              <div className="mt-4">
                <Select value={selectedConsultantId} onValueChange={handleSelectConsultant}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione seu nome" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
            {/* Resumo do dia */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Fila de {selectedConsultant.name}
              </h2>
              <p className="text-sm text-slate-500">{queue.length} prospect(s) aguardando na fila hoje.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { label: 'Ligações hoje', value: todaysMetrics.calls, icon: PhoneCall, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
                { label: 'Reuniões hoje', value: todaysMetrics.meetings, icon: CalendarCheck, color: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300' },
              ] as { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }[]).map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className={`shrink-0 rounded-xl p-3 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Próximo Lead */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-violet-600 p-6 text-white shadow-xl shadow-brand-600/20 sm:p-8">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <PhoneForwarded className="h-4 w-4" /> Próximo lead
                </div>
                {activeLead ? (
                  <>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-bold sm:text-3xl">{activeLead.name || activeLead.phone}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/85">
                          <span className="flex items-center gap-1.5"><PhoneCall className="h-4 w-4" /> {activeLead.phone}</span>
                          {activeLead.company_name && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-4 w-4" /> {activeLead.company_name}
                            </span>
                          )}
                          {activeLead.city && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" /> {activeLead.city}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                            {activeLead.current_stage}
                          </span>
                          {lastLogForLead(activeLead.id) && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" /> Último: {lastLogForLead(activeLead.id)?.result}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          onClick={() => setIsResultDialogOpen(true)}
                          disabled={isSaving}
                          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50"
                        >
                          <PhoneCall className="h-5 w-5" /> Ligar
                        </button>
                        <div className="rounded-xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                          <p className="text-xs text-white/70">{queue.length - 1} na fila após este</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold">Fila vazia</h3>
                    <p className="mt-2 text-sm text-white/80">
                      Todos os seus prospects foram trabalhados. Peça ao gestor para importar e dividir novos leads.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fila restante */}
            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold">
                  <BarChart3 className="h-5 w-5 text-brand-600" /> Minha fila ({queue.length})
                </h3>
                <span className="text-xs font-medium text-slate-400">Só números ainda não ligados</span>
              </div>
              {queue.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">Você ligou para todos os números da fila. Peça ao gestor para importar novos leads.</p>
              ) : (
                <div className="divide-y dark:divide-slate-800">
                  {queue.map(lead => (
                    <div
                      key={lead.id}
                      className={`flex w-full items-center gap-3 px-5 py-3 ${activeLead?.id === lead.id ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}
                    >
                      <button
                        onClick={() => setActiveLeadId(lead.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {lead.name || lead.phone}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{lead.phone}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBadgeClass(lead.current_stage)}`}>
                            {lead.current_stage === 'Base Fria' ? 'Contato não realizado' : lead.current_stage}
                          </span>
                          {activeLead?.id === lead.id && <ChevronRight className="h-4 w-4 text-brand-500" />}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ligações realizadas */}
            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold">
                  <PhoneCall className="h-5 w-5 text-emerald-600" /> Ligações realizadas ({filteredRealized.length})
                </h3>
                <div className="w-full sm:w-56">
                  <Label htmlFor="statusFilter" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Filtrar por resultado da ligação</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | ColdCallResult)}>
                    <SelectTrigger id="statusFilter" className="h-9 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                      <SelectItem value="all">Todos os status</SelectItem>
                      {CALL_RESULTS.map(c => (
                        <SelectItem key={c.result} value={c.result}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filteredRealized.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">
                  {statusFilter === 'all' ? 'Nenhuma ligação registrada ainda.' : 'Nenhuma ligação com este resultado.'}
                </p>
              ) : (
                <div className="divide-y dark:divide-slate-800">
                  {filteredRealized.map(({ lead, lastLog }) => (
                    <div key={lead.id} className="flex w-full items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {lead.name || lead.phone}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{lead.phone}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {lastLog && (
                          <span className="text-xs text-slate-400">
                            {new Date(lastLog.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${resultColor(lastLog?.result || '')}`}>
                          {lastLog?.result || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status de resultado das ligações */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b px-5 py-4 dark:border-slate-800">
                <BarChart3 className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold">Status das ligações</h3>
              </div>
              <div className="space-y-2 px-5 py-4">
                {CALL_RESULTS.map(c => {
                  const count = todayResultSummary.find(s => s.result === c.result)?.count || 0;
                  return (
                    <div key={c.result} className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${resultColor(c.result)}`}>
                        <c.icon className="h-3.5 w-3.5" />
                        {c.label}
                      </span>
                      <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</span>
                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{todayLogsWithLead.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b px-5 py-4 dark:border-slate-800">
                <PhoneCall className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">Ligações realizadas hoje</h3>
              </div>
              {todayLogsWithLead.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">
                  Nenhuma ligação registrada hoje ainda.
                </p>
              ) : (
                <div className="max-h-[600px] divide-y overflow-y-auto dark:divide-slate-800">
                  {todayLogsWithLead.map(({ log, lead }) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {lead?.name || lead?.phone || 'Contato'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {lead?.phone || '—'}
                          <span className="ml-2 text-slate-400">
                            {new Date(log.start_time || log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${resultColor(log.result)}`}>
                        {log.result}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>

      {/* Dialog de resultado detalhado (Agendar Reunião) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 dark:bg-slate-800 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-green-500" />
              <span>{dialogResult === 'Pedir retorno' ? 'Registrar retorno' : 'Agendar reunião'}</span>
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-slate-900 dark:text-white">{activeLead?.name || activeLead?.phone}</span> · {activeLead?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">Nome do contato</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Ex: Maria Souza"
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>

            {dialogResult === 'Agendar Reunião' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="meetingDate">Data *</Label>
                    <Input id="meetingDate" type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetingTime">Horário *</Label>
                    <Input id="meetingTime" type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingModality">Modalidade</Label>
                  <Select value={meetingModality} onValueChange={setMeetingModality}>
                    <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                      {['Online', 'Presencial', 'Telefone'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingNotes">Observações</Label>
                  <Textarea id="meetingNotes" rows={2} value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                </div>
              </>
            )}

            {dialogResult === 'Pedir retorno' && (
              <div className="space-y-2">
                <Label htmlFor="returnNotes">O que foi conversado?</Label>
                <Textarea
                  id="returnNotes"
                  rows={3}
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  placeholder="Descreva o que foi conversado para retomar o contato depois..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 flex-col gap-2 sm:flex-row dark:border-slate-700">
            <Button type="button" onClick={handleDialogSave} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Salvando...' : 'Registrar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de resultado da ligação */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 dark:bg-slate-800 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-6 w-6 text-emerald-500" />
              <span>Resultado da ligação</span>
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-slate-900 dark:text-white">{activeLead?.name || activeLead?.phone}</span> · {activeLead?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {CALL_RESULTS.map(btn => (
              <button
                key={btn.result}
                disabled={isSaving}
                onClick={() => handleCallResult(btn.result)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 ${btn.color}`}
              >
                <btn.icon className="h-5 w-5 shrink-0" />
                {btn.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicColdCall;