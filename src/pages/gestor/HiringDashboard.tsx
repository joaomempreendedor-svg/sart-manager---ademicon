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
  BarChart3
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

    // Filtro base por data de criação
    const filtered = candidates.filter(c => {
      const created = new Date(c.createdAt);
      return created >= start && created <= end;
    });

    const total = filtered.length;
    
    // 1. Novos Candidatos (Coluna 'Candidatos')
    const newCandidates = filtered.filter(c => 
      c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)
    ).length;

    // 2. Contatados (Coluna 'Contatados')
    const contacted = filtered.filter(c => 
      c.status === 'Triagem' && c.screeningStatus === 'Contacted'
    ).length;

    // 3. Entrevistas Agendadas (Coluna 'Agendadas')
    const scheduled = filtered.filter(c => 
      c.status === 'Entrevista' && 
      !c.interviewConducted &&
      c.interviewScores.basicProfile === 0 && 
      c.interviewScores.commercialSkills === 0 && 
      c.interviewScores.behavioralProfile === 0 && 
      c.interviewScores.jobFit === 0 && 
      c.interviewScores.notes === ''
    ).length;

    // 4. Entrevistas Realizadas (Coluna 'Realizadas')
    const conducted = filtered.filter(c => 
      c.status === 'Entrevista' && 
      (c.interviewConducted || c.interviewScores.basicProfile > 0 || c.interviewScores.commercialSkills > 0 || c.interviewScores.behavioralProfile > 0 || c.interviewScores.jobFit > 0 || c.interviewScores.notes !== '')
    ).length;

    // 5. Em Prévia (Coluna 'Em Prévia')
    const awaitingPreview = filtered.filter(c => c.status === 'Aguardando Prévia').length;

    // 6. Contratados (Coluna 'Autorizados')
    const hired = filtered.filter(c => c.status === 'Autorizado').length;

    // 7. Faltas (Coluna 'Faltou')
    const noShow = filtered.filter(c => c.status === 'Faltou').length;

    // 8. Desistências (Coluna 'Desistências')
    const withdrawn = filtered.filter(c => c.status === 'Reprovado').length;

    // 9. Desqualificados (Coluna 'Desqualificado')
    const disqualified = filtered.filter(c => c.status === 'Desqualificado').length;

    // --- Candidaturas por Origem ---
    const originCounts: Record<string, number> = {};
    hiringOrigins.forEach(origin => { originCounts[origin] = 0; });
    originCounts['Não Informado'] = 0;

    filtered.forEach(c => {
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

    // Taxas de Conversão Sincronizadas
    const contactRate = total > 0 ? ((total - newCandidates) / total) * 100 : 0;
    const totalInterviews = scheduled + conducted;
    const attendanceRate = totalInterviews > 0 ? (conducted / totalInterviews) * 100 : 0;
    const hiringRate = total > 0 ? (hired / total) * 100 : 0;

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
      candidatesByOrigin,
      contactRate,
      attendanceRate,
      hiringRate
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
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard de Candidaturas</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Métricas detalhadas e sincronizadas com o pipeline.</p>
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

      {/* Grid de Métricas Sincronizadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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
          title="Em Prévia" 
          value={metrics.awaitingPreview} 
          icon={TrendingUp} 
          colorClass="bg-blue-600 text-white" 
        />
        <MetricCard 
          title="Autorizados" 
          value={metrics.hired} 
          icon={UserCheck} 
          colorClass="bg-emerald-600 text-white" 
          subValue="Contratações efetivas"
        />
        
        {/* Métricas de Perda Separadas */}
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
        
        {/* Taxas de Conversão */}
        <MetricCard 
          title="Taxa de Contato" 
          value={`${metrics.contactRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
          subValue="Conversão Triagem"
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

      {/* Relatório por Origem */}
      <div className="grid grid-cols-1 gap-8">
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
    </div>
  );
};

export default HiringDashboard;