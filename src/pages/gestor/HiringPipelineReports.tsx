import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Loader2, Users, MessageSquare, HelpCircle, Clock, FileText, Ghost, TrendingUp, UserCheck, UserMinus, XCircle, Calendar, RotateCcw, BarChart3, UserRound } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { CandidatesDetailModal } from '@/components/gestor/CandidatesDetailModal';
import { Candidate, TeamMember } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HiringPipelineReports: React.FC = () => {
  const { candidates, isDataLoading, teamMembers } = useApp();

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string | null>(null);

  const [isCandidatesDetailModalOpen, setIsCandidatesDetailModalOpen] = useState(false);
  const [candidatesModalTitle, setCandidatesModalTitle] = useState('');
  const [candidatesForModal, setCandidatesForModal] = useState<Candidate[]>([]);
  const [candidatesMetricType, setCandidatesMetricType] = useState<'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse'>('total');

  const filteredCandidates = useMemo(() => {
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');
    let list = candidates.filter(c => {
      const created = new Date(c.createdAt);
      return created >= start && created <= end;
    });

    if (selectedResponsibleId) {
      list = list.filter(c => (c.responsibleUserId || '') === selectedResponsibleId);
    }
    return list;
  }, [candidates, filterStartDate, filterEndDate, selectedResponsibleId]);

  const metrics = useMemo(() => {
    const start = new Date(filterStartDate + 'T00:00:00');
    const end = new Date(filterEndDate + 'T23:59:59');
    const isInRange = (dateString?: string) => {
      if (!dateString) return false;
      const d = new Date(dateString);
      return d >= start && d <= end;
    };

    const totalCandidatesList = filteredCandidates;

    const newCandidatesList = totalCandidatesList.filter(c =>
      c.screeningStatus === 'Pending Contact' || !c.screeningStatus
    );

    const contactedList = totalCandidatesList.filter(c => isInRange(c.contactedDate));
    const noResponseList = totalCandidatesList.filter(c => isInRange(c.noResponseDate));

    const scheduledList = totalCandidatesList.filter(c => isInRange(c.interviewScheduledDate));
    const conductedList = totalCandidatesList.filter(c => isInRange(c.interviewConductedDate));
    const noShowList = totalCandidatesList.filter(c => isInRange(c.faltouDate));

    const awaitingPreviewList = totalCandidatesList.filter(c => isInRange(c.awaitingPreviewDate));
    const hiredList = totalCandidatesList.filter(c => isInRange(c.authorizedDate));
    const withdrawnList = totalCandidatesList.filter(c => isInRange(c.reprovadoDate));
    const disqualifiedList = totalCandidatesList.filter(c => isInRange(c.disqualifiedDate));

    const totalHiredList = totalCandidatesList.filter(c =>
      isInRange(c.awaitingPreviewDate) ||
      isInRange(c.onboardingOnlineDate) ||
      isInRange(c.integrationPresencialDate) ||
      isInRange(c.acompanhamento90DiasDate) ||
      isInRange(c.authorizedDate)
    );

    const totalInterviewsScheduled = scheduledList.length;
    const totalInterviewsConducted = conductedList.length;
    const attendanceRate = totalInterviewsScheduled > 0 ? (totalInterviewsConducted / totalInterviewsScheduled) * 100 : 0;
    const hiringRate = totalCandidatesList.length > 0 ? (totalHiredList.length / totalCandidatesList.length) * 100 : 0;

    // Desempenho por responsável (responsibleUserId)
    type Perf = {
      name: string;
      id: string;
      total: number;
      contacted: number;
      noResponse: number;
      scheduled: number;
      conducted: number;
      noShow: number;
      awaitingPreview: number;
      hired: number;
      withdrawn: number;
      disqualified: number;
    };
    const perfByResponsible: Record<string, Perf> = {};
    const ensurePerf = (id: string, name: string) => {
      if (!perfByResponsible[id]) {
        perfByResponsible[id] = {
          name, id,
          total: 0, contacted: 0, noResponse: 0,
          scheduled: 0, conducted: 0, noShow: 0,
          awaitingPreview: 0, hired: 0, withdrawn: 0, disqualified: 0
        };
      }
      return perfByResponsible[id];
    };

    const tmIndex: Record<string, TeamMember> = {};
    teamMembers.forEach(m => { tmIndex[m.authUserId || m.id] = m; });

    totalCandidatesList.forEach(c => {
      const respId = c.responsibleUserId || 'unassigned';
      const name = respId === 'unassigned' ? 'Não atribuído' : (tmIndex[respId]?.name || 'Desconhecido');
      const perf = ensurePerf(respId, name);
      perf.total += 1;
      if (isInRange(c.contactedDate)) perf.contacted += 1;
      if (isInRange(c.noResponseDate)) perf.noResponse += 1;
      if (isInRange(c.interviewScheduledDate)) perf.scheduled += 1;
      if (isInRange(c.interviewConductedDate)) perf.conducted += 1;
      if (isInRange(c.faltouDate)) perf.noShow += 1;
      if (isInRange(c.awaitingPreviewDate)) perf.awaitingPreview += 1;
      if (isInRange(c.authorizedDate)) perf.hired += 1;
      if (isInRange(c.reprovadoDate)) perf.withdrawn += 1;
      if (isInRange(c.disqualifiedDate)) perf.disqualified += 1;
    });

    const performanceList = Object.values(perfByResponsible)
      .sort((a, b) => b.hired - a.hired || b.awaitingPreview - a.awaitingPreview || b.total - a.total);

    return {
      total: totalCandidatesList.length,
      newCandidates: newCandidatesList.length,
      contacted: contactedList.length,
      noResponse: noResponseList.length,
      scheduled: scheduledList.length,
      conducted: conductedList.length,
      noShow: noShowList.length,
      awaitingPreview: awaitingPreviewList.length,
      hired: hiredList.length,
      withdrawn: withdrawnList.length,
      disqualified: disqualifiedList.length,
      attendanceRate,
      hiringRate,
      totalHired: totalHiredList.length,
      // lists
      totalCandidatesList,
      newCandidatesList,
      contactedList,
      noResponseList,
      scheduledList,
      conductedList,
      noShowList,
      awaitingPreviewList,
      hiredList,
      withdrawnList,
      disqualifiedList,
      // performance
      performanceList,
    };
  }, [filteredCandidates, filterStartDate, filterEndDate, teamMembers]);

  const handleOpenCandidatesDetailModal = (
    title: string,
    list: Candidate[],
    metric: 'total' | 'newCandidates' | 'contacted' | 'scheduled' | 'conducted' | 'awaitingPreview' | 'hired' | 'noShow' | 'withdrawn' | 'disqualified' | 'noResponse'
  ) => {
    setCandidatesModalTitle(title);
    setCandidatesForModal(list);
    setCandidatesMetricType(metric);
    setIsCandidatesDetailModalOpen(true);
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const responsibleOptions = useMemo(() => {
    const base = teamMembers
      .filter(m => m.isActive)
      .map(m => ({ id: m.authUserId || m.id, name: m.name }));
    return [{ id: 'all', name: 'Todos' }, ...base, { id: 'unassigned', name: 'Não atribuído' }];
  }, [teamMembers]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Candidaturas</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise do pipeline de contratação por período e responsável.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-8">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide">
            <Calendar className="w-4 h-4 mr-2" /> Filtros
          </h3>
          {(filterStartDate || filterEndDate || selectedResponsibleId) && (
            <button
              onClick={() => { setFilterStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); setFilterEndDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]); setSelectedResponsibleId(null); }}
              className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsável</label>
            <Select value={selectedResponsibleId || 'all'} onValueChange={(val) => setSelectedResponsibleId(val === 'all' ? null : val)}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                {responsibleOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data até</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Cards de Métricas do Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        <MetricCard title="Total de Candidaturas" value={metrics.total} icon={Users} colorClass="bg-indigo-600 text-white" onClick={() => handleOpenCandidatesDetailModal('Total de Candidaturas', metrics.totalCandidatesList, 'total')} />
        <MetricCard title="Contatados" value={metrics.contacted} icon={MessageSquare} colorClass="bg-amber-500 text-white" subValue="Triagem ativa" onClick={() => handleOpenCandidatesDetailModal('Contatados', metrics.contactedList, 'contacted')} />
        <MetricCard title="Não Respondido" value={metrics.noResponse} icon={HelpCircle} colorClass="bg-orange-500 text-white" subValue="Aguardando retorno" onClick={() => handleOpenCandidatesDetailModal('Não Respondido', metrics.noResponseList, 'noResponse')} />
        <MetricCard title="Entrevistas Agendadas" value={metrics.scheduled} icon={Clock} colorClass="bg-orange-600 text-white" onClick={() => handleOpenCandidatesDetailModal('Entrevistas Agendadas', metrics.scheduledList, 'scheduled')} />
        <MetricCard title="Entrevistas Realizadas" value={metrics.conducted} icon={FileText} colorClass="bg-purple-600 text-white" onClick={() => handleOpenCandidatesDetailModal('Entrevistas Realizadas', metrics.conductedList, 'conducted')} />
        <MetricCard title="Faltas" value={metrics.noShow} icon={Ghost} colorClass="bg-rose-500 text-white" subValue="Não compareceram" onClick={() => handleOpenCandidatesDetailModal('Faltas', metrics.noShowList, 'noShow')} />
        <MetricCard title="Em Prévia" value={metrics.awaitingPreview} icon={TrendingUp} colorClass="bg-blue-600 text-white" onClick={() => handleOpenCandidatesDetailModal('Em Prévia', metrics.awaitingPreviewList, 'awaitingPreview')} />
        <MetricCard title="Autorizados" value={metrics.hired} icon={UserCheck} colorClass="bg-emerald-600 text-white" subValue="Contratações efetivas" onClick={() => handleOpenCandidatesDetailModal('Autorizados', metrics.hiredList, 'hired')} />
        <MetricCard title="Desistências" value={metrics.withdrawn} icon={UserMinus} colorClass="bg-rose-600 text-white" subValue="Aprovados que saíram" onClick={() => handleOpenCandidatesDetailModal('Desistências', metrics.withdrawnList, 'withdrawn')} />
        <MetricCard title="Desqualificados" value={metrics.disqualified} icon={XCircle} colorClass="bg-rose-700 text-white" subValue="Reprovados pelo gestor" onClick={() => handleOpenCandidatesDetailModal('Desqualificados', metrics.disqualifiedList, 'disqualified')} />
        <MetricCard title="Taxa de Comparecimento" value={`${metrics.attendanceRate.toFixed(1)}%`} icon={BarChart3} colorClass="bg-slate-800 text-white dark:bg-slate-700" subValue="Entrevistas realizadas / agendadas" />
        <MetricCard title="Taxa de Contratação" value={`${metrics.hiringRate.toFixed(1)}%`} icon={BarChart3} colorClass="bg-slate-800 text-white dark:bg-slate-700" subValue="Aprovados no período / total" />
      </div>

      {/* Desempenho por Responsável */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center">
            <UserRound className="w-5 h-5 mr-2 text-brand-500" /> Desempenho por Responsável
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Responsável</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Contatados</th>
                <th className="px-6 py-3">Não Respondido</th>
                <th className="px-6 py-3">Agendadas</th>
                <th className="px-6 py-3">Realizadas</th>
                <th className="px-6 py-3">Faltas</th>
                <th className="px-6 py-3">Em Prévia</th>
                <th className="px-6 py-3">Autorizados</th>
                <th className="px-6 py-3">Desistências</th>
                <th className="px-6 py-3">Desqualificados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {metrics.performanceList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                metrics.performanceList.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-6 py-4">{p.total}</td>
                    <td className="px-6 py-4">{p.contacted}</td>
                    <td className="px-6 py-4">{p.noResponse}</td>
                    <td className="px-6 py-4">{p.scheduled}</td>
                    <td className="px-6 py-4">{p.conducted}</td>
                    <td className="px-6 py-4">{p.noShow}</td>
                    <td className="px-6 py-4">{p.awaitingPreview}</td>
                    <td className="px-6 py-4">{p.hired}</td>
                    <td className="px-6 py-4">{p.withdrawn}</td>
                    <td className="px-6 py-4">{p.disqualified}</td>
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

export default HiringPipelineReports;