// ... (mantenha os imports existentes)

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

// Dentro do AppProvider:

const addProcess = useCallback(async (processData: any, filesToAdd?: any[], linksToAdd?: any[]) => {
  if (!user) throw new Error("Não autenticado.");
  
  console.log("[AppContext] Iniciando addProcess", { processData, filesCount: filesToAdd?.length });

  // 1. Salva o Processo (Usa o ID do usuário logado para evitar erro de RLS)
  const { data: process, error } = await supabase
    .from('processes')
    .insert({ ...processData, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[AppContext] Erro ao inserir processo:", error);
    throw error;
  }

  const attachments: ProcessAttachment[] = [];

  // 2. Processa Arquivos via Edge Function
  if (filesToAdd && filesToAdd.length > 0) {
    for (const item of filesToAdd) {
      try {
        console.log(`[AppContext] Fazendo upload do arquivo: ${item.file.name}`);
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('processId', process.id);

        const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('upload-process-file', {
          body: formData,
        });

        if (uploadError) {
          console.error(`[AppContext] Erro no upload (${item.file.name}):`, uploadError);
          throw uploadError;
        }

        console.log(`[AppContext] Resposta do upload (${item.file.name}):`, uploadRes);

        // 3. Salva o registro do anexo no banco
        const { data: attachment, error: attachError } = await supabase
          .from('process_attachments')
          .insert({
            process_id: process.id,
            file_url: uploadRes.publicUrl,
            file_type: item.type,
            file_name: item.file.name
          })
          .select()
          .single();

        if (attachError) {
          console.error("[AppContext] Erro ao inserir anexo no banco:", attachError);
          throw attachError;
        } else if (attachment) {
          attachments.push(attachment);
        }
      } catch (err) {
        console.error("[AppContext] Falha no fluxo do anexo:", err);
        toast.error(`Falha ao salvar anexo: ${item.file.name}`);
      }
    }
  }

  // 4. Processa Links
  if (linksToAdd && linksToAdd.length > 0) {
    for (const item of linksToAdd) {
      const { data: attachment, error: attachError } = await supabase
        .from('process_attachments')
        .insert({
          process_id: process.id,
          file_url: item.url,
          file_type: 'link',
          file_name: 'Link Externo'
        })
        .select()
        .single();
      
      if (!attachError && attachment) attachments.push(attachment);
    }
  }

  const newProcess = { ...process, attachments };
  setProcesses(prev => [newProcess, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
  return newProcess;
}, [user]);

const updateProcess = useCallback(async (id: string, updates: any, filesToAdd?: any[], linksToAdd?: any[]) => {
  console.log("[AppContext] Iniciando updateProcess", { id, filesCount: filesToAdd?.length });

  const { data: process, error } = await supabase
    .from('processes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Mesma lógica de upload de arquivos e links do addProcess...
  if (filesToAdd && filesToAdd.length > 0) {
    for (const item of filesToAdd) {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('processId', id);

        const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('upload-process-file', {
          body: formData,
        });

        if (!uploadError) {
          await supabase.from('process_attachments').insert({
            process_id: id,
            file_url: uploadRes.publicUrl,
            file_type: item.type,
            file_name: item.file.name
          });
        }
      } catch (err) {
        console.error("[AppContext] Erro no upload de anexo:", err);
      }
    }
  }

  if (linksToAdd && linksToAdd.length > 0) {
    for (const item of linksToAdd) {
      await supabase.from('process_attachments').insert({
        process_id: id,
        file_url: item.url,
        file_type: 'link',
        file_name: 'Link Externo'
      });
    }
  }
  
  const { data: allAttachments } = await supabase.from('process_attachments').select('*').eq('process_id', id);
  const updatedProcess = { ...process, attachments: allAttachments || [] };
  setProcesses(prev => prev.map(p => p.id === id ? updatedProcess : p).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
  return updatedProcess;
}, []);

const deleteProcessAttachment = useCallback(async (attachmentId: string) => {
  const { error } = await supabase.from('process_attachments').delete().eq('id', attachmentId);
  if (error) throw error;
  setProcesses(prev => prev.map(p => ({
    ...p,
    attachments: p.attachments?.filter(a => a.id !== attachmentId)
  })));
}, []);

// ... (mantenha o restante do arquivo)