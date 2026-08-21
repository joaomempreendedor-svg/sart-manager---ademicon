import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Autenticação manual (verify_jwt=false por padrão)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string | null = null;
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    userId = payload.sub || payload.user_id || null;
    if (!userId) throw new Error("User ID not found in token");
  } catch (e) {
    return new Response(JSON.stringify({ error: `Unauthorized: invalid token (${e.message})` }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verifica papel do usuário (somente GESTOR/ADMIN/SECRETARIA)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return new Response(JSON.stringify({ error: `Profile lookup error: ${profileError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowedRoles = ["GESTOR", "ADMIN", "SECRETARIA"];
  if (!profile || !allowedRoles.includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Lê request body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, id, daily_checklist_id, text, order_index, resource } = body as {
    action: "insert" | "update";
    id?: string;
    daily_checklist_id?: string;
    text?: string;
    order_index?: number;
    resource?: any;
  };

  if (!action || !["insert", "update"].includes(action)) {
    return new Response(JSON.stringify({ error: "Invalid action. Use 'insert' or 'update'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "insert") {
    if (!daily_checklist_id || typeof text !== "string" || typeof order_index !== "number") {
      return new Response(JSON.stringify({ error: "Missing required fields for insert." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica existência e propriedade do checklist
    const { data: checklist, error: checklistError } = await supabase
      .from("daily_checklists")
      .select("id, user_id, is_active")
      .eq("id", daily_checklist_id)
      .maybeSingle();

    if (checklistError) {
      return new Response(JSON.stringify({ error: `Checklist lookup error: ${checklistError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!checklist) {
      return new Response(JSON.stringify({ error: "Checklist not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // **SECURITY FIX**: Check if the user owns the checklist
    if (checklist.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: you do not own this checklist." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!checklist.is_active) {
      return new Response(JSON.stringify({ error: "Checklist is inactive." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("daily_checklist_items")
      .insert({ daily_checklist_id, text, order_index, resource })
      .select("*")
      .maybeSingle();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // action === "update"
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id for update." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // **SECURITY FIX**: Verify ownership before update
  const { data: existingItem, error: itemError } = await supabase
    .from("daily_checklist_items")
    .select("daily_checklist_id")
    .eq("id", id)
    .maybeSingle();

  if (itemError) {
    return new Response(JSON.stringify({ error: `Item lookup error: ${itemError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!existingItem) {
    return new Response(JSON.stringify({ error: "Item not found." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: checklist, error: checklistError } = await supabase
    .from("daily_checklists")
    .select("user_id")
    .eq("id", existingItem.daily_checklist_id)
    .maybeSingle();

  if (checklistError) {
    return new Response(JSON.stringify({ error: `Checklist lookup error: ${checklistError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!checklist || checklist.user_id !== userId) {
    return new Response(JSON.stringify({ error: "Forbidden: you do not own the parent checklist." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("daily_checklist_items")
    .update({ text, resource })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: updated }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});