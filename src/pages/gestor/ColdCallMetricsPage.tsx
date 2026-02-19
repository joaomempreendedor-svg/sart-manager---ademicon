import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, MessageSquare, CalendarCheck, BarChart3, Percent, Loader2, Users, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'lucide-react';
import { ColdCallDetailModal } from '@/components/gestor/ColdCallDetailModal';
import { ColdCallLead, ColdCallLog, ColdCallDetailType } from '@/types';
import toast from 'react-hot-toast';

const MetricCard = ({ title, value, icon: Icon, colorClass, subValue, onClick }: any) => {
  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-4xl font-black">{value}</h3>
          {subValue && <p className="text-xs font-medium opacity-60">{subValue}</p>}
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={100} strokeWidth={3} />
        </div>
      </div >
    </>
  );

  const baseClasses = `relative overflow-hidden p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md ${colorClass}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} text-left w-full`}>
        {CardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {CardContent}
    </div>
  );
};

const ColdCallMetricsPage = () => {
  const { user } = useAuth();
  const { coldCallLeads, coldCallLogs, getColdCallMetrics, teamMembers, isDataLoading } = useApp();

  const [selectedColdCallConsultantId, setSelectedColdCallConsultantId] = useState<string | null>(null);

  const [isColdCallDetailModalOpen, setIsColdCallDetailModalOpen] = useState(false);
  const [coldCallModalTitle, setColdCallModalTitle] = useState('');
  const [coldCallLeadsForModal, setColdCallLeadsForModal] = useState<ColdCallLead[]>([]);
  const [coldCallLogsForModal, setColdCallLogsForModal] = useState<ColdCallLog[]>([]);
  const [coldCallDetailType, setColdCallDetailType] = useState<ColdCallDetailType>('all');
  const [selectedColdCallConsultantName, setSelectedColdCallConsultantName] = useState<string>('');

  const coldCallConsultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')));
  }, [teamMembers]);

  const coldCallMetrics = useMemo(() => {
    if (!user) return { totalCalls: 0, totalConversations: 0, totalMeetingsScheduled: 0, conversationToMeetingRate: 0 };

    const targetConsultantId = selectedColdCallConsultantId || user.id;
    
    const isUserConsultant = teamMembers.some(m => m.authUserId === user.id && (m.roles.includes('CONSULTOR') || m.roles.includes('PRÉVIA') || m.roles.includes('AUTORIZADO')));
    if (!selectedColdCallConsultantId && !isUserConsultant) {
      return { totalCalls: 0, totalConversations: 0, totalMeetingsScheduled: 0, conversationToMeetingRate: 0 };
    }

    return getColdCallMetrics(targetConsultantId);
  }, [user, selectedColdCallConsultantId, getColdCallMetrics, teamMembers]);

  const handleOpenColdCallDetailModal = (title: string, type: ColdCallDetailType) => {
    if (!selectedColdCallConsultantId) {
      toast.error("Selecione um consultor para ver os detalhes de Cold Call.");
      return;
    }
    const consultantLeadsFiltered = coldCallLeads.filter(l => l.user_id === selectedColdCallConsultantId);
    const consultantLogsFiltered = coldCallLogs.filter(l => l.user_id === selectedColdCallConsultantId);

    setColdCallModalTitle(title);
    setColdCallLeadsForModal(consultantLeadsFiltered);
    setColdCallLogsForModal(consultantLogsFiltered);
    setColdCallDetailType(type);
    setSelectedColdCallConsultantName(teamMembers.find(m => m.authUserId === selectedColdCallConsultantId)?.name || 'Consultor Desconhecido');
    setIsColdCallDetailModalOpen(true);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      />
    </div>
  );
};

export default ColdCallMetricsPage;