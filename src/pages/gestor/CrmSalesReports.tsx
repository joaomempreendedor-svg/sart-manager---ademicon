import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, TrendingUp, Users, Calendar, DollarSign, Send, ListTodo, Award, Filter, RotateCcw, UserRound, FileText, Download, Percent, MapPin, BarChart } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import TopSellersChart from '@/components/crm/TopSellersChart';
import { SalesByOriginDetailModal } from '@/components/crm/SalesByOriginDetailModal';
import toast from 'react-hot-toast';

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CrmSalesReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmLeads, leadTasks, crmStages, teamMembers, crmPipelines, isDataLoading, salesOrigins } = useApp();

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSaleDateStart, setFilterSaleDateStart] = useState('');
  const [filterSaleDateEnd, setFilterSaleDateEnd] = useState('');
  const [filterProposalDateStart, setFilterProposalDateStart] = useState('');
  const [filterProposalDateEnd, setFilterProposalDateEnd] = useState('');
  const [filterStageId, setFilterStageId] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  // CORREÇÃO: Lista de membros normalizada para usar authUserId como chave de busca
  const allTeamMembers = useMemo(() => {
    const members = [...teamMembers.filter(m => m.isActive)];
    
    // Garante que o João Müller esteja na lista se o ID bater
    if (!members.some(m => m.authUserId === JOAO_GESTOR_AUTH_ID)) {
        members.push({
            id: 'gestor-joao',
            authUserId: JOAO_GESTOR_AUTH_ID,
            name: 'João Müller',
            roles: ['Gestor'],
            isActive: true
        } as any);
    }
    return members;
  }, [teamMembers]);

  const filteredLeads = useMemo(() => {
    let currentLeads = crmLeads;

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId || (!lead.consultant_id && lead.created_by === selectedConsultantId));
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) <= end);
    }

    if (filterSaleDateStart) {
      const start = new Date(filterSaleDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') >= start);
    }
    if (filterSaleDateEnd) {
      const end = new Date(filterSaleDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.saleDate && new Date(lead.saleDate + 'T00:00:00') <= end);
    }

    if (filterProposalDateStart) {
      const start = new Date(filterProposalDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.proposalClosingDate && new Date(lead.proposalClosingDate + 'T00:00:00') >= start);
    }
    if (filterProposalDateEnd) {
      const end = new Date(filterProposalDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.proposalClosingDate && new Date(lead.proposalClosingDate + 'T00:00:00') <= end);
    }

    if (filterStageId) {
      currentLeads = currentLeads.filter(lead => lead.stage_id === filterStageId);
    }

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
        conversionRate: number;
      };
    } = {};

    // Inicializa o mapa usando o authUserId como chave
    allTeamMembers.forEach(m => {
      const key = m.authUserId || m.id;
      dataByConsultant[key] = {
        name: m.name,
        leadsRegistered: 0,
        meetingsScheduled: 0,
        proposalsSent: 0,
        proposalValue: 0,
        salesClosed: 0,
        soldValue: 0,
        conversionRate: 0,
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

    const salesByOrigin: { [key: string]: { count: number; soldValue: number; leads: any[] } } = {};
    salesOrigins.forEach(origin => {
      salesByOrigin[origin] = { count: 0, soldValue: 0, leads: [] };
    });

    filteredLeads.forEach(lead => {
      totalLeads++;
      
      // RESOLUÇÃO DE ID DO CONSULTOR (Prioriza consultant_id, depois quem criou)
      const consultantId = lead.consultant_id || lead.created_by;
      
      if (consultantId && dataByConsultant[consultantId]) {
        dataByConsultant[consultantId].leadsRegistered++;
      }

      if (lead.stage_id && pipelineStageSummary[lead.stage_id]) {
        pipelineStageSummary[lead.stage_id].count++;
        const currentVal = lead.proposalValue || 0;
        pipelineStageSummary[lead.stage_id].totalValue += currentVal;
      }

      if (lead.proposalValue && lead.proposalValue > 0) {
        totalProposalValue += lead.proposalValue;
        totalProposalsCount++;
        if (consultantId && dataByConsultant[consultantId]) {
          dataByConsultant[consultantId].proposalsSent++;
          dataByConsultant[consultantId].proposalValue += lead.proposalValue;
        }
      }

      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      if (wonStage) {
        const actualSoldValue = (lead.soldCreditValue && lead.soldCreditValue > 0)
          ? lead.soldCreditValue
          : (lead.proposalValue || 0);

        if (actualSoldValue > 0) {
          totalSalesCount++;
          totalSoldValue += actualSoldValue;
          if (consultantId && dataByConsultant[consultantId]) {
            dataByConsultant[consultantId].salesClosed++;
            dataByConsultant[consultantId].soldValue += actualSoldValue;
          }
          if (lead.data?.origin && salesByOrigin[lead.data.origin] !== undefined) {
            salesByOrigin[lead.data.origin].count++;
            salesByOrigin[lead.data.origin].soldValue += actualSoldValue;
            salesByOrigin[lead.data.origin].leads.push(lead);
          }
        }
      }
    });

    // Contabiliza reuniões
    leadTasks.forEach(task => {
      if (task.type === 'meeting' && task.user_id && dataByConsultant[task.user_id]) {
        dataByConsultant[task.user_id].meetingsScheduled++;
      }
    });

    const performanceList = Object.values(dataByConsultant).map(c => {
      const conversionRate = c.proposalsSent > 0 ? (c.salesClosed / c.proposalsSent) * 100 : 0;
      return { ...c, conversionRate };
    }).sort((a, b) => b.soldValue - a.soldValue);

    return {
      totalLeads,
      totalProposalValue,
      totalSoldValue,
      overallConversionRate: totalProposalsCount > 0 ? (totalSalesCount / totalProposalsCount) * 100 : 0,
      consultantPerformance: performanceList,
      pipelineStageSummary: Object.values(pipelineStageSummary).filter(s => s.count > 0),
      salesByOrigin: Object.entries(salesByOrigin).map(([origin, data]) => ({ origin, ...data })).filter(o => o.count > 0).sort((a, b) => b.soldValue - a.soldValue),
    };
  }, [filteredLeads, leadTasks, allTeamMembers, crmStages, pipelineStages, salesOrigins]);

  const topSellersChartData = useMemo(() => {
    return reportData.consultantPerformance
      .filter(c => c.soldValue > 0)
      .map(c => ({ name: c.name, soldValue: c.soldValue }));
  }, [reportData.consultantPerformance]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterSaleDateStart('');
    setFilterSaleDateEnd('');
    setFilterProposalDateStart('');
    setFilterProposalDateEnd('');
    setFilterStageId(null);
    setSelectedConsultantId(null);
    setFilterOrigin(null);
  };

  const hasActiveFilters = filterStartDate || filterEndDate || filterSaleDateStart || filterSaleDateEnd || filterProposalDateStart || filterProposalDateEnd || filterStageId || selectedConsultantId || filterOrigin;

  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const detailedLeadsData = filteredLeads.map(lead => {
      const consultantId = lead.consultant_id || lead.created_by;
      const consultant = allTeamMembers.find(m => m.authUserId === consultantId || m.id === consultantId);
      const stage = crmStages.find(s => s.id === lead.stage_id);
      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      const actualSoldValue = wonStage
        ? ((lead.soldCreditValue && lead.soldCreditValue > 0) ? lead.soldCreditValue : (lead.proposalValue || 0))
        : 0;

      return {
        'Nome do Lead': lead.name,
        'Consultor': consultant?.name || 'N/A',
        'Etapa': stage?.name || 'N/A',
        'Origem': lead.data?.origin || 'N/A',
        'Valor Proposta': lead.proposalValue || 0,
        'Valor Vendido': actualSoldValue,
        'Data Venda': lead.saleDate ? new Date(lead.saleDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
        'Criado Em': new Date(lead.created_at).toLocaleDateString('pt-BR'),
      };
    });
    const wsDetailedLeads = XLSX.utils.json_to_sheet(detailedLeadsData);
    XLSX.utils.book_append_sheet(workbook, wsDetailedLeads, "Leads Detalhado");
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Consultor</label>
            <Select value={selectedConsultantId || 'all'} onValueChange={(value) => setSelectedConsultantId(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Consultores" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {allTeamMembers.map(c => (
                  <SelectItem key={c.authUserId || c.id} value={c.authUserId || c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etapa</label>
            <Select value={filterStageId || 'all'} onValueChange={(value) => setFilterStageId(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todas as Etapas" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {pipelineStages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Origem</label>
            <Select value={filterOrigin || 'all'} onValueChange={(value) => setFilterOrigin(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todas as Origens" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todas as Origens</SelectItem>
                {salesOrigins.map(origin => (
                  <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data até</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm text-gray-500">Total Leads</p><p className="text-xl font-bold">{reportData.totalLeads}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><Send className="w-6 h-6 text-purple-600" /></div>
          <div><p className="text-sm text-gray-500">Total Propostas</p><p className="text-xl font-bold">{formatCurrency(reportData.totalProposalValue)}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-sm text-gray-500">Total Vendido</p><p className="text-xl font-bold">{formatCurrency(reportData.totalSoldValue)}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><Percent className="w-6 h-6 text-yellow-600" /></div>
          <div><p className="text-sm text-gray-500">Conversão</p><p className="text-xl font-bold">{reportData.overallConversionRate.toFixed(1)}%</p></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-6 flex items-center"><BarChart className="w-5 h-5 mr-2 text-brand-500" />Ranking de Vendas</h2>
        {topSellersChartData.length > 0 ? <TopSellersChart data={topSellersChartData} /> : <p className="text-center py-8 text-gray-500">Sem dados para o período.</p>}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50"><h3 className="font-bold">Desempenho por Consultor</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Consultor</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Reuniões</th>
                <th className="px-4 py-3">Propostas</th>
                <th className="px-4 py-3">Vendas</th>
                <th className="px-4 py-3 text-right">Valor Vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.consultantPerformance.map(c => (
                <tr key={c.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center space-x-2"><UserRound className="w-4 h-4 text-gray-400" /><span>{c.name}</span></td>
                  <td className="px-4 py-3">{c.leadsRegistered}</td>
                  <td className="px-4 py-3">{c.meetingsScheduled}</td>
                  <td className="px-4 py-3">{c.proposalsSent}</td>
                  <td className="px-4 py-3">{c.salesClosed}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(c.soldValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrmSalesReports;