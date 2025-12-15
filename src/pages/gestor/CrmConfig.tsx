import React, { useState } from 'react';
import { SlidersHorizontal, ListChecks } from 'lucide-react';
import PipelineStagesConfig from '@/components/crm/PipelineStagesConfig';
import LeadFieldsConfig from '@/components/crm/LeadFieldsConfig';

const CrmConfigPage = () => {
  const [activeTab, setActiveTab] = useState<'stages' | 'fields'>('stages');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações do CRM</h1>
        <p className="text-gray-500 dark:text-gray-400">Personalize as etapas do funil de vendas e os campos dos leads.</p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('stages')}
          className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'stages'
              ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Etapas do Pipeline</span>
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'fields'
              ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Campos do Lead</span>
        </button>
      </div>

      <div>
        {activeTab === 'stages' && <PipelineStagesConfig />}
        {activeTab === 'fields' && <LeadFieldsConfig />}
      </div>
    </div>
  );
};

export default CrmConfigPage;