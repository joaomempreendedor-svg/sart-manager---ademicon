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
    const { email, name, tempPassword, login: consultantLogin, role: userRole } = await req.json();

    console.log("[create-or-link-consultant] Received request:", { email, name, consultantLogin, userRole });

    if (!email || !name || !tempPassword || !userRole) {
      console.error("[create-or-link-consultant] Missing required fields. Email, name, temporary password, and role are required.");
      return new Response(JSON.stringify({ error: 'Email, name, temporary password, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[create-or-link-consultant] Attempting to list users for email: ${email}`);

    // 1. VERIFICAR SE USUÁRIO JÁ EXISTE COM ESTE EMAIL
    const { data: existingUsersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`[create-or-link-consultant] Error listing users: ${listError.message}`, { listError });
      return new Response(JSON.stringify({ error: `Falha ao verificar usuários: ${listError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!existingUsersData || !Array.isArray(existingUsersData.users)) {
        console.error("[create-or-link-consultant] Unexpected structure from listUsers: 'users' array is missing or not an array.", { existingUsersData });
        return new Response(JSON.stringify({ error: `Falha ao verificar usuários: Resposta inesperada do serviço de autenticação.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    const existingUser = existingUsersData.users.find(user => user.email === email);
    let authUserId: string;
    let userExists = false;

    if (existingUser) {
      // 2A. USUÁRIO EXISTE - APENAS RESETAR SENHA E ATUALIZAR METADADOS
      console.log(`[create-or-link-consultant] User ${email} already exists. Resetting password and updating metadata.`);
      authUserId = existingUser.id;
      userExists = true;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: tempPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            needs_password_change: true,
            login: consultantLogin || existingUser.user_metadata?.login,
            role: userRole,
          },
        }
      );

      if (updateError) {
        console.error(`[create-or-link-consultant] Error updating existing user ${email}: ${updateError.message}`, { updateError });
        return new Response(JSON.stringify({ error: `Falha ao resetar senha: ${updateError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      console.log(`[create-or-link-consultant] Password and metadata for existing user ${email} updated successfully.`);
    } else {
      // 2B. USUÁRIO NÃO EXISTE - CRIAR NOVO
      console.log(`[create-or-link-consultant] Creating new user: ${email}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          role: userRole,
          needs_password_change: true,
          login: consultantLogin,
        },
      });

      if (createError) {
        console.error(`[create-or-link-consultant] Error creating user ${email}: ${createError.message}`, { createError });
        return new Response(JSON.stringify({ error: `Falha ao criar usuário: ${createError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      authUserId = newUser.user.id;
      userExists = false;
      console.log(`[create-or-link-consultant] New user ${email} created successfully. Auth ID: ${authUserId}`);
    }

    console.log(`[create-or-link-consultant] Success! AuthUserId: ${authUserId}, UserExists: ${userExists}`);

    return new Response(JSON.stringify({ 
      authUserId, 
      userExists,
      message: userExists ? 'Usuário existente atualizado' : 'Novo usuário criado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[create-or-link-consultant] Critical error in Edge Function:', error.message || error, { error });
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar solicitação' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});