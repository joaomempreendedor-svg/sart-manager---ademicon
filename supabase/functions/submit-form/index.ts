import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID do gestor principal para vincular os cadastros do formulário
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; // <--- ATUALIZADO COM O SEU ID DE GESTOR!

// Helper function to sanitize filenames
const sanitizeFilename = (filename: string): string => {
  return filename
    .normalize("NFD") // Normalize to decompose combined characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-zA-Z0-9.]/g, "-") // Replace non-alphanumeric (except dot) with hyphen
    .replace(/--+/g, "-") // Replace multiple hyphens with a single one
    .replace(/^-/, "") // Remove leading hyphen
    .replace(/-\./, ".") // Fix hyphen before dot
    .toLowerCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cadastroData, files } = await req.json();
    console.log("[submit-form] Received request with cadastroData:", cadastroData);
    console.log("[submit-form] Received files:", files.map((f:any) => f.fileName));

    if (!cadastroData) {
      console.error("[submit-form] Missing cadastroData.");
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
    console.log("[submit-form] Attempting to insert into form_submissions...");
    const { data: cadastro, error: cadastroError } = await supabaseAdmin
      .from('form_submissions')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, data: cadastroData, is_complete: files.length > 0 })
      .select('id')
      .single();

    if (cadastroError) {
      console.error("[submit-form] Error inserting cadastro:", cadastroError);
      throw cadastroError;
    }
    console.log("[submit-form] Cadastro inserted successfully. ID:", cadastro.id);

    const cadastroId = cadastro.id;
    const uploadedFilesMetadata = [];

    // 2. Processar e fazer upload dos arquivos para o Supabase Storage
    for (const fileData of files) {
      const { fieldName, fileName: originalFileName, fileType, fileContent } = fileData;
      const fileBuffer = Uint8Array.from(fileContent);

      const sanitizedFileName = sanitizeFilename(originalFileName); // Sanitize the filename
      const filePath = `${cadastroId}/${fieldName}-${sanitizedFileName}`; // Removed 'public/' prefix
      console.log(`[submit-form] Attempting to upload file: ${originalFileName} (sanitized: ${sanitizedFileName}) to ${filePath}`);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('form_uploads')
        .upload(filePath, fileBuffer, {
          contentType: fileType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`[submit-form] Error uploading file ${originalFileName}:`, uploadError);
        throw uploadError;
      }
      console.log(`[submit-form] File ${originalFileName} uploaded successfully.`);

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('form_uploads')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        console.error(`[submit-form] Could not get public URL for ${originalFileName}.`);
        throw new Error(`Não foi possível obter a URL pública para ${originalFileName}.`);
      }
      console.log(`[submit-form] Public URL for ${originalFileName}: ${publicUrlData.publicUrl}`);

      // 3. Inserir metadados do arquivo na tabela form_files
      console.log(`[submit-form] Attempting to insert file record for ${originalFileName}...`);
      const { data: fileRecord, error: fileRecordError } = await supabaseAdmin
        .from('form_files')
        .insert({
          submission_id: cadastroId,
          field_name: fieldName,
          file_name: originalFileName, // Store original file name in DB
          file_url: publicUrlData.publicUrl,
        })
        .select('id')
        .single();

      if (fileRecordError) {
        console.error(`[submit-form] Error inserting file record for ${originalFileName}:`, fileRecordError);
        throw fileRecordError;
      }
      console.log(`[submit-form] File record for ${originalFileName} inserted successfully. ID: ${fileRecord.id}`);
      uploadedFilesMetadata.push({ id: fileRecord.id, fileName: originalFileName, fileUrl: publicUrlData.publicUrl });
    }

    // 4. Criar notificação para o gestor
    const clientName = cadastroData.nome_completo || 'Desconhecido';
    const notificationTitle = `Novo Cadastro de Formulário: ${clientName}`;
    const notificationDescription = `Um novo formulário foi enviado e aguarda revisão.`;
    const notificationLink = `/gestor/form-cadastros`;
    console.log(`[submit-form] Attempting to insert notification for user ${JOAO_GESTOR_AUTH_ID}...`); // Adicionado log aqui

    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: JOAO_GESTOR_AUTH_ID,
        type: 'form_submission',
        title: notificationTitle,
        description: notificationDescription,
        date: new Date().toISOString().split('T')[0],
        link: notificationLink,
        is_read: false,
      });

    if (notificationError) {
      console.error("[submit-form] Error creating notification:", notificationError);
      // Não lançar erro aqui para não impedir o envio do formulário
    } else {
      console.log("[submit-form] Notification created successfully.");
    }

    return new Response(JSON.stringify({
      message: 'Formulário e arquivos enviados com sucesso!',
      cadastroId,
      uploadedFiles: uploadedFilesMetadata,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[submit-form] Erro crítico na Edge Function:', JSON.stringify(error, Object.getOwnPropertyNames(error)), { error });
    return new Response(JSON.stringify({ error: error.message || 'Falha ao processar cadastro do formulário.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});