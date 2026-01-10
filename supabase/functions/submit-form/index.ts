import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID do gestor principal para vincular os cadastros do formulário
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; // <--- ATUALIZADO COM O SEU ID DE GESTOR!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cadastroData, files } = await req.json();

    if (!cadastroData) {
      return new Response(JSON.stringify({ error: 'Dados do formulário são obrigatórios.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Inserir os dados do formulário na tabela form_submissions
    const { data: cadastro, error: cadastroError } = await supabaseAdmin
      .from('form_submissions')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, data: cadastroData, is_complete: files.length > 0 }) // Assume completo se tiver arquivos
      .select('id')
      .single();

    if (cadastroError) {
      console.error("Erro ao inserir cadastro:", cadastroError);
      throw cadastroError;
    }

    const cadastroId = cadastro.id;
    const uploadedFilesMetadata = [];

    // 2. Processar e fazer upload dos arquivos para o Supabase Storage
    for (const fileData of files) {
      const { fieldName, fileName, fileType, fileContent } = fileData;
      const fileBuffer = Uint8Array.from(fileContent);

      const filePath = `public/${cadastroId}/${fieldName}-${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('form_uploads')
        .upload(filePath, fileBuffer, {
          contentType: fileType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Erro ao fazer upload do arquivo ${fileName}:`, uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('form_uploads')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error(`Não foi possível obter a URL pública para ${fileName}.`);
      }

      // 3. Inserir metadados do arquivo na tabela form_files
      const { data: fileRecord, error: fileRecordError } = await supabaseAdmin
        .from('form_files')
        .insert({
          submission_id: cadastroId,
          field_name: fieldName,
          file_name: fileName,
          file_url: publicUrlData.publicUrl,
        })
        .select('id')
        .single();

      if (fileRecordError) {
        console.error(`Erro ao inserir registro do arquivo ${fileName}:`, fileRecordError);
        throw fileRecordError;
      }
      uploadedFilesMetadata.push({ id: fileRecord.id, fileName, fileUrl: publicUrlData.publicUrl });
    }

    return new Response(JSON.stringify({
      message: 'Formulário e arquivos enviados com sucesso!',
      cadastroId,
      uploadedFiles: uploadedFilesMetadata,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na Edge Function submit-form:', error);
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar cadastro do formulário.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});