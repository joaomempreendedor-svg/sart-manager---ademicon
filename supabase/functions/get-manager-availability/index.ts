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
    const { managerId, date } = await req.json();

    console.log("[get-manager-availability] Received request:", { managerId, date });

    if (!managerId || !date) {
      console.error("[get-manager-availability] Missing managerId or date.");
      return new Response(JSON.stringify({ error: 'Manager ID and date are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch lead tasks (meetings) for the manager on the given date
    const { data: leadMeetings, error: leadMeetingsError } = await supabaseAdmin
      .from('lead_tasks')
      .select('meeting_start_time, meeting_end_time')
      .eq('manager_id', managerId)
      .eq('due_date', date) // Assuming due_date is the meeting date
      .neq('manager_invitation_status', 'declined'); // Exclude declined meetings

    if (leadMeetingsError) {
      console.error("[get-manager-availability] Error fetching lead meetings:", leadMeetingsError);
      throw leadMeetingsError;
    }

    // Fetch consultant events for the manager on the given date
    const { data: consultantEvents, error: consultantEventsError } = await supabaseAdmin
      .from('consultant_events')
      .select('start_time, end_time')
      .eq('user_id', managerId)
      .gte('start_time', `${date}T00:00:00.000Z`)
      .lte('end_time', `${date}T23:59:59.999Z`);

    if (consultantEventsError) {
      console.error("[get-manager-availability] Error fetching consultant events:", consultantEventsError);
      throw consultantEventsError;
    }

    const busySlots = [
      ...(leadMeetings || []).map(m => ({ start: m.meeting_start_time, end: m.meeting_end_time })),
      ...(consultantEvents || []).map(e => ({ start: e.start_time, end: e.end_time })),
    ];

    console.log("[get-manager-availability] Busy slots found:", busySlots);

    return new Response(JSON.stringify({ busySlots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[get-manager-availability] Error in Edge Function:', error.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch manager availability.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});