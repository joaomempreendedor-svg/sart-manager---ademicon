import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, MessageSquare, CalendarCheck, BarChart3, Percent, Loader2, Users, Filter, RotateCcw, CalendarDays, UserPlus, ArrowUpRight, Clock, TrendingUp } from 'lucide-react'; // Adicionado TrendingUp
import { ColdCallDetailModal } from '@/components/gestor/ColdCallDetailModal';
import { ColdCallLead, ColdCallLog, ColdCallDetailType } from '@/types';
import toast from 'react-hot-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricCard } from '@/components/MetricCard';

const ColdCallMetricsPage = () => {
  const { user } = useAuth();
  const { coldCallLeads, coldCallLogs, teamMembers, isDataLoading } = useApp();

  const [selectedColdCallConsultantId, setSelectedColdCallConsultantId] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isColdCallDetailModalOpen, setIsColdCallDetailModalOpen] = useState(false);
  const [coldCallModalTitle, setColdCallModalTitle] = useState('');
  const [coldCallLeadsForModal, setColdCallLeadsForModal] = useState<ColdCallLead[]>([]);
  const [coldCallLogsForModal, setColdCallLogsForModal] = useState<ColdCallLog[]>([]);
  const [coldCallDetailType, setColdCallDetailType] = useState<ColdCallDetailType>('all');
  
  const selectedColdCallConsultantName = useMemo(() => {
    if (!selectedColdCallConsultantId) {
      return 'Todos os Consultores';
    }
    return teamMembers.find(m => (m.authUserId || m.id) === selectedColdCallConsultantId)?.name || 'Consultor Desconhecido';
  }, [selectedColdCallConsultantId, teamMembers]);


  const coldCallConsultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')));
  }, [teamMembers]);

  const filteredColdCallLogs = useMemo(() => {
    let logs = coldCallLogs;
    if (selectedColdCallConsultantId) {
      logs = logs.filter(log => log.user_id === selectedColdCallConsultantId);
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      logs = logs.filter(log => new Date(log.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      logs = logs.filter(log => new Date(log.created_at) <= end);
    }
    return logs;
  }, [coldCallLogs, selectedColdCallConsultantId, filterStartDate, filterEndDate]);

  const filteredColdCallLeadsForMetrics = useMemo(() => {
    let leads = coldCallLeads;
    if (selectedColdCallConsultantId) {
      leads = leads.filter(lead => lead.user_id === selectedColdCallConsultantId);
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      leads = leads.filter(lead => new Date(lead.created_at) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      leads = leads.filter(lead => new Date(lead.created_at) <= end);
    }
    return leads;
  }, [coldCallLeads, selectedColdCallConsultantId, filterStartDate, filterEndDate]);

  const coldCallMetrics = useMemo(() => {
    const totalCalls = filteredColdCallLogs.length;
    const totalConversations = filteredColdCallLogs.filter(log => log.result === 'Conversou' || log.result === 'Agendar Reunião').length;
    const totalMeetingsScheduled = filteredColdCallLogs.filter(log => log.result === 'Agendar Reunião').length;
    const totalDurationSeconds = filteredColdCallLogs.reduce((sum, log) => sum + log.duration_seconds, 0);

    const conversationToMeetingRate = totalConversations > 0 ? (totalMeetingsScheduled / totalConversations) * 100 : 0;
    const averageCallDuration = totalCalls > 0 ? totalDurationSeconds / totalCalls : 0;

    const totalLeadsAdded = filteredColdCallLeadsForMetrics.length;
    const leadsConvertedToCrm = filteredColdCallLeadsForMetrics.filter(lead => lead.crm_lead_id).length;
    const conversionRateToCrm = totalLeadsAdded > 0 ? (leadsConvertedToCrm / totalLeadsAdded) * 100 : 0;

    return {
      totalCalls,
      totalConversations,
      totalMeetingsScheduled,
      conversationToMeetingRate,
      totalLeadsAdded,
      leadsConvertedToCrm,
      conversionRateToCrm,
      averageCallDuration,
    };
  }, [filteredColdCallLogs, filteredColdCallLeadsForMetrics]);

  const handleOpenColdCallDetailModal = (title: string, type: ColdCallDetailType) => {
    const leadsToPass = selectedColdCallConsultantId 
      ? coldCallLeads.filter(l => l.user_id === selectedColdCallConsultantId)
      : coldCallLeads; 

    setColdCallModalTitle(title);
    setColdCallLeadsForModal(leadsToPass);
    setColdCallLogsForModal(filteredColdCallLogs);
    setColdCallDetailType(type);
    setIsColdCallDetailModalOpen(true);
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedColdCallConsultantId(null);
  };

  const hasActiveFilters = filterStartDate || filterEndDate || selectedColdCallConsultantId;

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <PhoneCall className="w-6 h-6 mr-2 text-brand-500" /> Métricas de Cold Call
        </h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="coldCallConsultant" className="text-sm font-medium text-gray-700 dark:text-gray-300">Consultor:</label>
          <Select
            value={selectedColdCallConsultantId || 'all'}
            onValueChange={(value) => setSelectedColdCallConsultantId(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <SelectValue placeholder="Selecione o Consultor" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
              <SelectItem value="all">Todos os Consultores</SelectItem>
              {coldCallConsultants.map(consultant => (
                <SelectItem key={consultant.id} value={consultant.authUserId || consultant.id}>
                  {consultant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar por Período</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Início</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Fim</label>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard 
          title="Total de Ligações" 
          value={coldCallMetrics.totalCalls} 
          icon={PhoneCall} 
          colorClass="bg-blue-600 text-white" 
          onClick={() => handleOpenColdCallDetailModal('Total de Ligações', 'calls')}
        />
        <MetricCard 
          title="Total de Conversas" 
          value={coldCallMetrics.totalConversations} 
          icon={MessageSquare} 
          colorClass="bg-purple-600 text-white" 
          onClick={() => handleOpenColdCallDetailModal('Total de Conversas', 'conversations')}
        />
        <MetricCard 
          title="Reuniões Agendadas" 
          value={coldCallMetrics.totalMeetingsScheduled} 
          icon={CalendarCheck} 
          colorClass="bg-green-600 text-white" 
          onClick={() => handleOpenColdCallDetailModal('Reuniões Agendadas', 'meetings')}
        />
        <MetricCard 
          title="Taxa Conversa → Reunião" 
          value={`${coldCallMetrics.conversationToMeetingRate.toFixed(1)}%`} 
          icon={Percent} 
          colorClass="bg-yellow-600 text-white" 
          subValue="Efetividade da Conversão"
        />
        <MetricCard 
          title="Prospects Adicionados" 
          value={coldCallMetrics.totalLeadsAdded} 
          icon={UserPlus} 
          colorClass="bg-indigo-600 text-white" 
          onClick={() => handleOpenColdCallDetailModal('Prospects Adicionados', 'all')}
        />
        <MetricCard 
          title="Convertidos para CRM" 
          value={coldCallMetrics.leadsConvertedToCrm} 
          icon={TrendingUp} 
          colorClass="bg-teal-600 text-white" 
          onClick={() => handleOpenColdCallDetailModal('Convertidos para CRM', 'all')}
        />
        <MetricCard 
          title="Taxa Conversão para CRM" 
          value={`${coldCallMetrics.conversionRateToCrm.toFixed(1)}%`} 
          icon={ArrowUpRight} 
          colorClass="bg-orange-600 text-white" 
          subValue="Cold Call para CRM"
        />
        <MetricCard 
          title="Duração Média da Ligação" 
          value={`${Math.round(coldCallMetrics.averageCallDuration / 60)}m ${Math.round(coldCallMetrics.averageCallDuration % 60)}s`} 
          icon={Clock} 
          colorClass="bg-slate-800 text-white dark:bg-slate-700" 
        />
      </div>

      <ColdCallDetailModal
        isOpen={isColdCallDetailModalOpen}
        onClose={() => setIsColdCallDetailModalOpen(false)}
        title={coldCallModalTitle}
        consultantName={selectedColdCallConsultantName}
        leads={coldCallLeadsForModal}
        logs={coldCallLogsForModal}
        type={coldCallDetailType}
        teamMembers={teamMembers}
        filterStartDate={filterStartDate}
        filterEndDate={filterEndDate}
      />
    </div>
  );
};

export default ColdCallMetricsPage;