import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PhoneCall, MessageSquare, CalendarCheck, Target, Trophy, BarChart3,
  AlertTriangle, TrendingUp, Users, Maximize, Minimize,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ColdCallLead, ColdCallLog, ColdCallGoals } from '@/types';

const DEFAULT_GOALS: ColdCallGoals = { calls: 80, contacts: 30, interested: 5, meetings: 3 };

const STAGE_ORDER: Record<ColdCallLead['current_stage'], number> = {
  'Base Fria': 0,
  'Tentativa de Contato': 1,
  'Conversou': 2,
  'Reunião Agendada': 3,
};

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [
  'from-amber-400 to-yellow-300',
  'from-slate-300 to-slate-200',
  'from-amber-600 to-orange-400',
];

interface PublicTeamMember {
  id: string;
  name: string;
  roles: string[];
  isActive: boolean;
  consultantKey: string;
}

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return t >= todayStart.getTime() && t < todayStart.getTime() + 86400000;
};

const PublicColdCallTV = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [consultants, setConsultants] = useState<PublicTeamMember[]>([]);
  const [leads, setLeads] = useState<ColdCallLead[]>([]);
  const [logs, setLogs] = useState<ColdCallLog[]>([]);
  const [goals, setGoals] = useState<ColdCallGoals>(DEFAULT_GOALS);
  const [now, setNow] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const loadData = useCallback(async () => {
    if (!ownerId) return;
    const [membersRes, goalsRes, leadsRes, logsRes] = await Promise.all([
      supabase.from('team_members').select('id, data').eq('user_id', ownerId),
      supabase.rpc('get_cold_call_goals', { p_user: ownerId }),
      supabase.from('cold_call_leads').select('*'),
      supabase.from('cold_call_logs').select('*'),
    ]);

    if (!membersRes.error) {
      const members: PublicTeamMember[] = (membersRes.data || [])
        .map((row: any) => {
          const d = row.data || {};
          return {
            id: row.id,
            name: String(d.name || ''),
            roles: Array.isArray(d.roles) ? d.roles.map((r: string) => String(r).toUpperCase()) : [],
            isActive: d.isActive !== false,
            consultantKey: d.id || d.authUserId || row.id,
          };
        })
        .filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')))
        .sort((a, b) => a.name.localeCompare(b.name));
      setConsultants(members);
    }

    if (!goalsRes.error && goalsRes.data) {
      setGoals({ ...DEFAULT_GOALS, ...(goalsRes.data as Partial<ColdCallGoals>) });
    }

    if (!leadsRes.error) setLeads((leadsRes.data || []) as ColdCallLead[]);
    if (!logsRes.error) setLogs((logsRes.data || []) as ColdCallLog[]);

    setIsLoading(false);
  }, [ownerId]);

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, 15000);
    const clockInterval = setInterval(() => setNow(new Date()), 10000);

    const channel = supabase
      .channel('cold-call-tv-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cold_call_logs' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cold_call_logs' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cold_call_leads' },
        () => loadData()
      )
      .subscribe();

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const todayLogs = useMemo(() => logs.filter(l => isToday(l.start_time || l.created_at)), [logs]);

  const liveTotals = useMemo(() => {
    let calls = 0, answered = 0, meetings = 0;
    todayLogs.forEach(l => {
      calls += 1;
      if (l.result !== 'Não atendeu' && l.result !== 'Número inválido') answered += 1;
      if (l.result === 'Agendar Reunião') meetings += 1;
    });
    return { calls, answered, meetings };
  }, [todayLogs]);

  const liveMetaCompletion = useMemo(() => {
    const values = [liveTotals.calls, liveTotals.answered, liveTotals.meetings];
    const metas = [goals.calls, goals.contacts, goals.meetings];
    const pcts = values.map((v, i) => metas[i] > 0 ? Math.min(100, (v / metas[i]) * 100) : 0);
    return pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  }, [liveTotals, goals]);

  const ranking = useMemo(() => {
    return consultants
      .map(m => {
        const uid = m.consultantKey;
        const logsFor = todayLogs.filter(l => l.user_id === uid);
        const calls = logsFor.length;
        const answered = logsFor.filter(l => l.result !== 'Não atendeu' && l.result !== 'Número inválido').length;
        const meetings = logsFor.filter(l => l.result === 'Agendar Reunião').length;
        return { consultant: m, uid, calls, answered, meetings };
      })
      .sort((a, b) => b.meetings - a.meetings || b.answered - a.answered || b.calls - a.calls);
  }, [consultants, todayLogs]);

  const funnelAnalysis = useMemo(() => {
    const baseLeads = leads.filter(l => l.current_stage === 'Base Fria').length;
    const stages = [
      { label: 'Ligações realizadas', value: liveTotals.calls, rate: liveTotals.calls > 0 ? 100 : 0, strong: 'bg-blue-500', faint: 'from-blue-500 to-blue-400' },
      { label: 'Ligações atendidas', value: liveTotals.answered, rate: liveTotals.calls > 0 ? (liveTotals.answered / liveTotals.calls) * 100 : 0, strong: 'bg-sky-500', faint: 'from-sky-500 to-sky-400' },
      { label: 'Reuniões marcadas', value: liveTotals.meetings, rate: liveTotals.answered > 0 ? (liveTotals.meetings / liveTotals.answered) * 100 : 0, strong: 'bg-green-500', faint: 'from-green-500 to-emerald-400' },
    ];
    const bottlenecks = stages
      .filter(s => s.label !== 'Ligações realizadas' && s.value > 0)
      .map(s => ({ label: s.label, rate: s.rate }));
    let bottleneck: { label: string; rate: number } | null = null;
    if (bottlenecks.length > 0) {
      bottleneck = bottlenecks.reduce((min, s) => (s.rate < min.rate ? s : min));
    }
    return { baseLeads, stages, bottleneck };
  }, [leads, liveTotals]);

  const dateLabel = useMemo(() => {
    return now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }, [now]);

  const timeLabel = useMemo(() => {
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [now]);

  const kpiCards = [
    { label: 'Ligações realizadas', value: liveTotals.calls, meta: goals.calls, icon: PhoneCall, color: 'bg-blue-500/20 text-blue-300', bar: 'bg-blue-400' },
    { label: 'Ligações atendidas', value: liveTotals.answered, meta: goals.contacts, icon: MessageSquare, color: 'bg-sky-500/20 text-sky-300', bar: 'bg-sky-400' },
    { label: 'Reuniões marcadas', value: liveTotals.meetings, meta: goals.meetings, icon: CalendarCheck, color: 'bg-green-500/20 text-green-300', bar: 'bg-green-400' },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <BarChart3 className="h-12 w-12 animate-pulse text-brand-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col p-6 lg:p-10">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 p-4 shadow-lg shadow-brand-600/40">
              <PhoneCall className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Cold Call · AO VIVO</h1>
              <p className="text-lg capitalize text-slate-400">{dateLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
              </span>
              <span className="font-bold text-green-300">AO VIVO</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="rounded-full bg-white/10 p-3 text-slate-300 hover:bg-white/20 transition"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            <div className="rounded-2xl bg-white/5 px-6 py-3 text-right backdrop-blur">
              <p className="text-3xl font-black tabular-nums">{timeLabel}</p>
              <p className="flex items-center justify-end gap-1 text-sm text-slate-400">
                <Users className="h-4 w-4" /> {consultants.length} consultores
              </p>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <section className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-5">
          {kpiCards.map(k => {
            const pct = k.meta > 0 ? Math.min(100, Math.round((k.value / k.meta) * 100)) : 0;
            const barClass = pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
            return (
              <div key={k.label} className="relative overflow-hidden rounded-3xl bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${k.color}`}>
                    <k.icon className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-6xl font-black leading-none tabular-nums">{k.value}</span>
                  <span className="pb-1 text-2xl font-semibold text-slate-500">/ {k.meta}</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${barClass} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <p className={`mt-2 text-sm font-bold ${pct >= 100 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {pct}% da meta
                </p>
              </div>
            );
          })}

          {/* Meta do dia */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-violet-700 p-6 shadow-xl shadow-brand-700/40">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-3">
                <Target className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-white/80">Meta do dia</p>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-6xl font-black leading-none tabular-nums">{liveMetaCompletion}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${liveMetaCompletion}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-white/80">Média de cumprimento das 3 metas</p>
          </div>
        </section>

        {/* Ranking + Funil */}
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* Ranking */}
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur xl:col-span-3">
            <div className="mb-4 flex items-center gap-3">
              <Trophy className="h-7 w-7 text-amber-400" />
              <h2 className="text-2xl font-black">Ranking ao Vivo</h2>
            </div>

            {ranking.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-2xl bg-white/5 text-lg text-slate-400">
                Nenhum consultor ativo
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {ranking.slice(0, 3).map((r, index) => (
                  <div
                    key={r.uid}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${RANK_COLORS[index]} p-5 text-slate-900`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-5xl drop-shadow">{MEDALS[index]}</span>
                      <span className="text-4xl font-black tabular-nums">{r.meetings}<span className="text-xl"> ★</span></span>
                    </div>
                    <p className="mt-3 text-2xl font-black leading-tight">{r.consultant.name}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-black/10 p-2">
                        <p className="text-2xl font-black tabular-nums">{r.calls}</p>
                        <p className="text-[11px] font-bold uppercase">Ligações</p>
                      </div>
                      <div className="rounded-lg bg-black/10 p-2">
                        <p className="text-2xl font-black tabular-nums">{r.answered}</p>
                        <p className="text-[11px] font-bold uppercase">Atendidas</p>
                      </div>
                      <div className="rounded-lg bg-black/10 p-2">
                        <p className="text-2xl font-black tabular-nums">{r.meetings}</p>
                        <p className="text-[11px] font-bold uppercase">Reuniões</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabela completa */}
            {ranking.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl bg-black/20">
                <table className="w-full text-left text-lg">
                  <thead className="bg-white/5 text-sm font-bold uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Consultor</th>
                      <th className="px-5 py-3 text-center">Ligações</th>
                      <th className="px-5 py-3 text-center">Atendidas</th>
                      <th className="px-5 py-3 text-center">Reuniões</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {ranking.map((r, index) => (
                      <tr key={r.uid} className="hover:bg-white/5">
                        <td className="px-5 py-3 font-black text-slate-400">
                          {index < 3 ? MEDALS[index] : index + 1}
                        </td>
                        <td className="px-5 py-3 font-bold">{r.consultant.name}</td>
                        <td className="px-5 py-3 text-center font-black tabular-nums">{r.calls}</td>
                        <td className="px-5 py-3 text-center font-semibold tabular-nums">{r.answered}</td>
                        <td className="px-5 py-3 text-center font-black tabular-nums text-green-300">{r.meetings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Funil */}
          <div className="flex flex-col gap-6 xl:col-span-2">
            <div className="rounded-3xl bg-white/5 p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-brand-400" />
                <h2 className="text-2xl font-black">Funil de Conversão</h2>
              </div>
              <div className="space-y-3">
                {funnelAnalysis.stages.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-4">
                    <div className="w-28 shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-300">{s.label}</p>
                      <p className={`text-3xl font-black ${s.strong}`}>{s.value}</p>
                    </div>
                    <div className="relative h-7 flex-1">
                      <div className="absolute inset-x-0 bottom-0 h-7 scale-x-105 origin-left" style={{ clipPath: 'polygon(4% 100%, 100% 100%, 100% 0%, 0% 0%)' }}>
                        <div className={`h-full w-full bg-gradient-to-b ${s.faint} opacity-60`} />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-2 rounded-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm">
                <p className="flex items-center gap-2 font-bold text-slate-300"><TrendingUp className="h-5 w-5 text-brand-400" /> Base fria: {funnelAnalysis.baseLeads} leads aguardando</p>
                {funnelAnalysis.bottleneck && (
                  <p className="mt-1 flex items-center gap-2 text-slate-400">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    Gargalo: <span className="font-bold text-amber-300">{funnelAnalysis.bottleneck.label}</span> ({funnelAnalysis.bottleneck.rate.toFixed(0)}%)
                  </p>
                )}
              </div>
            </div>

            {/* Resumo geral */}
            <div className="flex-1 rounded-3xl bg-gradient-to-br from-blue-600/30 to-brand-700/30 p-6 backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                {kpiCards.map(k => (
                  <div key={k.label} className="rounded-2xl bg-black/20 p-4">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-300">{k.label}</p>
                    <p className="mt-1 text-5xl font-black tabular-nums">{k.value}<span className="text-xl text-slate-400"> /{k.meta}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>Atualização automática a cada 15s</span>
          <span className="capitalize">{dateLabel} · {timeLabel}</span>
        </footer>
      </div>
    </div>
  );
};

export default PublicColdCallTV;
