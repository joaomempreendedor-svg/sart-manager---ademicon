import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAIN_GESTOR_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; // JOAO_GESTOR_AUTH_ID

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Client with anon to read user from token
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requesterId = userRes.user.id;

    // Service client for privileged queries
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate role (must be GESTOR/ADMIN/SECRETARIA)
    const { data: profile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", requesterId)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: `Profile error: ${profileErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const role = (profile?.role || "CONSULTOR").toString().toUpperCase();
    if (!["GESTOR", "ADMIN", "SECRETARIA"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch datasets for the main gestor
    const [{ data: leads, error: leadsErr }, { data: candidatesRows, error: candErr }] = await Promise.all([
      serviceClient.from("crm_leads").select("*").eq("user_id", MAIN_GESTOR_ID).order("created_at", { ascending: false }),
      serviceClient.from("candidates").select("id, data, created_at, last_updated_at").eq("user_id", MAIN_GESTOR_ID),
    ]);

    if (leadsErr) {
      return new Response(JSON.stringify({ error: `Leads error: ${leadsErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (candErr) {
      return new Response(JSON.stringify({ error: `Candidates error: ${candErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const leadIds = (leads || []).map((l: any) => l.id);
    let leadTasks: any[] = [];
    if (leadIds.length > 0) {
      const { data: tasks, error: tasksErr } = await serviceClient
        .from("lead_tasks")
        .select("*")
        .in("lead_id", leadIds);

      if (tasksErr) {
        return new Response(JSON.stringify({ error: `Lead tasks error: ${tasksErr.message}` }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      leadTasks = tasks || [];
    }

    return new Response(
      JSON.stringify({
        ok: true,
        crm_leads: leads || [],
        lead_tasks: leadTasks,
        candidates: candidatesRows || [],
        owner_id: MAIN_GESTOR_ID,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});