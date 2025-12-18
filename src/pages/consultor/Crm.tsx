import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp, ListTodo, CalendarPlus, Send, DollarSign, Edit2, Trash2, XCircle } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal';
import { LeadTasksModal } from '@/components/crm/LeadTasksModal';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { ProposalModal } from '@/components/crm/ProposalModal';
import { SaleModal } from '@/components/crm/SaleModal';

// Dnd-kit imports
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  MeasuringStrategy,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { CrmLead } from '@/types';
import toast from 'react-hot-toast';

// Componente para o cartão de Lead arrastável
interface DraggableLeadCardProps {
  lead: CrmLead;
  onEdit: (lead: CrmLead) => void;
  onDelete: (e: React.MouseEvent, lead: CrmLead) => void;
  onOpenTasksModal: (e: React.MouseEvent, lead: CrmLead) => void;
  onOpenMeetingModal: (e: React.MouseEvent, lead: CrmLead) => void;
  onOpenProposalModal: (e: React.MouseEvent, lead: CrmLead) => void;
  onOpenSaleModal: (e: React.MouseEvent, lead: CrmLead) => void;
  onMarkAsLost: (e: React.MouseEvent, lead: CrmLead) => void;
}

const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({
  lead,
  onEdit,
  onDelete,
  onOpenTasksModal,
  onOpenMeetingModal,
  onOpenProposalModal,
  onOpenSaleModal,
  onMarkAsLost,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(lead)}
      className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-grab transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
            title="Editar Lead"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onDelete(e, lead)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            title="Excluir Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
        {lead.data.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {lead.data.phone}</div>}
        {lead.data.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {lead.data.email}</div>}
        {lead.data.origin && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {lead.data.origin}</div>}
        {lead.data.proposal_value && (
          <div className="flex items-center text-purple-700 dark:text-purple-300 font-semibold">
            <DollarSign className="w-3 h-3 mr-1" /> Proposta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.data.proposal_value)}
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-600 flex gap-2 justify-center flex-wrap">
        <button 
          onClick={(e) => onOpenTasksModal(e, lead)} 
          className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
          title="Tarefas"
        >
          <ListTodo className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => onOpenMeetingModal(e, lead)} 
          className="flex items-center justify-center w-7 h-7 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
          title="Agendar Reunião"
        >
          <CalendarPlus className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => onOpenProposalModal(e, lead)} 
          className="flex items-center justify-center w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
          title="Registrar Proposta"
        >
          <Send className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => onOpenSaleModal(e, lead)} 
          className="flex items-center justify-center w-7 h-7 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition"
          title="Registrar Venda"
        >
          <DollarSign className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => onMarkAsLost(e, lead)} 
          className="flex items-center justify-center w-7 h-7 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          title="Marcar como Perdido"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Novo componente para a coluna do Kanban
interface KanbanColumnProps {
  id: string; // Stage ID
  title: string;
  leadCount: number;
  totalValue: number;
  children: React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, leadCount, totalValue, children }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[220px] 2xl:max-w-[250px] bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full" // Adicionado h-full
    >
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{leadCount} leads</span>
          {(title.toLowerCase().includes('proposta enviada') || title.toLowerCase().includes('vendido')) && totalValue > 0 && (
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </span>
          )}
        </div>
      </div>
      <SortableContext items={[]} strategy={verticalListSortingStrategy}> {/* items will be passed to children */}
        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1"> {/* Removido max-h, adicionado flex-1 */}
          {children}
        </div>
      </SortableContext>
    </div>
  );
};


const CrmPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, isDataLoading, deleteCrmLead, updateCrmLead, updateCrmLeadStage } = useApp();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [selectedLeadForTasks, setSelectedLeadForTasks] = useState<CrmLead | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState<CrmLead | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedLeadForProposal, setSelectedLeadForProposal] = useState<CrmLead | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedLeadForSale, setSelectedLeadForSale] = useState<CrmLead | null>(null);

  // Dnd-kit state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px before drag starts
      },
    }),
    useSensor(KeyboardSensor, {})
  );

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
    if (!searchTerm) return consultantLeads;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return consultantLeads.filter(lead =>
      (lead.name && lead.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
      Object.values(lead.data || {}).some(value =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [consultantLeads, searchTerm]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, CrmLead[]> = {};
    pipelineStages.forEach(stage => {
      groups[stage.id] = filteredLeads.filter(lead => lead.stage_id === stage.id);
    });
    return groups;
  }, [pipelineStages, filteredLeads]);

  const stageTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pipelineStages.forEach(stage => {
      const leadsInStage = groupedLeads[stage.id] || [];
      const totalValue = leadsInStage.reduce((sum, lead) => {
        if (lead.data?.proposal_value) {
          return sum + (lead.data.proposal_value as number);
        }
        return sum;
      }, 0);
      totals[stage.id] = totalValue;
    });
    return totals;
  }, [pipelineStages, groupedLeads]);

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
        toast.error(`Erro ao excluir lead: ${error.message}`);
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

  const handleOpenProposalModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForProposal(lead);
    setIsProposalModalOpen(true);
  };

  const handleSaveProposal = async (leadId: string, proposalValue: number, proposalDate: string, proposalNotes?: string) => {
    const proposalSentStage = crmStages.find(s => s.name.toLowerCase().includes('proposta enviada') && s.is_active);

    if (!proposalSentStage) {
      toast.error("A etapa 'Proposta Enviada' não foi encontrada ou não está ativa. Por favor, configure-a nas configurações do CRM.");
      throw new Error("Etapa 'Proposta Enviada' não configurada.");
    }

    try {
      await updateCrmLead(leadId, {
        data: {
          ...crmLeads.find(l => l.id === leadId)?.data,
          proposal_value: proposalValue,
          proposal_date: proposalDate,
          proposal_notes: proposalNotes,
        }
      });
      await updateCrmLeadStage(leadId, proposalSentStage.id);
      toast.success("Proposta registrada e lead movido para 'Proposta Enviada'!");
    } catch (error: any) {
      console.error("Erro ao salvar proposta e mover lead:", error);
      toast.error(`Erro ao salvar proposta: ${error.message}`);
      throw error;
    }
  };

  const handleOpenSaleModal = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    setSelectedLeadForSale(lead);
    setIsSaleModalOpen(true);
  };

  const handleMarkAsLost = async (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja marcar o lead "${lead.name}" como PERDIDO?`)) {
      return;
    }

    const lostStage = crmStages.find(s => s.is_lost && s.is_active);

    if (!lostStage) {
      toast.error("A etapa 'Perdida' não foi encontrada ou não está ativa. Por favor, configure-a nas configurações do CRM.");
      return;
    }

    try {
      await updateCrmLeadStage(lead.id, lostStage.id);
      toast.success(`Lead "${lead.name}" marcado como PERDIDO!`);
    } catch (error: any) {
      console.error("Erro ao marcar lead como perdido:", error);
      toast.error(`Erro ao marcar lead como perdido: ${error.message}`);
    }
  };

  // Dnd-kit handlers
  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!active || !over) return;

    const draggedLeadId = active.id as string;
    const targetId = over.id as string;

    const draggedLead = consultantLeads.find(lead => lead.id === draggedLeadId);
    if (!draggedLead) return;

    // Determine the new stage ID
    let newStageId: string | undefined;

    // Prioritize dropping directly on a KanbanColumn (stage)
    if (pipelineStages.some(stage => stage.id === targetId)) {
      newStageId = targetId;
    } else {
      // If dropped on another lead, find the stage of that lead
      const targetLead = consultantLeads.find(lead => lead.id === targetId);
      if (targetLead) {
        newStageId = targetLead.stage_id;
      }
    }

    if (!newStageId) {
      console.warn("Could not determine new stage ID. No update.");
      setActiveDragId(null);
      return;
    }

    // Only update if the stage has actually changed
    if (draggedLead.stage_id !== newStageId) {
      try {
        await updateCrmLeadStage(draggedLeadId, newStageId);
        toast.success(`Lead "${draggedLead.name}" movido para a nova etapa!`);
      } catch (error: any) {
        console.error("Failed to update lead stage:", error);
        toast.error(`Erro ao mover o lead: ${error.message}`);
      }
    }
    setActiveDragId(null);
  };

  const getActiveDragLead = useMemo(() => {
    if (!activeDragId) return null;
    return consultantLeads.find(lead => lead.id === activeDragId);
  }, [activeDragId, consultantLeads]);


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
    <div className="p-8 h-full bg-gray-50 dark:bg-slate-900 flex flex-col"> {/* Alterado min-h-screen para h-full */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu CRM - {activePipeline.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus leads e acompanhe o funil de vendas.</p>
        </div>
        <div className="flex items-center space-x-4 flex-grow md:flex-grow-0 justify-end">
          <div className="relative flex-1 md:w-64">
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
            onClick={handleAddNewLead}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4 pb-4 flex-1 h-full"> {/* Adicionado h-full */}
          {pipelineStages.map(stage => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.name}
              leadCount={groupedLeads[stage.id]?.length || 0}
              totalValue={stageTotals[stage.id] || 0}
            >
              <SortableContext items={groupedLeads[stage.id]?.map(lead => lead.id) || []} strategy={verticalListSortingStrategy}>
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                  {groupedLeads[stage.id]?.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">Nenhum lead nesta etapa.</p>
                  ) : (
                    groupedLeads[stage.id]?.map(lead => (
                      <DraggableLeadCard
                        key={lead.id}
                        lead={lead}
                        onEdit={handleEditLead}
                        onDelete={handleDeleteLead}
                        onOpenTasksModal={handleOpenTasksModal}
                        onOpenMeetingModal={handleOpenMeetingModal}
                        onOpenProposalModal={handleOpenProposalModal}
                        onOpenSaleModal={handleOpenSaleModal}
                        onMarkAsLost={handleMarkAsLost}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        {createPortal(
          <DragOverlay>
            {activeDragId && getActiveDragLead ? (
              <DraggableLeadCard
                lead={getActiveDragLead}
                onEdit={handleEditLead}
                onDelete={handleDeleteLead}
                onOpenTasksModal={handleOpenTasksModal}
                onOpenMeetingModal={handleOpenMeetingModal}
                onOpenProposalModal={handleOpenProposalModal}
                onOpenSaleModal={handleOpenSaleModal}
                onMarkAsLost={handleMarkAsLost}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          lead={editingLead}
          crmFields={crmFields.filter(f => f.is_active)}
          consultantId={user?.id || ''}
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
          onSave={handleSaveProposal}
        />
      )}

      {isSaleModalOpen && selectedLeadForSale && (
        <SaleModal
          isOpen={isSaleModalOpen}
          onClose={() => setIsSaleModalOpen(false)}
          lead={selectedLeadForSale}
        />
      )}
    </div>
  );
};

export default CrmPage;