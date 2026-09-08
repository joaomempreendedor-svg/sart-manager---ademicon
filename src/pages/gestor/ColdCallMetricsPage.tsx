import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, MessageSquare, CalendarCheck, BarChart3, Percent, Loader2, Users, Filter, RotateCcw, CalendarDays, UserPlus, ArrowUpRight, Clock, TrendingUp, Star, Target, Trophy, Settings2, ChevronRight, UploadCloud, Link2 } from 'lucide-react';
import { ColdCallDetailModal } from '@/components/gestor/ColdCallDetailModal';
import ImportColdCallLeadsDivisionModal, { ColdCallImportConsultant } from '@/components/gestor/ImportColdCallLeadsDivisionModal';
import { ColdCallLead, ColdCallLog, ColdCallDetailType, ColdCallGoals } from '@/types';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/MetricCard';

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return t >= todayStart.getTime() && t < todayStart.getTime() + 86400000;
};

const MEDALS = ['🥇', '🥈', '🥉'];

interface LiveKpiProps {
  title: string;
  value: number | string;
  meta: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  onClick?: () => void;
}

const LiveKpiCard: React.FC<LiveKpiProps> = ({ title, value, meta, icon: Icon, iconColorClass = 'text-brand-500', onClick }) => {
  const numericValue = typeof value === 'number' ? value : NaN;
  const pct = !isNaN(numericValue) && meta > 0 ? Math.min(100, Math.round((numericValue / meta) * 100)) : 0;
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const inner = (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-all hover:shadow-md w-full h-full">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{value}</span>
        <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">/ {meta}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1.5 text-xs font-bold ${pct >= 100 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
        {pct}% da meta
      </p>
    </div>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full h-full block">
        {inner}
      </button>
    );
  }
  return <div className="h-full">{inner}</div>;
};

