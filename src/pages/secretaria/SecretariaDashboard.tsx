import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  FileText, 
  TrendingUp, 
  UserCheck, 
  Ghost, 
  UserMinus, 
  XCircle, 
  Percent, 
  Calendar, 
  RotateCcw,
  ListChecks,
  Loader2
} from 'lucide-react';

export const SecretariaDashboard = () => {
  const { user } = useAuth();
  const { candidates, isDataLoading, hiringOrigins } = useApp();
  
  // Filtros de Data Padrão: Mês Atual
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const metrics = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const filtered = candidates.filter(c => {
      const created = new Date(c.createdAt);
      return created >= start && created <= end;
    });

    const total = filtered.length;
    
    const newCandidates = filtered.filter(c => 
      c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)
    ).length;

    const contacted = filtered.filter(c => 
      c.status === 'Triagem' && c.screeningStatus === 'Contacted'
    ).length;

    const scheduled = filtered.filter(c => 
      c.status === 'Entrevista' && !c.interviewConducted
    ).length;

    const conducted = filtered.filter(c => 
      c.status === 'Entrevista' && c.interviewConducted
    ).length;

    const awaitingPreview = filtered.filter(c => c.status === 'Aguardando Prévia').length;
    const hired = filtered.filter(c => c.status === 'Autorizado').length;
    const noShow = filtered.filter(c => c.status === 'Faltou').length;
    const withdrawn = filtered.filter(c => c.status === 'Reprovado').length;
    const disqualified = filtered.filter(c => c.status === 'Desqualificado').length;

    // NOVA LÓGICA: Contratado é quem entra em Prévia ou avança além disso
    const totalHired = filtered.filter(c => 
      !['Triagem', 'Entrevista', 'Faltou', 'Reprovado', 'Desqualificado'].includes(c.status)
    ).length;

    const totalInterviews = scheduled + conducted;
    const attendanceRate = totalInterviews > 0 ? (conducted / totalInterviews) * 100 : 0;
    const hiringRate = total > 0 ? (totalHired / total) * 100 : 0;

    return {
      total,
      newCandidates,
      contacted,
      scheduled,
      conducted,
      awaitingPreview,
      hired,
      noShow,
      withdrawn,
      disqualified,
      attendanceRate,
      hiringRate,
      totalHired
    };
  }, [candidates, startDate, endDate]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const MetricCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
    <div className={`relative overflow-hidden p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-4xl font-black">{value}</h3>
          {subValue && <p className="text-xs font-medium opacity-60">{subValue}</p>}
        </div>
        <div className="p-3 rounded-xl bg-white/20 dark:bg-black/20">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon size={100} strokeWidth={3} />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      {/* 1. SEÇÃO DE METAS DIÁRIAS */}
      <section className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ListChecks className="w-6 h-6 mr-2 text-brand-500" /> Minhas Metas Diárias
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe suas tarefas e rotinas do dia.</p>
        </div>
        <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
      </section>

      <hr className="border-gray-200 dark:border-slate-800" />

      {/* 2. SEÇÃO DE DASHBOARD DE CANDIDATURAS */}
      <section className="animate-fade-in">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-brand-500" /> Dashboard de Candidaturas
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Métricas detalhadas do fluxo de contratação.</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 dark:text-white"
            />
            <span className="text-gray-400 font-bold">→</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 dark:text-white"
            />
            <button 
              onClick={() => {
                const d = new Date();
                setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
              }}
              className="ml-2 p-1 text-gray-400 hover:text-brand-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <MetricCard 
            title="Total de Candidaturas" 
            value={metrics.total} 
            icon={Users} 
            colorClass="bg-indigo-600 text-white" 
          />
          <MetricCard 
            title="Novos Candidatos" 
            value={metrics.newCandidates} 
            icon={UserPlus} 
            colorClass="bg-slate-600 text-white" 
            subValue="Aguardando contato"
          />
          <MetricCard 
            title="Contatados" 
            value={metrics.contacted} 
            icon={MessageSquare} 
            colorClass="bg-amber-500 text-white" 
            subValue="Em triagem ativa"
          />
          <MetricCard 
            title="Entrevistas Agendadas" 
            value={metrics.scheduled} 
            icon={Clock} 
            colorClass="bg-orange-600 text-white" 
          />
          <MetricCard 
            title="Entrevistas Realizadas" 
            value={metrics.conducted} 
            icon={FileText} 
            colorClass="bg-purple-600 text-white" 
          />
          <MetricCard 
            title="Contratados (Em Prévia)" 
            value={metrics.totalHired} 
            icon={TrendingUp} 
            colorClass="bg-blue-600 text-white" 
            subValue="Passaram na seleção"
          />
          <MetricCard 
            title="Autorizados" 
            value={metrics.hired} 
            icon={UserCheck} 
            colorClass="bg-emerald-600 text-white" 
            subValue="Contratações efetivas"
          />
          
          <MetricCard 
            title="Faltas" 
            value={metrics.noShow} 
            icon={Ghost} 
            colorClass="bg-rose-500 text-white" 
            subValue="Não compareceram"
          />
          <MetricCard 
            title="Desistências" 
            value={metrics.withdrawn} 
            icon={UserMinus} 
            colorClass="bg-rose-600 text-white" 
            subValue="Candidato desistiu"
          />
          <MetricCard 
            title="Desqualificados" 
            value={metrics.disqualified} 
            icon={XCircle} 
            colorClass="bg-rose-700 text-white" 
            subValue="Reprovados pelo gestor"
          />
          
          <MetricCard 
            title="Taxa de Comparecimento" 
            value={`${metrics.attendanceRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Efetividade Agenda"
          />
          <MetricCard 
            title="Taxa de Contratação" 
            value={`${metrics.hiringRate.toFixed(1)}%`} 
            icon={Percent} 
            colorClass="bg-slate-800 text-white dark:bg-slate-700" 
            subValue="Conversão Final"
          />
        </div>
      </section>
    </div>
  );
};