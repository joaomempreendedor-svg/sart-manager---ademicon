import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp, ListTodo, CalendarPlus, Send, DollarSign, Edit2, Trash2, Users, CheckCircle2 } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal';
import { LeadTasksModal } from '@/components/crm/LeadTasksModal';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { ProposalModal } from '@/components/crm/ProposalModal'; // Importar o novo modal de proposta
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

const CrmOverviewPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, teamMembers, isDataLoading, deleteCrmLead, updateCrmLeadStage } = useApp();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [selectedLeadForTasks, setSelectedLeadForTasks] = useState<CrmLead | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState<CrmLead | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false); // NOVO: Estado para o modal de proposta
  const [selectedLeadForProposal, setSelectedLeadForProposal] = useState<CrmLead | null>(null); // NOVO: Lead selecionado para proposta
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null); // Novo estado para filtrar por consultor

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

  const allCrmLeads = useMemo(() => {
    // Gestores/Admins veem todos os leads associados ao seu crmOwnerUserId
    // O filtro por user_id já é feito no AppContext para crmLeads
    return crmLeads;
  }, [crmLeads]);

  const filteredLeads = useMemo(() => {
    let currentLeads = allCrmLeads;

    if (selectedConsultantId) {
      currentLeads = currentLeads.filter(lead => lead.consultant_id === selectedConsultantId);
    }

    if (!searchTerm) return currentLeads;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return currentLeads.filter(lead =>
      (lead.name && lead.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
      Object.values(lead.data || {}).some(value =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [allCrmLeads, searchTerm, selectedConsultantId]);

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

  const handleOpenMeetingModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForMeeting(lead);
    setIsMeetingModalOpen(true);
  };

  // NOVO: Função para abrir o modal de proposta
  const handleOpenProposalModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForProposal(lead);
    setIsProposalModalOpen(true);
  };

  const handleMarkAsWon = async (e: React.MouseEvent, lead: CrmLead) => {
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

    if (window.confirm(`Tem certeza que deseja marcar o lead "${lead.name}" como GANHO e movê-lo para a etapa "${wonStage.name}"?`)) {
      try {
        await updateCrmLeadStage(lead.id, wonStage.id);
        alert(`Lead "${lead.name}" marcado como GANHO!`);
      } catch (error: any) {
        alert(`Erro ao marcar lead como ganho: ${error.message}`);
      }
    }
  };

  const handleStageChange = async (leadId: string, newStageId: string) => {
    if (!user) return;
    try {
      await updateCrmLeadStage(leadId, newStageId);
    } catch (error: any) {
      alert(`Erro ao mover lead: ${error.message}`);
    }
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!activePipeline || pipelineStages.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">CRM - Funil de Vendas</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Nenhum pipeline de vendas ativo ou etapas configuradas. Por favor, configure as etapas do CRM.
        </p>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <TrendingUp className="mx-auto w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Vá para "Configurações do CRM" na barra lateral para criar seu pipeline e etapas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral do CRM - {activePipeline.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie leads de todos os consultores e acompanhe o funil de vendas.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <div className="relative flex-1 w-full sm:w-64">
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
          <div className="w-full sm:w-48">
            <Select 
              value={selectedConsultantId || 'all'} 
              onValueChange={(value) => setSelectedConsultantId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-800 dark:text-white dark:border-slate-600">
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
          <button
            onClick={handleAddNewLead}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 space-x-6 custom-scrollbar">
        {pipelineStages.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-80 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                {stage.name.toLowerCase().includes('proposta') && <Send className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />}
                {stage.name}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{groupedLeads[stage.id]?.length || 0} leads</span>
              {stage.name.toLowerCase().includes('proposta') && (
                <div className="mt-1 text-sm font-bold text-purple-700 dark:text-purple-300">
                  Total Propostas: {formatCurrency(
                    groupedLeads[stage.id].reduce((sum, lead) => {
                      console.log(`Lead ${lead.name} in stage ${stage.name}: proposalValue = ${lead.proposalValue}`); // DEBUG LOG
                      return sum + (lead.proposalValue || 0);
                    }, 0)
                  )}
                </div>
              )}
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {groupedLeads[stage.id]?.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Nenhum lead nesta etapa.</p>
              ) : (
                groupedLeads[stage.id].map(lead => {
                  const consultant = teamMembers.find(m => m.id === lead.consultant_id);
                  const currentLeadStage = crmStages.find(s => s.id === lead.stage_id);
                  const isWonStage = currentLeadStage?.is_won;
                  const isLostStage = currentLeadStage?.is_lost;
                  const canOpenProposalModal = !isWonStage && !isLostStage;
                  const canMarkAsWon = !isWonStage && !isLostStage;

                  console.log(`[Card Render] Lead: ${lead.name}, ProposalValue: ${lead.proposalValue}, ProposalClosingDate: ${lead.proposalClosingDate}`); // DEBUG LOG

                  return (
                    <div key={lead.id} onClick={() => handleEditLead(lead)} className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        {consultant && <div className="flex items-center"><Users className="w-3 h-3 mr-1" /> {consultant.name}</div>}
                        {lead.data.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {lead.data.phone}</div>}
                        {lead.data.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {lead.data.email}</div>}
                        {lead.data.origin && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {lead.data.origin}</div>}
                        
                        {lead.proposalValue && lead.proposalValue > 0 ? ( // Adicionado verificação > 0
                          isWonStage ? (
                            <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Vendido: {formatCurrency(lead.proposalValue)}
                            </div>
                          ) : (
                            <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold">
                              <DollarSign className="w-3 h-3 mr-1" /> Proposta: {formatCurrency(lead.proposalValue)}
                              {lead.proposalClosingDate && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                                  (até {new Date(lead.proposalClosingDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center text-gray-400 dark:text-gray-500">
                            <DollarSign className="w-3 h-3 mr-1" /> Sem proposta
                          </div>
                        )}
                      </div>
                      {/* Seletor de Estágio */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-600">
                        <Select
                          value={lead.stage_id}
                          onValueChange={(newStageId) => handleStageChange(lead.id, newStageId)}
                          onOpenChange={() => {}} // Adicionado para evitar propagação
                        >
                          <SelectTrigger 
                            className="w-full h-auto py-1.5 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-600"
                            onClick={(e) => e.stopPropagation()} // Reintroduzido
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
                        <button onClick={(e) => handleOpenMeetingModal(e, lead)} className="flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition">
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
                          className={`flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs transition ${canOpenProposalModal ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 cursor-not-allowed opacity-70'}`}
                          disabled={!canOpenProposalModal}
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
          assignedConsultantId={selectedConsultantId || user?.id || null}
        />
      )}

      {isTasksModalOpen && selectedLeadForTasks && (
        <LeadTasksModal
          isOpen={isTasksModalOpen}
          onClose={() => setIsTasksModalOpen(false)}
          lead={selectedLeadForTasks}
        />
      )}

      {isMeetingModalOpen && selectedLeadForMeeting && (
        <ScheduleMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          lead={selectedLeadForMeeting}
        />
      )}

      {isProposalModalOpen && selectedLeadForProposal && (
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          lead={selectedLeadForProposal}
        />
      )}
    </div>
  );
};

export default CrmOverviewPage;