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

    console.log(`[Edge Function] Received request for email: ${email}, name: ${name}`);

    if (!email || !name || !tempPassword) {
      console.error('[Edge Function] Missing required fields: email, name, or tempPassword.');
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
    let userExistsFlag: boolean;

    // 1. Check if user already exists in auth.users
    console.log(`[Edge Function] Attempting to list users with email: ${email}`);
    const { data: existingUsersData, error: fetchError } = await supabaseAdmin.auth.admin.listUsers({
      email: email,
    });

    if (fetchError) {
      console.error(`[Edge Function] Error listing users: ${fetchError.message}`);
      throw fetchError;
    }

    userExistsFlag = (existingUsersData?.users?.length || 0) > 0;
    console.log(`[Edge Function] User exists check result: ${userExistsFlag}. Found ${existingUsersData?.users?.length || 0} users.`);

    if (userExistsFlag) {
      // User exists, update their password and metadata
      authUserId = existingUsersData!.users[0].id;
      console.log(`[Edge Function] User ${email} found in Auth. ID: ${authUserId}. Updating password and metadata.`);

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: tempPassword,
          user_metadata: {
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' '),
            needs_password_change: true, // Force password change
          },
        }
      );

      if (updateAuthError) {
        console.error(`[Edge Function] Error updating existing user in Auth: ${updateAuthError.message}`);
        throw updateAuthError;
      }

      // Also update the public.profiles table to ensure needs_password_change is true
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' '), needs_password_change: true })
        .eq('id', authUserId);

      if (updateProfileError) {
        console.error(`[Edge Function] Error updating profile table for existing user: ${updateProfileError.message}`);
        // Do not throw here, as auth update was successful. Log and continue.
      }

      message = 'Existing user updated with new temporary password and forced password change.';
    } else {
      // User does not exist, create new user
      console.log(`[Edge Function] User ${email} not found in Auth. Creating new user.`);
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
      authUserId = newUser.user!.id;
      message = 'New user created successfully with temporary password and forced password change.';
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