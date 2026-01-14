import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Ajuste para o seu projeto Supabase (redirect do callback)
const PROJECT_URL = Deno.env.get('SUPABASE_URL') || 'https://jhhlktqhrdiashyjgbad.supabase.co'
// Ajuste: garantir action=callback no redirect
const REDIRECT_URI = `${PROJECT_URL}/functions/v1/google-calendar-auth?action=callback`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(PROJECT_URL, supabaseServiceKey!)

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body.action === 'start') {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'GOOGLE_CLIENT_ID não configurado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const userId = body.user_id
        if (!userId) {
          return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: REDIRECT_URI,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          state: userId,
        })
        const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`
        return new Response(JSON.stringify({ auth_url: authUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Aceitar callback mesmo sem 'action', se houver 'code'
    if (req.method === 'GET' && (action === 'callback' || url.searchParams.get('code'))) {
      const code = url.searchParams.get('code')
      const stateUserId = url.searchParams.get('state')
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!code || !stateUserId) {
        return new Response(JSON.stringify({ error: 'Código de autorização ou state ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: 'Segredos do Google não configurados' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        })
      })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok) {
        console.error('[google-calendar-auth] Token error', tokenJson)
        return new Response(JSON.stringify({ error: 'Falha ao obter tokens do Google' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const accessToken = tokenJson.access_token
      const refreshToken = tokenJson.refresh_token
      const expiresIn = tokenJson.expires_in
      const expiresAt = new Date(Date.now() + (expiresIn * 1000))

      const { error: upsertError } = await supabase
        .from('oauth_tokens')
        .upsert({
          user_id: stateUserId,
          provider: 'google',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (upsertError) {
        console.error('[google-calendar-auth] Upsert error', upsertError)
        return new Response(JSON.stringify({ error: 'Falha ao salvar tokens' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Resposta simples de sucesso
      const successHtml = `
        <html><body style="font-family: sans-serif;">
          <h3>Google Agenda conectado com sucesso!</h3>
          <p>Você já pode fechar esta janela e voltar para o aplicativo.</p>
          <script>setTimeout(() => { window.close(); }, 1500);</script>
        </body></html>
      `
      return new Response(successHtml, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[google-calendar-auth] Unexpected error', e)
    return new Response(JSON.stringify({ error: 'Erro inesperado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})