import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, TrendingUp, UserRound } from 'lucide-react';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const CrmMirror = () => {
  const { user } = useAuth();
  const { 
    teamMembers, 
    isDataLoading, 
    crmLeads, 
    crmPipelines, 
    crmStages, 
    crmFields,
    addCrmLead, 
    updateCrmLead, 
    deleteCrmLead, 
    updateCrmLeadStage 
  } = useApp();

  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));
  }, [teamMembers]);

  useEffect(() => {
    if (consultants.length > 0 && !selectedConsultantId) {
      setSelectedConsultantId(consultants[0].id);
    }
  }, [consultants, selectedConsultantId]);

  const activePipeline = useMemo(() => {
    return crmPipelines.find(p => p.is_active) || crmPipelines[0];
  }, [crmPipelines]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return [];
    return crmStages
      .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  }, [crmStages, activePipeline]);

  const leadsForSelectedConsultant = useMemo(() => {
    if (!selectedConsultantId) return [];
    return crmLeads.filter(lead => lead.consultant_id === selectedConsultantId);
  }, [crmLeads, selectedConsultantId]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!activePipeline || pipelineStages.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Espelho do CRM</h1>
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
    <div className="p-8 h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Espelho do CRM</h1>
          <p className="text-gray-500 dark:text-gray-400">Visualize o funil de vendas de cada consultor.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Visualizando:</span>
          <Select value={selectedConsultantId || ''} onValueChange={setSelectedConsultantId}>
            <SelectTrigger className="w-[200px] dark:bg-slate-700 dark:text-white dark:border-slate-600">
              <SelectValue placeholder="Selecione o Consultor" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-900 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700">
              {consultants.map(consultant => (
                <SelectItem key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedConsultantId ? (
        <div className="flex-1">
          <KanbanBoard
            leads={leadsForSelectedConsultant}
            pipelineStages={pipelineStages}
            crmFields={crmFields.filter(f => f.is_active)}
            consultantId={selectedConsultantId}
            onUpdateLeadStage={updateCrmLeadStage}
            onAddLead={addCrmLead}
            onUpdateLead={updateCrmLead}
            onDeleteLead={deleteCrmLead}
          />
        </div>
      ) : (
        <div className="p-6 text-center text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <UserRound className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600 mb-4" />
          <p>Selecione um consultor para ver o CRM dele.</p>
        </div>
      )}
    </div>
  );
};