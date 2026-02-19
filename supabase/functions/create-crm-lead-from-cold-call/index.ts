import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID do gestor principal para vincular os leads do CRM
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coldCallLeadId } = await req.json();

    console.log("[Edge Function] Received request for coldCallLeadId:", coldCallLeadId);

    if (!coldCallLeadId) {
      console.error("[Edge Function] Missing coldCallLeadId.");
      return new Response(JSON.stringify({ error: 'Cold Call Lead ID é obrigatório.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar os dados do Cold Call Lead
    const { data: coldCallLead, error: coldCallLeadError } = await supabaseAdmin
      .from('cold_call_leads')
      .select('*')
      .eq('id', coldCallLeadId)
      .maybeSingle();

    if (coldCallLeadError) {
      console.error("[Edge Function] Error fetching cold call lead:", coldCallLeadError);
      throw coldCallLeadError;
    }
    if (!coldCallLead) {
      console.error(`[Edge Function] Cold Call Lead not found for ID: ${coldCallLeadId}`);
      throw new Error(`Cold Call Lead não encontrado para o ID: ${coldCallLeadId}`);
    }
    console.log("[Edge Function] Cold Call Lead fetched:", coldCallLead);

    // 2. Encontrar o primeiro pipeline ativo do gestor principal
    const { data: activePipeline, error: pipelineError } = await supabaseAdmin
      .from('crm_pipelines')
      .select('id')
      .eq('user_id', JOAO_GESTOR_AUTH_ID)
      .eq('is_active', true)
      .order('created_at', { ascending: true }) // Pega o mais antigo se houver vários ativos
      .limit(1)
      .maybeSingle();

    if (pipelineError) {
      console.error("[Edge Function] Error fetching active CRM pipeline:", pipelineError);
      throw pipelineError;
    }
    if (!activePipeline) {
      console.error(`[Edge Function] No active CRM pipeline found for user_id: ${JOAO_GESTOR_AUTH_ID}`);
      throw new Error(`Nenhum pipeline de CRM ativo encontrado. Por favor, configure um nas configurações do CRM.`);
    }
    console.log("[Edge Function] Active CRM pipeline fetched:", activePipeline);

    // 3. Encontrar a primeira etapa ativa desse pipeline
    const { data: firstActiveStage, error: stageError } = await supabaseAdmin
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', activePipeline.id)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (stageError) {
      console.error("[Edge Function] Error fetching first active CRM stage:", stageError);
      throw stageError;
    }
    if (!firstActiveStage) {
      console.error(`[Edge Function] No active CRM stage found for pipeline ID: ${activePipeline.id}`);
      throw new Error(`Nenhuma etapa ativa encontrada no pipeline. Por favor, configure etapas nas configurações do CRM.`);
    }
    console.log("[Edge Function] First active CRM stage fetched:", firstActiveStage);

    // 4. Criar um novo Lead no Pipeline Principal
    const newCrmLeadData = {
      user_id: JOAO_GESTOR_AUTH_ID, // O proprietário do CRM é o gestor principal
      consultant_id: coldCallLead.user_id, // O consultor do Cold Call é o consultor do CRM Lead
      stage_id: firstActiveStage.id, // Coloca o lead na primeira etapa ativa
      name: coldCallLead.name,
      data: {
        phone: coldCallLead.phone,
        email: coldCallLead.email,
        origin: 'Cold Call', // Origem definida como Cold Call
        cold_call_notes: coldCallLead.notes, // Histórico da ligação
      },
      created_by: coldCallLead.user_id, // Quem criou o cold call lead
    };
    console.log("[Edge Function] Attempting to insert new CRM lead with data:", newCrmLeadData);

    const { data: newCrmLead, error: crmLeadError } = await supabaseAdmin
      .from('crm_leads')
      .insert(newCrmLeadData)
      .select('id')
      .maybeSingle();

    if (crmLeadError) {
      console.error("[Edge Function] Error inserting new CRM lead:", crmLeadError);
      throw crmLeadError;
    }
    if (!newCrmLead) {
      console.error("[Edge Function] Failed to create CRM lead: No lead returned after insertion.");
      throw new Error(`Falha ao criar Lead no CRM principal: Nenhum lead retornado após a inserção.`);
    }
    console.log("[Edge Function] New CRM lead created:", newCrmLead);

    // 5. Atualizar o Cold Call Lead com o ID do CRM Lead criado
    console.log(`[Edge Function] Updating Cold Call Lead ${coldCallLeadId} with crm_lead_id: ${newCrmLead.id}`);
    const { error: updateColdCallLeadError } = await supabaseAdmin
      .from('cold_call_leads')
      .update({ crm_lead_id: newCrmLead.id })
      .eq('id', coldCallLeadId);

    if (updateColdCallLeadError) {
      console.error("[Edge Function] Error updating cold call lead with crm_lead_id:", updateColdCallLeadError);
      throw updateColdCallLeadError;
    }
    console.log("[Edge Function] Cold Call Lead updated with CRM Lead ID.");

    return new Response(JSON.stringify({ message: 'Lead criado no CRM principal e vinculado com sucesso!', crmLeadId: newCrmLead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[create-crm-lead-from-cold-call] Erro na Edge Function:', error.message || error);
    // Log the full error object for more details
    console.error('[create-crm-lead-from-cold-call] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar a criação do Lead no CRM.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});