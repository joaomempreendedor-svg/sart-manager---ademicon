import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  UserCheck, 
  UserPlus, 
  Clock, 
  Percent, 
  Loader2, 
  Filter, 
  RotateCcw,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';

const HiringDashboard = () => {
  const { candidates, isDataLoading } = useApp();
  
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
    
    // Em Pipeline (Não finalizados)
    const inPipeline = filtered.filter(c => 
      !['Autorizado', 'Reprovado', 'Desqualificado'].includes(c.status)
    ).length;

    // Finalizadas (Contratados ou Desistências/Reprovados)
    const finished = filtered.filter(c => 
      ['Autorizado', 'Reprovado', 'Desqualificado'].includes(c.status)
    ).length;

    // Este Mês (Candidaturas criadas no mês atual)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = candidates.filter(c => new Date(c.createdAt) >= thisMonthStart).length;

    // Contatados (Triagem com status 'Contacted' ou que já avançaram de etapa)
    const contacted = filtered.filter(c => 
      c.screeningStatus === 'Contacted' || c.status !== 'Triagem'
    ).length;

    // Entrevistas Agendadas (Status 'Entrevista' mas ainda não realizada)
    const scheduled = filtered.filter(c => 
      c.status === 'Entrevista' && !c.interviewConducted
    ).length;

    // Contratados (Status 'Autorizado')
    const hired = filtered.filter(c => c.status === 'Autorizado').length;

    // Iniciaram Trabalho (Integração Presencial ou além)
    const startedWork = filtered.filter(c => 
      ['Integração Presencial', 'Acompanhamento 90 Dias', 'Autorizado'].includes(c.status)
    ).length;

    // Completaram Onboarding (Acompanhamento 90 Dias ou além)
    const completedOnboarding = filtered.filter(c => 
      ['Acompanhamento 90 Dias', 'Autorizado'].includes(c.status)
    ).length;

    // Taxas de Conversão
    const contactRate = total > 0 ? (contacted / total) * 100 : 0;
    const interviewRate = total > 0 ? (filtered.filter(c => c.status !== 'Triagem').length / total) * 100 : 0;
    const hiringRate = total > 0 ? (hired / total) * 100 : 0;

    return {
      total,
      inPipeline,
      finished,
      thisMonth,
      contacted,
      scheduled,
      hired,
      startedWork,
      completedOnboarding,
      contactRate,
      interviewRate,
      hiringRate
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
      {/* Decorative background element */}
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon size={100} strokeWidth={3} />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard de Candidaturas</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Visão geral do funil de recrutamento e seleção.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <button 
            onClick={() => {
              const d = new Date();
              setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
              setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
            }}
            className="p-3 text-gray-400 hover:text-brand-500 transition-colors"
            title="Resetar Filtros"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard 
          title="Total de Candidaturas" 
          value={metrics.total} 
          icon={Users} 
          colorClass="bg-indigo-600 text-white" 
        />
        <MetricCard 
          title="Em Pipeline" 
          value={metrics.inPipeline} 
          icon={TrendingUp} 
          colorClass="bg-blue-600 text-white" 
        />
        <MetricCard 
          title="Finalizadas" 
          value={metrics.finished} 
          icon={CheckCircle2} 
          colorClass="bg-emerald-600 text-white" 
        />
        <MetricCard 
          title="Este Mês" 
          value={metrics.thisMonth} 
          icon={Calendar} 
          colorClass="bg-green-700 text-white" 
          subValue="Novas entradas"
        />
        <MetricCard 
          title="Contatados" 
          value={metrics.contacted} 
          icon={MessageSquare} 
          colorClass="bg-amber-500 text-white" 
        />
        <MetricCard 
          title="Entrevistas Agendadas" 
          value={metrics.scheduled} 
          icon={Clock} 
          colorClass="bg-orange-600 text-white" 
        />
        <MetricCard 
          title="Contratados" 
          value={metrics.hired} 
          icon={UserCheck} 
          colorClass="bg-rose-600 text-white" 
        />
        <MetricCard 
          title="Iniciaram Trabalho" 
          value={metrics.startedWork} 
          icon={Briefcase} 
          colorClass="bg-violet-700 text-white" 
        />
        <MetricCard 
          title="Completaram Onboarding" 
          value={metrics.completedOnboarding} 
          icon={UserPlus} 
          colorClass="bg-cyan-700 text-white" 
        />
        
        {/* Taxas de Conversão */}
        <MetricCard 
          title="Taxa de Contato" 
          value={`${metrics.contactRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
        />
        <MetricCard 
          title="Taxa de Entrevista" 
          value={`${metrics.interviewRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
        />
        <MetricCard 
          title="Taxa de Contratação" 
          value={`${metrics.hiringRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
        />
      </div>
    </div>
  );
};

export default HiringDashboard;