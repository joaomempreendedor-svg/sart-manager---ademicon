import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, Plus, Trash2, GripVertical, Type, Pilcrow, CheckSquare, Image as ImageIcon, FileText, Download } from 'lucide-react';
import { Process, ProcessBlock } from '@/types';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFilename } from '@/utils/fileUtils';
import { SlashCommandMenu } from '@/components/gestor/SlashCommandMenu';

const areBlocksEqual = (prevProps: any, nextProps: any) => {
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.type === nextProps.block.type &&
    prevProps.block.content === nextProps.block.content &&
    prevProps.block.data.checked === nextProps.block.data.checked &&
    prevProps.isUploading === nextProps.isUploading
  );
};

const BlockComponent = React.memo(React.forwardRef<
  HTMLDivElement,
  {
    block: ProcessBlock;
    onUpdate: (id: string, content: string) => void;
    onToggleCheck: (id: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
    onFocus: () => void;
    onKeyUp: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    isUploading: boolean;
  }
>(({ block, onUpdate, onToggleCheck, onKeyDown, onFocus, onKeyUp, isUploading }, ref) => {
  
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    onUpdate(block.id, e.currentTarget.innerHTML);
  };

  switch (block.type) {
    case 'heading1':
      return (
        <h1
          ref={ref as any}
          data-block-id={block.id}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={(e) => onKeyDown(e, block.id)}
          onKeyUp={onKeyUp}
          onFocus={onFocus}
          className="text-3xl font-bold outline-none focus:ring-2 focus:ring-brand-500 rounded px-1"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case 'text':
      return (
        <p
          ref={ref as any}
          data-block-id={block.id}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={(e) => onKeyDown(e, block.id)}
          onKeyUp={onKeyUp}
          onFocus={onFocus}
          className="text-base outline-none focus:ring-2 focus:ring-brand-500 rounded px-1"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case 'todo':
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={block.data.checked || false}
            onChange={() => onToggleCheck(block.id)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span
            ref={ref as any}
            data-block-id={block.id}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={(e) => onKeyDown(e, block.id)}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            className={`flex-grow outline-none focus:ring-2 focus:ring-brand-500 rounded px-1 ${block.data.checked ? 'line-through text-gray-400' : ''}`}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        </div>
      );
    case 'image':
      return (
        <div ref={ref as any} tabIndex={0} onKeyDown={(e) => onKeyDown(e, block.id)} onFocus={onFocus} className="my-2 outline-none focus:ring-2 focus:ring-brand-500 rounded">
          {isUploading || !block.content ? (
            <div className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Enviando imagem...</span>
            </div>
          ) : (
            <a href={block.content} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
              <ImageIcon className="w-8 h-8 text-green-500 mr-4" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{block.data.name || 'Imagem'}</p>
                <p className="text-xs text-gray-500">Clique para abrir ou baixar</p>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </a>
          )}
        </div>
      );
    case 'pdf':
      return (
        <div ref={ref as any} tabIndex={0} onKeyDown={(e) => onKeyDown(e, block.id)} onFocus={onFocus} className="my-2 outline-none focus:ring-2 focus:ring-brand-500 rounded">
          {isUploading || !block.content ? (
            <div className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Enviando PDF...</span>
            </div>
          ) : (
            <a href={block.content} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
              <FileText className="w-8 h-8 text-red-500 mr-4" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{block.data.name || 'Documento PDF'}</p>
                <p className="text-xs text-gray-500">Clique para abrir ou baixar</p>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </a>
          )}
        </div>
      );
    default:
      return null;
  }
}), areBlocksEqual);

export const ProcessoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { processes, updateProcess, isDataLoading } = useApp();

  const process = useMemo(() => processes.find(p => p.id === id), [processes, id]);
  const [blocks, setBlocks] = useState<ProcessBlock[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const hasUnsavedChanges = useRef(false);
  const selectionRef = useRef<Range | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (process?.content && Array.isArray(process.content)) {
      setBlocks(process.content);
    } else if (process) {
      setBlocks([]);
    }
  }, [process]);

  const saveBlocks = useCallback(async (blocksToSave: ProcessBlock[]) => {
    if (!process || !hasUnsavedChanges.current) return;
    try {
      await updateProcess(process.id, { content: blocksToSave });
      hasUnsavedChanges.current = false;
      toast.success("Alterações salvas!", { id: 'save-toast', duration: 2000 });
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`, { id: 'save-toast' });
    }
  }, [process, updateProcess]);

  const debouncedSave = useDebouncedCallback(saveBlocks, 1500);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0);
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (selectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selectionRef.current);
    }
  }, []);

  const updateBlocks = (updater: (prevBlocks: ProcessBlock[]) => ProcessBlock[], options: { saveCursor?: boolean } = {}) => {
    if (options.saveCursor) {
      saveSelection();
    }
    const newBlocks = updater(blocksRef.current);
    setBlocks(newBlocks);
    hasUnsavedChanges.current = true;
    debouncedSave(newBlocks);
  };

  useLayoutEffect(() => {
    restoreSelection();
  }, [blocks, restoreSelection]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        debouncedSave.flush();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedChanges.current) {
        debouncedSave.flush();
      }
    };
  }, [debouncedSave]);

  const addBlock = useCallback((type: ProcessBlock['type'], index: number) => {
    const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { checked: false } };
    updateBlocks(currentBlocks => {
      const newBlocks = [...currentBlocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    }, { saveCursor: true });
    setTimeout(() => {
      const newBlockEl = document.querySelector(`[data-block-id="${newBlock.id}"]`);
      if (newBlockEl) (newBlockEl as HTMLElement).focus();
    }, 50);
  }, [updateBlocks]);

  const handleAddFileBlock = useCallback((type: 'image' | 'pdf', index: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'application/pdf';
      fileInputRef.current.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file || !process) return;
        const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { name: file.name } };
        setUploadingBlockId(newBlock.id);
        updateBlocks(currentBlocks => {
          const newBlocks = [...currentBlocks];
          newBlocks.splice(index + 1, 0, newBlock);
          return newBlocks;
        });
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('processId', process.id);
          const { data, error } = await supabase.functions.invoke('upload-process-file', { body: formData });
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          const publicUrl = data.publicUrl;
          updateBlocks(currentBlocks => currentBlocks.map(b => b.id === newBlock.id ? { ...b, content: publicUrl } : b));
        } catch (error: any) {
          toast.error(`Falha no upload do arquivo: ${error.message}`);
          updateBlocks(currentBlocks => currentBlocks.filter(b => b.id !== newBlock.id));
        } finally {
          setUploadingBlockId(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      fileInputRef.current.click();
    }
  }, [process?.id, updateBlocks]);

  useEffect(() => {
    if (!isDataLoading && process && blocks.length === 0) {
      addBlock('text', -1);
    }
  }, [isDataLoading, process, blocks.length, addBlock]);

  const updateBlockContent = useCallback((id: string, content: string) => {
    hasUnsavedChanges.current = true;
    const newBlocks = blocksRef.current.map(block => block.id === id ? { ...block, content } : block);
    setBlocks(newBlocks);
    debouncedSave(newBlocks);
  }, [debouncedSave]);

  const toggleTodoCheck = useCallback((id: string) => {
    updateBlocks(currentBlocks => currentBlocks.map(block =>
      block.id === id ? { ...block, data: { ...block.data, checked: !block.data.checked } } : block
    ));
  }, [updateBlocks]);

  const deleteBlock = useCallback((id: string) => {
    updateBlocks(currentBlocks => currentBlocks.filter(block => block.id !== id));
  }, [updateBlocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    saveSelection();
    if (e.key === '/') {
      const rect = e.currentTarget.getBoundingClientRect();
      setSlashMenuPosition({ top: rect.top + window.scrollY + 30, left: rect.left });
      setSlashMenuBlockId(id);
      setIsSlashMenuOpen(true);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentContent = e.currentTarget.innerHTML;
      updateBlockContent(id, currentContent);
      const currentIndex = blocksRef.current.findIndex(b => b.id === id);
      const currentBlock = blocksRef.current[currentIndex];
      const newBlockType = currentBlock.type === 'todo' ? 'todo' : 'text';
      addBlock(newBlockType, currentIndex);
    } else if (e.key === 'Backspace' && e.currentTarget.innerHTML === '' && blocksRef.current.length > 1) {
      e.preventDefault();
      const currentIndex = blocksRef.current.findIndex(b => b.id === id);
      if (currentIndex > 0) {
        const prevBlockId = blocksRef.current[currentIndex - 1].id;
        deleteBlock(id);
        setTimeout(() => {
          const prevBlockEl = document.querySelector(`[data-block-id="${prevBlockId}"]`);
          if (prevBlockEl) {
            (prevBlockEl as HTMLElement).focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(prevBlockEl);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }, 50);
      }
    }
  }, [saveSelection, updateBlockContent, addBlock, deleteBlock]);

  const handleSelectSlashCommand = (type: ProcessBlock['type']) => {
    if (!slashMenuBlockId) return;
    const index = blocks.findIndex(b => b.id === slashMenuBlockId);
    if (type === 'image' || type === 'pdf') {
      updateBlocks(currentBlocks => currentBlocks.filter(b => b.id !== slashMenuBlockId));
      handleAddFileBlock(type, index - 1);
    } else {
      updateBlocks(currentBlocks => currentBlocks.map(b => b.id === slashMenuBlockId ? { ...b, type, content: '' } : b));
      setTimeout(() => {
        const newBlockEl = document.querySelector(`[data-block-id="${slashMenuBlockId}"]`);
        if (newBlockEl) (newBlockEl as HTMLElement).focus();
      }, 50);
    }
    setIsSlashMenuOpen(false);
  };

  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) setIsSlashMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSlashMenuOpen(false); };
    document.addEventListener('mousedown', handleCloseMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isDataLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]"><Loader2 className="w-12 h-12 animate-spin text-brand-500" /></div>;
  }
  if (!process) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-500">Processo não encontrado</h1>
        <button onClick={() => navigate('/gestor/processos')} className="mt-4 flex items-center text-brand-600 hover:underline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <input type="file" ref={fileInputRef} className="hidden" />
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/gestor/processos')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Processos
        </button>
      </div>
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">{process.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{process.description}</p>
      </div>
      <div ref={editorRef} className="space-y-2">
        {blocks.map((block, index) => (
          <div key={block.id} className="flex items-start space-x-2 group" onMouseEnter={() => setHoveredBlockId(block.id)} onMouseLeave={() => setHoveredBlockId(null)}>
            <div className="flex items-center h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => addBlock('text', index)}><Plus className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab"><GripVertical className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1">
              <BlockComponent 
                block={block} 
                onUpdate={updateBlockContent} 
                onToggleCheck={toggleTodoCheck}
                onKeyDown={handleKeyDown}
                onKeyUp={saveSelection}
                onFocus={() => setHoveredBlockId(block.id)}
                isUploading={uploadingBlockId === block.id}
              />
            </div>
            <div className="flex items-center h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBlock(block.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center space-x-2">
        <Button variant="outline" onClick={() => addBlock('heading1', blocks.length - 1)} className="flex items-center space-x-1"><Type className="w-4 h-4" /><span>Título</span></Button>
        <Button variant="outline" onClick={() => addBlock('text', blocks.length - 1)} className="flex items-center space-x-1"><Pilcrow className="w-4 h-4" /><span>Texto</span></Button>
        <Button variant="outline" onClick={() => addBlock('todo', blocks.length - 1)} className="flex items-center space-x-1"><CheckSquare className="w-4 h-4" /><span>Tarefa</span></Button>
        <Button variant="outline" onClick={() => handleAddFileBlock('image', blocks.length - 1)} className="flex items-center space-x-1"><ImageIcon className="w-4 h-4" /><span>Imagem</span></Button>
        <Button variant="outline" onClick={() => handleAddFileBlock('pdf', blocks.length - 1)} className="flex items-center space-x-1"><FileText className="w-4 h-4" /><span>PDF</span></Button>
      </div>
      <SlashCommandMenu ref={slashMenuRef} isOpen={isSlashMenuOpen} position={slashMenuPosition} onSelect={handleSelectSlashCommand} />
    </div>
  );
};