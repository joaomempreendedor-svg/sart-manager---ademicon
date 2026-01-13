import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Users, Calendar, FileText, UserCheck, UserX, Award, Filter, RotateCcw, UserRound, TrendingUp, Star, Download, Percent, LineChart, MapPin } from 'lucide-react'; // Adicionado MapPin
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

const HiringReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, interviewStructure, hiringOrigins, isDataLoading } = useApp(); // ATUALIZADO: Usando hiringOrigins

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null); // NOVO: Filtro por origem

  const responsibleMembers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  const candidateStatuses = useMemo(() => [
    'Entrevista',
    'Aguardando Prévia',
    'Onboarding Online',
    'Integração Presencial',
    'Acompanhamento 90 Dias',
    'Autorizado',
    'Reprovado',
  ], []);

  const filteredCandidates = useMemo(() => {
    let currentCandidates = candidates;

    if (selectedResponsibleId) {
      currentCandidates = currentCandidates.filter(c => c.responsibleUserId === selectedResponsibleId);
    }

    if (filterStatus) {
      currentCandidates = currentCandidates.filter(c => c.status === filterStatus);
    }

    if (filterOrigin) { // NOVO: Filtrar por origem
      currentCandidates = currentCandidates.filter(c => c.origin === filterOrigin);
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) <= end);
    }

    return currentCandidates;
  }, [candidates, selectedResponsibleId, filterStatus, filterOrigin, filterStartDate, filterEndDate]); // ATUALIZADO: Adicionado filterOrigin

  const reportData = useMemo(() => {
    const dataByStatus: { [key: string]: number } = {
      'Entrevista Agendada': 0,
      'Entrevista Realizada': 0,
      'Aguardando Prévia': 0,
      'Onboarding Online': 0,
      'Integração Presencial': 0,
      'Acompanhamento 90 Dias': 0,
      'Autorizado': 0,
      'Reprovado': 0,
    };

    let totalInterviewScore = 0;
    let interviewCount = 0;
    const sectionScores: { [key: string]: { total: number; count: number } } = {};
    interviewStructure.forEach(section => {
      sectionScores[section.id] = { total: 0, count: 0 };
    });

    const candidatesByResponsible: { [key: string]: { name: string; count: number } } = {};
    responsibleMembers.forEach(m => candidatesByResponsible[m.id] = { name: m.name, count: 0 });

    const candidatesByOrigin: { [key: string]: { count: number; authorizedCount: number; } } = {}; // NOVO: Estrutura para origens
    hiringOrigins.forEach(o => candidatesByOrigin[o] = { count: 0, authorizedCount: 0 }); // NOVO: Inicializa com hiringOrigins

    const monthlyTrends: { [monthYear: string]: { totalCandidates: number; authorizedCandidates: number; totalInterviewScore: number; interviewCount: number; } } = {};

    filteredCandidates.forEach(c => {
      if (c.status === 'Entrevista' && c.interviewScores.basicProfile === 0 && c.interviewScores.commercialSkills === 0 && c.interviewScores.behavioralProfile === 0 && c.interviewScores.jobFit === 0 && c.interviewScores.notes === '') {
        dataByStatus['Entrevista Agendada']++;
      } else if (c.status === 'Entrevista') {
        dataByStatus['Entrevista Realizada']++;
      } else {
        dataByStatus[c.status]++;
      }

      if (c.responsibleUserId && candidatesByResponsible[c.responsibleUserId]) {
        candidatesByResponsible[c.responsibleUserId].count++;
      }

      const totalCandidateScore = Object.entries(c.interviewScores)
        .filter(([key]) => key !== 'notes')
        .reduce((sum, [_, val]) => {
          if (typeof val === 'number') {
            sectionScores[key].total += val;
            sectionScores[key].count++;
            return sum + val;
          }
          return sum;
        }, 0);

      if (totalCandidateScore > 0) {
        totalInterviewScore += totalCandidateScore;
        interviewCount++;
      }

      // NOVO: Preencher dados de candidatos por origem
      if (c.origin && candidatesByOrigin[c.origin]) {
        candidatesByOrigin[c.origin].count++;
        if (c.status === 'Autorizado') {
          candidatesByOrigin[c.origin].authorizedCount++;
        }
      }

      const createdAtDate = new Date(c.createdAt);
      const monthYear = `${createdAtDate.getFullYear()}-${String(createdAtDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTrends[monthYear]) {
        monthlyTrends[monthYear] = { totalCandidates: 0, authorizedCandidates: 0, totalInterviewScore: 0, interviewCount: 0 };
      }
      monthlyTrends[monthYear].totalCandidates++;
      if (c.status === 'Autorizado') {
        monthlyTrends[monthYear].authorizedCandidates++;
      }
      if (totalCandidateScore > 0) {
        monthlyTrends[monthYear].totalInterviewScore += totalCandidateScore;
        monthlyTrends[monthYear].interviewCount++;
      }
    });

    const avgInterviewScore = interviewCount > 0 ? totalInterviewScore / interviewCount : 0;

    const avgSectionScores = Object.entries(sectionScores).map(([id, data]) => ({
      id,
      title: interviewStructure.find(s => s.id === id)?.title || id,
      average: data.count > 0 ? data.total / data.count : 0,
    }));

    const sortedCandidatesByResponsible = Object.values(candidatesByResponsible).sort((a, b) => b.count - a.count);
    const sortedCandidatesByOrigin = Object.entries(candidatesByOrigin).map(([origin, data]) => ({ // NOVO: Processa origens
      origin,
      ...data,
      conversionRate: data.count > 0 ? (data.authorizedCount / data.count) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    const totalScheduled = dataByStatus['Entrevista Agendada'] + dataByStatus['Entrevista Realizada'];
    const scheduledToConducted = totalScheduled > 0 ? (dataByStatus['Entrevista Realizada'] / totalScheduled) * 100 : 0;
    const conductedToAwaitingPreview = dataByStatus['Entrevista Realizada'] > 0 ? (dataByStatus['Aguardando Prévia'] / dataByStatus['Entrevista Realizada']) * 100 : 0;
    const awaitingPreviewToAuthorized = dataByStatus['Aguardando Prévia'] > 0 ? (dataByStatus['Autorizado'] / dataByStatus['Aguardando Prévia']) * 100 : 0;
    const overallToAuthorized = totalScheduled > 0 ? (dataByStatus['Autorizado'] / totalScheduled) * 100 : 0;

    const formattedMonthlyTrends = Object.entries(monthlyTrends)
      .map(([monthYear, data]) => {
        const [year, month] = monthYear.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return {
          month: monthName,
          totalCandidates: data.totalCandidates,
          authorizedCandidates: data.authorizedCandidates,
          avgInterviewScore: data.interviewCount > 0 ? data.totalInterviewScore / data.interviewCount : 0,
        };
      })
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());


    return {
      dataByStatus,
      avgInterviewScore,
      avgSectionScores,
      candidatesByResponsible: sortedCandidatesByResponsible,
      candidatesByOrigin: sortedCandidatesByOrigin, // NOVO: Adiciona ao retorno
      conversionRates: {
        scheduledToConducted,
        conductedToAwaitingPreview,
        awaitingPreviewToAuthorized,
        overallToAuthorized,
      },
      monthlyTrends: formattedMonthlyTrends,
    };
  }, [filteredCandidates, interviewStructure, responsibleMembers, hiringOrigins]); // ATUALIZADO: Adicionado hiringOrigins

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedResponsibleId(null);
    setFilterStatus(null);
    setFilterOrigin(null); // NOVO: Limpa filtro de origem
  };

  const hasActiveFilters = filterStartDate || filterEndDate || selectedResponsibleId || filterStatus || filterOrigin; // ATUALIZADO: Adicionado filterOrigin

  const handleExportToExcel = () => {
    const dataToExport = filteredCandidates.map(c => ({
      'Nome': c.name,
      'Telefone': c.phone,
      'Data Entrevista': new Date(c.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR'),
      'Origem': c.origin, // NOVO: Exporta origem
      'Status': c.status,
      'Responsável': teamMembers.find(m => m.id === c.responsibleUserId)?.name || 'N/A',
      'Pontuação Total Entrevista': Object.entries(c.interviewScores).filter(([key]) => key !== 'notes').reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0),
      'Notas da Entrevista': c.interviewScores.notes,
      'Criado Em': new Date(c.createdAt).toLocaleDateString('pt-BR'),
    }));

    const workbook = XLSX.utils.book_new();

    const worksheetCandidates = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(workbook, worksheetCandidates, "Candidatos Detalhado");

    const summaryData = [
      { 'Métrica': 'Total de Candidatos Filtrados', 'Valor': filteredCandidates.length },
      { 'Métrica': 'Média Geral da Entrevista', 'Valor': reportData.avgInterviewScore.toFixed(1) },
      { 'Métrica': 'Taxa de Conversão Geral (Agendado -> Autorizado)', 'Valor': reportData.conversionRates.overallToAuthorized.toFixed(1) + '%' },
    ];
    reportData.avgSectionScores.forEach(s => summaryData.push({ 'Métrica': `Média ${s.title}`, 'Valor': s.average.toFixed(1) }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo Geral");

    const pipelineOverviewSheet = XLSX.utils.json_to_sheet(Object.entries(reportData.dataByStatus).map(([status, count]) => ({
      'Status do Pipeline': status,
      'Número de Candidatos': count,
    })));
    XLSX.utils.book_append_sheet(workbook, pipelineOverviewSheet, "Visao Geral Pipeline");

    const conversionRatesSheet = XLSX.utils.json_to_sheet([
      { 'Conversão': 'Agendada -> Realizada', 'Taxa (%)': reportData.conversionRates.scheduledToConducted.toFixed(1) },
      { 'Conversão': 'Realizada -> Aguardando Prévia', 'Taxa (%)': reportData.conversionRates.conductedToAwaitingPreview.toFixed(1) },
      { 'Conversão': 'Aguardando Prévia -> Autorizado', 'Taxa (%)': reportData.conversionRates.awaitingPreviewToAuthorized.toFixed(1) },
      { 'Conversão': 'Geral (Agendado -> Autorizado)', 'Taxa (%)': reportData.conversionRates.overallToAuthorized.toFixed(1) },
    ]);
    XLSX.utils.book_append_sheet(workbook, conversionRatesSheet, "Taxas de Conversao");

    const responsibleSheet = XLSX.utils.json_to_sheet(reportData.candidatesByResponsible.map(r => ({
      'Responsável': r.name,
      'Candidatos Gerenciados': r.count,
    })));
    XLSX.utils.book_append_sheet(workbook, responsibleSheet, "Candidatos por Responsavel");

    const originSheet = XLSX.utils.json_to_sheet(reportData.candidatesByOrigin.map(o => ({ // NOVO: Exporta origens
      'Origem': o.origin,
      'Total de Candidatos': o.count,
      'Autorizados': o.authorizedCount,
      'Taxa de Conversão para Autorizado (%)': o.conversionRate.toFixed(1),
    })));
    XLSX.utils.book_append_sheet(workbook, originSheet, "Candidatos por Origem");

    const monthlyTrendsSheet = XLSX.utils.json_to_sheet(reportData.monthlyTrends.map(m => ({
      'Mês': m.month,
      'Total de Candidatos': m.totalCandidates,
      'Candidatos Autorizados': m.authorizedCandidates,
      'Média Pontuação Entrevista': m.avgInterviewScore.toFixed(1),
    })));
    XLSX.utils.book_append_sheet(workbook, monthlyTrendsSheet, "Tendencias Mensais");


    XLSX.writeFile(workbook, `Relatorio_Contratacao_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise do pipeline de candidatos e desempenho do processo seletivo.</p>
        </div>
        <button onClick={handleExportToExcel} className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition font-medium w-full sm:w-auto">
          <Download className="w-5 h-5" />
          <span>Exportar para Excel</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Relatório</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="w-full">
            <label htmlFor="responsibleFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsável</label>
            <Select 
              value={selectedResponsibleId || 'all'} 
              onValueChange={(value) => setSelectedResponsibleId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Responsáveis" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {responsibleMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <label htmlFor="statusFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status do Candidato</label>
            <Select 
              value={filterStatus || 'all'} 
              onValueChange={(value) => setFilterStatus(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Status</SelectItem>
                {candidateStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <label htmlFor="originFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Origem do Candidato</label>
            <Select 
              value={filterOrigin || 'all'} 
              onValueChange={(value) => setFilterOrigin(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todas as Origens" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todas as Origens</SelectItem>
                {hiringOrigins.map(origin => (
                  <SelectItem key={origin} value={origin}>
                    {origin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Candidatos Criados de</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Candidatos Criados até</label>
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

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Visão Geral do Pipeline</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Agendadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Entrevista Agendada']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Realizadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Entrevista Realizada']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <UserCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aguardando Prévia</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Aguardando Prévia']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reprovados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Reprovado']}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Percent className="w-5 h-5 mr-2 text-brand-500" />Taxas de Conversão do Pipeline</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Agendada &rarr; Realizada</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.conversionRates.scheduledToConducted.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Realizada &rarr; Aguardando Prévia</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.conversionRates.conductedToAwaitingPreview.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aguardando Prévia &rarr; Autorizado</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.conversionRates.awaitingPreviewToAuthorized.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Geral (Agendado &rarr; Autorizado)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.conversionRates.overallToAuthorized.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Award className="w-5 h-5 mr-2 text-brand-500" />Desempenho das Entrevistas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Média Geral da Entrevista</h3>
          <p className="text-4xl font-bold text-brand-600 dark:text-brand-400">{reportData.avgInterviewScore.toFixed(1)} / 100</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pontuação média de todas as entrevistas realizadas.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Média por Seção da Entrevista</h3>
          <ul className="space-y-3">
            {reportData.avgSectionScores.length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              reportData.avgSectionScores.map(section => (
                <li key={section.id} className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-200">{section.title}</span>
                  <span className="text-gray-600 dark:text-gray-300">{section.average.toFixed(1)} pts</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><UserRound className="w-5 h-5 mr-2 text-brand-500" />Candidatos por Responsável</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Total de Candidatos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.candidatesByResponsible.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
                    Nenhum responsável encontrado ou dados de candidatos.
                  </td>
                </tr>
              ) : (
                reportData.candidatesByResponsible.map(responsible => (
                  <tr key={responsible.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                      {responsible.name === user?.name ? <Crown className="w-4 h-4 text-yellow-500" /> : <UserRound className="w-4 h-4 text-gray-400" />}
                      <span>{responsible.name}</span>
                    </td>
                    <td className="px-4 py-3">{responsible.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Star className="w-5 h-5 mr-2 text-brand-500" />Candidatos por Origem</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Total de Candidatos</th>
                <th className="px-4 py-3">Autorizados</th>
                <th className="px-4 py-3">Taxa de Conversão para Autorizado (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.candidatesByOrigin.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado de origem encontrado.
                  </td>
                </tr>
              ) : (
                reportData.candidatesByOrigin.map(origin => (
                  <tr key={origin.origin} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{origin.origin}</td>
                    <td className="px-4 py-3">{origin.count}</td>
                    <td className="px-4 py-3">{origin.authorizedCount}</td>
                    <td className="px-4 py-3">{origin.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><LineChart className="w-5 h-5 mr-2 text-brand-500" />Tendências Mensais</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Total de Candidatos</th>
                <th className="px-4 py-3">Candidatos Autorizados</th>
                <th className="px-4 py-3">Média Pontuação Entrevista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.monthlyTrends.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado de tendência mensal encontrado.
                  </td>
                </tr>
              ) : (
                reportData.monthlyTrends.map(trend => (
                  <tr key={trend.month} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{trend.month}</td>
                    <td className="px-4 py-3">{trend.totalCandidates}</td>
                    <td className="px-4 py-3">{trend.authorizedCandidates}</td>
                    <td className="px-4 py-3">{trend.avgInterviewScore.toFixed(1)}</td>
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

export default HiringReports;