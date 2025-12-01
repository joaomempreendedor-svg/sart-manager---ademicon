import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para obter o cliente Supabase autenticado pelo usuário
async function getAuthenticatedSupabaseClient(req: Request): Promise<{ user: any, supabaseAdmin: SupabaseClient }> {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    return { user, supabaseAdmin };
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, supabaseAdmin } = await getAuthenticatedSupabaseClient(req);
    const { tableName, operation, data, id } = await req.json();

    if (!tableName || !operation) {
      throw new Error('Missing tableName or operation');
    }

    let result;

    switch (operation) {
      case 'insert':
        if (!data) throw new Error('Missing data for insert operation');
        result = await supabaseAdmin.from(tableName).insert({ user_id: user.id, data: data }).select('data').single();
        break;
      
      case 'update':
        if (!data || !id) throw new Error('Missing data or id for update operation');
        result = await supabaseAdmin.from(tableName).update({ data: data }).match({ 'data->>id': id, user_id: user.id }).select('data').single();
        break;

      case 'delete':
        if (!id) throw new Error('Missing id for delete operation');
        result = await supabaseAdmin.from(tableName).delete().match({ 'data->>id': id, user_id: user.id });
        break;
      
      case 'update_config':
        if (!data) throw new Error('Missing data for update_config operation');
        result = await supabaseAdmin.from(tableName).update({ data: data }).eq('user_id', user.id).select('data').single();
        break;

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }

    if (result.error) {
      console.error("Supabase error:", result.error);
      throw result.error;
    }

    return new Response(JSON.stringify(result.data ? result.data : { success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})