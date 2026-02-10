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
  Briefcase,
  FileText,
  UserX,
  XCircle,
  UserMinus,
  Ghost,
  MapPin,
  BarChart3,
  PieChart
} from 'lucide-react';

const HiringDashboard = () => {
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

    // Função auxiliar para verificar se uma data está dentro do período de filtro
    const isInFilterRange = (dateString?: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date >= start && date <= end;
    };

    const total = candidates.filter(c => isInFilterRange(c.createdAt)).length;
    
    // Entradas históricas em cada etapa (dentro do período de filtro)
    const contacted = candidates.filter(c => 
      isInFilterRange(c.contactedDate) // Usa contactedDate
    ).length;

    const scheduled = candidates.filter(c => 
      isInFilterRange(c.interviewScheduledDate) // Usa interviewScheduledDate, removida a condição !c.interviewConducted
    ).length;

    const conducted = candidates.filter(c => 
      isInFilterRange(c.interviewConductedDate) // Usa interviewConductedDate
    ).length;

    const awaitingPreview = candidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate) // Usa awaitingPreviewDate
    ).length;

    const hired = candidates.filter(c => 
      isInFilterRange(c.authorizedDate) // Usa authorizedDate
    ).length;

    const noShow = candidates.filter(c => 
      isInFilterRange(c.faltouDate) // Usa faltouDate
    ).length;

    const withdrawn = candidates.filter(c => 
      isInFilterRange(c.reprovadoDate) // Usa reprovadoDate
    ).length;

    const disqualified = candidates.filter(c => 
      isInFilterRange(c.disqualifiedDate) // Usa disqualifiedDate
    ).length;

    // NOVA LÓGICA: Total de Contratados (que passaram da triagem)
    const totalHired = candidates.filter(c => 
      isInFilterRange(c.awaitingPreviewDate) || // Entrou em 'Aguardando Prévia'
      isInFilterRange(c.onboardingOnlineDate) || // Entrou em 'Onboarding Online'
      isInFilterRange(c.integrationPresencialDate) || // Entrou em 'Integração Presencial'
      isInFilterRange(c.acompanhamento90DiasDate) || // Entrou em 'Acompanhamento 90 Dias'
      isInFilterRange(c.authorizedDate) // Entrou em 'Autorizado'
    ).length;

    const totalInterviewsScheduled = candidates.filter(c => isInFilterRange(c.interviewScheduledDate)).length;
    const totalInterviewsConducted = candidates.filter(c => isInFilterRange(c.interviewConductedDate)).length;

    const attendanceRate = totalInterviewsScheduled > 0 ? (totalInterviewsConducted / totalInterviewsScheduled) * 100 : 0;
    const hiringRate = total > 0 ? (totalHired / total) * 100 : 0;

    const originCounts: Record<string, number> = {};
    hiringOrigins.forEach(origin => { originCounts[origin] = 0; });
    originCounts['Não Informado'] = 0;

    candidates.filter(c => isInFilterRange(c.createdAt)).forEach(c => { // Conta a origem apenas para candidatos criados no período
      const origin = c.origin || 'Não Informado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });

    const candidatesByOrigin = Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .filter(o => o.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      total,
      contacted,
      scheduled,
      conducted,
      awaitingPreview,
      hired,
      noShow,
      withdrawn,
      disqualified,
      candidatesByOrigin,
      attendanceRate,
      hiringRate,
      totalHired
    };
  }, [candidates, startDate, endDate, hiringOrigins]);

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
            <PieChart className="w-8 h-8 mr-3 text-brand-500" /> Dashboard de Candidaturas
          </h1>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        <MetricCard 
          title="Candidatos (Entrada no Funil)" 
          value={metrics.total} 
          icon={Users} 
          colorClass="bg-indigo-600 text-white" 
        />
        <MetricCard 
          title="Contatados (no Período)" 
          value={metrics.contacted} 
          icon={MessageSquare} 
          colorClass="bg-amber-500 text-white" 
        />
        <MetricCard 
          title="Entrevistas Agendadas (no Período)" 
          value={metrics.scheduled} 
          icon={Clock} 
          colorClass="bg-orange-600 text-white" 
        />
        <MetricCard 
          title="Entrevistas Realizadas (no Período)" 
          value={metrics.conducted} 
          icon={FileText} 
          colorClass="bg-purple-600 text-white" 
        />
        <MetricCard 
          title="Em Prévia (no Período)" 
          value={metrics.awaitingPreview} 
          icon={TrendingUp} 
          colorClass="bg-blue-600 text-white" 
        />
        <MetricCard 
          title="Autorizados (no Período)" 
          value={metrics.hired} 
          icon={UserCheck} 
          colorClass="bg-emerald-600 text-white" 
        />
        
        <MetricCard 
          title="Faltas (no Período)" 
          value={metrics.noShow} 
          icon={Ghost} 
          colorClass="bg-rose-500 text-white" 
        />
        <MetricCard 
          title="Desistências (no Período)" 
          value={metrics.withdrawn} 
          icon={UserMinus} 
          colorClass="bg-rose-600 text-white" 
        />
        <MetricCard 
          title="Desqualificados (no Período)" 
          value={metrics.disqualified} 
          icon={XCircle} 
          colorClass="bg-rose-700 text-white" 
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-brand-500" /> Candidaturas por Origem
          </h2>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Quantidade</th>
                <th className="px-6 py-3">Representatividade</th>
                <th className="px-6 py-3">Barra de Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {metrics.candidatesByOrigin.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado de origem encontrado para o período.
                  </td>
                </tr>
              ) : (
                metrics.candidatesByOrigin.map(origin => (
                  <tr key={origin.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{origin.name}</td>
                    <td className="px-6 py-4 font-medium">{origin.count} candidatos</td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{origin.percentage.toFixed(1)}%</td>
                    <td className="px-6 py-4 w-1/3">
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${origin.percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HiringDashboard;