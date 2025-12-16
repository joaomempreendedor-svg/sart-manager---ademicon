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
    const { email, name, tempPassword } = await req.json();

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

    let authUserId: string;
    let message: string;
    let userExistsFlag: boolean; // Novo flag

    // 1. Check if user already exists in auth.users
    console.log(`[Edge Function] Checking for existing user with email: ${email}`);
    const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers({
      email: email,
    });

    if (fetchError) {
      console.error(`[Edge Function] Error listing users: ${fetchError.message}`);
      throw fetchError;
    }

    console.log(`[Edge Function] Existing users found: ${existingUsers?.users.length}`);

    if (existingUsers && existingUsers.users.length > 0) {
      // User exists, use their ID
      authUserId = existingUsers.users[0].id;
      message = 'User already exists, linked to existing account.';
      userExistsFlag = true;
    } else {
      // User does not exist, create new user
      console.log(`[Edge Function] Creating new user with email: ${email}`);
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // Automatically confirm email
        user_metadata: { 
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          role: 'CONSULTOR', // Default role for new signups
          needs_password_change: true, // Force password change on first login
        },
      });

      if (createUserError) {
        console.error(`[Edge Function] Error creating user: ${createUserError.message}`);
        throw createUserError;
      }
      authUserId = newUser.user.id;
      message = 'New user created successfully.';
      userExistsFlag = false;
    }

    return new Response(JSON.stringify({ authUserId, message, userExists: userExistsFlag }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-or-link-consultant Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create or link consultant.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});