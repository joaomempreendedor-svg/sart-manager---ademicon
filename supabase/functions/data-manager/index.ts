import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

console.log("data-manager function initializing...");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cria uma única instância do cliente Supabase para ser reutilizada
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Lida com as requisições CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autentica o usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Authentication error: Missing Authorization header.");
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError) {
      console.error("Authentication error: ", userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!user) {
      console.error("Authentication error: User not found for the provided token.");
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 2. Processa o corpo da requisição
    const { tableName, operation, data, id } = await req.json();

    if (!tableName || !operation) {
      throw new Error('Missing tableName or operation in the request body');
    }

    let result;

    // 3. Executa a operação no banco de dados
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
        // Usar upsert é mais seguro: cria a configuração se não existir
        result = await supabaseAdmin.from(tableName).upsert({ user_id: user.id, data: data }, { onConflict: 'user_id' }).select('data').single();
        break;

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }

    if (result.error) {
      console.error("Supabase DB error:", result.error);
      throw result.error;
    }

    // 4. Retorna o resultado
    return new Response(JSON.stringify(result.data ? result.data : { success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Handler catch block error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});