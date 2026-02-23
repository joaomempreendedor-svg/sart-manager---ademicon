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
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'User ID and new password are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the user's password in auth.users
    const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (authUpdateError) {
      throw authUpdateError;
    }

    // Update the 'needs_password_change' flag in the public.profiles table
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ needs_password_change: true })
      .eq('id', userId);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    // Sincroniza o role no perfil com base no registro de team_members
    const { data: tm, error: tmError } = await supabaseAdmin
      .from('team_members')
      .select('data')
      .eq('data->>id', userId)
      .maybeSingle();

    if (tmError) {
      console.warn('[reset-consultant-password] Não foi possível buscar team_member para sincronizar role', tmError);
    } else if (tm?.data) {
      const roles = (tm.data as any).roles || [];
      let desiredRole = 'CONSULTOR';
      if (Array.isArray(roles)) {
        if (roles.includes('SECRETARIA')) desiredRole = 'SECRETARIA';
        else if (roles.includes('GESTOR')) desiredRole = 'GESTOR';
      }
      const { error: roleUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: desiredRole })
        .eq('id', userId);
      if (roleUpdateError) {
        console.warn('[reset-consultant-password] Falha ao atualizar role no perfil', roleUpdateError);
      }
    }

    // Buscar o email atual no Auth para exibir na modal de credenciais
    const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userFetchError) {
      throw userFetchError;
    }
    const userEmail = userData?.user?.email || null;

    return new Response(JSON.stringify({ message: 'Password reset successfully. User will be prompted to change it on next login.', newPassword, userEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to reset password.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});