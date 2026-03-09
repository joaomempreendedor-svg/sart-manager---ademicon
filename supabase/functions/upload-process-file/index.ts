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

    console.log(`[upload-process-file] Recebido arquivo: ${file?.name}, Processo: ${processId}`);

    if (!file || !processId) {
      throw new Error("Arquivo ou ID do processo ausente no FormData.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Sanitização básica do nome do arquivo
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
    const filePath = `process_files/${processId}/${Date.now()}-${sanitizedName}`;

    console.log(`[upload-process-file] Fazendo upload para: ${filePath}`);

    // 1. Upload para o Storage (usando bucket form_uploads que já existe)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('form_uploads')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("[upload-process-file] Erro no Storage:", uploadError);
      throw uploadError;
    }

    // 2. Obter URL Pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('form_uploads')
      .getPublicUrl(filePath);

    console.log(`[upload-process-file] Sucesso! URL gerada: ${publicUrl}`);

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