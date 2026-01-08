import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, Edit2, Save, X, MapPin, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export const OriginConfig = () => {
  const { origins, addOrigin, deleteOrigin, resetOriginsToDefault } = useApp();
  
  const [newOriginName, setNewOriginName] = useState('');
  const [editingOrigin, setEditingOrigin] = useState<string | null>(null);
  const [editOriginName, setEditOriginName] = useState('');

  const handleAddOrigin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOriginName.trim()) {
      addOrigin(newOriginName.trim());
      setNewOriginName('');
      toast.success(`Origem "${newOriginName.trim()}" adicionada!`);
    } else {
      toast.error("O nome da origem não pode ser vazio.");
    }
  };

  const handleDeleteOrigin = (originToDelete: string) => {
    if (origins.length <= 1) {
      toast.error("É necessário manter pelo menos uma origem.");
      return;
    }
    if (window.confirm(`Tem certeza que deseja remover a origem "${originToDelete}"? Esta ação não pode ser desfeita e pode afetar candidatos existentes.`)) {
      deleteOrigin(originToDelete);
      toast.success(`Origem "${originToDelete}" removida!`);
    }
  };

  const handleReset = () => {
      if(confirm("Tem certeza que deseja restaurar as origens padrão? Todas as suas personalizações serão perdidas.")){
          resetOriginsToDefault();
          toast.success("Origens restauradas para o padrão!");
      }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Origens de Candidatos</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie as opções de origem para novos candidatos.</p>
          </div>
          <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition">
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Restaurar Padrão
          </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar Nova Origem</h2>
        <form onSubmit={handleAddOrigin} className="flex space-x-2">
          <input
            type="text"
            value={newOriginName}
            onChange={(e) => setNewOriginName(e.target.value)}
            placeholder="Nome da nova origem (Ex: Indicação, Prospecção)"
            className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
            required
          />
          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white">Origens Atuais</h2>
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {origins.length === 0 ? (
            <li className="p-6 text-center text-gray-400">Nenhuma origem configurada.</li>
          ) : (
            origins.map(origin => (
              <li key={origin} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{origin}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDeleteOrigin(origin)} className="p-2 text-gray-400 hover:text-red-500 rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};