import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Edit2, Trash2, Plus, ArrowUp, ArrowDown, Save, X, RotateCcw } from 'lucide-react';

export const GoalsConfig = () => {
  const { consultantGoalsStructure, addGoalItem, updateGoalItem, deleteGoalItem, moveGoalItem, resetGoalsToDefault } = useApp();
  
  const [editingItem, setEditingItem] = useState<{stageId: string, itemId: string} | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const startEdit = (stageId: string, itemId: string, currentLabel: string) => {
    setEditingItem({ stageId, itemId });
    setEditLabel(currentLabel);
  };

  const handleSaveEdit = () => {
    if (editingItem && editLabel.trim()) {
      updateGoalItem(editingItem.stageId, editingItem.itemId, editLabel);
      setEditingItem(null);
      setEditLabel('');
    }
  };

  const handleSaveNew = (stageId: string) => {
    if (newLabel.trim()) {
      addGoalItem(stageId, newLabel);
      setAddingToStage(null);
      setNewLabel('');
    }
  };

  const handleReset = () => {
      if(confirm("Tem certeza que deseja restaurar as metas padrão? Todas as suas personalizações serão perdidas.")){
          resetGoalsToDefault();
      }
  }

  const getBorderColor = (color: string) => {
      switch(color) {
          case 'blue': return 'border-blue-200 dark:border-blue-800';
          case 'green': return 'border-green-200 dark:border-green-800';
          case 'orange': return 'border-orange-200 dark:border-orange-800';
          case 'brown': return 'border-[#d7ccc8] dark:border-[#5d4037]';
          default: return 'border-gray-200 dark:border-slate-700';
      }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Metas do Consultor</h1>
            <p className="text-gray-500 dark:text-gray-400">Edite as metas, objetivos e itens de acompanhamento.</p>
          </div>
          <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition">
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Restaurar Padrão
          </button>
      </div>

      <div className="space-y-8">
        {consultantGoalsStructure.map((stage) => (
          <div key={stage.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${getBorderColor(stage.color)} shadow-sm overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${getBorderColor(stage.color)} bg-opacity-10 bg-gray-50 dark:bg-slate-700/50`}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stage.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stage.objective}</p>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {stage.items.map((item, index) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                  
                  {editingItem?.itemId === item.id ? (
                    <div className="flex-1 flex items-center space-x-2 mr-4">
                      <input 
                        type="text" 
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-1 text-sm focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingItem(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex-1 mr-4">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => moveGoalItem(stage.id, item.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveGoalItem(stage.id, item.id, 'down')}
                      disabled={index === stage.items.length - 1}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                    <button 
                      onClick={() => startEdit(stage.id, item.id, item.label)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm('Tem certeza que deseja remover esta meta?')) {
                          deleteGoalItem(stage.id, item.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-gray-50/50 dark:bg-slate-700/30">
                {addingToStage === stage.id ? (
                   <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Descrição da nova meta..."
                        className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSaveNew(stage.id)} 
                        className="px-3 py-2 bg-brand-600 text-white rounded text-sm font-medium hover:bg-brand-700"
                      >
                        Adicionar
                      </button>
                      <button 
                        onClick={() => setAddingToStage(null)} 
                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
                      >
                        Cancelar
                      </button>
                   </div>
                ) : (
                  <button 
                    onClick={() => setAddingToStage(stage.id)}
                    className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Meta
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};