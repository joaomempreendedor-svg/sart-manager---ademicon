import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sanitizeFilename = (filename: string): string => {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-/, "")
    .replace(/-\./, ".")
    .toLowerCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const processId = formData.get('processId') as string;
    const assetType = formData.get('assetType') as 'cover' | 'attachment';
    const attachmentType = formData.get('attachmentType') as string;

    if (!file || !processId || !assetType) {
      throw new Error('Missing file, processId, or assetType');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sanitizedFileName = sanitizeFilename(file.name);
    let filePath = '';
    if (assetType === 'cover') {
      filePath = `${user.id}/process_covers/${processId}-${sanitizedFileName}`;
    } else {
      filePath = `${user.id}/process_files/${processId}/${Date.now()}-${sanitizedFileName}`;
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('form_uploads')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('form_uploads')
      .getPublicUrl(filePath);

    if (!publicUrlData) {
      throw new Error('Could not get public URL for the uploaded file.');
    }

    if (assetType === 'attachment') {
      const { data: attachment, error: attachError } = await supabaseAdmin
        .from('process_attachments')
        .insert({
          process_id: processId,
          file_url: publicUrlData.publicUrl,
          file_type: attachmentType,
          file_name: file.name,
        })
        .select()
        .single();
      
      if (attachError) throw attachError;

      return new Response(JSON.stringify({ attachment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ publicUrl: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[upload-process-assets] Error:', error.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to process file upload.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});