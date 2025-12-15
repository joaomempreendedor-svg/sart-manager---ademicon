import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DragDropContext, DropResult, Droppable } from 'react-beautiful-dnd';
import KanbanColumn from '@/components/crm/KanbanColumn';
import LeadModal from '@/components/crm/LeadModal';
import { CrmLead, CrmStage } from '@/types';
import { Plus, Loader2 } from 'lucide-react';

const CrmPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmFields, crmLeads, updateCrmLead, isDataLoading } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [initialStageIdForNewLead, setInitialStageIdForNewLead] = useState<string | undefined>(undefined);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(stage => stage.pipeline_id === activePipeline.id && stage.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, CrmLead[]> = {};
    pipelineStages.forEach(stage => {
      grouped[stage.id] = [];
    });

    // Filter leads for the current consultant only
    const consultantLeads = crmLeads.filter(lead => lead.consultant_id === user?.id);

    consultantLeads.forEach(lead => {
      if (grouped[lead.stage_id]) {
        grouped[lead.stage_id].push(lead);
      } else {
        // If a lead has a stage_id that is not in the active pipeline stages,
        // it might be an inactive stage or an error. We can put it in the first active stage
        // or a 'misc' category, but for now, let's just ignore it or put it in the first stage.
        if (pipelineStages.length > 0) {
          grouped[pipelineStages[0].id].push(lead);
        }
      }
    });
    return grouped;
  }, [crmLeads, pipelineStages, user]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const draggedLead = crmLeads.find(lead => lead.id === draggableId);
    if (!draggedLead) return;

    // Update the lead's stage_id in the database
    if (draggedLead.stage_id !== destination.droppableId) {
      await updateCrmLead(draggedLead.id, { stage_id: destination.droppableId });
    }
    // The `crmLeads` state will be updated by `updateCrmLead` and `leadsByStage` will re-memoize.
    // No need to manually reorder within the local state for now, as the backend is the source of truth.
  }, [crmLeads, updateCrmLead]);

  const handleAddLead = (stageId?: string) => {
    setEditingLead(null);
    setInitialStageIdForNewLead(stageId);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: CrmLead) => {
    setEditingLead(lead);
    setInitialStageIdForNewLead(undefined); // Not relevant for editing
    setIsModalOpen(true);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!activePipeline) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Nenhum pipeline de vendas ativo encontrado. Por favor, configure um pipeline na seção de Gestor.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meu CRM - Funil de Vendas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie seus leads no pipeline "{activePipeline.name}".</p>
        </div>
        <button
          onClick={() => handleAddLead()}
          className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lead</span>
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex overflow-x-auto p-6 space-x-6 custom-scrollbar">
          {pipelineStages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] || []}
              crmFields={crmFields.filter(f => f.is_active)}
              onAddLead={handleAddLead}
              onEditLead={handleEditLead}
            />
          ))}
        </div>
      </DragDropContext>

      {isModalOpen && (
        <LeadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          lead={editingLead}
          initialStageId={initialStageIdForNewLead}
        />
      )}
    </div>
  );
};

export default CrmPage;