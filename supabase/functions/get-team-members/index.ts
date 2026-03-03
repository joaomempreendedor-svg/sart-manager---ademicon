import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAIN_GESTOR_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

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
    // Validar usuário usando anon client com o token recebido
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

    // Service role para consultas privilegiadas
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verificar papel do solicitante
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

    // Buscar membros da equipe do gestor principal
    const { data: teamMembers, error: tmErr } = await serviceClient
      .from("team_members")
      .select("id, data, cpf, user_id")
      .eq("user_id", MAIN_GESTOR_ID);

    if (tmErr) {
      return new Response(JSON.stringify({ error: `Team members error: ${tmErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, team_members: teamMembers || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});