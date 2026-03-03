import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client com token do usuário para obter o user e role
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes } = await userClient.auth.getUser();
    const currentUserId = userRes?.user?.id;
    if (!currentUserId) {
      return new Response(JSON.stringify({ ok: false, error: "No user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta ler role do profiles
    const { data: profile, error: profileErr } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .maybeSingle();

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let role = (profile?.role || "").toString().toUpperCase();

    // Fallback (se RLS impedir leitura de profiles com anon)
    if (profileErr || !role) {
      const { data: p } = await serviceClient
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .maybeSingle();
      role = (p?.role || "").toString().toUpperCase();
    }

    let cold_call_leads: any[] = [];
    let cold_call_logs: any[] = [];

    const privileged = ["GESTOR", "ADMIN", "SECRETARIA"].includes(role);

    if (privileged) {
      const { data: leadsData, error: leadsErr } = await serviceClient
        .from("cold_call_leads")
        .select("id, user_id, name, phone, email, current_stage, notes, crm_lead_id, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (leadsErr) throw leadsErr;
      cold_call_leads = leadsData || [];

      const { data: logsData, error: logsErr } = await serviceClient
        .from("cold_call_logs")
        .select("id, cold_call_lead_id, user_id, start_time, end_time, duration_seconds, result, meeting_date, meeting_time, meeting_modality, meeting_notes, created_at")
        .order("start_time", { ascending: false })
        .range(0, 99999);
      if (logsErr) throw logsErr;
      cold_call_logs = logsData || [];
    } else {
      const { data: leadsData, error: leadsErr } = await serviceClient
        .from("cold_call_leads")
        .select("id, user_id, name, phone, email, current_stage, notes, crm_lead_id, created_at, updated_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (leadsErr) throw leadsErr;
      cold_call_leads = leadsData || [];

      const { data: logsData, error: logsErr } = await serviceClient
        .from("cold_call_logs")
        .select("id, cold_call_lead_id, user_id, start_time, end_time, duration_seconds, result, meeting_date, meeting_time, meeting_modality, meeting_notes, created_at")
        .eq("user_id", currentUserId)
        .order("start_time", { ascending: false })
        .range(0, 99999);
      if (logsErr) throw logsErr;
      cold_call_logs = logsData || [];
    }

    return new Response(JSON.stringify({ ok: true, cold_call_leads, cold_call_logs }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-cold-call-data error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});