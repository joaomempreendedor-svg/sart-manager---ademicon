import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, Edit2, Save, X, MapPin, RotateCcw, Users, DollarSign } from 'lucide-react'; // Adicionado Users e DollarSign
import toast from 'react-hot-toast';

export const OriginConfig = () => {
  const { salesOrigins, hiringOrigins, addOrigin, deleteOrigin, resetOriginsToDefault } = useApp(); // ATUALIZADO
  
  const [newOriginName, setNewOriginName] = useState('');
  const [activeOriginType, setActiveOriginType] = useState<'sales' | 'hiring'>('sales'); // NOVO: Estado para o tipo de origem ativo

  const handleAddOrigin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOriginName.trim()) {
      addOrigin(newOriginName.trim(), activeOriginType); // Passa o tipo de origem
      setNewOriginName('');
      toast.success(`Origem "${newOriginName.trim()}" adicionada às origens de ${activeOriginType === 'sales' ? 'vendas' : 'contratação'}!`);
    } else {
      toast.error("O nome da origem não pode ser vazio.");
    }
  };

  const handleDeleteOrigin = (originToDelete: string) => {
    const currentOrigins = activeOriginType === 'sales' ? salesOrigins : hiringOrigins;
    if (currentOrigins.length <= 1) {
      toast.error("É necessário manter pelo menos uma origem.");
      return;
    }
    if (window.confirm(`Tem certeza que deseja remover a origem "${originToDelete}" das origens de ${activeOriginType === 'sales' ? 'vendas' : 'contratação'}? Esta ação não pode ser desfeita e pode afetar leads/candidatos existentes.`)) {
      deleteOrigin(originToDelete, activeOriginType); // Passa o tipo de origem
      toast.success(`Origem "${originToDelete}" removida!`);
    }
  };

  const handleReset = () => {
      if(confirm("Tem certeza que deseja restaurar as origens padrão? Todas as suas personalizações serão perdidas.")){
          resetOriginsToDefault();
          toast.success("Origens restauradas para o padrão!");
      }
  }

  const currentOriginsList = activeOriginType === 'sales' ? salesOrigins : hiringOrigins;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Origens</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie as opções de origem para leads de vendas e candidatos de contratação.</p>
          </div>
          <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition mt-4 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Restaurar Padrão
          </button>
      </div>

      {/* NOVO: Seletor de Tipo de Origem */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex justify-center">
        <div className="flex space-x-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
          <button 
            onClick={() => setActiveOriginType('sales')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeOriginType === 'sales' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Origens de Vendas</span>
          </button>
          <button 
            onClick={() => setActiveOriginType('hiring')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeOriginType === 'hiring' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
          >
            <Users className="w-4 h-4" />
            <span>Origens de Contratação</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar Nova Origem ({activeOriginType === 'sales' ? 'Vendas' : 'Contratação'})</h2>
        <form onSubmit={handleAddOrigin} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="text"
            value={newOriginName}
            onChange={(e) => setNewOriginName(e.target.value)}
            placeholder={`Nome da nova origem (Ex: ${activeOriginType === 'sales' ? 'WhatsApp, Frio' : 'Indicação, LinkedIn'})`}
            className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
            required
          />
          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white">Origens Atuais ({activeOriginType === 'sales' ? 'Vendas' : 'Contratação'})</h2>
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {currentOriginsList.length === 0 ? (
            <li className="p-6 text-center text-gray-400">Nenhuma origem configurada para este tipo.</li>
          ) : (
            currentOriginsList.map(origin => (
              <li key={origin} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{origin}</span>
                </div>
                <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
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