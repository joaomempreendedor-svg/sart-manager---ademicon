import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, TrendingUp, Users, Calendar, DollarSign, Send, ListTodo, Award, Filter, RotateCcw, UserRound, FileText, Download, Percent, MapPin, BarChart } from 'lucide-react'; // Adicionado MapPin e BarChart
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx'; // Importar a biblioteca XLSX
import TopSellersChart from '@/components/crm/TopSellersChart'; // Importar o novo componente de gráfico

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CrmSalesReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmLeads, leadTasks, crmStages, teamMembers, crmPipelines, isDataLoading, salesOrigins } = useApp(); // Adicionado salesOrigins

  const [filterStartDate, setFilterStartDate] = useState(''); // Leads Created At
  const [filterEndDate, setFilterEndDate] = useState('');     // Leads Created At
  const [filterSaleDateStart, setFilterSaleDateStart] = useState(''); // Sale Date
  const [filterSaleDateEnd, setFilterSaleDateEnd] = useState('');     // Sale Date
  const [filterProposalDateStart, setFilterProposalDateStart] = useState(''); // Proposal Closing Date
  const [filterProposalDateEnd, setFilterProposalDateEnd] = useState('');     // Proposal Closing Date
  const [filterStageId, setFilterStageId] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null); // NOVO: Filtro por origem

  // NOVO: Filtro de data para o gráfico de top vendedores
  const [chartFilterSaleDateStart, setChartFilterSaleDateStart] = useState('');
  const [chartFilterSaleDateEnd, setChartFilterSaleDateEnd] = useState('');

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));
  }, [teamMembers]);

  const filteredLeads = useMemo(() => {
    let currentLeads = crmLeads;

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId);
    }

    // Filter by Lead Created At
    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) <= end);
    }

    // Filter by Sale Date
    if (filterSaleDateStart) {
      const start = new Date(filterSaleDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') >= start);
    }
    if (filterSaleDateEnd) {
      const end = new Date(filterSaleDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') <= end);
    }

    // Filter by Proposal Closing Date
    if (filterProposalDateStart) {
      const start = new Date(filterProposalDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.proposalClosingDate && new Date(lead.proposalClosingDate + 'T00:00:00') >= start);
    }
    if (filterProposalDateEnd) {
      const end = new Date(filterProposalDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.proposalClosingDate && new Date(lead.proposalClosingDate + 'T00:00:00') <= end);
    }

    // Filter by Stage
    if (filterStageId) {
      currentLeads = currentLeads.filter(lead => lead.stage_id === filterStageId);
    }

    // NOVO: Filtrar por Origem
    if (filterOrigin) {
      currentLeads = currentLeads.filter(lead => lead.data?.origin === filterOrigin);
    }

    return currentLeads;
  }, [crmLeads, selectedConsultantId, filterStartDate, filterEndDate, filterSaleDateStart, filterSaleDateEnd, filterProposalDateStart, filterProposalDateEnd, filterStageId, filterOrigin]);

  const reportData = useMemo(() => {
    const dataByConsultant: {
      [key: string]: {
        name: string;
        leadsRegistered: number;
        meetingsScheduled: number;
        proposalsSent: number;
        proposalValue: number;
        salesClosed: number;
        soldValue: number;
        conversionRate: number; // New metric
      };
    } = {};

    consultants.forEach(c => {
      dataByConsultant[c.id] = {
        name: c.name,
        leadsRegistered: 0,
        meetingsScheduled: 0,
        proposalsSent: 0,
        proposalValue: 0,
        salesClosed: 0,
        soldValue: 0,
        conversionRate: 0, // New metric
      };
    });

    let totalLeads = 0;
    let totalProposalValue = 0;
    let totalSoldValue = 0;
    let totalProposalsCount = 0;
    let totalSalesCount = 0;

    const pipelineStageSummary: { [key: string]: { name: string; count: number; totalValue: number; } } = {};
    pipelineStages.forEach(stage => {
      pipelineStageSummary[stage.id] = { name: stage.name, count: 0, totalValue: 0 };
    });

    // NOVO: Objeto para armazenar leads por origem
    const leadsByOrigin: { [key: string]: number } = {};
    salesOrigins.forEach(origin => {
      leadsByOrigin[origin] = 0;
    });

    filteredLeads.forEach(lead => {
      totalLeads++;
      if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
        dataByConsultant[lead.consultant_id].leadsRegistered++;
      }

      if (lead.stage_id && pipelineStageSummary[lead.stage_id]) {
        pipelineStageSummary[lead.stage_id].count++;
        // Use the determined sold value for pipeline stage summary if applicable
        const currentSoldValue = crmStages.find(s => s.id === lead.stage_id && s.is_won)
          ? (lead.soldCreditValue && lead.soldCreditValue > 0 ? lead.soldCreditValue : (lead.proposalValue || 0))
          : (lead.proposalValue || 0); // For non-won stages, use proposal value
        pipelineStageSummary[lead.stage_id].totalValue += currentSoldValue;
      }

      if (lead.proposalValue && lead.proposalValue > 0) {
        totalProposalValue += lead.proposalValue;
        totalProposalsCount++;
        if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
          dataByConsultant[lead.consultant_id].proposalsSent++;
          dataByConsultant[lead.consultant_id].proposalValue += lead.proposalValue;
        }
      }

      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      if (wonStage) {
        // Determine the actual sold value for this lead, with fallback
        const actualSoldValue = (lead.soldCreditValue && lead.soldCreditValue > 0)
          ? lead.soldCreditValue
          : (lead.proposalValue || 0); // Fallback to proposalValue if soldCreditValue is 0 or null

        if (actualSoldValue > 0) { // Only count as a sale if the value is positive
          totalSalesCount++;
          totalSoldValue += actualSoldValue;
          if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
            dataByConsultant[lead.consultant_id].salesClosed++;
            dataByConsultant[lead.consultant_id].soldValue += actualSoldValue;
          }
        }
      }

      // NOVO: Contar leads por origem
      if (lead.data?.origin && leadsByOrigin[lead.data.origin] !== undefined) {
        leadsByOrigin[lead.data.origin]++;
      }
    });

    leadTasks.forEach(task => {
      const lead = filteredLeads.find(l => l.id === task.lead_id);
      if (lead && task.type === 'meeting' && task.user_id && dataByConsultant[task.user_id]) { // Use task.user_id for consultant
        dataByConsultant[task.user_id].meetingsScheduled++;
      }
    });

    const avgProposalValue = totalProposalsCount > 0 ? totalProposalValue / totalProposalsCount : 0;
    const avgSoldValue = totalSalesCount > 0 ? totalSoldValue / totalSalesCount : 0;
    const overallConversionRate = totalProposalsCount > 0 ? (totalSalesCount / totalProposalsCount) * 100 : 0;

    const sortedConsultantData = Object.values(dataByConsultant).map(c => {
      const conversionRate = c.proposalsSent > 0 ? (c.salesClosed / c.proposalsSent) * 100 : 0;
      return { ...c, conversionRate };
    }).sort((a, b) => b.leadsRegistered - a.leadsRegistered);

    const topRegistrars = [...sortedConsultantData].sort((a, b) => b.leadsRegistered - a.leadsRegistered).slice(0, 3);
    const topMeetingSchedulers = [...sortedConsultantData].sort((a, b) => b.meetingsScheduled - a.meetingsScheduled).slice(0, 3);
    // Corrigido: Ordenar por soldValue (valor vendido) em vez de salesClosed (quantidade de vendas)
    const topClosers = [...sortedConsultantData].sort((a, b) => b.soldValue - a.soldValue).slice(0, 3); 

    return {
      totalLeads,
      totalProposalValue,
      totalSoldValue,
      avgProposalValue,
      avgSoldValue,
      overallConversionRate,
      consultantPerformance: sortedConsultantData,
      topRegistrars,
      topMeetingSchedulers,
      topClosers,
      pipelineStageSummary: Object.values(pipelineStageSummary).filter(s => s.count > 0),
      leadsByOrigin: Object.entries(leadsByOrigin).map(([origin, count]) => ({ origin, count })).filter(o => o.count > 0).sort((a, b) => b.count - a.count), // NOVO: Inclui leads por origem
    };
  }, [filteredLeads, leadTasks, consultants, crmStages, pipelineStages, salesOrigins]); // Adicionado salesOrigins como dependência

  // NOVO: Dados para o gráfico de top vendedores, aplicando o filtro de data específico
  const topSellersChartData = useMemo(() => {
    let leadsForChart = crmLeads;

    if (chartFilterSaleDateStart) {
      const start = new Date(chartFilterSaleDateStart + 'T00:00:00');
      leadsForChart = leadsForChart.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') >= start);
    }
    if (chartFilterSaleDateEnd) {
      const end = new Date(chartFilterSaleDateEnd + 'T23:59:59');
      leadsForChart = leadsForChart.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') <= end);
    }

    const salesByConsultant: { [key: string]: { name: string; soldValue: number; } } = {};
    consultants.forEach(c => {
      salesByConsultant[c.id] = { name: c.name, soldValue: 0 };
    });

    leadsForChart.forEach(lead => {
      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      if (wonStage && lead.consultant_id && salesByConsultant[lead.consultant_id]) {
        // Use fallback logic for chart data as well
        const actualSoldValue = (lead.soldCreditValue && lead.soldCreditValue > 0)
          ? lead.soldCreditValue
          : (lead.proposalValue || 0);
        salesByConsultant[lead.consultant_id].soldValue += actualSoldValue;
      }
    });

    return Object.values(salesByConsultant).filter(c => c.soldValue > 0);
  }, [crmLeads, crmStages, consultants, chartFilterSaleDateStart, chartFilterSaleDateEnd]);


  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterSaleDateStart('');
    setFilterSaleDateEnd('');
    setFilterProposalDateStart('');
    setFilterProposalDateEnd('');
    setFilterStageId(null);
    setSelectedConsultantId(null);
    setFilterOrigin(null); // NOVO: Limpa filtro de origem
    setChartFilterSaleDateStart(''); // Limpa filtro do gráfico
    setChartFilterSaleDateEnd(''); // Limpa filtro do gráfico
  };

  const hasActiveFilters = filterStartDate || filterEndDate || filterSaleDateStart || filterSaleDateEnd || filterProposalDateStart || filterProposalDateEnd || filterStageId || selectedConsultantId || filterOrigin || chartFilterSaleDateStart || chartFilterSaleDateEnd; // NOVO: Adicionado filterOrigin e filtros do gráfico

  const handleExportToExcel = () => {
    // A lógica de exportação de comissões não está presente aqui, mas se fosse, precisaria ser ajustada.
    // Por enquanto, vamos exportar os dados do relatório de vendas.
    const workbook = XLSX.utils.book_new();

    // Dados Detalhados dos Leads
    const detailedLeadsData = filteredLeads.map(lead => {
      const consultant = teamMembers.find(m => m.id === lead.consultant_id);
      const stage = crmStages.find(s => s.id === lead.stage_id);
      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      const actualSoldValue = wonStage
        ? ((lead.soldCreditValue && lead.soldCreditValue > 0) ? lead.soldCreditValue : (lead.proposalValue || 0))
        : 0; // If not won, sold value is 0

      return {
        'Nome do Lead': lead.name,
        'Consultor': consultant?.name || 'N/A',
        'Etapa': stage?.name || 'N/A',
        'Origem': lead.data?.origin || 'N/A',
        'Valor Proposta': lead.proposalValue || 0,
        'Data Fechamento Proposta': lead.proposalClosingDate ? new Date(lead.proposalClosingDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
        'Valor Vendido': actualSoldValue, // Use the actualSoldValue
        'Grupo Vendido': lead.soldGroup || 'N/A',
        'Cota Vendida': lead.soldQuota || 'N/A',
        'Data Venda': lead.saleDate ? new Date(lead.saleDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
        'Criado Em': new Date(lead.created_at).toLocaleDateString('pt-BR'),
      };
    });
    const wsDetailedLeads = XLSX.utils.json_to_sheet(detailedLeadsData);
    XLSX.utils.book_append_sheet(workbook, wsDetailedLeads, "Leads Detalhado");

    // Resumo Geral
    const summaryData = [
      { 'Métrica': 'Total de Leads Filtrados', 'Valor': reportData.totalLeads },
      { 'Métrica': 'Valor Total em Propostas', 'Valor': reportData.totalProposalValue },
      { 'Métrica': 'Valor Total Vendido', 'Valor': reportData.totalSoldValue },
      { 'Métrica': 'Valor Médio da Proposta', 'Valor': reportData.avgProposalValue },
      { 'Métrica': 'Valor Médio da Venda', 'Valor': reportData.avgSoldValue },
      { 'Métrica': 'Taxa de Conversão Geral', 'Valor': reportData.overallConversionRate.toFixed(1) + '%' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumo Geral");

    // Visão Geral do Pipeline por Etapa
    const pipelineSummaryData = reportData.pipelineStageSummary.map(stage => ({
      'Etapa': stage.name,
      'Número de Leads': stage.count,
      'Valor Total': stage.totalValue,
    }));
    const wsPipelineSummary = XLSX.utils.json_to_sheet(pipelineSummaryData);
    XLSX.utils.book_append_sheet(workbook, wsPipelineSummary, "Visao Geral Pipeline");

    // Desempenho Detalhado dos Consultores
    const consultantPerformanceData = reportData.consultantPerformance.map(c => ({
      'Consultor': c.name,
      'Leads Cadastrados': c.leadsRegistered,
      'Reuniões Agendadas': c.meetingsScheduled,
      'Propostas Enviadas': c.proposalsSent,
      'Valor em Propostas': c.proposalValue,
      'Vendas Fechadas': c.salesClosed,
      'Valor Vendido': c.soldValue,
      'Taxa de Conversão (%)': c.conversionRate.toFixed(1),
    }));
    const wsConsultantPerformance = XLSX.utils.json_to_sheet(consultantPerformanceData);
    XLSX.utils.book_append_sheet(workbook, wsConsultantPerformance, "Desempenho Consultores");

    // NOVO: Leads por Origem
    const leadsByOriginData = reportData.leadsByOrigin.map(o => ({
      'Origem': o.origin,
      'Número de Leads': o.count,
    }));
    const wsLeadsByOrigin = XLSX.utils.json_to_sheet(leadsByOriginData);
    XLSX.utils.book_append_sheet(workbook, wsLeadsByOrigin, "Leads por Origem");

    XLSX.writeFile(workbook, `Relatorio_Vendas_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Vendas do CRM</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise de desempenho dos consultores e visão geral do pipeline.</p>
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
          <div>
            <label htmlFor="consultantFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Consultor</label>
            <Select 
              value={selectedConsultantId || 'all'} 
              onValueChange={(value) => setSelectedConsultantId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Consultores" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {consultants.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="stageFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etapa do Pipeline</label>
            <Select 
              value={filterStageId || 'all'} 
              onValueChange={(value) => setFilterStageId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todas as Etapas" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {pipelineStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* NOVO: Filtro por Origem */}
          <div>
            <label htmlFor="originFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Origem do Lead</label>
            <Select 
              value={filterOrigin || 'all'} 
              onValueChange={(value) => setFilterOrigin(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todas as Origens" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todas as Origens</SelectItem>
                {salesOrigins.map(origin => (
                  <SelectItem key={origin} value={origin}>
                    {origin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Leads Criados de</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Leads Criados até</label>
            <input
              type="date"
              id="filterEndDate"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterProposalDateStart" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Proposta Fechamento de</label>
            <input
              type="date"
              id="filterProposalDateStart"
              value={filterProposalDateStart}
              onChange={(e) => setFilterProposalDateStart(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterProposalDateEnd" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Proposta Fechamento até</label>
            <input
              type="date"
              id="filterProposalDateEnd"
              value={filterProposalDateEnd}
              onChange={(e) => setFilterProposalDateEnd(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterSaleDateStart" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Venda Data de</label>
            <input
              type="date"
              id="filterSaleDateStart"
              value={filterSaleDateStart}
              onChange={(e) => setFilterSaleDateStart(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterSaleDateEnd" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Venda Data até</label>
            <input
              type="date"
              id="filterSaleDateEnd"
              value={filterSaleDateEnd}
              onChange={(e) => setFilterSaleDateEnd(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{reportData.totalLeads}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
            <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total em Propostas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(reportData.totalProposalValue)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total Vendido</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(reportData.totalSoldValue)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
            <Percent className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Taxa de Conversão Geral</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{reportData.overallConversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Average Values */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Valores Médios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
            <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Médio da Proposta</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(reportData.avgProposalValue)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-col justify-center ml-4 flex-grow flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Médio da Venda</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(reportData.avgSoldValue)}</p>
          </div>
        </div>
      </div>

      {/* NOVO: Gráfico de Top Vendedores */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><BarChart className="w-5 h-5 mr-2 text-brand-500" />Top Vendedores por Valor Vendido</h2>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="chartFilterSaleDateStart" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vendas de</label>
            <input
              type="date"
              id="chartFilterSaleDateStart"
              value={chartFilterSaleDateStart}
              onChange={(e) => setChartFilterSaleDateStart(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="chartFilterSaleDateEnd" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vendas até</label>
            <input
              type="date"
              id="chartFilterSaleDateEnd"
              value={chartFilterSaleDateEnd}
              onChange={(e) => setChartFilterSaleDateEnd(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
        {topSellersChartData.length > 0 ? (
          <TopSellersChart data={topSellersChartData} />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhum dado de vendas para o período selecionado.
          </div>
        )}
      </div>

      {/* Pipeline Stage Summary */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><ListTodo className="w-5 h-5 mr-2 text-brand-500" />Visão Geral do Pipeline por Etapa</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Número de Leads</th>
                <th className="px-4 py-3">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.pipelineStageSummary.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                    Nenhum lead nas etapas do pipeline.
                  </td>
                </tr>
              ) : (
                reportData.pipelineStageSummary.map(stage => (
                  <tr key={stage.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{stage.name}</td>
                    <td className="px-4 py-3">{stage.count}</td>
                    <td className="px-4 py-3">{formatCurrency(stage.totalValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOVO: Leads por Origem */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-brand-500" />Leads por Origem</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Número de Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.leadsByOrigin.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
                    Nenhum lead encontrado para as origens.
                  </td>
                </tr>
              ) : (
                reportData.leadsByOrigin.map(origin => (
                  <tr key={origin.origin} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{origin.origin}</td>
                    <td className="px-4 py-3">{origin.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Award className="w-5 h-5 mr-2 text-brand-500" />Top Performers</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />Mais Leads Cadastrados</h3>
          <ul className="space-y-3">
            {reportData.topRegistrars.length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              reportData.topRegistrars.map((consultant, index) => (
                <li key={consultant.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-brand-500">{index + 1}.</span>
                    <span className="text-gray-800 dark:text-gray-200">{consultant.name}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">{consultant.leadsRegistered} Leads</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />Mais Reuniões Agendadas</h3>
          <ul className="space-y-3">
            {reportData.topMeetingSchedulers.length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              reportData.topMeetingSchedulers.map((consultant, index) => (
                <li key={consultant.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-brand-500">{index + 1}.</span>
                    <span className="text-gray-800 dark:text-gray-200">{consultant.name}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">{consultant.meetingsScheduled} Reuniões</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />Ranking de Vendas</h3> {/* Título alterado */}
          <ul className="space-y-3">
            {reportData.topClosers.length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              reportData.topClosers.map((consultant, index) => (
                <li key={consultant.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-brand-500">{index + 1}.</span>
                    <span className="text-gray-800 dark:text-gray-200">{consultant.name}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">{formatCurrency(consultant.soldValue)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Detailed Performance Table */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><ListTodo className="w-5 h-5 mr-2 text-brand-500" />Desempenho Detalhado dos Consultores</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Consultor</th>
                <th className="px-4 py-3">Leads Cadastrados</th>
                <th className="px-4 py-3">Reuniões Agendadas</th>
                <th className="px-4 py-3">Propostas Enviadas</th>
                <th className="px-4 py-3">Valor em Propostas</th>
                <th className="px-4 py-3">Vendas Fechadas</th>
                <th className="px-4 py-3">Valor Vendido</th>
                <th className="px-4 py-3">Taxa de Conversão (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.consultantPerformance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado de desempenho encontrado.
                  </td>
                </tr>
              ) : (
                reportData.consultantPerformance.map(consultant => (
                  <tr key={consultant.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                      <UserRound className="w-4 h-4 text-gray-400" />
                      <span>{consultant.name}</span>
                    </td>
                    <td className="px-4 py-3">{consultant.leadsRegistered}</td>
                    <td className="px-4 py-3">{consultant.meetingsScheduled}</td>
                    <td className="px-4 py-3">{consultant.proposalsSent}</td>
                    <td className="px-4 py-3">{formatCurrency(consultant.proposalValue)}</td>
                    <td className="px-4 py-3">{consultant.salesClosed}</td>
                    <td className="px-4 py-3">{formatCurrency(consultant.soldValue)}</td>
                    <td className="px-4 py-3">{consultant.conversionRate.toFixed(1)}%</td>
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

export default CrmSalesReports;