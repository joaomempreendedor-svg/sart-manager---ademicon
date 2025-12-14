import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PipelineColumn } from '@/components/crm/PipelineColumn';
import { AddLeadModal } from '@/components/crm/AddLeadModal';
import { Loader2, Plus } from 'lucide-react';

export const CrmPage = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position', { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData);

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*');
      
      if (leadsError) throw leadsError;
      setLeads(leadsData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.stage_id === stageId || (stageId === stages[0]?.id && !lead.stage_id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Erro ao carregar o CRM: {error}</div>;
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4 px-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funil de Vendas (CRM)</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus leads e oportunidades.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Lead</span>
        </button>
      </div>
      <div className="flex-1 flex space-x-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <PipelineColumn key={stage.id} stage={stage} leads={leadsByStage(stage.id)} />
        ))}
      </div>
      <AddLeadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLeadAdded={fetchData}
      />
    </div>
  );
};