const ColdCallMetricsPage = () => {
  const { user } = useAuth();
  const { coldCallLeads, coldCallLogs, coldCallGoals, updateColdCallGoals, addColdCallLeadsWithAssignments, teamMembers, isDataLoading } = useApp();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [selectedColdCallConsultantId, setSelectedColdCallConsultantId] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isColdCallDetailModalOpen, setIsColdCallDetailModalOpen] = useState(false);
  const [coldCallModalTitle, setColdCallModalTitle] = useState('');
  const [coldCallLeadsForModal, setColdCallLeadsForModal] = useState<ColdCallLead[]>([]);
  const [coldCallLogsForModal, setColdCallLogsForModal] = useState<ColdCallLog[]>([]);
  const [coldCallDetailType, setColdCallDetailType] = useState<ColdCallDetailType>('all');
  const [modalFilterStartDate, setModalFilterStartDate] = useState('');
  const [modalFilterEndDate, setModalFilterEndDate] = useState('');

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [goalsDraft, setGoalsDraft] = useState<ColdCallGoals>(coldCallGoals);

  const selectedColdCallConsultantName = useMemo(() => {
    if (!selectedColdCallConsultantId) {
      return 'Todos os Consultores';
    }
    return teamMembers.find(m => (m.authUserId || m.id) === selectedColdCallConsultantId)?.name || 'Consultor Desconhecido';
  }, [selectedColdCallConsultantId, teamMembers]);

  const coldCallConsultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')));
  }, [teamMembers]);

  const coldCallImportConsultants: ColdCallImportConsultant[] = useMemo(() => {
    return coldCallConsultants.map(m => ({ id: m.id, name: m.name, key: (m.authUserId || m.id) }));
  }, [coldCallConsultants]);

  const filteredColdCallLogs = useMemo(() => {
    let logs = coldCallLogs;
    if (selectedColdCallConsultantId) {
      logs = logs.filter(log => log.user_id === selectedColdCallConsultantId);
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      logs = logs.filter(log => new Date(log.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      logs = logs.filter(log => new Date(log.created_at) <= end);
    }
    return logs;
  }, [coldCallLogs, selectedColdCallConsultantId, filterStartDate, filterEndDate]);

  const filteredColdCallLeadsForMetrics = useMemo(() => {
    let leads = coldCallLeads;
    if (selectedColdCallConsultantId) {
      leads = leads.filter(lead => lead.user_id === selectedColdCallConsultantId);
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      leads = leads.filter(lead => new Date(lead.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      leads = leads.filter(lead => new Date(lead.created_at) <= end);
    }
    return leads;
  }, [coldCallLeads, selectedColdCallConsultantId, filterStartDate, filterEndDate]);

  const coldCallMetrics = useMemo(() => {
    const totalCalls = filteredColdCallLogs.length;

    const answeredLogs = filteredColdCallLogs.filter(log =>
      log.result !== 'Não atendeu' && log.result !== 'Número inválido'
    );
    const totalAnswered = answeredLogs.length;

    const totalConversations = answeredLogs.filter(log =>
      log.result === 'Demonstrou Interesse' || log.result === 'Agendar Reunião'
    ).length;
    const totalMeetingsScheduled = answeredLogs.filter(log => log.result === 'Agendar Reunião').length;

    const interestConversionRate = totalAnswered > 0 ? (totalConversations / totalAnswered) * 100 : 0;
    const meetingConversionRate = totalAnswered > 0 ? (totalMeetingsScheduled / totalAnswered) * 100 : 0;

    const totalDuration = filteredColdCallLogs.reduce((sum, log) => sum + log.duration_seconds, 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      totalAnswered,
      totalConversations,
      totalMeetingsScheduled,
      interestConversionRate,
      meetingConversionRate,
      averageDuration,
    };
  }, [filteredColdCallLogs]);

  // ---------- Painel ao Vivo (Hoje) ----------
  const todayLogs = useMemo(() => {
    return coldCallLogs.filter(log => isToday(log.start_time || log.created_at));
  }, [coldCallLogs]);

  const perConsultantToday = useMemo(() => {
    const map: Record<string, { calls: number; contacts: number; interested: number; meetings: number }> = {};
    coldCallConsultants.forEach(m => {
      const uid = m.authUserId || m.id;
      const logs = todayLogs.filter(l => l.user_id === uid);
      map[uid] = {
        calls: logs.length,
        contacts: logs.filter(l => l.result !== 'Não atendeu' && l.result !== 'Número inválido').length,
        interested: logs.filter(l => l.result === 'Demonstrou Interesse').length,
        meetings: logs.filter(l => l.result === 'Agendar Reunião').length,
      };
    });
    return map;
  }, [todayLogs, coldCallConsultants]);

  const liveTotals = useMemo(() => {
    let calls = 0, contacts = 0, interested = 0, meetings = 0;
    todayLogs.forEach(l => {
      calls += 1;
      if (l.result !== 'Não atendeu' && l.result !== 'Número inválido') contacts += 1;
      if (l.result === 'Demonstrou Interesse') interested += 1;
      if (l.result === 'Agendar Reunião') meetings += 1;
    });
    return { calls, contacts, interested, meetings };
  }, [todayLogs]);

  const liveMetaCompletion = useMemo(() => {
    const pcts = [
      liveTotals.calls, liveTotals.contacts, liveTotals.interested, liveTotals.meetings,
    ].map((v, i) => {
      const metaValues = [coldCallGoals.calls, coldCallGoals.contacts, coldCallGoals.interested, coldCallGoals.meetings];
      return metaValues[i] > 0 ? Math.min(100, (v / metaValues[i]) * 100) : 0;
    });
    return pcts.length > 0 ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  }, [liveTotals, coldCallGoals]);

  const ranking = useMemo(() => {
    return coldCallConsultants
      .map(m => {
        const uid = m.authUserId || m.id;
        const metrics = perConsultantToday[uid] || { calls: 0, contacts: 0, interested: 0, meetings: 0 };
        const meetingsPct = coldCallGoals.meetings > 0 ? Math.min(100, Math.round((metrics.meetings / coldCallGoals.meetings) * 100)) : 0;
        return { consultant: m, uid, ...metrics, meetingsPct };
      })
      .sort((a, b) => b.meetings - a.meetings || b.contacts - a.contacts || b.calls - a.calls);
  }, [coldCallConsultants, perConsultantToday, coldCallGoals.meetings]);

  const funnelAnalysis = useMemo(() => {
    const baseLeads = coldCallLeads.filter(l => l.current_stage === 'Base Fria').length;
    const poolWorked = baseLeads > 0 ? (liveTotals.calls / baseLeads) * 100 : null;
    const callContact = liveTotals.calls > 0 ? (liveTotals.contacts / liveTotals.calls) * 100 : null;
    const contactInterest = liveTotals.contacts > 0 ? (liveTotals.interested / liveTotals.contacts) * 100 : null;
    const interestMeeting = liveTotals.interested > 0 ? (liveTotals.meetings / liveTotals.interested) * 100 : null;

    const stages = [
      { label: 'Base → Ligações', rate: poolWorked },
      { label: 'Ligações → Contatos', rate: callContact },
      { label: 'Contatos → Interessados', rate: contactInterest },
      { label: 'Interessados → Reuniões', rate: interestMeeting },
    ];
    const withRate: { label: string; rate: number }[] = stages.filter((s): s is { label: string; rate: number } => s.rate !== null);
    let bottleneck: { label: string; rate: number } | null = null;
    if (withRate.length > 0) {
      bottleneck = withRate.reduce((min, s) => (s.rate! < min.rate! ? s : min));
    }
    return { baseLeads, poolWorked, callContact, contactInterest, interestMeeting, bottleneck };
  }, [coldCallLeads, liveTotals]);

  const handleOpenColdCallDetailModal = (title: string, type: ColdCallDetailType) => {
    const leadsToPass = selectedColdCallConsultantId
      ? coldCallLeads.filter(l => l.user_id === selectedColdCallConsultantId)
      : coldCallLeads;

    setColdCallModalTitle(title);
    setColdCallLeadsForModal(leadsToPass);
    setColdCallLogsForModal(filteredColdCallLogs);
    setColdCallDetailType(type);
    setModalFilterStartDate(filterStartDate);
    setModalFilterEndDate(filterEndDate);
    setIsColdCallDetailModalOpen(true);
  };

  const handleOpenTodayDetailModal = (title: string, type: ColdCallDetailType) => {
    setColdCallModalTitle(`${title} — Hoje`);
    setColdCallLeadsForModal(coldCallLeads);
    setColdCallLogsForModal(todayLogs);
    setColdCallDetailType(type);
    setModalFilterStartDate('');
    setModalFilterEndDate('');
    setIsColdCallDetailModalOpen(true);
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedColdCallConsultantId(null);
  };

  const hasActiveFilters = filterStartDate || filterEndDate || selectedColdCallConsultantId;

  const openGoalsModal = () => {
    setGoalsDraft(coldCallGoals);
    setIsGoalsModalOpen(true);
  };

  const saveGoals = () => {
    updateColdCallGoals({
      calls: Math.max(0, goalsDraft.calls),
      contacts: Math.max(0, goalsDraft.contacts),
      interested: Math.max(0, goalsDraft.interested),
      meetings: Math.max(0, goalsDraft.meetings),
    });
    setIsGoalsModalOpen(false);
    toast.success('Metas diárias atualizadas');
  };

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }, []);

  const publicOperationUrl = useMemo(() => {
    const ownerId = user?.id || '';
    return `${window.location.origin}${window.location.pathname}#/cold-call/${ownerId}`;
  }, [user?.id]);

  const copyPublicOperationLink = async () => {
    try {
      await navigator.clipboard.writeText(publicOperationUrl);
      toast.success('Link da operação copiado!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const progressBarClass = (pct: number) => pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div key={user?.id || 'guest'} className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <PhoneCall className="w-6 h-6 mr-2 text-brand-500" /> Cold Call — Painel do Gestor
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={copyPublicOperationLink}
            className="flex items-center space-x-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:underline"
            title="Copiar link público para os consultores operarem sem login"
          >
            <Link2 className="w-4 h-4" />
            <span>Copiar link da operação</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Leads</span>
          </button>
          <button
            onClick={openGoalsModal}
            className="flex items-center space-x-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <Settings2 className="w-4 h-4" />
            <span>Editar Meta do Dia</span>
          </button>
        </div>
      </div>

      {/* ===== PAINEL AO VIVO ===== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-brand-500" /> Painel ao Vivo · Hoje
          </h2>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">{todayLabel}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <LiveKpiCard
            title="Ligações"
            value={liveTotals.calls}
            meta={coldCallGoals.calls}
            icon={PhoneCall}
            iconColorClass="text-blue-600 dark:text-blue-400"
            onClick={() => handleOpenTodayDetailModal('Total de Ligações', 'calls')}
          />
          <LiveKpiCard
            title="Contatos"
            value={liveTotals.contacts}
            meta={coldCallGoals.contacts}
            icon={MessageSquare}
            iconColorClass="text-sky-600 dark:text-sky-400"
            onClick={() => handleOpenTodayDetailModal('Contatos Realizados', 'answered')}
          />
          <LiveKpiCard
            title="Interessados"
            value={liveTotals.interested}
            meta={coldCallGoals.interested}
            icon={Star}
            iconColorClass="text-amber-600 dark:text-amber-400"
            onClick={() => handleOpenTodayDetailModal('Demonstraram Interesse', 'interest')}
          />
          <LiveKpiCard
            title="Reuniões"
            value={liveTotals.meetings}
            meta={coldCallGoals.meetings}
            icon={CalendarCheck}
            iconColorClass="text-green-600 dark:text-green-400"
            onClick={() => handleOpenTodayDetailModal('Reuniões Agendadas', 'meetings')}
          />
          <LiveKpiCard
            title="Meta Diária"
            value={`${liveMetaCompletion}%`}
            meta={100}
            icon={Target}
            iconColorClass="text-teal-600 dark:text-teal-400"
          />
        </div>
      </section>

      {/* ===== RANKING + TABELA DO TIME ===== */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-brand-500" /> Ranking ao Vivo
        </h2>

        {ranking.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum consultor ativo encontrado para o ranking.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ranking.slice(0, 3).map((r, index) => (
              <div key={r.uid} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm relative overflow-hidden">
                {index === 0 && <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-300" />}
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{MEDALS[index]}</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{r.meetings}<span className="text-sm font-semibold text-gray-400"> reuniões</span></span>
                </div>
                <p className="mt-2 font-bold text-gray-900 dark:text-white">{r.consultant.name}</p>
                <div className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <p className="flex items-center justify-between"><span>Ligações</span><span className="font-bold text-gray-800 dark:text-gray-200">{r.calls}</span></p>
                  <p className="flex items-center justify-between"><span>Contatos</span><span className="font-bold text-gray-800 dark:text-gray-200">{r.contacts}</span></p>
                  <p className="flex items-center justify-between"><span>Interessados</span><span className="font-bold text-gray-800 dark:text-gray-200">{r.interested}</span></p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                  <div className={`h-full rounded-full ${progressBarClass(r.meetingsPct)}`} style={{ width: `${r.meetingsPct}%` }} />
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{r.meetingsPct}% da meta de reuniões</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Consultor</th>
                <th className="px-4 py-3 text-center">Ligações</th>
                <th className="px-4 py-3 w-40 min-w-40">Meta Ligações</th>
                <th className="px-4 py-3 text-center">Contatos</th>
                <th className="px-4 py-3 text-center">Interessados</th>
                <th className="px-4 py-3 text-center">Reuniões</th>
                <th className="px-4 py-3 w-40 min-w-40">Meta Reuniões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {ranking.map((r, index) => (
                <tr key={r.uid} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3 font-bold text-gray-400">
                    {index < 3 ? MEDALS[index] : index + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.consultant.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{r.calls}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div className={`h-full rounded-full ${progressBarClass(coldCallGoals.calls > 0 ? Math.round((r.calls / coldCallGoals.calls) * 100) : 0)}`} style={{ width: `${coldCallGoals.calls > 0 ? Math.min(100, (r.calls / coldCallGoals.calls) * 100) : 0}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">{r.contacts}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">{r.interested}</td>
                  <td className="px-4 py-3 text-center font-bold text-green-600 dark:text-green-400">{r.meetings}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div className={`h-full rounded-full ${progressBarClass(r.meetingsPct)}`} style={{ width: `${r.meetingsPct}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== FUNIL ===== */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-brand-500" /> Funil de Conversão
        </h2>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="rounded-lg bg-slate-100 dark:bg-slate-700/60 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Leads na Base Fria</p>
              <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{funnelAnalysis.baseLeads}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{funnelAnalysis.poolWorked !== null ? `${funnelAnalysis.poolWorked.toFixed(0)}%` : '—'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ligações Hoje</p>
              <p className="mt-1 text-3xl font-black text-blue-700 dark:text-blue-300">{liveTotals.calls}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{funnelAnalysis.callContact !== null ? `${funnelAnalysis.callContact.toFixed(0)}%` : '—'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Contatos Efetivos</p>
              <p className="mt-1 text-3xl font-black text-sky-700 dark:text-sky-300">{liveTotals.contacts}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{funnelAnalysis.contactInterest !== null ? `${funnelAnalysis.contactInterest.toFixed(0)}%` : '—'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Interessados</p>
              <p className="mt-1 text-3xl font-black text-amber-700 dark:text-amber-300">{liveTotals.interested}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{funnelAnalysis.interestMeeting !== null ? `${funnelAnalysis.interestMeeting.toFixed(0)}%` : '—'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Reuniões Hoje</p>
              <p className="mt-1 text-3xl font-black text-green-700 dark:text-green-300">{liveTotals.meetings}</p>
            </div>
          </div>

          {funnelAnalysis.bottleneck && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start space-x-3">
              <Percent className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Diagnóstico do funil</p>
                <p className="text-sm text-amber-700/90 dark:text-amber-300/90">
                  Maior gargalo hoje: <span className="font-bold">{funnelAnalysis.bottleneck.label}</span> com apenas{' '}
                  <span className="font-bold">{funnelAnalysis.bottleneck.rate!.toFixed(0)}%</span> de conversão.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== MÉTRICAS POR PERÍODO ===== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-brand-500" /> Métricas por Período
          </h2>
          <div className="flex items-center space-x-2">
            <label htmlFor="coldCallConsultant" className="text-sm font-medium text-gray-700 dark:text-gray-300">Consultor:</label>
            <Select
              value={selectedColdCallConsultantId || 'all'}
              onValueChange={(value) => setSelectedColdCallConsultantId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[180px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Selecione o Consultor" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {coldCallConsultants.map(consultant => (
                  <SelectItem key={consultant.id} value={consultant.authUserId || consultant.id}>
                    {consultant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-col sm:flex-row">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar por Período</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
                <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Início</label>
              <input
                type="date"
                id="filterStartDate"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Fim</label>
              <input
                type="date"
                id="filterEndDate"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Total de Ligações"
            value={coldCallMetrics.totalCalls}
            icon={PhoneCall}
            colorClass="bg-blue-600 text-white"
            subValue="Chamadas registradas no período"
            onClick={() => handleOpenColdCallDetailModal('Total de Ligações', 'calls')}
          />
          <MetricCard
            title="Ligações Atendidas"
            value={coldCallMetrics.totalAnswered}
            icon={MessageSquare}
            colorClass="bg-sky-600 text-white"
            subValue="Chamadas que foram atendidas"
            onClick={() => handleOpenColdCallDetailModal('Ligações Atendidas', 'answered')}
          />
          <MetricCard
            title="Demonstraram Interesse"
            value={coldCallMetrics.totalConversations}
            icon={Star}
            colorClass="bg-amber-600 text-white"
            subValue="Conversou ou Agendou Reunião"
            onClick={() => handleOpenColdCallDetailModal('Demonstraram Interesse', 'conversations')}
          />
          <MetricCard
            title="Taxa de Interesse"
            value={`${coldCallMetrics.interestConversionRate.toFixed(1)}%`}
            icon={Percent}
            colorClass="bg-yellow-600 text-white"
            subValue="Atendidas → Interesse"
          />
          <MetricCard
            title="Reuniões Agendadas"
            value={coldCallMetrics.totalMeetingsScheduled}
            icon={CalendarCheck}
            colorClass="bg-green-600 text-white"
            subValue="Agendadas durante a ligação"
            onClick={() => handleOpenColdCallDetailModal('Reuniões Agendadas', 'meetings')}
          />
          <MetricCard
            title="Taxa de Agendamento"
            value={`${coldCallMetrics.meetingConversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            colorClass="bg-teal-600 text-white"
            subValue="Atendidas → Reunião"
          />
        </div>
      </section>

      {/* ===== MODAL EDITAR METAS ===== */}
      <Dialog open={isGoalsModalOpen} onOpenChange={setIsGoalsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 dark:text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-brand-500" />
              <span>Metas Diárias do Time</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {([
              { key: 'calls', label: 'Ligações' },
              { key: 'contacts', label: 'Contatos' },
              { key: 'interested', label: 'Interessados' },
              { key: 'meetings', label: 'Reuniões' },
            ] as { key: keyof ColdCallGoals; label: string }[]).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label} por consultor</label>
                <input
                  type="number"
                  min={0}
                  value={goalsDraft[field.key]}
                  onChange={(e) => setGoalsDraft(prev => ({ ...prev, [field.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" onClick={saveGoals} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
              Salvar Metas
            </Button>
            <Button type="button" onClick={() => setIsGoalsModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL IMPORTAR LEADS ===== */}
      <ImportColdCallLeadsDivisionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        consultants={coldCallImportConsultants}
        existingLeads={coldCallLeads}
        onImport={async (items) => {
          await addColdCallLeadsWithAssignments(items);
        }}
      />

      <ColdCallDetailModal
        isOpen={isColdCallDetailModalOpen}
        onClose={() => setIsColdCallDetailModalOpen(false)}
        title={coldCallModalTitle}
        consultantName={selectedColdCallConsultantName}
        leads={coldCallLeadsForModal}
        logs={coldCallLogsForModal}
        type={coldCallDetailType}
        teamMembers={teamMembers}
        filterStartDate={modalFilterStartDate}
        filterEndDate={modalFilterEndDate}
      />
    </div>
  );
};

export default ColdCallMetricsPage;