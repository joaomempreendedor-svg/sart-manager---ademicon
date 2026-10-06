import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PhoneCall, CalendarCheck, Loader2, Sun, Moon,
  UserRound, RotateCcw, Pencil, Search, History, BookOpen, MessageCircle,
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
import { getAllFromTable } from '@/lib/supabase';
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
  'Não chamou': 'Tentativa de Contato',
  'Sem interesse': 'Tentativa de Contato',
  'Número inválido': 'Tentativa de Contato',
  'Ligou': 'Tentativa de Contato',
};

const POSITIVE_RESULTS: { result: ColdCallResult; label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }[] = [
  { result: 'Pedir retorno', label: 'Pedir retorno', icon: RotateCcw, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', description: 'A pessoa pediu para retomar o contato depois.' },
  { result: 'Foi para o WhatsApp', label: 'Foi para o WhatsApp', icon: MessageCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', description: 'A conversa seguiu pelo WhatsApp.' },
  { result: 'Agendar Reunião', label: 'Agendar reunião', icon: CalendarCheck, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', description: 'Vamos marcar uma reunião com a pessoa.' },
];

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return t >= todayStart.getTime() && t < todayStart.getTime() + 86400000;
};

const formatPhone = (phone?: string) => {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
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

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [statusSearch, setStatusSearch] = useState('');
  const [tutorialText, setTutorialText] = useState('');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [pendingLead, setPendingLead] = useState<ColdCallLead | null>(null);
  const [pendingLogId, setPendingLogId] = useState<string | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [resultName, setResultName] = useState('');
  const [resultPhone, setResultPhone] = useState('');

  const [dialogResult, setDialogResult] = useState<ColdCallResult>('Agendar Reunião');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingModality, setMeetingModality] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const [editingLog, setEditingLog] = useState<ColdCallLog | null>(null);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [editLogResult, setEditLogResult] = useState<ColdCallResult>('Ligou');
  const [editLogNotes, setEditLogNotes] = useState('');

  const [historyLead, setHistoryLead] = useState<ColdCallLead | null>(null);

  const selectedConsultant = consultants.find(c => c.id === selectedConsultantId);
  const selectedConsultantKey = selectedConsultant?.consultantKey || null;

  const loadBaseData = useCallback(async () => {
    if (!ownerId) return;
    const [consultantsRes, tutorialRes] = await Promise.all([
      supabase.from('cold_call_consultants').select('id, name, email, user_id, is_active'),
      supabase.rpc('get_cold_call_tutorial', { p_user: ownerId }).then((res: any) => res),
    ]);

    if (consultantsRes.error) {
      toast.error('Não foi possível carregar os consultores. Verifique se a tabela cold_call_consultants foi criada no banco.');
      setIsLoading(false);
      return;
    }

    const members: PublicTeamMember[] = ((consultantsRes.data || []) as any[])
      .map((row): PublicTeamMember => ({
        id: row.id,
        name: String(row.name || ''),
        roles: ['CONSULTOR'],
        isActive: row.is_active !== false,
        consultantKey: row.user_id,
      }))
      .filter(m => m.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));

    setConsultants(members);

    if (typeof tutorialRes.data === 'string') setTutorialText(tutorialRes.data);

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
    try {
      const [leadsRes, logsRes] = await Promise.all([
        getAllFromTable('cold_call_leads', { filters: { user_id: consultantKey } }),
        getAllFromTable('cold_call_logs', { filters: { user_id: consultantKey } }),
      ]);
      setLeads((leadsRes.data || []) as ColdCallLead[]);
      setLogs((logsRes.data || []) as ColdCallLog[]);
    } catch {
      toast.error('Não foi possível carregar os dados da operação.');
    }
  }, []);

  useEffect(() => {
    if (!selectedConsultantKey) {
      setLeads([]);
      setLogs([]);
      return;
    }
    setLeads([]);
    setLogs([]);
    loadConsultantData(selectedConsultantKey);
  }, [selectedConsultantKey, loadConsultantData]);

  const handleSelectConsultant = (id: string) => {
    setSelectedConsultantId(id);
    if (id) localStorage.setItem(`cold_call_consultant_${ownerId}`, id);
    else localStorage.removeItem(`cold_call_consultant_${ownerId}`);
  };

  const leadByPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return null;
    return leads.find(l => {
      const lClean = (l.phone || '').replace(/\D/g, '');
      return lClean && lClean === clean;
    }) || null;
  };

  const ensureLead = async (name: string, phone: string): Promise<ColdCallLead | null> => {
    if (!selectedConsultantKey) return null;
    const existing = leadByPhone(phone);
    if (existing) {
      if (name.trim() && (existing.name || '').trim() !== name.trim()) {
        await supabase.from('cold_call_leads').update({ name: name.trim() }).eq('id', existing.id);
      }
      return existing;
    }
    const { data, error } = await supabase
      .from('cold_call_leads')
      .insert({
        user_id: selectedConsultantKey,
        name: name.trim() || phone,
        phone,
        current_stage: 'Base Fria',
      })
      .select('id, name, phone, user_id, current_stage')
      .single();
    if (error) {
      toast.error(`Não foi possível cadastrar o contato: ${error.message}`);
      return null;
    }
    return data as ColdCallLead;
  };

  const recordCall = async (lead: ColdCallLead) => {
    if (!selectedConsultantKey) return null;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('cold_call_logs')
      .insert({
        cold_call_lead_id: lead.id,
        user_id: selectedConsultantKey,
        start_time: now,
        end_time: now,
        duration_seconds: 0,
        result: 'Ligou',
      })
      .select('id')
      .single();
    if (error) {
      toast.error(`Não foi possível registrar a ligação: ${error.message}`);
      return null;
    }
    return data;
  };

  const handleLigar = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const lead = await ensureLead(newName, newPhone);
      if (!lead) {
        setIsSaving(false);
        return;
      }
      const logRow = await recordCall(lead);
      if (!logRow) {
        setIsSaving(false);
        return;
      }
      const freshLead = { ...lead };
      if (freshLead.name === freshLead.phone) freshLead.name = newName.trim() || freshLead.phone;
      setPendingLead(freshLead);
      setPendingLogId(logRow.id);
      setResultName(freshLead.name && freshLead.name !== freshLead.phone ? freshLead.name : newName.trim());
      setResultPhone(freshLead.phone || newPhone.trim());
      setMeetingDate('');
      setMeetingTime('');
      setMeetingModality('Online');
      setMeetingNotes('');
      setIsResultDialogOpen(true);
      setNewName('');
      setNewPhone('');
      await refreshAfterWrite();
    } catch (err: any) {
      toast.error(`Erro ao registrar a ligação: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLogResult = async (lead: ColdCallLead, result: ColdCallResult, meeting?: { date?: string; time?: string; modality?: string; notes?: string }, contact?: { name?: string; phone?: string }) => {
    if (!selectedConsultantKey) return false;
    setIsSaving(true);
    try {
      let foundRows = 0;
      if (pendingLogId) {
        const { data, error: logError } = await supabase
          .from('cold_call_logs')
          .update({
            result,
            meeting_date: result === 'Agendar Reunião' ? meeting?.date || null : null,
            meeting_time: result === 'Agendar Reunião' ? meeting?.time || null : null,
            meeting_modality: result === 'Agendar Reunião' ? meeting?.modality || null : null,
            meeting_notes: (result === 'Agendar Reunião' || result === 'Pedir retorno') ? meeting?.notes || null : null,
          })
          .eq('id', pendingLogId)
          .select('id');
        if (logError) throw logError;
        foundRows = (data || []).length;
      }
      if (foundRows === 0) {
        const { data, error: logError } = await supabase
          .from('cold_call_logs')
          .update({
            result,
            meeting_date: result === 'Agendar Reunião' ? meeting?.date || null : null,
            meeting_time: result === 'Agendar Reunião' ? meeting?.time || null : null,
            meeting_modality: result === 'Agendar Reunião' ? meeting?.modality || null : null,
            meeting_notes: (result === 'Agendar Reunião' || result === 'Pedir retorno') ? meeting?.notes || null : null,
          })
          .eq('cold_call_lead_id', lead.id)
          .eq('result', 'Ligou')
          .is('meeting_date', null)
          .select('id')
          .limit(1);
        if (logError) throw logError;
      }

      const { error: leadError } = await supabase
        .from('cold_call_leads')
        .update({ current_stage: RESULT_TO_STAGE[result] })
        .eq('id', lead.id);
      if (leadError) throw leadError;

      const cName = contact?.name?.trim() || '';
      const cPhone = contact?.phone?.trim() || '';
      if (cName && cName !== lead.name) {
        await supabase.from('cold_call_leads').update({ name: cName }).eq('id', lead.id);
      }
      if (cPhone && cPhone !== lead.phone) {
        await supabase.from('cold_call_leads').update({ phone: cPhone }).eq('id', lead.id);
      }

      toast.success('Resultado registrado!');
      await refreshAfterWrite();
      return true;
    } catch (err: any) {
      toast.error(`Erro ao registrar o resultado: ${err.message || err}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const validatePositiveContact = () => {
    if (!resultName.trim()) {
      toast.error('Informe o nome da pessoa para registrar o positivo.');
      return false;
    }
    if (resultPhone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um telefone válido para registrar o positivo.');
      return false;
    }
    return true;
  };

  const handlePositiveResult = async (result: ColdCallResult) => {
    const lead = pendingLead;
    if (!lead) {
      setIsResultDialogOpen(false);
      return;
    }
    if (result === 'Agendar Reunião' || result === 'Pedir retorno') {
      if (!validatePositiveContact()) return;
      setContactName(resultName.trim());
      setContactPhone(resultPhone.trim());
      setDialogResult(result);
      setIsResultDialogOpen(false);
      setIsDialogOpen(true);
      return;
    }
    if (!validatePositiveContact()) return;
    const ok = await updateLogResult(lead, result, undefined, { name: resultName.trim(), phone: resultPhone.trim() });
    if (ok) setIsResultDialogOpen(false);
  };

  const handleDialogSave = async () => {
    const lead = pendingLead;
    if (!lead) return;
    if (!contactName.trim()) {
      toast.error('Informe o nome do contato.');
      return;
    }
    if (contactPhone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um telefone válido do contato.');
      return;
    }
    if (dialogResult === 'Agendar Reunião' && (!meetingDate || !meetingTime)) {
      toast.error('Informe data e horário da reunião.');
      return;
    }
    const ok = await updateLogResult(lead, dialogResult, {
      date: meetingDate || undefined,
      time: meetingTime || undefined,
      modality: meetingModality || undefined,
      notes: meetingNotes || undefined,
    }, { name: contactName.trim(), phone: contactPhone.trim() });
    if (ok) setIsDialogOpen(false);
  };

  const todaysMetrics = useMemo(() => {
    let calls = 0, contacts = 0, meetings = 0;
    logs.filter(l => isToday(l.start_time || l.created_at)).forEach(l => {
      calls += 1;
      if (POSITIVE_RESULTS.some(p => p.result === l.result)) contacts += 1;
      if (l.result === 'Agendar Reunião') meetings += 1;
    });
    return { calls, contacts, meetings };
  }, [logs]);

  const filteredStatusLogs = useMemo(() => {
    const leadById = new Map(leads.map(l => [l.id, l]));
    const term = statusSearch.trim().toLowerCase();
    return logs
      .map(l => ({ log: l, lead: leadById.get(l.cold_call_lead_id) || null }))
      .filter(({ log, lead }) => {
        if (!term) return true;
        return (lead?.name || '').toLowerCase().includes(term) || (lead?.phone || '').toLowerCase().includes(term) || log.result.toLowerCase().includes(term);
      })
      .sort((a, b) => new Date(b.log.start_time || b.log.created_at).getTime() - new Date(a.log.start_time || a.log.created_at).getTime());
  }, [logs, leads, statusSearch]);

  const todayLogsWithLead = useMemo(() => {
    const leadById = new Map(leads.map(l => [l.id, l]));
    return logs
      .filter(l => isToday(l.start_time || l.created_at))
      .map(l => ({ log: l, lead: leadById.get(l.cold_call_lead_id) || null }))
      .sort((a, b) => new Date(b.log.start_time || b.log.created_at).getTime() - new Date(a.log.start_time || a.log.created_at).getTime());
  }, [logs, leads]);

  const todayResultSummary = useMemo(() => {
    const byResult: Record<string, number> = {};
    todayLogsWithLead.forEach(({ log }) => {
      byResult[log.result] = (byResult[log.result] || 0) + 1;
    });
    const keys = [...new Set([...POSITIVE_RESULTS.map(p => p.result), 'Ligou', ...Object.keys(byResult)])];
    return keys.map(result => ({
      result,
      count: byResult[result] || 0,
    })).filter(({ count }) => count > 0);
  }, [todayLogsWithLead]);

  const refreshAfterWrite = async () => {
    if (!selectedConsultantKey) return;
    try {
      const [leadsRes, logsRes] = await Promise.all([
        getAllFromTable('cold_call_leads', { filters: { user_id: selectedConsultantKey } }),
        getAllFromTable('cold_call_logs', { filters: { user_id: selectedConsultantKey } }),
      ]);
      setLeads((leadsRes.data || []) as ColdCallLead[]);
      setLogs((logsRes.data || []) as ColdCallLog[]);
    } catch {
      // silencioso; os dados ainda aparecem parcialmente
    }
  };

  const openEditLogDialog = (log: ColdCallLog) => {
    setEditingLog(log);
    setEditLogResult(log.result);
    setEditLogNotes(log.meeting_notes || '');
    setIsEditLogOpen(true);
  };

  const availableEditResults: { result: ColdCallResult; label: string }[] = [
    ...POSITIVE_RESULTS.map(p => ({ result: p.result, label: p.label })),
    { result: 'Ligou', label: 'Só a ligação (sem positivo)' },
  ];

  const handleSaveEditLog = async () => {
    if (!editingLog) return;
    setIsSaving(true);
    try {
      const { error: logError } = await supabase
        .from('cold_call_logs')
        .update({
          result: editLogResult,
          meeting_notes: (editLogResult === 'Pedir retorno' || editLogResult === 'Agendar Reunião') ? (editLogNotes || null) : null,
        })
        .eq('id', editingLog.id);
      if (logError) throw logError;

      await supabase
        .from('cold_call_leads')
        .update({ current_stage: RESULT_TO_STAGE[editLogResult] })
        .eq('id', editingLog.cold_call_lead_id);

      toast.success('Resultado atualizado!');
      setIsEditLogOpen(false);
      setEditingLog(null);
      await refreshAfterWrite();
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const resultBadge = (result: string) => {
    const pos = POSITIVE_RESULTS.find(p => p.result === result);
    if (pos) return { label: pos.label, color: pos.color };
    if (result === 'Ligou') return { label: 'Ligou', color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
    return { label: result, color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300' };
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
              <p className="text-sm text-slate-500 dark:text-slate-400">Clique em Ligar a cada ligação e registre os resultados positivos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsTutorialOpen(true)} title="Ver como fazer as ligações" className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <BookOpen className="h-4 w-4" />
              <span>Como Fazer</span>
            </Button>
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
              <p className="mt-1 text-sm text-slate-500">Selecione seu nome para começar.</p>
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
          <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
            {/* Cabeçalho da operação */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedConsultant.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sua operação de hoje</p>
                </div>
              </div>
            </div>

            {/* Métricas do dia */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                { label: 'Ligações hoje', value: todaysMetrics.calls, icon: PhoneCall, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
                { label: 'Positivos hoje', value: todaysMetrics.contacts, icon: MessageCircle, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
                { label: 'Reuniões hoje', value: todaysMetrics.meetings, icon: CalendarCheck, color: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300' },
              ] as { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }[]).map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className={`shrink-0 rounded-xl p-3 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Nova ligação */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-violet-600 p-6 text-white shadow-xl shadow-brand-600/20 sm:p-8">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <PhoneCall className="h-4 w-4" /> Nova ligação
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newName" className="text-white/90">Nome da pessoa (opcional)</Label>
                    <Input
                      id="newName"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Ex: Maria Souza"
                      className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPhone" className="text-white/90">Telefone (opcional)</Label>
                    <Input
                      id="newPhone"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <button
                    onClick={handleLigar}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneCall className="h-5 w-5" />}
                    {isSaving ? 'Registrando...' : 'Ligar'}
                  </button>
                  <p className="mt-2 text-center text-xs text-white/60">
                    Cada clique em Ligar conta uma ligação no seu total do dia. Nome e telefone só são necessários quando houver positivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Ligações de hoje */}
            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold">
                  <PhoneCall className="h-5 w-5 text-emerald-600" /> Ligações de hoje ({todayLogsWithLead.length})
                </h3>
              </div>
              {todayLogsWithLead.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">
                  Nenhuma ligação registrada hoje. Clique em Ligar para registrar cada ligação.
                </p>
              ) : (
                <div className="divide-y dark:divide-slate-800">
                  {todayLogsWithLead.map(({ log, lead }) => {
                    const badge = resultBadge(log.result);
                    return (
                      <div key={log.id} className="flex w-full items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {lead?.name || lead?.phone || 'Contato'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPhone(lead?.phone) || '—'} ·{' '}
                            {new Date(log.start_time || log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {lead && (
                            <button
                              onClick={() => setHistoryLead(lead)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                              title="Histórico desta pessoa"
                            >
                              <History className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                            </button>
                          )}
                          {log.result === 'Ligou' && lead && (
                            <button
                              onClick={() => { setPendingLead(lead); setPendingLogId(log.id); setResultName(lead.name && lead.name !== lead.phone ? lead.name : ''); setResultPhone(lead.phone || ''); setMeetingDate(''); setMeetingTime(''); setMeetingModality('Online'); setMeetingNotes(''); setIsResultDialogOpen(true); }}
                              className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                              title="Registrar um resultado positivo"
                            >
                              Marcar positivo
                            </button>
                          )}
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                          <button
                            onClick={() => openEditLogDialog(log)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            title="Editar resultado"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumo de resultados */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b px-5 py-4 dark:border-slate-800">
                <MessageCircle className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold">Resumo de hoje</h3>
              </div>
              <div className="space-y-2 px-5 py-4">
                {todayResultSummary.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum resultado hoje ainda.</p>
                ) : (
                  todayResultSummary.map(s => {
                    const badge = resultBadge(s.result);
                    return (
                      <div key={s.result} className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{s.count}</span>
                      </div>
                    );
                  })
                )}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</span>
                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{todayLogsWithLead.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b px-5 py-4 dark:border-slate-800">
                <Search className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold">Buscar ligações</h3>
              </div>
              <div className="px-5 py-4">
                <Input
                  value={statusSearch}
                  onChange={e => setStatusSearch(e.target.value)}
                  placeholder="Nome, telefone ou resultado..."
                />
              </div>
              {filteredStatusLogs.length === 0 ? (
                <p className="px-5 pb-4 text-center text-sm text-slate-400">Nada encontrado.</p>
              ) : (
                <div className="max-h-[320px] divide-y overflow-y-auto dark:divide-slate-800">
                  {filteredStatusLogs.slice(0, 30).map(({ log, lead }) => {
                    const badge = resultBadge(log.result);
                    return (
                      <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {lead?.name || lead?.phone || 'Contato'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(log.start_time || log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ·{' '}
                            {new Date(log.start_time || log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                  {filteredStatusLogs.length > 30 && (
                    <p className="px-5 py-3 text-center text-xs text-slate-400">Mostrando os 30 primeiros resultados.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
          </div>

          {/* Dialog de resultado positivo */}
          <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white p-6 dark:bg-slate-800 dark:text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PhoneCall className="h-6 w-6 text-emerald-500" />
                  <span>A ligação teve resultado?</span>
                </DialogTitle>
                <DialogDescription>
                  Se teve positivo, preencha o nome e o telefone do contato.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="resultName">Nome da pessoa</Label>
                    <Input id="resultName" value={resultName} onChange={e => setResultName(e.target.value)} placeholder="Ex: Maria Souza" className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resultPhone">Telefone *</Label>
                    <Input id="resultPhone" value={resultPhone} onChange={e => setResultPhone(e.target.value)} placeholder="(00) 00000-0000" className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-400">Obrigatório somente quando houve resultado positivo.</p>

                <div className="grid grid-cols-1 gap-2 pt-1">
                {POSITIVE_RESULTS.map(btn => (
                  <button
                    key={btn.result}
                    disabled={isSaving}
                    onClick={() => handlePositiveResult(btn.result)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 border border-transparent ${btn.color}`}
                  >
                    <btn.icon className="h-5 w-5 shrink-0" />
                    <span>
                      {btn.label}
                      <span className="block text-xs font-normal opacity-80">{btn.description}</span>
                    </span>
                  </button>
                ))}
                </div>
              </div>

              <DialogFooter className="mt-4 pt-4 border-t border-gray-100 flex-col gap-2 sm:flex-row dark:border-slate-700">
                <Button type="button" variant="outline" onClick={() => setIsResultDialogOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                  Só liguei
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de detalhe (Pedir retorno / Agendar reunião) */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white p-6 dark:bg-slate-800 dark:text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {dialogResult === 'Pedir retorno' ? <RotateCcw className="h-6 w-6 text-blue-500" /> : <CalendarCheck className="h-6 w-6 text-green-500" />}
                  <span>{dialogResult === 'Pedir retorno' ? 'Registrar retorno' : 'Agendar reunião'}</span>
                </DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-slate-900 dark:text-white">{contactName || pendingLead?.name || pendingLead?.phone}</span>{contactPhone ? ` · ${formatPhone(contactPhone)}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Telefone *</Label>
                    <Input
                      id="contactPhone"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
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
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {isSaving ? 'Salvando...' : 'Registrar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de edição de resultado */}
          <Dialog open={isEditLogOpen} onOpenChange={setIsEditLogOpen}>
            <DialogContent className="sm:max-w-md bg-white p-6 dark:bg-slate-800 dark:text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-6 w-6 text-brand-600" />
                  <span>Editar resultado da ligação</span>
                </DialogTitle>
                <DialogDescription>
                  {editingLog ? (
                    <>{leads.find(l => l.id === editingLog.cold_call_lead_id)?.name || 'Contato'} ·{' '}
                    {formatPhone(leads.find(l => l.id === editingLog.cold_call_lead_id)?.phone) || editingLog.cold_call_lead_id}</>
                  ) : '—'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 gap-2">
                  {availableEditResults.map(btn => (
                    <button
                      key={btn.result}
                      disabled={isSaving}
                      onClick={() => setEditLogResult(btn.result)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 border ${
                        editLogResult === btn.result
                          ? 'border-brand-600 ring-2 ring-brand-600/30 bg-brand-50 dark:bg-brand-950'
                          : 'border-slate-200 dark:border-slate-700'
                      } ${resultBadge(btn.result).color}`}
                    >
                      <span className="flex-1">{btn.label}</span>
                    </button>
                  ))}
                </div>

                {(editLogResult === 'Pedir retorno' || editLogResult === 'Agendar Reunião') && (
                  <div className="space-y-2">
                    <Label htmlFor="editLogNotes">
                      {editLogResult === 'Pedir retorno' ? 'O que foi conversado?' : 'Observações da reunião'}
                    </Label>
                    <Textarea
                      id="editLogNotes"
                      rows={3}
                      value={editLogNotes}
                      onChange={e => setEditLogNotes(e.target.value)}
                      placeholder={editLogResult === 'Pedir retorno' ? 'Descreva o que foi conversado...' : 'Observações da reunião...'}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 pt-4 border-t border-gray-100 flex-col gap-2 sm:flex-row dark:border-slate-700">
                <Button type="button" onClick={handleSaveEditLog} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditLogOpen(false)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de histórico */}
          <Dialog open={!!historyLead} onOpenChange={open => { if (!open) setHistoryLead(null); }}>
            <DialogContent className="sm:max-w-lg bg-white p-6 dark:bg-slate-800 dark:text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-brand-600" />
                  <span>Histórico: {historyLead?.name || historyLead?.phone}</span>
                </DialogTitle>
                <DialogDescription>
                  {formatPhone(historyLead?.phone)} · {historyLead?.current_stage || '—'} · {logs.filter(l => l.cold_call_lead_id === historyLead?.id).length} ligação(ões)
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[50vh] space-y-3 overflow-y-auto py-2 pr-1">
                {historyLead && logs.filter(l => l.cold_call_lead_id === historyLead.id)
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((log, i) => {
                    const badge = resultBadge(log.result);
                    return (
                      <div key={log.id} className="flex items-center justify-between rounded-xl border bg-white p-3 dark:border-slate-700 dark:bg-slate-700/50">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {i + 1}ª ligação · {new Date(log.start_time || log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ·{' '}
                            {new Date(log.start_time || log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {log.result === 'Agendar Reunião' && log.meeting_date && (
                            <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                              Reunião: {new Date(log.meeting_date).toLocaleDateString('pt-BR')}{log.meeting_time ? ` às ${log.meeting_time}` : ''}
                            </p>
                          )}
                          {log.meeting_notes && (
                            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{log.meeting_notes}</p>
                          )}
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="outline" onClick={() => setHistoryLead(null)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Como Fazer */}
          <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
            <DialogContent className="sm:max-w-lg bg-white p-6 dark:bg-slate-800 dark:text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-amber-500" />
                  <span>Como Fazer</span>
                </DialogTitle>
                <DialogDescription>Passo a passo deixado pelo gestor.</DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-700/50 dark:text-slate-200">
                {tutorialText ? tutorialText : 'O gestor ainda não escreveu o tutorial. Volte logo!'}
              </div>
              <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" onClick={() => setIsTutorialOpen(false)} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                  Entendi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

export default PublicColdCall;