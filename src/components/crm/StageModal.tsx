import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmStage } from '@/types';
import { X, Save, Loader2 } from 'lucide-react';

interface StageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: CrmStage | null;
  pipelineId: string;
  existingStagesCount: number;
}

const StageModal: React.FC<StageModalProps> = ({ isOpen, onClose, stage, pipelineId, existingStagesCount }) => {
  const { addCrmStage, updateCrmStage } = useApp();
  const [name, setName] = useState('');
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setIsWon(stage.is_won);
      setIsLost(stage.is_lost);
    } else {
      setName('');
      setIsWon(false);
      setIsLost(false);
    }
  }, [stage, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      if (stage) {
        await updateCrmStage(stage.id, { name, is_won: isWon, is_lost: isLost });
      } else {
        await addCrmStage({
          pipeline_id: pipelineId,
          name,
          order_index: existingStagesCount,
          is_active: true,
          is_won: isWon,
          is_lost: isLost,
        });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save stage:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg">{stage ? 'Editar Etapa' : 'Nova Etapa'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Etapa</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={isWon} onChange={e => setIsWon(e.target.checked)} className="h-4 w-4 rounded" />
                <span>Marcar como etapa de "Ganha"</span>
              </label>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={isLost} onChange={e => setIsLost(e.target.checked)} className="h-4 w-4 rounded" />
                <span>Marcar como etapa de "Perdida"</span>
              </label>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border rounded-lg mr-2">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StageModal;