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
import { SaleCelebrationModal } from '@/components/SaleCelebrationModal'; // NOVO: Importar o modal de celebração
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrmLead, LeadTask } from '@/types';
import { useLocation } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ConsultorCrmPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, teamMembers, isDataLoading, deleteCrmLead, updateCrmLead, addCrmLead, origins, leadTasks } = useApp();
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

  // Filtros de Data Padrão: Mês Atual
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false); // NOVO: Estado para o modal de celebração
  const [celebratedLeadName, setCelebratedLeadName] = useState(''); // NOVO: Nome do lead para a celebração

  const location = useLocation();

  useEffect(() => {
    if (location.state?.highlightLeadId) {
      const leadToHighlight = crmLeads.filter(lead => lead.consultant_id === user?.id).find(l => l.id === location.state.highlightLeadId);
      if (leadToHighlight) {
        setSelectedLeadForTasks(leadToHighlight);
        setIsTasksModalOpen(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, crmLeads, user]);


  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const consultantLeads = useMemo(() => {
    if (!user) return [];
    return crmLeads.filter(lead => lead.consultant_id === user.id);
  }, [crmLeads, user]);

  const filteredLeads = useMemo(() => {
    let currentLeads = consultantLeads;

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
        // LÓGICA DE DATA DE REFERÊNCIA: Prioriza Data da Venda, senão usa Data de Criação
        const referenceDate = lead.sale_date ? new Date(lead.sale_date + 'T00:00:00') : new Date(lead.created_at); // Usando snake_case
        
        const matchesStart = !start || referenceDate >= start;
        const matchesEnd = !end || referenceDate <= end;
        return matchesStart && matchesEnd;
      });
    }

    return currentLeads;
  }, [consultantLeads, searchTerm, filterStartDate, filterEndDate]);

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
    if (!user) return;

    const wonStage = crmStages.find(s => s.pipeline_id === activePipeline?.id && s.is_won);
    if (!wonStage) {
      alert("Nenhuma etapa de 'Ganha' configurada no pipeline. Por favor, configure-a nas configurações do CRM.");
      return;
    }

    const currentLeadStage = crmStages.find(s => s.id === lead.stage_id);
    if (currentLeadStage?.is_won) {
      alert("Este lead já está na etapa de 'Ganha'.");
      return;
    }
    if (currentLeadStage?.is_lost) {
      alert("Este lead está na etapa de 'Perdida' e não pode ser marcado como 'Ganha'.");
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
    if (!user) return;
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
    if (!leadId || !user) return;

    const leadToUpdate = crmLeads.find(l => l.id === leadId);
    if (!leadToUpdate) return;

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

  const handleSaleSuccess = (leadName: string) => { // NOVO: Passar o handler de sucesso
    setCelebratedLeadName(leadName);
    setShowCelebration(true);
  };

  const handleCloseCelebration = () => { // NOVO: Handler para fechar a celebração
    setShowCelebration(false);
    setCelebratedLeadName('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters = searchTerm || filterStartDate || filterEndDate;

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (isAuthLoading || isDataLoading) {
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
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Nenhum pipeline de vendas ativo ou etapas configuradas. Por favor, entre em contato com seu gestor.
        </p>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <TrendingUp className="mx-auto w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Seu gestor precisa configurar o pipeline de vendas e as etapas para que você possa gerenciar seus leads aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu CRM de Vendas - {activePipeline.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus leads e acompanhe o funil de vendas.</p>
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
          <ExportCrmLeadsButton
            leads={filteredLeads}
            crmFields={crmFields}
            crmStages={crmStages}
            teamMembers={teamMembers}
            fileName="leads_crm_consultor"
          />
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition font-medium flex-shrink-0"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Importar Leads</span>
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
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar por Período</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período de (Criação/Venda)</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período até (Criação/Venda)</label>
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

      <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
        {pipelineStages.map(stage => (
          <div 
            key={stage.id} 
            className="flex-shrink-0 w-56 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                {stage.name.toLowerCase().includes('proposta') && <Send className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />}
                {stage.name}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{groupedLeads[stage.id]?.length || 0} leads</span>
              {stage.name.toLowerCase().includes('proposta') && (
                <div className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">
                  Total Propostas (Mês): {formatCurrency(
                    groupedLeads[stage.id].reduce((sum, lead) => {
                      if (lead.proposal_value !== undefined && lead.proposal_value !== null && lead.proposal_closing_date) { // Usando snake_case
                        const proposalDate = new Date(lead.proposal_closing_date + 'T00:00:00'); // Usando snake_case
                        if (proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd) {
                          return sum + (lead.proposal_value || 0); // Usando snake_case
                        }
                      }
                      return sum;
                    }, 0)
                  )}
                </div>
              )}
              {stage.is_won && (
                <div className="mt-1 text-sm font-bold text-green-700 dark:text-green-300">
                  Total Vendido: {formatCurrency(
                    groupedLeads[stage.id].reduce((sum, lead) => {
                      return sum + (lead.sold_credit_value || 0); // Usando snake_case
                    }, 0)
                  )}
                </div>
              )}
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {isDataLoading ? ( // Adicionar esqueleto de carregamento aqui
                <TableSkeleton rows={3} />
              ) : groupedLeads[stage.id]?.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Nenhum lead nesta etapa.</p>
              ) : (
                groupedLeads[stage.id].map(lead => {
                  const currentLeadStage = crmStages.find(s => s.id === lead.stage_id);
                  const isWonStage = currentLeadStage?.is_won;
                  const isLostStage = currentLeadStage?.is_lost;
                  const canOpenProposalModal = !isWonStage && !isLostStage;
                  const canMarkAsWon = !isWonStage && !isLostStage;
                  const consultant = teamMembers.find(member => member.id === lead.consultant_id);

                  const now = new Date();
                  const nextMeeting = leadTasks
                    .filter(task => task.lead_id === lead.id && task.type === 'meeting' && !task.is_completed && task.meeting_start_time && new Date(task.meeting_start_time).getTime() > now.getTime())
                    .sort((a, b) => new Date(a.meeting_start_time!).getTime() - new Date(b.meeting_start_time!).getTime())[0];

                  return (
                    <div 
                      key={lead.id} 
                      onClick={() => handleEditLead(lead)} 
                      className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                        <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }} 
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                            title="Editar Lead"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteLead(e, lead)} 
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                            title="Excluir Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {consultant && <div className="flex items-center"><UserRound className="w-3 h-3 mr-1" /> Consultor: {consultant.name}</div>}
                        {lead.data.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {lead.data.phone}</div>}
                        {lead.data.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {lead.data.email}</div>}
                        {lead.data.origin && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {lead.data.origin}</div>}
                        
                        {nextMeeting && (
                          <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold mt-2">
                            <Calendar className="w-3 h-3 mr-1" /> {new Date(nextMeeting.meeting_start_time!).toLocaleDateString('pt-BR')}
                            <Clock className="w-3 h-3 ml-2 mr-1" /> {new Date(nextMeeting.meeting_start_time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        {isWonStage ? (
                          lead.sold_credit_value !== undefined && lead.sold_credit_value !== null ? ( // Usando snake_case
                            <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Vendido: {formatCurrency(lead.sold_credit_value)} {/* Usando snake_case */}
                              {lead.sale_date && ( // Usando snake_case
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                                  (em {new Date(lead.sale_date + 'T00:00:00').toLocaleDateString('pt-BR')}) {/* Usando snake_case */}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Vendido (valor não informado)
                            </div>
                          )
                        ) : (
                          lead.proposal_value !== undefined && lead.proposal_value !== null ? (
                            <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold">
                              <DollarSign className="w-3 h-3 mr-1" /> Proposta: {formatCurrency(lead.proposal_value)} {/* Usando snake_case */}
                              {lead.proposal_closing_date && ( // Usando snake_case
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                                  (até {new Date(lead.proposal_closing_date + 'T00:00:00').toLocaleDateString('pt-BR')}) {/* Usando snake_case */}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400 dark:text-gray-500">
                              <DollarSign className="w-3 h-3 mr-1" /> Sem proposta
                            </div>
                          )
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-600">
                        <Select
                          value={lead.stage_id}
                          onValueChange={(newStageId) => handleStageChange(lead.id, newStageId)}
                        >
                          <SelectTrigger 
                            className="w-full h-auto py-1.5 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue placeholder="Mover para..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            {pipelineStages.map(stageOption => (
                              <SelectItem key={stageOption.id} value={stageOption.id}>
                                {stageOption.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={(e) => handleOpenTasksModal(e, lead)} className="flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                          <ListTodo className="w-3 h-3 mr-1" /> Tarefas
                        </button>
                        <button onClick={(e) => handleOpenMeetingModal(e, lead)} className="flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-blue-900/30 transition">
                          <CalendarPlus className="w-3 h-3 mr-1" /> Reunião
                        </button>
                        <button 
                          onClick={(e) => handleOpenProposalModal(e, lead)} 
                          className={`flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs transition ${canOpenProposalModal ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 cursor-not-allowed opacity-70'}`}
                          disabled={!canOpenProposalModal}
                        >
                          <Send className="w-3 h-3 mr-1" /> Proposta
                        </button>
                        <button 
                          onClick={(e) => handleMarkAsWon(e, lead)} 
                          className={`flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs transition ${canMarkAsWon ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 cursor-not-allowed opacity-70'}`}
                          disabled={!canMarkAsWon}
                        >
                          <DollarSign className="w-3 h-3 mr-1" /> Vendido
                        </button>
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
          assignedConsultantId={user?.id || null}
        />
      )}

      {isTasksModalOpen && selectedLeadForTasks && (
        <LeadTasksModal
          isOpen={isTasksModalOpen}
          onClose={() => setIsTasksModalOpen(false)}
          lead={selectedLeadForTasks}
          highlightedTaskId={location.state?.highlightLeadTaskId}
        />
      )}

      {isProposalModalOpen && selectedLeadForProposal && (
        <ProposalModal
          isOpen={isProposalModalOpen}
        onClose={() => {
          console.log("ProposalModal onClose called");
          setIsProposalModalOpen(false);
        }}
          lead={selectedLeadForProposal}
        />
      )}

      {isMarkAsSoldModalOpen && selectedLeadForSold && (
        <MarkAsSoldModal
          isOpen={isMarkAsSoldModalOpen}
          onClose={() => setIsMarkAsSoldModalOpen(false)}
          lead={selectedLeadForSold}
          onSaleSuccess={handleSaleSuccess} // NOVO: Passar o handler de sucesso
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
          crmFields={crmFields}
          consultants={teamMembers}
          stages={crmStages}
        />
      )}

      {/* NOVO: Renderizar o modal de celebração */}
      <SaleCelebrationModal
        isOpen={showCelebration}
        onClose={handleCloseCelebration}
        leadName={celebratedLeadName}
      />
    </div>
  );
};

export default ConsultorCrmPage;