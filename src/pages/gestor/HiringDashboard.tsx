import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
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
  PieChart,
  HelpCircle
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Candidate } from '@/types';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';

const HiringDashboard = () => {
  const { candidates, isDataLoading, hiringOrigins, teamMembers } = useApp();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false);
  const [candidatesModalTitle, setCandidatesModalTitle] = useState('');
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]);
  const [candidatesMetricType, setCandidatesMetricType] = useState<'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse'>('total');

  const metrics = useMemo(() => {
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    const isInDateRange = (dateString?: string) => {
      if (!dateString) return false;
      const date = new Date(dateString + 'T00:00:00'); // Garante que a comparação seja apenas por data
      return (!start || date >= start) && (!end || date <= end);
    };

    // Base para métricas de fluxo (eventos no período)
    const totalCandidatesInPeriod = candidates.filter(c => isInDateRange(c.createdAt));
    
    // Métricas de fluxo (dependentes do filtro de data)
    const newCandidatesList = totalCandidatesInPeriod.filter(c => 
      (c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus))
    );
    const contactedList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Triagem' && c.screeningStatus === 'Contacted'
    );
    const noResponseList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Triagem' && c.screeningStatus === 'No Response'
    );
    const scheduledList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Entrevista' && isInDateRange(c.interviewScheduledDate)
    );
    const conductedList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Entrevista' && isInDateRange(c.interviewConductedDate)
    );
    const noShowList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Faltou' && isInDateRange(c.faltouDate)
    );
    const withdrawnList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Reprovado' && isInDateRange(c.reprovadoDate)
    );
    const disqualifiedList = totalCandidatesInPeriod.filter(c => 
      c.status === 'Desqualificado' && isInDateRange(c.disqualifiedDate)
    );

    // Métricas de estado (agora também dependentes do filtro de data de transição)
    const awaitingPreviewList = candidates.filter(c => 
      c.status === 'Aguardando Prévia' && c.awaitingPreviewDate && isInDateRange(c.awaitingPreviewDate)
    );
    const hiredList = candidates.filter(c => 
      c.status === 'Autorizado' && c.authorizedDate && isInDateRange(c.authorizedDate)
    );
    
    // Total de Aprovados: candidatos que entraram em qualquer uma dessas etapas no período
    const totalHiredList = candidates.filter(c => 
      (c.awaitingPreviewDate && isInDateRange(c.awaitingPreviewDate)) ||
      (c.onboardingOnlineDate && isInDateRange(c.onboardingOnlineDate)) ||
      (c.integrationPresencialDate && isInDateRange(c.integrationPresencialDate)) ||
      (c.acompanhamento90DiasDate && isInDateRange(c.acompanhamento90DiasDate)) ||
      (c.authorizedDate && isInDateRange(c.authorizedDate))
    );

    // Métricas calculadas
    const totalInterviewsScheduled = scheduledList.length;
    const totalInterviewsConducted = conductedList.length;
    const attendanceRate = totalInterviewsScheduled > 0 ? (totalInterviewsConducted / totalInterviewsScheduled) * 100 : 0;
    const hiringRate = totalCandidatesInPeriod.length > 0 ? (totalHiredList.length / totalCandidatesInPeriod.length) * 100 : 0;

    // Métricas por origem (dependentes do filtro de data)
    const originCounts: Record<string, number> = {};
    hiringOrigins.forEach(origin => { originCounts[origin] = 0; });
    originCounts['Não Informado'] = 0;
    totalCandidatesInPeriod.forEach(c => {
      const origin = c.origin || 'Não Informado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });
    const candidatesByOrigin = Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalCandidatesInPeriod.length > 0 ? (count / totalCandidatesInPeriod.length) * 100 : 0
      }))
      .filter(o => o.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      total: totalCandidatesInPeriod.length,
      newCandidates: newCandidatesList.length,
      contacted: contactedList.length,
      noResponse: noResponseList.length,
      scheduled: scheduledList.length,
      conducted: conductedList.length,
      awaitingPreview: awaitingPreviewList.length,
      hired: hiredList.length,
      noShow: noShowList.length,
      withdrawn: withdrawnList.length,
      disqualified: disqualifiedList.length,
      attendanceRate,
      hiringRate,
      totalHired: totalHiredList.length,
      newCandidatesList,
      contactedList,
      noResponseList,
      scheduledList,
      conductedList,
      awaitingPreviewList,
      hiredList,
      noShowList,
      withdrawnList,
      disqualifiedList,
      totalCandidatesList: totalCandidatesInPeriod,
      totalHiredList,
      candidatesByOrigin,
    };
  }, [candidates, startDate, endDate, hiringOrigins]);

  const handleOpenCandidatesDetailModal = (title: string, candidates: Candidate[], metricType: 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse') => {
    setCandidatesModalTitle(title);
    setCandidatesForModal(candidates);
    setCandidatesMetricType(metricType);
    setIsCandidatesDetailModalOpen(true);
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
          <PieChart className="w-8 h-8 mr-3 text-brand-500" /> Dashboard de Candidaturas
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Métricas detalhadas do fluxo de contratação.</p>
      </div>

      <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
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
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="ml-2 p-1 text-gray-400 hover:text-brand-500 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {/* Top of Funnel */}
        <MetricCard 
          title="Total de Candidaturas" 
          value={metrics.total} 
          icon={Users} 
          colorClass="bg-indigo-600 text-white" 
          onClick={() => handleOpenCandidatesDetailModal('Total de Candidaturas', metrics.totalCandidatesList, 'total')}
        />
        <MetricCard 
          title="Novas Candidaturas" 
          value={metrics.newCandidates} 
          icon={UserPlus} 
          colorClass="bg-sky-600 text-white" 
          subValue="Aguardando contato"
          onClick={() => handleOpenCandidatesDetailModal('Novas Candidaturas', metrics.newCandidatesList, 'newCandidates')}
        />
        <MetricCard 
          title="Contatados" 
          value={metrics.contacted} 
          icon={MessageSquare} 
          colorClass="bg-amber-500 text-white" 
          subValue="Em triagem ativa"
          onClick={() => handleOpenCandidatesDetailModal('Contatados', metrics.contactedList, 'contacted')}
        />
        <MetricCard 
          title="Não Respondido"
          value={metrics.noResponse}
          icon={HelpCircle}
          colorClass="bg-orange-500 text-white"
          subValue="Aguardando retorno"
          onClick={() => handleOpenCandidatesDetailModal('Não Respondido', metrics.noResponseList, 'noResponse')}
        />

        {/* Interview Stage */}
        <MetricCard 
          title="Entrevistas Agendadas" 
          value={metrics.scheduled} 
          icon={Clock} 
          colorClass="bg-orange-600 text-white" 
          onClick={() => handleOpenCandidatesDetailModal('Entrevistas Agendadas', metrics.scheduledList, 'scheduled')}
        />
        <MetricCard 
          title="Entrevistas Realizadas" 
          value={metrics.conducted} 
          icon={FileText} 
          colorClass="bg-purple-600 text-white" 
          onClick={() => handleOpenCandidatesDetailModal('Entrevistas Realizadas', metrics.conductedList, 'conducted')}
        />
        <MetricCard 
          title="Faltas" 
          value={metrics.noShow} 
          icon={Ghost} 
          colorClass="bg-rose-500 text-white" 
          subValue="Não compareceram"
          onClick={() => handleOpenCandidatesDetailModal('Faltas', metrics.noShowList, 'noShow')}
        />
        <MetricCard 
          title="Taxa de Comparecimento" 
          value={`${metrics.attendanceRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
          subValue="Efetividade da Agenda"
        />

        {/* Hiring Stage */}
        <div className="flex flex-col space-y-2 h-full">
            <button 
                onClick={() => handleOpenCandidatesDetailModal('Candidatos em Prévia', metrics.awaitingPreviewList, 'awaitingPreview')}
                className="relative overflow-hidden p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md flex-1 flex flex-col bg-blue-600 text-white text-left"
            >
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Em Prévia</p>
                        <h3 className="text-3xl font-black">{metrics.awaitingPreview}</h3>
                    </div>
                    <div className="absolute -right-2 -bottom-2 opacity-10">
                        <TrendingUp size={60} strokeWidth={3} />
                    </div>
                </div>
            </button>
            <button 
                onClick={() => handleOpenCandidatesDetailModal('Candidatos Autorizados', metrics.hiredList, 'hired')}
                className="relative overflow-hidden p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md flex-1 flex flex-col bg-emerald-600 text-white text-left"
            >
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Autorizados</p>
                        <h3 className="text-3xl font-black">{metrics.hired}</h3>
                    </div>
                    <div className="absolute -right-2 -bottom-2 opacity-10">
                        <UserCheck size={60} strokeWidth={3} />
                    </div>
                </div>
            </button>
        </div>
        <MetricCard 
          title="Desistências" 
          value={metrics.withdrawn} 
          icon={UserMinus} 
          colorClass="bg-rose-600 text-white" 
          subValue="Aprovados que saíram"
          onClick={() => handleOpenCandidatesDetailModal('Desistências', metrics.withdrawnList, 'withdrawn')}
        />
        <MetricCard 
          title="Desqualificados" 
          value={metrics.disqualified} 
          icon={XCircle} 
          colorClass="bg-rose-700 text-white" 
          subValue="Reprovados pelo gestor"
          onClick={() => handleOpenCandidatesDetailModal('Desqualificados', metrics.disqualifiedList, 'disqualified')}
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
                    Nenhum dado encontrado para o período selecionado.
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

      <CandidatesDetailModal 
        isOpen={isCandidatesDetailModalOpen} 
        onClose={() => setIsCandidatesDetailModalOpen(false)} 
        title={candidatesModalTitle} 
        candidates={candidatesForModal} 
        teamMembers={teamMembers} 
        metricType={candidatesMetricType} 
      />
    </div>
  );
};

export default HiringDashboard;