import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Process, ProcessPage, Block, BlockType } from '@/types';
import { Loader2, Plus, FileText, Share2, ArrowLeft, Trash2 } from 'lucide-react';
import { Editor } from './processos/components/Editor';
import { SlashMenu } from './processos/components/SlashMenu';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import toast from 'react-hot-toast';

export const ProcessEditorPage = () => {
  const { processId } = useParams<{ processId: string }>();
  const [process, setProcess] = useState<Process | null>(null);
  const [pages, setPages] = useState<ProcessPage[]>([]);
  const [activePage, setActivePage] = useState<ProcessPage | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const fetchProcessData = useCallback(async () => {
    if (!processId) return;
    setIsLoading(true);
    try {
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .select('*')
        .eq('id', processId)
        .single();
      if (processError) throw processError;
      setProcess(processData);

      const { data: pagesData, error: pagesError } = await supabase
        .from('process_pages')
        .select('*')
        .eq('process_id', processId)
        .order('sort_order');
      if (pagesError) throw pagesError;
      setPages(pagesData);

      if (pagesData.length > 0) {
        setActivePage(pagesData[0]);
        setBlocks(pagesData[0].blocks || []);
      } else {
        // Create a default page if none exist
        const { data: newPage, error: newPageError } = await supabase
          .from('process_pages')
          .insert({ process_id: processId, title: 'Página Inicial', sort_order: 0, blocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] })
          .select()
          .single();
        if (newPageError) throw newPageError;
        setPages([newPage]);
        setActivePage(newPage);
        setBlocks(newPage.blocks);
      }
    } catch (error: any) {
      toast.error(`Erro ao carregar processo: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    fetchProcessData();
  }, [fetchProcessData]);

  const debouncedSave = useDebouncedCallback(async (pageId: string, newBlocks: Block[]) => {
    const { error } = await supabase
      .from('process_pages')
      .update({ blocks: newBlocks, updated_at: new Date().toISOString() })
      .eq('id', pageId);
    if (error) {
      toast.error('Erro ao salvar alterações.');
    } else {
      toast.success('Alterações salvas!');
    }
  }, 1000);

  useEffect(() => {
    if (activePage) {
      debouncedSave(activePage.id, blocks);
    }
  }, [blocks, activePage, debouncedSave]);

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
  };

  const handleBlockUpdate = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleBlockAdd = (currentBlockId: string) => {
    const index = blocks.findIndex(b => b.id === currentBlockId);
    const newBlock: Block = { id: crypto.randomUUID(), type: 'text', content: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setTimeout(() => setFocusedBlockId(newBlock.id), 0);
  };

  const handleBlockDelete = (id: string) => {
    if (blocks.length === 1) return;
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = blocks.filter(b => b.id !== id);
    setBlocks(newBlocks);
    if (index > 0) {
      setTimeout(() => setFocusedBlockId(newBlocks[index - 1].id), 0);
    }
  };

  const handleTypeChange = (id: string, type: BlockType) => {
    if (type === 'image' || type === 'pdf') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = type === 'image' ? 'image/*' : 'application/pdf';
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleUploadFile(id, file);
        }
      };
      fileInput.click();
    }
    handleBlockUpdate(id, { type });
    setShowSlashMenu(false);
  };

  const handleUploadFile = async (id: string, file: File) => {
    setUploadingBlockId(id);
    try {
      const path = `process_files/${processId}/${id}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('form_uploads').getPublicUrl(path);
      handleBlockUpdate(id, { fileUrl: urlData.publicUrl, fileName: file.name, type: file.type.startsWith('image') ? 'image' : 'pdf' });
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploadingBlockId(null);
    }
  };

  useEffect(() => {
    const focusedBlock = blocks.find(b => b.id === focusedBlockId);
    if (focusedBlock?.content.endsWith('/')) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSlashMenuPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        setShowSlashMenu(true);
      }
    } else {
      setShowSlashMenu(false);
    }
  }, [blocks, focusedBlockId]);

  const handleAddNewPage = async () => {
    if (!processId) return;
    const title = prompt("Título da nova página:");
    if (title && title.trim()) {
      const { data, error } = await supabase
        .from('process_pages')
        .insert({ process_id: processId, title, sort_order: pages.length, blocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] })
        .select()
        .single();
      if (error) {
        toast.error('Erro ao criar página.');
      } else {
        setPages(prev => [...prev, data]);
        setActivePage(data);
        setBlocks(data.blocks);
        toast.success('Página criada!');
      }
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) {
      toast.error("Não é possível excluir a última página.");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir esta página?")) {
      const { error } = await supabase.from('process_pages').delete().eq('id', pageId);
      if (error) {
        toast.error('Erro ao excluir página.');
      } else {
        const newPages = pages.filter(p => p.id !== pageId);
        setPages(newPages);
        if (activePage?.id === pageId) {
          setActivePage(newPages[0]);
          setBlocks(newPages[0].blocks);
        }
        toast.success('Página excluída!');
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900">
      <aside className="w-64 h-full bg-gray-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <Link to="/gestor/processos" className="flex items-center text-sm text-gray-500 hover:text-brand-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Processos
          </Link>
          <h2 className="text-lg font-bold mt-2 text-gray-900 dark:text-white truncate">{process?.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {pages.map(page => (
            <div key={page.id} className="group flex items-center">
              <button
                onClick={() => { setActivePage(page); setBlocks(page.blocks); }}
                className={`flex-1 flex items-center space-x-2 p-2 rounded text-left text-sm ${activePage?.id === page.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                <FileText className="w-4 h-4" />
                <span className="truncate">{page.title}</span>
              </button>
              <button onClick={() => handleDeletePage(page.id)} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={handleAddNewPage} className="w-full flex items-center justify-center space-x-2 text-sm text-brand-600 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 p-2 rounded">
            <Plus className="w-4 h-4" />
            <span>Nova Página</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">{activePage?.title}</h1>
          <Editor
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            onBlockUpdate={handleBlockUpdate}
            onBlockAdd={handleBlockAdd}
            onBlockDelete={handleBlockDelete}
            onUploadFile={handleUploadFile}
            focusedBlockId={focusedBlockId}
            setFocusedBlockId={setFocusedBlockId}
            uploadingBlockId={uploadingBlockId}
          />
        </div>
      </main>
      {showSlashMenu && focusedBlockId && (
        <div
          className="fixed z-50"
          style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
        >
          <SlashMenu onSelect={(type) => handleTypeChange(focusedBlockId, type)} />
        </div>
      )}
    </div>
  );
};