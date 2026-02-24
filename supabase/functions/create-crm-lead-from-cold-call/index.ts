import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coldCallLeadId, meetingDate, meetingTime, meetingModality, meetingNotes } = await req.json();

    if (!coldCallLeadId) {
      return new Response(JSON.stringify({ error: 'Cold Call Lead ID é obrigatório.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados do Cold Call Lead
    const { data: coldCallLead, error: coldCallLeadError } = await supabaseAdmin
      .from('cold_call_leads')
      .select('*')
      .eq('id', coldCallLeadId)
      .maybeSingle();

    if (coldCallLeadError) throw coldCallLeadError;
    if (!coldCallLead) throw new Error(`Cold Call Lead não encontrado para o ID: ${coldCallLeadId}`);

    // Encontrar pipeline ativo
    const { data: activePipeline, error: pipelineError } = await supabaseAdmin
      .from('crm_pipelines')
      .select('id')
      .eq('user_id', JOAO_GESTOR_AUTH_ID)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pipelineError) throw pipelineError;
    if (!activePipeline) throw new Error(`Nenhum pipeline de CRM ativo encontrado. Configure um nas configurações do CRM.`);

    // Se houver reunião, tentar encontrar uma etapa de reunião
    let targetStageId: string | null = null;

    if (meetingDate && meetingTime) {
      const { data: meetingStage, error: meetingStageError } = await supabaseAdmin
        .from('crm_stages')
        .select('id, name, order_index')
        .eq('user_id', JOAO_GESTOR_AUTH_ID)
        .eq('pipeline_id', activePipeline.id)
        .eq('is_active', true)
        .ilike('name', '%reuni%')
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (meetingStageError) {
        // não aborta; apenas loga
        console.error("[Edge Function] Erro ao buscar etapa de reunião:", meetingStageError);
      } else if (meetingStage) {
        targetStageId = meetingStage.id;
      }
    }

    // Se não encontramos etapa de reunião, usar a primeira etapa ativa do pipeline
    if (!targetStageId) {
      const { data: firstActiveStage, error: stageError } = await supabaseAdmin
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', activePipeline.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (stageError) throw stageError;
      if (!firstActiveStage) throw new Error(`Nenhuma etapa ativa encontrada no pipeline. Configure etapas nas configurações do CRM.`);
      targetStageId = firstActiveStage.id;
    }

    // Criar o Lead no CRM
    const newCrmLeadData = {
      user_id: JOAO_GESTOR_AUTH_ID,
      consultant_id: coldCallLead.user_id,
      stage_id: targetStageId,
      name: coldCallLead.name,
      data: {
        phone: coldCallLead.phone,
        email: coldCallLead.email,
        origin: 'Cold Call',
        cold_call_notes: coldCallLead.notes,
      },
      created_by: coldCallLead.user_id,
    };

    const { data: newCrmLead, error: crmLeadError } = await supabaseAdmin
      .from('crm_leads')
      .insert(newCrmLeadData)
      .select('id')
      .maybeSingle();

    if (crmLeadError) throw crmLeadError;
    if (!newCrmLead) throw new Error(`Falha ao criar Lead no CRM principal.`);

    // Se houver data/horário de reunião, criar tarefa de reunião
    if (meetingDate && meetingTime) {
      // FIX: Assume Brazil timezone (UTC-3) when creating the date object
      const start = new Date(`${meetingDate}T${meetingTime}:00-03:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h

      const meetingTask = {
        lead_id: newCrmLead.id,
        user_id: coldCallLead.user_id,
        title: 'Reunião agendada via Cold Call',
        description: meetingNotes || null,
        type: 'meeting' as const,
        meeting_start_time: start.toISOString(),
        meeting_end_time: end.toISOString(),
        manager_id: JOAO_GESTOR_AUTH_ID,
        manager_invitation_status: 'pending',
        is_completed: false,
      };

      const { error: meetingTaskError } = await supabaseAdmin
        .from('lead_tasks')
        .insert(meetingTask);

      if (meetingTaskError) {
        console.error("[Edge Function] Erro ao criar tarefa de reunião:", meetingTaskError);
        // não aborta a criação do lead
      }
    }

    // Atualizar o Cold Call Lead com o ID do CRM Lead
    const { error: updateColdCallLeadError } = await supabaseAdmin
      .from('cold_call_leads')
      .update({ crm_lead_id: newCrmLead.id })
      .eq('id', coldCallLeadId);

    if (updateColdCallLeadError) throw updateColdCallLeadError;

    return new Response(JSON.stringify({ message: 'Lead criado no CRM principal e vinculado com sucesso!', crmLeadId: newCrmLead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[create-crm-lead-from-cold-call] Erro:', error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || 'Falha ao processar a criação do Lead no CRM.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});