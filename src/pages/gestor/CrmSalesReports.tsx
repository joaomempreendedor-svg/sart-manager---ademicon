import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, TrendingUp, Users, Calendar, DollarSign, Send, ListTodo, Award, Filter, RotateCcw, UserRound, FileText, Download, Percent, MapPin, BarChart, PieChart, HelpCircle, CheckCircle2, Ticket, UserX, PhoneCall } from 'lucide-react';
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
import { MeetingsByOriginDetailModal } from '@/components/crm/MeetingsByOriginDetailModal';
import toast from 'react-hot-toast';
import { CrmLead } from '@/types';
import { LeadsDetailModal } from '@/components/gestor/LeadsDetailModal';
import { MetricCard } from '@/components/MetricCard';
import { formatLargeCurrency } from '@/utils/currencyUtils';

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CrmSalesReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmLeads, leadTasks, crmStages, teamMembers, crmPipelines, isDataLoading, salesOrigins } = useApp();

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [filterSaleDateStart, setFilterSaleDateStart] = useState('');
  const [filterSaleDateEnd, setFilterSaleDateEnd] = useState('');
  const [filterProposalDateStart, setFilterProposalDateStart] = useState('');
  const [filterProposalDateEnd, setFilterProposalDateEnd] = useState('');
  const [filterStageId, setFilterStageId] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);

  const [isLeadsDetailModalOpen, setIsLeadsDetailModalOpen] = useState(false);
  const [leadsModalTitle, setLeadsModalTitle] = useState('');
  const [leadsForModal, setLeadsForModal] = useState<CrmLead[]>([]);
  const [leadsMetricType, setLeadsMetricType] = useState<'proposal' | 'sold' | 'meeting' | 'all'>('proposal');

  const [isSalesByOriginModalOpen, setIsSalesByOriginModalOpen] = useState(false);
  const [selectedOriginData, setSelectedOriginData] = useState<{ originName: string; leads: CrmLead[] } | null>(null);

  const [isMeetingsByOriginModalOpen, setIsMeetingsByOriginModalOpen] = useState(false);
  const [selectedOriginDataForMeetings, setSelectedOriginDataForMeetings] = useState<{ originName: string; leads: CrmLead[] } | null>(null);

  const [isNoShowDetailModalOpen, setIsNoShowDetailModalOpen] = useState(false);
  const [noShowLeadsForModal, setNoShowLeadsForModal] = useState<CrmLead[]>([]);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const activeStageIds = useMemo(() => new Set(pipelineStages.map(s => s.id)), [pipelineStages]);

  const allTeamMembers = useMemo(() => {
    const members = [...teamMembers.filter(m => m.isActive)];
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
    let currentLeads = crmLeads.filter(lead => activeStageIds.has(lead.stage_id));

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId || (!lead.consultant_id && lead.created_by === selectedConsultantId));
    }

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
      const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;

      currentLeads = currentLeads.filter(lead => {
        const isWon = crmStages.find(s => s.id === lead.stage_id)?.is_won;
        const referenceDate = (isWon && lead.sale_date) ? new Date(lead.sale_date + 'T00:00:00') : new Date(lead.created_at);
        
        const matchesStart = !start || referenceDate >= start;
        const matchesEnd = !end || referenceDate <= end;
        return matchesStart && matchesEnd;
      });
    }

    if (filterSaleDateStart) {
      const start = new Date(filterSaleDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.sale_date && new Date(lead.sale_date + 'T00:00:00') >= start);
    }
    if (filterSaleDateEnd) {
      const end = new Date(filterSaleDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.sale_date && new Date(lead.sale_date + 'T00:00:00') <= end);
    }

    if (filterProposalDateStart) {
      const start = new Date(filterProposalDateStart + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => lead.proposal_closing_date && new Date(lead.proposal_closing_date + 'T00:00:00') >= start);
    }
    if (filterProposalDateEnd) {
      const end = new Date(filterProposalDateEnd + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => lead.proposal_closing_date && new Date(lead.proposal_closing_date + 'T00:00:00') <= end);
    }

    if (filterStageId) {
      currentLeads = currentLeads.filter(lead => lead.stage_id === filterStageId);
    }

    if (filterOrigin) {
      currentLeads = currentLeads.filter(lead => lead.data?.origin === filterOrigin);
    }

    return currentLeads;
  }, [crmLeads, selectedConsultantId, filterStartDate, filterEndDate, filterSaleDateStart, filterSaleDateEnd, filterProposalDateStart, filterProposalDateEnd, filterStageId, filterOrigin, crmStages, activeStageIds]);

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
    let totalProposalsCount = 0;
    let totalSoldValue = 0;
    let totalSalesCount = 0;
    const leadsWithProposal: CrmLead[] = [];
    const leadsSold: CrmLead[] = [];
    const leadsNoShow: CrmLead[] = [];
    const leadsWithMeetings: CrmLead[] = []; // NOVO: Lista para armazenar leads com reuniões

    const pipelineStageSummary: { [key: string]: { name: string; count: number; totalValue: number; } } = {};
    pipelineStages.forEach(stage => {
      pipelineStageSummary[stage.id] = { name: stage.name, count: 0, totalValue: 0 };
    });

    const salesByOrigin: { [key: string]: { count: number; soldValue: number; leads: CrmLead[] } } = {};
    salesOrigins.forEach(origin => {
      salesByOrigin[origin] = { count: 0, soldValue: 0, leads: [] };
    });

    const meetingsByOrigin: { [key: string]: { count: number; leads: CrmLead[] } } = {};
    salesOrigins.forEach(origin => {
      meetingsByOrigin[origin] = { count: 0, leads: [] };
    });

    let totalMeetingsScheduledCount = 0;
    let noShowLeadsCount = 0;

    const noShowStageIds = new Set(crmStages.filter(s => s.is_no_show).map(s => s.id));

    filteredLeads.forEach(lead => {
      const stage = crmStages.find(s => s.id === lead.stage_id);
      const isResolved = stage?.is_won || stage?.is_lost;

      totalLeads++;
      const consultantId = lead.consultant_id || lead.created_by;
      
      if (consultantId && dataByConsultant[consultantId]) {
        dataByConsultant[consultantId].leadsRegistered++;
      }

      if (lead.stage_id && pipelineStageSummary[lead.stage_id]) {
        pipelineStageSummary[lead.stage_id].count++;
        const currentVal = lead.proposal_value || 0;
        pipelineStageSummary[lead.stage_id].totalValue += currentVal;
      }

      if (lead.proposal_value && lead.proposal_value > 0 && !isResolved) {
        totalProposalValue += lead.proposal_value;
        totalProposalsCount++;
        leadsWithProposal.push(lead);
        if (consultantId && dataByConsultant[consultantId]) {
          dataByConsultant[consultantId].proposalsSent++;
          dataByConsultant[consultantId].proposalValue += lead.proposal_value;
        }
      }

      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      if (wonStage) {
        const actualSoldValue = (lead.sold_credit_value && lead.sold_credit_value > 0)
          ? lead.sold_credit_value
          : (lead.proposal_value || 0);

        if (actualSoldValue > 0) {
          totalSalesCount++;
          totalSoldValue += actualSoldValue;
          leadsSold.push(lead);
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

      if (noShowStageIds.has(lead.stage_id)) {
        noShowLeadsCount++;
        leadsNoShow.push(lead);
      }
    });

    leadTasks.forEach(task => {
      if (task.type === 'meeting') {
        const lead = filteredLeads.find(l => l.id === task.lead_id);
        if (lead) {
          const meetingDate = new Date(task.meeting_start_time || '');
          const start = new Date(filterStartDate + 'T00:00:00');
          const end = new Date(filterEndDate + 'T23:59:59');

          if (meetingDate >= start && meetingDate <= end) {
            totalMeetingsScheduledCount++;
            
            // Adiciona à lista geral de leads com reuniões no período
            if (!leadsWithMeetings.some(l => l.id === lead.id)) {
              leadsWithMeetings.push(lead);
            }

            const consultantId = lead.consultant_id || lead.created_by;
            if (consultantId && dataByConsultant[consultantId]) {
              dataByConsultant[consultantId].meetingsScheduled++;
            }
            if (lead.data?.origin && meetingsByOrigin[lead.data.origin] !== undefined) {
              meetingsByOrigin[lead.data.origin].count++;
              if (!meetingsByOrigin[lead.data.origin].leads.some(l => l.id === lead.id)) {
                meetingsByOrigin[lead.data.origin].leads.push(lead);
              }
            }
          }
        }
      }
    });

    const performanceList = Object.values(dataByConsultant).map(c => {
      const conversionRate = c.proposalsSent > 0 ? (c.salesClosed / c.proposalsSent) * 100 : 0;
      return { ...c, conversionRate };
    }).sort((a, b) => b.soldValue - a.soldValue);

    const averageTicket = totalSalesCount > 0 ? totalSoldValue / totalSalesCount : 0;
    const noShowRate = totalMeetingsScheduledCount > 0 ? (noShowLeadsCount / totalMeetingsScheduledCount) * 100 : 0;

    return {
      totalLeads,
      totalProposalValue,
      totalSoldValue,
      overallConversionRate: totalProposalsCount > 0 ? (totalSalesCount / totalProposalsCount) * 100 : 0,
      consultantPerformance: performanceList,
      pipelineStageSummary: Object.values(pipelineStageSummary).filter(s => s.count > 0),
      salesByOrigin: Object.entries(salesByOrigin).map(([origin, data]) => ({ origin, ...data })).filter(o => o.count > 0).sort((a, b) => b.soldValue - a.soldValue),
      meetingsByOrigin: Object.entries(meetingsByOrigin).map(([origin, data]) => ({ origin, ...data })).filter(o => o.count > 0).sort((a, b) => b.count - a.count),
      leadsWithProposal,
      leadsSold,
      averageTicket,
      noShowRate,
      noShowLeadsCount,
      leadsNoShow,
      leadsWithMeetings, // Retornando a lista populada
      totalMeetingsScheduledCount,
    };
  }, [filteredLeads, leadTasks, allTeamMembers, crmStages, pipelineStages, salesOrigins, filterStartDate, filterEndDate]);

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
        ? ((lead.sold_credit_value && lead.sold_credit_value > 0) ? lead.sold_credit_value : (lead.proposal_value || 0))
        : 0;

      return {
        'Nome do Lead': lead.name,
        'Consultor': consultant?.name || 'N/A',
        'Etapa': stage?.name || 'N/A',
        'Origem': lead.data?.origin || 'N/A',
        'Valor Proposta': lead.proposal_value || 0,
        'Valor Vendido': actualSoldValue,
        'Data Venda': lead.sale_date ? new Date(lead.sale_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
        'Criado Em': new Date(lead.created_at).toLocaleDateString('pt-BR'),
      };
    });
    const wsDetailedLeads = XLSX.utils.json_to_sheet(detailedLeadsData);
    XLSX.utils.book_append_sheet(workbook, wsDetailedLeads, "Leads Detalhado");
    XLSX.writeFile(workbook, `Relatorio_Vendas_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleOpenLeadsDetailModal = (title: string, leads: CrmLead[], metricType: 'proposal' | 'sold' | 'meeting' | 'all') => {
    setLeadsModalTitle(title);
    setLeadsForModal(leads);
    setLeadsMetricType(metricType);
    setIsLeadsDetailModalOpen(true);
  };

  const handleOpenSalesByOriginModal = (originName: string, leads: CrmLead[]) => {
    setSelectedOriginData({ originName, leads });
    setIsSalesByOriginModalOpen(true);
  };

  const handleOpenMeetingsByOriginModal = (originName: string, leads: CrmLead[]) => {
    setSelectedOriginDataForMeetings({ originName, leads });
    setIsMeetingsByOriginModalOpen(true);
  };

  const handleOpenNoShowDetailModal = (title: string, leads: CrmLead[]) => {
    setLeadsModalTitle(title);
    setNoShowLeadsForModal(leads);
    setIsNoShowDetailModalOpen(true);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Leads"
          value={reportData.totalLeads}
          icon={Users}
          colorClass="bg-blue-600 text-white"
          onClick={() => handleOpenLeadsDetailModal('Total de Leads no Período', filteredLeads, 'all')}
        />
        <MetricCard
          title="Reuniões Agendadas"
          value={reportData.totalMeetingsScheduledCount}
          icon={Calendar}
          colorClass="bg-orange-600 text-white"
          onClick={() => handleOpenMeetingsByOriginModal('Total de Reuniões Agendadas', reportData.leadsWithMeetings)}
        />
        <MetricCard
          title="Leads com No-Show"
          value={reportData.noShowLeadsCount}
          icon={UserX}
          colorClass="bg-red-600 text-white"
          onClick={() => handleOpenNoShowDetailModal('Leads com No-Show', reportData.leadsNoShow)}
        />
        <MetricCard
          title="Taxa de No-Show"
          value={`${reportData.noShowRate.toFixed(1)}%`}
          icon={Percent}
          colorClass="bg-rose-600 text-white"
          subValue={`${reportData.noShowLeadsCount} de ${reportData.totalMeetingsScheduledCount} reuniões`}
        />
        <MetricCard
          title="Total Propostas"
          value={formatLargeCurrency(reportData.totalProposalValue)}
          icon={Send}
          colorClass="bg-purple-600 text-white"
          onClick={() => handleOpenLeadsDetailModal('Leads com Proposta no Período', reportData.leadsWithProposal, 'proposal')}
        />
        <MetricCard
          title="Total Vendido"
          value={formatLargeCurrency(reportData.totalSoldValue)}
          icon={DollarSign}
          colorClass="bg-green-600 text-white"
          onClick={() => handleOpenLeadsDetailModal('Leads Vendidos no Período', reportData.leadsSold, 'sold')}
        />
        <MetricCard
          title="Conversão"
          value={`${reportData.overallConversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          colorClass="bg-yellow-600 text-white"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatLargeCurrency(reportData.averageTicket)}
          icon={Ticket}
          colorClass="bg-brand-500 text-white"
          subValue="Valor médio por venda"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-brand-500" /> Vendas por Origem
          </h2>
          <div className="space-y-3">
            {reportData.salesByOrigin.map(origin => (
              <button key={origin.origin} onClick={() => handleOpenSalesByOriginModal(origin.origin, origin.leads)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{origin.origin}</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(origin.soldValue)} ({origin.count})</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div className="bg-green-50 h-1.5 rounded-full" style={{ width: `${(origin.soldValue / reportData.totalSoldValue) * 100}%` }}></div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-brand-500" /> Reuniões por Origem
          </h2>
          <div className="space-y-3">
            {reportData.meetingsByOrigin.map(origin => (
              <button key={origin.origin} onClick={() => handleOpenMeetingsByOriginModal(origin.origin, origin.leads)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{origin.origin}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{origin.count} reuniões</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(origin.count / (reportData.totalMeetingsScheduledCount || 1)) * 100}%` }}></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-6 flex items-center"><BarChart className="w-5 h-5 mr-2 text-brand-500" />Ranking de Vendas</h2>
        {topSellersChartData.length > 0 ? <TopSellersChart data={topSellersChartData} /> : <p className="text-center py-8 text-gray-500">Sem dados para o período.</p>}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50"><h3 className="font-bold">Desempenho por Consultor</h3></div>
        <div className="p-4 space-y-4">
          {reportData.consultantPerformance.map(c => (
            <div key={c.name} className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-3">{c.name}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-700">
                  <Users className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500">Leads</p>
                  <p className="font-bold text-lg">{c.leadsRegistered}</p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-700">
                  <Calendar className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500">Reuniões</p>
                  <p className="font-bold text-lg">{c.meetingsScheduled}</p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-700">
                  <Send className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs text-gray-500">Propostas</p>
                  <p className="font-bold text-lg">{c.proposalsSent}</p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-700">
                  <CheckCircle2 className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-gray-500">Vendas</p>
                  <p className="font-bold text-lg">{c.salesClosed}</p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-700 col-span-2 sm:col-span-1 md:col-span-1">
                  <DollarSign className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                  <p className="text-xs text-gray-500">Valor Vendido</p>
                  <p className="font-bold text-lg">{formatCurrency(c.soldValue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LeadsDetailModal
        isOpen={isLeadsDetailModalOpen}
        onClose={() => setIsLeadsDetailModalOpen(false)}
        title={leadsModalTitle}
        leads={leadsForModal}
        crmStages={crmStages}
        teamMembers={allTeamMembers}
        metricType={leadsMetricType}
      />
      {selectedOriginData && (
        <SalesByOriginDetailModal
          isOpen={isSalesByOriginModalOpen}
          onClose={() => setIsSalesByOriginModalOpen(false)}
          originName={selectedOriginData.originName}
          leads={selectedOriginData.leads}
          crmStages={crmStages}
          teamMembers={allTeamMembers}
        />
      )}
      {selectedOriginDataForMeetings && (
        <MeetingsByOriginDetailModal
          isOpen={isMeetingsByOriginModalOpen}
          onClose={() => setIsMeetingsByOriginModalOpen(false)}
          originName={selectedOriginDataForMeetings.originName}
          leads={selectedOriginDataForMeetings.leads}
          crmStages={crmStages}
          teamMembers={allTeamMembers}
        />
      )}
      <LeadsDetailModal
        isOpen={isNoShowDetailModalOpen}
        onClose={() => setIsNoShowDetailModalOpen(false)}
        title={leadsModalTitle}
        leads={noShowLeadsForModal}
        crmStages={crmStages}
        teamMembers={allTeamMembers}
        metricType="meeting"
      />
    </div>
  );
};

export default CrmSalesReports;