import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, TrendingUp, Users, Calendar, DollarSign, Send, ListTodo, Award, Filter, RotateCcw, UserRound } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CrmSalesReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmLeads, leadTasks, crmStages, teamMembers, isDataLoading } = useApp();

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));
  }, [teamMembers]);

  const filteredLeads = useMemo(() => {
    let currentLeads = crmLeads;

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId);
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentLeads = currentLeads.filter(lead => new Date(lead.created_at) <= end);
    }

    return currentLeads;
  }, [crmLeads, selectedConsultantId, filterStartDate, filterEndDate]);

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
      };
    });

    let totalLeads = 0;
    let totalProposalValue = 0;
    let totalSoldValue = 0;

    filteredLeads.forEach(lead => {
      totalLeads++;
      if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
        dataByConsultant[lead.consultant_id].leadsRegistered++;
      }

      if (lead.proposalValue && lead.proposalValue > 0) {
        totalProposalValue += lead.proposalValue;
        if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
          dataByConsultant[lead.consultant_id].proposalsSent++;
          dataByConsultant[lead.consultant_id].proposalValue += lead.proposalValue;
        }
      }

      const wonStage = crmStages.find(s => s.id === lead.stage_id && s.is_won);
      if (wonStage && lead.soldCreditValue && lead.soldCreditValue > 0) {
        totalSoldValue += lead.soldCreditValue;
        if (lead.consultant_id && dataByConsultant[lead.consultant_id]) {
          dataByConsultant[lead.consultant_id].salesClosed++;
          dataByConsultant[lead.consultant_id].soldValue += lead.soldCreditValue;
        }
      }
    });

    leadTasks.forEach(task => {
      const lead = filteredLeads.find(l => l.id === task.lead_id);
      if (lead && task.type === 'meeting' && task.consultant_id && dataByConsultant[task.consultant_id]) {
        dataByConsultant[task.consultant_id].meetingsScheduled++;
      }
    });

    const sortedConsultantData = Object.values(dataByConsultant).sort((a, b) => b.leadsRegistered - a.leadsRegistered);

    const topRegistrars = [...sortedConsultantData].sort((a, b) => b.leadsRegistered - a.leadsRegistered).slice(0, 3);
    const topMeetingSchedulers = [...sortedConsultantData].sort((a, b) => b.meetingsScheduled - a.meetingsScheduled).slice(0, 3);
    const topClosers = [...sortedConsultantData].sort((a, b) => b.salesClosed - a.salesClosed).slice(0, 3);

    return {
      totalLeads,
      totalProposalValue,
      totalSoldValue,
      consultantPerformance: sortedConsultantData,
      topRegistrars,
      topMeetingSchedulers,
      topClosers,
    };
  }, [filteredLeads, leadTasks, consultants, crmStages]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedConsultantId(null);
  };

  const hasActiveFilters = filterStartDate || filterEndDate || selectedConsultantId;

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Vendas do CRM</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise de desempenho dos consultores e visão geral do pipeline.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Relatório</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="w-full">
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
                {consultants.map(consultant => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Leads</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.totalLeads}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total em Propostas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(reportData.totalProposalValue)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total Vendido</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(reportData.totalSoldValue)}</p>
          </div>
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
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />Mais Vendas Fechadas</h3>
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
                  <span className="text-gray-600 dark:text-gray-300">{consultant.salesClosed} Vendas ({formatCurrency(consultant.soldValue)})</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.consultantPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado de desempenho encontrado.
                  </td>
                </tr>
              ) : (
                reportData.consultantPerformance.map(consultant => (
                  <tr key={consultant.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
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