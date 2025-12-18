import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, tempPassword, login: consultantLogin } = await req.json();

    if (!email || !name || !tempPassword) {
      return new Response(JSON.stringify({ error: 'Email, name, and temporary password are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[Edge Function] Criando/vinculando consultor: ${email}`);

    // 1. VERIFICAR SE USUÁRIO JÁ EXISTE COM ESTE EMAIL
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`[Edge Function] Erro ao listar usuários: ${listError.message}`);
      return new Response(JSON.stringify({ error: `Falha ao verificar usuários: ${listError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const existingUser = existingUsers.users.find(user => user.email === email);
    let authUserId: string;
    let userExists = false;

    if (existingUser) {
      // 2A. USUÁRIO EXISTE - APENAS RESETAR SENHA (NUNCA ALTERAR EMAIL)
      console.log(`[Edge Function] Usuário ${email} já existe. Resetando senha.`);
      authUserId = existingUser.id;
      userExists = true;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          // ⚠️ NUNCA ATUALIZAR EMAIL AQUI - APENAS SENHA
          password: tempPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            needs_password_change: true,
            login: consultantLogin || existingUser.user_metadata?.login,
          },
        }
      );

      if (updateError) {
        console.error(`[Edge Function] Erro ao atualizar usuário existente: ${updateError.message}`);
        return new Response(JSON.stringify({ error: `Falha ao resetar senha: ${updateError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
      // 2B. USUÁRIO NÃO EXISTE - CRIAR NOVO
      console.log(`[Edge Function] Criando novo usuário: ${email}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          role: 'CONSULTOR',
          needs_password_change: true,
          login: consultantLogin,
        },
      });

      if (createError) {
        console.error(`[Edge Function] Erro ao criar usuário: ${createError.message}`);
        return new Response(JSON.stringify({ error: `Falha ao criar usuário: ${createError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      authUserId = newUser.user.id;
      userExists = false;
    }

    console.log(`[Edge Function] Sucesso! AuthUserId: ${authUserId}, UserExists: ${userExists}`);

    return new Response(JSON.stringify({ 
      authUserId, 
      userExists,
      message: userExists ? 'Usuário existente atualizado' : 'Novo usuário criado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[Edge Function] Erro crítico:', error);
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar solicitação' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});