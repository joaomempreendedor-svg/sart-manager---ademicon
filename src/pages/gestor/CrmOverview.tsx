import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp, ListTodo, CalendarPlus, Send, DollarSign, Edit2, Trash2, Users, CheckCircle2, XCircle, Filter, RotateCcw, UserRound, UploadCloud, Calendar, Clock } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal';
import { LeadTasksModal } from '@/components/crm/LeadTasksModal';
import { ProposalModal } from '@/components/crm/ProposalModal';
import { MarkAsSoldModal } from '@/components/crm/MarkAsSoldModal';
import ExportCrmLeadsButton from '@/components/crm/ExportCrmLeadsButton';
import { ImportCrmLeadsModal } from '@/components/crm/ImportCrmLeadsModal';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { SaleCelebrationModal } from '@/components/SaleCelebrationModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrmLead, LeadTask } from '@/types';
import { useLocation } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CrmOverviewPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, teamMembers, isDataLoading, deleteCrmLead, updateCrmLead, addCrmLead, leadTasks, crmOwnerUserId } = useApp();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [selectedLeadForTasks, setSelectedLeadForTasks] = useState<CrmLead | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedLeadForProposal, setSelectedLeadForProposal] = useState<CrmLead | null>(null);
  const [isMarkAsSoldModalOpen, setIsMarkAsSoldModalOpen] = useState(false);
  const [selectedLeadForSold, setSelectedLeadForSold] = useState<CrmLead | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState<CrmLead | null>(null);

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedLeadName, setCelebratedLeadName] = useState('');

  const location = useLocation();

  useEffect(() => {
    if (location.state?.highlightLeadId) {
      const leadToHighlight = crmLeads.find(l => l.id === location.state.highlightLeadId);
      if (leadToHighlight) {
        setSelectedLeadForTasks(leadToHighlight);
        setIsTasksModalOpen(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, crmLeads]);

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
    // Filtro mais abrangente para garantir que todos os consultores apareçam
    return teamMembers.filter(m => 
      m.isActive && 
      (m.roles.some(r => ['Prévia', 'Autorizado', 'Consultor', 'CONSULTOR'].includes(r)))
    );
  }, [teamMembers]);

  const filteredLeads = useMemo(() => {
    let currentLeads = crmLeads;

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentLeads = currentLeads.filter(lead =>
        (String(lead.name || '').toLowerCase()).includes(lowerCaseSearchTerm) ||
        Object.values(lead.data || {}).some(value =>
          String(value).toLowerCase().includes(lowerCaseSearchTerm)
        )
      );
    }

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
      const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;

      currentLeads = currentLeads.filter(lead => {
        const referenceDate = lead.saleDate ? new Date(lead.saleDate + 'T00:00:00') : new Date(lead.created_at);
        const matchesStart = !start || referenceDate >= start;
        const matchesEnd = !end || referenceDate <= end;
        return matchesStart && matchesEnd;
      });
    }

    return currentLeads;
  }, [crmLeads, searchTerm, filterStartDate, filterEndDate, selectedConsultantId]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, CrmLead[]> = {};
    pipelineStages.forEach(stage => {
      groups[stage.id] = filteredLeads.filter(lead => lead.stage_id === stage.id);
    });
    return groups;
  }, [pipelineStages, filteredLeads]);

  const handleAddNewLead = () => {
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleEditLead = (lead: CrmLead) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleDeleteLead = async (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteCrmLead(lead.id);
      } catch (error: any) {
        alert(`Erro ao excluir lead: ${error.message}`);
      }
    }
  };

  const handleOpenTasksModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForTasks(lead);
    setIsTasksModalOpen(true);
  };

  const handleOpenProposalModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForProposal(lead);
    setIsProposalModalOpen(true);
  };

  const handleMarkAsWon = async (e: React.FormEvent, lead: CrmLead) => {
    e.stopPropagation();
    const wonStage = crmStages.find(s => s.pipeline_id === activePipeline?.id && s.is_won);
    if (!wonStage) {
      alert("Nenhuma etapa de 'Ganha' configurada no pipeline.");
      return;
    }
    setSelectedLeadForSold(lead);
    setIsMarkAsSoldModalOpen(true);
  };

  const handleOpenMeetingModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForMeeting(lead);
    setIsMeetingModalOpen(true);
  };

  const handleStageChange = async (leadId: string, newStageId: string) => {
    try {
      await updateCrmLead(leadId, { stage_id: newStageId });
    } catch (error: any) {
      alert(`Erro ao mover lead: ${error.message}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    try {
      await updateCrmLead(leadId, { stage_id: targetStageId });
    } catch (error: any) {
      alert(`Erro ao mover lead: ${error.message}`);
    }
  };

  const handleImportLeads = async (leadsToImport: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>[]) => {
    for (const leadData of leadsToImport) {
      await addCrmLead(leadData);
    }
  };

  const handleSaleSuccess = (leadName: string) => {
    setCelebratedLeadName(leadName);
    setShowCelebration(true);
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setCelebratedLeadName('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedConsultantId(null);
  };

  const hasActiveFilters = searchTerm || filterStartDate || filterEndDate || selectedConsultantId;

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!activePipeline || pipelineStages.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">CRM - Funil de Vendas</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Nenhum pipeline de vendas ativo ou etapas configuradas.</p>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <TrendingUp className="mx-auto w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Configure o pipeline nas configurações do CRM.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM de Vendas - {activePipeline.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Visão geral de todos os leads da equipe.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar lead..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition font-medium flex-shrink-0"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Importar</span>
          </button>
          <button
            onClick={handleAddNewLead}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtros</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Consultor</label>
            <Select value={selectedConsultantId || 'all'} onValueChange={(val) => setSelectedConsultantId(val === 'all' ? null : val)}>
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Consultores" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {consultants.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">De</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Até</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
        {pipelineStages.map(stage => (
          <div 
            key={stage.id} 
            className="flex-shrink-0 w-64 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{groupedLeads[stage.id]?.length || 0} leads</span>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {isDataLoading ? (
                <TableSkeleton rows={3} />
              ) : groupedLeads[stage.id]?.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Vazio</p>
              ) : (
                groupedLeads[stage.id].map(lead => {
                  const consultant = teamMembers.find(m => m.id === lead.consultant_id || m.authUserId === lead.consultant_id);
                  return (
                    <div 
                      key={lead.id} 
                      onClick={() => handleEditLead(lead)} 
                      className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900 dark:text-white leading-tight">{lead.name}</p>
                        <button onClick={(e) => handleDeleteLead(e, lead)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex items-center font-bold text-brand-600 dark:text-brand-400">
                          <UserRound className="w-3 h-3 mr-1" /> {consultant?.name || 'Não atribuído'}
                        </div>
                        {lead.data.origin && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {lead.data.origin}</div>}
                        {stage.is_won ? (
                          <div className="text-green-600 font-bold">{formatCurrency(lead.soldCreditValue || 0)}</div>
                        ) : lead.proposalValue ? (
                          <div className="text-purple-600 font-bold">{formatCurrency(lead.proposalValue)}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          lead={editingLead}
          crmFields={crmFields.filter(f => f.is_active)}
        />
      )}

      {isTasksModalOpen && selectedLeadForTasks && (
        <LeadTasksModal
          isOpen={isTasksModalOpen}
          onClose={() => setIsTasksModalOpen(false)}
          lead={selectedLeadForTasks}
        />
      )}

      {isProposalModalOpen && selectedLeadForProposal && (
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          lead={selectedLeadForProposal}
        />
      )}

      {isMarkAsSoldModalOpen && selectedLeadForSold && (
        <MarkAsSoldModal
          isOpen={isMarkAsSoldModalOpen}
          onClose={() => setIsMarkAsSoldModalOpen(false)}
          lead={selectedLeadForSold}
          onSaleSuccess={handleSaleSuccess}
        />
      )}

      {isMeetingModalOpen && selectedLeadForMeeting && (
        <ScheduleMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          lead={selectedLeadForMeeting}
        />
      )}

      {isImportModalOpen && (
        <ImportCrmLeadsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportLeads}
        />
      )}

      <SaleCelebrationModal
        isOpen={showCelebration}
        onClose={handleCloseCelebration}
        leadName={celebratedLeadName}
      />
    </div>
  );
};

export default CrmOverviewPage;