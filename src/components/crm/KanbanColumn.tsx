import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { CrmLead, CrmStage, CrmField } from '@/types';
import LeadCard from './LeadCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: CrmStage;
  leads: CrmLead[];
  crmFields: CrmField[];
  onAddLead: (stageId: string) => void;
  onEditLead: (lead: CrmLead) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, leads, crmFields, onAddLead, onEditLead }) => {
  const getStageColorClass = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case 'novo': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'contato': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
      case 'qualificação': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'proposta': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300';
      case 'negociação': return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300';
      case 'ganho': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'perdido': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="flex flex-col w-80 flex-shrink-0 bg-gray-50 dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
      <div className={`p-4 rounded-t-lg flex justify-between items-center ${getStageColorClass(stage.name)}`}>
        <h3 className="font-bold text-lg">{stage.name}</h3>
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-900/50 text-gray-800 dark:text-gray-200">
          {leads.length}
        </span>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-4 overflow-y-auto custom-scrollbar ${
              snapshot.isDraggingOver ? 'bg-brand-50 dark:bg-brand-900/10' : ''
            }`}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.8 : 1,
                      backgroundColor: snapshot.isDragging ? (snapshot.isDropAnimating ? 'transparent' : 'var(--color-brand-50)') : 'transparent',
                      boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                      transition: snapshot.isDropAnimating ? 'none' : 'background-color 0.2s ease',
                    }}
                  >
                    <LeadCard lead={lead} crmFields={crmFields} onEdit={onEditLead} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <button
              onClick={() => onAddLead(stage.id)}
              className="w-full flex items-center justify-center p-3 mt-3 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Lead
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;