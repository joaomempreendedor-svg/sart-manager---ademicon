import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal'; // Novo componente

const CrmPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, isDataLoading } = useApp();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const consultantLeads = useMemo(() => {
    if (!user) return [];
    return crmLeads.filter(lead => lead.consultant_id === user.id);
  }, [crmLeads, user]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return consultantLeads;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return consultantLeads.filter(lead =>
      lead.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      Object.values(lead.data || {}).some(value =>
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [consultantLeads, searchTerm]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, CrmLead[]> = {};
    pipelineStages.forEach(stage => {
      groups[stage.id] = filteredLeads.filter(lead => lead.stage_id === stage.id);
    });
    return groups;
  }, [pipelineStages, filteredLeads]);

  const handleAddNewLead = () => {
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleEditLead = (lead: CrmLead) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!activePipeline || pipelineStages.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">CRM - Funil de Vendas</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Nenhum pipeline de vendas ativo ou etapas configuradas. Por favor, entre em contato com seu gestor.
        </p>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <TrendingUp className="mx-auto w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Seu gestor precisa configurar o pipeline de vendas e as etapas para que você possa gerenciar seus leads aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu CRM - {activePipeline.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus leads e acompanhe o funil de vendas.</p>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar lead..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddNewLead}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 space-x-6 custom-scrollbar">
        {pipelineStages.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-80 bg-gray-100 dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{groupedLeads[stage.id]?.length || 0} leads</span>
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              {groupedLeads[stage.id]?.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Nenhum lead nesta etapa.</p>
              ) : (
                groupedLeads[stage.id]?.map(lead => (
                  <div key={lead.id} onClick={() => handleEditLead(lead)} className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 hover:border-brand-500 cursor-pointer transition-all">
                    <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                      {lead.data.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {lead.data.phone}</div>}
                      {lead.data.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {lead.data.email}</div>}
                      {lead.data.origin && <div className="flex items-center"><Tag className="w-3 h-3 mr-1" /> {lead.data.origin}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          lead={editingLead}
          crmFields={crmFields.filter(f => f.is_active)}
          pipelineStages={pipelineStages}
          consultantId={user?.id || ''}
        />
      )}
    </div>
  );
};

export default CrmPage;