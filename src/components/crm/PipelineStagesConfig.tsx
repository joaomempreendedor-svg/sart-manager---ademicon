import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmStage } from '@/types';
import { Plus, Edit2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, CheckCircle, XCircle, Trophy, Skull, Trash2 } from 'lucide-react';
import StageModal from './StageModal';
import { Button } from '@/components/ui/button'; // Import Button component

const PipelineStagesConfig = () => {
  const { crmPipelines, crmStages, updateCrmStage, updateCrmStageOrder, deleteCrmStage } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<CrmStage | null>(null);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages.filter(s => s.pipeline_id === activePipeline.id);
  }, [crmStages, activePipeline]);

  const handleAddNew = () => {
    setEditingStage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (stage: CrmStage) => {
    setEditingStage(stage);
    setIsModalOpen(true);
  };

  const handleToggleActive = (stage: CrmStage) => {
    updateCrmStage(stage.id, { is_active: !stage.is_active });
  };

  const handleDelete = async (stage: CrmStage) => {
    if (window.confirm(`Tem certeza que deseja excluir a etapa "${stage.name}"? Todos os leads nesta etapa ficarão sem etapa definida. Esta ação não pode ser desfeita.`)) {
      try {
        await deleteCrmStage(stage.id);
      } catch (error: any) {
        alert(`Erro ao excluir etapa: ${error.message}`);
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newStages = [...pipelineStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === newStages.length - 1)) {
      return; // Cannot move further in this direction
    }

    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    try {
      await updateCrmStageOrder(newStages);
    } catch (error: any) {
      console.error("Erro ao reordenar etapas:", error);
      alert(`Erro ao reordenar etapas: ${error.message || 'Verifique o console para mais detalhes.'}`);
    }
  };

  if (!activePipeline) {
    return <div className="text-center p-8 bg-gray-50 dark:bg-slate-800 rounded-lg">Nenhum pipeline de vendas encontrado.</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Etapas do Pipeline: {activePipeline.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Arraste para reordenar, edite ou adicione novas etapas ao seu funil.</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium text-sm mt-4 sm:mt-0">
          <Plus className="w-4 h-4" />
          <span>Nova Etapa</span>
        </Button>
      </div>

      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
          {pipelineStages.map((stage, index) => (
            <li key={stage.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between group ${!stage.is_active ? 'bg-gray-50 dark:bg-slate-800/50 opacity-60' : ''}`}>
              <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                <div className="flex flex-col space-y-1">
                  <Button variant="ghost" size="sm" onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(index, 'down')} disabled={index === pipelineStages.length - 1} className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{stage.name}</p>
                  <div className="flex items-center space-x-2 text-xs mt-1">
                    {stage.is_won && <span className="flex items-center text-green-600"><Trophy className="w-3 h-3 mr-1"/> Ganha</span>}
                    {stage.is_lost && <span className="flex items-center text-red-600"><Skull className="w-3 h-3 mr-1"/> Perdida</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0 flex-wrap justify-end">
                <Button 
                  variant={stage.is_active ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleToggleActive(stage)} 
                  className={`px-3 py-1.5 text-xs font-medium ${stage.is_active ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 border-gray-300 dark:border-slate-600'}`}
                  title={stage.is_active ? 'Desativar Etapa' : 'Ativar Etapa'}
                >
                  {stage.is_active ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                  <span>{stage.is_active ? 'Ativa' : 'Inativa'}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(stage)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full"><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(stage)} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isModalOpen && (
        <StageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stage={editingStage}
          pipelineId={activePipeline.id}
          existingStagesCount={pipelineStages.length}
        />
      )}
    </div>
  );
};

export default PipelineStagesConfig;