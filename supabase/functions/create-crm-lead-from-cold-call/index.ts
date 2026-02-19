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
      throw new Error(`Cold Call Lead não encontrado para o ID: ${coldCallLeadId}`);
    }

    // 2. Buscar o último log de 'Agendar Reunião' para obter os detalhes da reunião
    const { data: meetingLog, error: meetingLogError } = await supabaseAdmin
      .from('cold_call_logs')
      .select('*')
      .eq('cold_call_lead_id', coldCallLeadId)
      .eq('result', 'Agendar Reunião')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (meetingLogError) {
      console.error("[Edge Function] Error fetching meeting log:", meetingLogError);
      throw meetingLogError;
    }
    if (!meetingLog) {
      throw new Error(`Nenhum log de reunião agendada encontrado para o Cold Call Lead: ${coldCallLeadId}. Certifique-se de que uma ligação com o resultado 'Agendar Reunião' foi registrada.`);
    }

    // 3. Encontrar a etapa "Reunião Agendada" no pipeline principal
    const { data: meetingStage, error: stageError } = await supabaseAdmin
      .from('crm_stages')
      .select('id')
      .eq('name', 'Reunião Agendada') // Assumindo que esta etapa existe
      .eq('user_id', JOAO_GESTOR_AUTH_ID) // Garante que é a etapa do gestor principal
      .maybeSingle();

    if (stageError) {
      console.error("[Edge Function] Error fetching meeting stage:", stageError);
      throw stageError;
    }
    if (!meetingStage) {
      throw new Error(`Etapa 'Reunião Agendada' não encontrada no pipeline principal. Por favor, configure-a nas configurações do CRM.`);
    }

    // 4. Criar um novo Lead no Pipeline Principal
    const newCrmLeadData = {
      user_id: JOAO_GESTOR_AUTH_ID, // O proprietário do CRM é o gestor principal
      consultant_id: coldCallLead.user_id, // O consultor do Cold Call é o consultor do CRM Lead
      stage_id: meetingStage.id,
      name: coldCallLead.name,
      data: {
        phone: coldCallLead.phone,
        email: coldCallLead.email,
        origin: 'Cold Call', // Origem definida como Cold Call
        cold_call_notes: coldCallLead.notes, // Histórico da ligação
        meeting_modality: meetingLog.meeting_modality,
        meeting_notes: meetingLog.meeting_notes,
      },
      created_by: coldCallLead.user_id, // Quem criou o cold call lead
    };

    const { data: newCrmLead, error: crmLeadError } = await supabaseAdmin
      .from('crm_leads')
      .insert(newCrmLeadData)
      .select('id')
      .maybeSingle(); // Alterado para maybeSingle()

    if (crmLeadError) {
      console.error("[Edge Function] Error inserting new CRM lead:", crmLeadError);
      throw crmLeadError;
    }
    if (!newCrmLead) {
      throw new Error(`Falha ao criar Lead no CRM principal: Nenhum lead retornado após a inserção.`);
    }

    // 5. Criar uma Lead Task (reunião) no Pipeline Principal
    const newLeadTaskData = {
      lead_id: newCrmLead.id,
      user_id: coldCallLead.user_id, // Consultor que agendou
      title: `Reunião com ${coldCallLead.name} (Cold Call)`,
      description: meetingLog.meeting_notes || `Reunião agendada via Cold Call. Modalidade: ${meetingLog.meeting_modality || 'Não informada'}.`,
      due_date: meetingLog.meeting_date,
      is_completed: false,
      type: 'meeting',
      meeting_start_time: `${meetingLog.meeting_date}T${meetingLog.meeting_time}:00`,
      meeting_end_time: `${meetingLog.meeting_date}T${meetingLog.meeting_time}:00`, // Ajustar se houver duração
      manager_id: null, // Não há gestor convidado por padrão
      manager_invitation_status: 'accepted', // Considera aceito por padrão
    };

    const { data: newLeadTask, error: leadTaskError } = await supabaseAdmin
      .from('lead_tasks')
      .insert(newLeadTaskData)
      .select('id')
      .maybeSingle(); // Alterado para maybeSingle()

    if (leadTaskError) {
      console.error("[Edge Function] Error inserting new lead task:", leadTaskError);
      throw leadTaskError;
    }
    if (!newLeadTask) {
      throw new Error(`Falha ao criar tarefa de reunião no CRM principal: Nenhuma tarefa retornada após a inserção.`);
    }

    // 6. Atualizar o Cold Call Lead com o ID do CRM Lead criado
    const { error: updateColdCallLeadError } = await supabaseAdmin
      .from('cold_call_leads')
      .update({ crm_lead_id: newCrmLead.id })
      .eq('id', coldCallLeadId);

    if (updateColdCallLeadError) {
      console.error("[Edge Function] Error updating cold call lead with crm_lead_id:", updateColdCallLeadError);
      throw updateColdCallLeadError;
    }

    return new Response(JSON.stringify({ message: 'Lead criado no CRM principal e vinculado com sucesso!', crmLeadId: newCrmLead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[create-crm-lead-from-cold-call] Erro na Edge Function:', error.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar a criação do Lead no CRM.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});