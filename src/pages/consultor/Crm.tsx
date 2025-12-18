import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Loader2, Phone, Mail, Tag, MessageSquare, TrendingUp, ListTodo, CalendarPlus, Send, DollarSign, Edit2, Trash2, XCircle, ChevronDown } from 'lucide-react';
import LeadModal from '@/components/crm/LeadModal';
import { LeadTasksModal } from '@/components/crm/LeadTasksModal';
import { ScheduleMeetingModal } from '@/components/crm/ScheduleMeetingModal';
import { ProposalModal } from '@/components/crm/ProposalModal';
import { SaleModal } from '@/components/crm/SaleModal';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { DailyChecklist } from '@/pages/consultor/DailyChecklist'; // Importar o DailyChecklist

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const CrmPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmPipelines, crmStages, crmLeads, crmFields, isDataLoading, deleteCrmLead, updateCrmLead, updateCrmLeadStage, addCrmLead } = useApp();
  
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM - Funil de Vendas</h1>
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Meu CRM - {activePipeline.name}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Gerencie seus leads e acompanhe o funil de vendas.</p>

      {/* Daily Checklist Section */}
      <div className="mb-8">
        <DailyChecklist />
      </div>

      <KanbanBoard
        leads={consultantLeads}
        pipelineStages={pipelineStages}
        crmFields={crmFields.filter(f => f.is_active)}
        consultantId={user?.id || ''}
        onUpdateLeadStage={updateCrmLeadStage}
        onAddLead={addCrmLead}
        onUpdateLead={updateCrmLead}
        onDeleteLead={deleteCrmLead}
      />
    </div>
  );
};

export default CrmPage;