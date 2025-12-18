import React, { useState, useMemo } from 'react';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp, ListTodo, CalendarPlus, Send, DollarSign, Edit2, Trash2, XCircle, ChevronDown } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal';
import { LeadTasksModal } from '@/components/crm/LeadTasksModal';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { ProposalModal } from '@/components/crm/ProposalModal';
import { SaleModal } from '@/components/crm/SaleModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

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
  useDroppable, // Adicionado: Importação do useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { CrmLead, CrmStage, CrmField } from '@/types';
import toast from 'react-hot-toast';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  onChangeStage: (leadId: string, newStageId: string) => void;
  pipelineStages: CrmStage[];
  overlay?: boolean;
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
  onChangeStage,
  pipelineStages,
  overlay = false,
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
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(lead)}
      className={cn(
        "bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-grab transition-all group mb-3",
        overlay && "shadow-lg ring-2 ring-brand-500/50 !bg-white !dark:bg-slate-700"
      )}
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
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-600">
        <Select onValueChange={(newStageId) => onChangeStage(lead.id, newStageId)} value={lead.stage_id}>
          <SelectTrigger className="w-full h-8 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-600">
            <SelectValue placeholder="Mover para..." />
          </SelectTrigger>
          <SelectContent className="bg-white text-gray-900 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700">
            {pipelineStages.map(stage => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Componente para a coluna do Kanban
interface KanbanColumnProps {
  id: string; // Stage ID
  title: string;
  leadCount: number;
  totalValue: number;
  leadsInStageIds: string[]; // IDs dos leads nesta etapa para o SortableContext
  children: React.ReactNode;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, leadCount, totalValue, leadsInStageIds, children }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className="min-w-[220px] 2xl:max-w-[250px] bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full"
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
      <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 overflow-hidden">
        <SortableContext 
          key={id}
          items={leadsInStageIds} 
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  leads: CrmLead[];
  pipelineStages: CrmStage[];
  crmFields: CrmField[];
  consultantId: string; // ID do consultor cujos leads estão sendo exibidos
  onUpdateLeadStage: (leadId: string, newStageId: string) => Promise<void>;
  onAddLead: (leadData: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>) => Promise<CrmLead>;
  onUpdateLead: (id: string, updates: Partial<CrmLead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  pipelineStages,
  crmFields,
  consultantId,
  onUpdateLeadStage,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
}) => {
  const { crmLeads, crmStages } = useApp(); // Usar crmLeads e crmStages do AppContext para handlers
  const { user } = useAuth();

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

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return leads.filter(lead =>
      (lead.name && lead.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
      Object.values(lead.data || {}).some(value =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [leads, searchTerm]);

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
        await onDeleteLead(lead.id);
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
      await onUpdateLead(leadId, {
        data: {
          ...crmLeads.find(l => l.id === leadId)?.data,
          proposal_value: proposalValue,
          proposal_date: proposalDate,
          proposal_notes: proposalNotes,
        }
      });
      await onUpdateLeadStage(leadId, proposalSentStage.id);
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
      await onUpdateLeadStage(lead.id, lostStage.id);
      toast.success(`Lead "${lead.name}" marcado como PERDIDO!`);
    } catch (error: any) {
      console.error("Erro ao marcar lead como perdido:", error);
      toast.error(`Erro ao marcar lead como perdido: ${error.message}`);
    }
  };

  const handleChangeStageFromSelect = async (leadId: string, newStageId: string) => {
    const leadToUpdate = leads.find(lead => lead.id === leadId);
    if (!leadToUpdate) {
      toast.error("Lead não encontrado.");
      return;
    }
    if (leadToUpdate.stage_id === newStageId) {
      return;
    }
    try {
      await onUpdateLeadStage(leadId, newStageId);
      toast.success(`Lead "${leadToUpdate.name}" movido para a nova etapa!`);
    } catch (error: any) {
      console.error("Erro ao mover o lead via select:", error);
      toast.error(`Erro ao mover o lead: ${error.message}`);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!active || !over) {
      setActiveDragId(null);
      return;
    }

    const draggedLeadId = active.id as string;
    const draggedLead = leads.find(lead => lead.id === draggedLeadId);
    if (!draggedLead) {
      setActiveDragId(null);
      return;
    }

    let newStageId: string | undefined;
    const isValidStageId = (id: string) => pipelineStages.some(stage => stage.id === id);

    if (over.id && isValidStageId(over.id as string)) {
      newStageId = over.id as string;
    } else if (over.data?.current?.sortable?.containerId && isValidStageId(over.data.current.sortable.containerId as string)) {
      newStageId = over.data.current.sortable.containerId as string;
    } else if (over.data?.current?.droppable?.id && isValidStageId(over.data.current.droppable.id as string)) {
      newStageId = over.data.current.droppable.id as string;
    }

    if (!newStageId) {
      setActiveDragId(null);
      return;
    }

    if (draggedLead.stage_id !== newStageId) {
      try {
        await onUpdateLeadStage(draggedLeadId, newStageId);
        toast.success(`Lead "${draggedLead.name}" movido para a nova etapa!`);
      } catch (error: any) {
        toast.error(`Erro ao mover o lead: ${error.message}`);
      }
    }
    setActiveDragId(null);
  };

  const getActiveDragLead = useMemo(() => {
    if (!activeDragId) return null;
    return leads.find(lead => lead.id === activeDragId);
  }, [activeDragId, leads]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
          {user?.role === 'CONSULTOR' && ( // Apenas consultores podem adicionar leads
            <button
              onClick={handleAddNewLead}
              className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Lead</span>
            </button>
          )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4 pb-4 flex-1 h-full">
          {pipelineStages.map(stage => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.name}
              leadCount={groupedLeads[stage.id]?.length || 0}
              totalValue={stageTotals[stage.id] || 0}
              leadsInStageIds={groupedLeads[stage.id]?.map(lead => lead.id) || []}
            >
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
                    onChangeStage={handleChangeStageFromSelect}
                    pipelineStages={pipelineStages}
                  />
                ))
              )}
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
                onChangeStage={handleChangeStageFromSelect}
                pipelineStages={pipelineStages}
                overlay={true}
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
          consultantId={consultantId}
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