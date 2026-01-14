import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_URL = Deno.env.get('SUPABASE_URL') || 'https://jhhlktqhrdiashyjgbad.supabase.co'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(PROJECT_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { user_id, start_date, end_date } = await req.json().catch(() => ({}))

    if (!user_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: 'user_id, start_date e end_date são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user_id)
      .eq('provider', 'google')
      .maybeSingle()

    if (error || !tokens) {
      return new Response(JSON.stringify({ error: 'Tokens não encontrados para este usuário' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null
    const needsRefresh = !accessToken || (expiresAt && expiresAt.getTime() < (Date.now() + 60_000))

    if (needsRefresh && refreshToken) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
      const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: refreshToken!,
          grant_type: 'refresh_token',
        })
      })
      const refreshJson = await refreshRes.json()
      if (!refreshRes.ok) {
        console.error('[google-calendar-events] Refresh error', refreshJson)
        return new Response(JSON.stringify({ error: 'Falha ao renovar token' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      accessToken = refreshJson.access_token
      const newExpiresAt = new Date(Date.now() + (refreshJson.expires_in * 1000)).toISOString()
      await supabase.from('oauth_tokens').update({ access_token: accessToken, expires_at: newExpiresAt, updated_at: new Date().toISOString() }).eq('id', tokens.id)
    }

    const timeMin = new Date(`${start_date}T00:00:00`).toISOString()
    const timeMax = new Date(`${end_date}T23:59:59`).toISOString()
    const googleUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`

    const eventsRes = await fetch(googleUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
    const eventsJson = await eventsRes.json()
    if (!eventsRes.ok) {
      console.error('[google-calendar-events] Google API error', eventsJson)
      return new Response(JSON.stringify({ error: 'Falha ao obter eventos do Google' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const mapped = (eventsJson.items || []).map((ev: any) => ({
      id: ev.id,
      title: ev.summary || 'Evento',
      description: ev.description || '',
      start_time: ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : null),
      end_time: ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T23:59:59` : null),
      all_day: !!ev.start?.date,
    })).filter((e: any) => e.start_time && e.end_time)

    return new Response(JSON.stringify({ events: mapped }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[google-calendar-events] Unexpected error', e)
    return new Response(JSON.stringify({ error: 'Erro inesperado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})