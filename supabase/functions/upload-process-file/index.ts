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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const processId = formData.get('processId') as string;

    console.log(`[upload-process-file] Iniciando upload para processo: ${processId}, arquivo: ${file.name}`);

    if (!file || !processId) {
      throw new Error("Arquivo ou ID do processo ausente.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
    const filePath = `process_files/${processId}/${Date.now()}-${sanitizedName}`;

    // 1. Upload para o Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('form_uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error("[upload-process-file] Erro no storage:", uploadError);
      throw uploadError;
    }

    // 2. Obter URL Pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('form_uploads')
      .getPublicUrl(filePath);

    console.log(`[upload-process-file] Upload concluído. URL: ${publicUrl}`);

    return new Response(
      JSON.stringify({ publicUrl, fileName: file.name, filePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[upload-process-file] Erro crítico:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})