import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmField } from '@/types';
import { Plus, Edit2, ToggleLeft, ToggleRight, CheckSquare, Square } from 'lucide-react';
import FieldModal from './FieldModal';

const LeadFieldsConfig = () => {
  const { crmFields, updateCrmField } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CrmField | null>(null);

  const handleAddNew = () => {
    setEditingField(null);
    setIsModalOpen(true);
  };

  const handleEdit = (field: CrmField) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  const handleToggleActive = (field: CrmField) => {
    updateCrmField(field.id, { is_active: !field.is_active });
  };

  const getTypeLabel = (type: CrmField['type']) => {
    switch (type) {
      case 'text': return 'Texto Curto';
      case 'longtext': return 'Texto Longo';
      case 'number': return 'Número';
      case 'select': return 'Seleção';
      default: return type;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Campos Personalizados do Lead</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Defina as informações que devem ser coletadas para cada lead.</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium text-sm">
          <Plus className="w-4 h-4" />
          <span>Novo Campo</span>
        </button>
      </div>

      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-4">Rótulo (Label)</th>
              <th className="p-4">Chave (Key)</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Obrigatório</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {crmFields.map(field => (
              <tr key={field.id} className={`group ${!field.is_active ? 'opacity-60' : ''}`}>
                <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{field.label}</td>
                <td className="p-4 font-mono text-xs text-gray-500">{field.key}</td>
                <td className="p-4">{getTypeLabel(field.type)}</td>
                <td className="p-4">{field.is_required ? <CheckSquare className="text-green-500" /> : <Square className="text-gray-300" />}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${field.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}>
                    {field.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleToggleActive(field)} className={`p-2 rounded-full ${field.is_active ? 'text-gray-400 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'}`} title={field.is_active ? 'Desativar' : 'Ativar'}>
                      {field.is_active ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleEdit(field)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <FieldModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          field={editingField}
        />
      )}
    </div>
  );
};

export default LeadFieldsConfig;