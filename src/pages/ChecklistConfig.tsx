import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Edit2, Trash2, Plus, ArrowUp, ArrowDown, Save, X, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';

export const ChecklistConfig = () => {
  const { checklistStructure, addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem, resetChecklistToDefault } = useApp();
  
  const [editingItem, setEditingItem] = useState<{stageId: string, itemId: string} | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editRole, setEditRole] = useState<'GESTOR' | 'SECRETARIA'>('GESTOR');

  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<'GESTOR' | 'SECRETARIA'>('GESTOR');

  const startEdit = (stageId: string, itemId: string, currentLabel: string, currentRole?: 'GESTOR' | 'SECRETARIA') => {
    setEditingItem({ stageId, itemId });
    setEditLabel(currentLabel);
    setEditRole(currentRole || 'GESTOR');
  };

  const handleSaveEdit = () => {
    if (editingItem && editLabel.trim()) {
      updateChecklistItem(editingItem.stageId, editingItem.itemId, { label: editLabel, responsibleRole: editRole });
      setEditingItem(null);
      setEditLabel('');
    }
  };

  const handleSaveNew = (stageId: string) => {
    if (newLabel.trim()) {
      addChecklistItem(stageId, newLabel, newRole);
      setAddingToStage(null);
      setNewLabel('');
      setNewRole('GESTOR');
    }
  };

  const handleReset = () => {
      if(confirm("Tem certeza que deseja restaurar o checklist padrão? Todas as suas personalizações de estrutura e mensagens serão perdidas.")){
          resetChecklistToDefault();
      }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Processo (Checklist)</h1>
            <p className="text-gray-500 dark:text-gray-400">Adicione, remova ou reordene as tarefas do checklist e defina os responsáveis.</p>
          </div>
          <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition">
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Restaurar Padrão
          </button>
      </div>

      <div className="space-y-8">
        {checklistStructure.map((stage) => (
          <div key={stage.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stage.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stage.description}</p>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {stage.items.map((item, index) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                  
                  {editingItem?.itemId === item.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mr-4 w-full">
                      <input 
                        type="text" 
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-1 text-sm focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                      />
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'GESTOR' | 'SECRETARIA')}
                        className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs rounded px-2 py-1"
                      >
                        <option value="GESTOR">Gestor</option>
                        <option value="SECRETARIA">Secretaria</option>
                      </select>
                      <div className="flex space-x-1">
                        <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingItem(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 mr-4 w-full flex items-center space-x-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
                      {item.responsibleRole && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.responsibleRole === 'SECRETARIA' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                            {item.responsibleRole}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-1 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                    <button 
                      onClick={() => moveChecklistItem(stage.id, item.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveChecklistItem(stage.id, item.id, 'down')}
                      disabled={index === stage.items.length - 1}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-900/20 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                    <button 
                      onClick={() => startEdit(stage.id, item.id, item.label, item.responsibleRole)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm('Tem certeza que deseja remover esta tarefa?')) {
                          deleteChecklistItem(stage.id, item.id);
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
                   <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <input 
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Nome da nova tarefa..."
                        className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                      />
                      <select 
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'GESTOR' | 'SECRETARIA')}
                        className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm rounded px-3 py-2"
                      >
                        <option value="GESTOR">Gestor</option>
                        <option value="SECRETARIA">Secretaria</option>
                      </select>
                      <div className="flex space-x-2">
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
                   </div>
                ) : (
                  <button 
                    onClick={() => setAddingToStage(stage.id)}
                    className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Tarefa
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