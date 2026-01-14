import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!url || !serviceRoleKey) {
      console.error("[get-manager-availability] Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(url, serviceRoleKey)

    // Manual auth: not strictly necessary for read, but we can parse body for manager_id and range
    const { manager_id, start_date, end_date } = await req.json().catch(() => ({}))

    if (!manager_id || !start_date || !end_date) {
      console.error("[get-manager-availability] Invalid params", { manager_id, start_date, end_date })
      return new Response(JSON.stringify({ error: "manager_id, start_date, end_date são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log("[get-manager-availability] Fetching events", { manager_id, start_date, end_date })

    const { data, error } = await supabase
      .from('consultant_events')
      .select('id, title, description, start_time, end_time')
      .eq('user_id', manager_id)
      .gte('start_time', new Date(`${start_date}T00:00:00`).toISOString())
      .lte('end_time', new Date(`${end_date}T23:59:59`).toISOString())

    if (error) {
      console.error("[get-manager-availability] Query error", { error })
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log("[get-manager-availability] Found events", { count: data?.length || 0 })

    return new Response(JSON.stringify({ events: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error("[get-manager-availability] Unexpected error", { e })
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})