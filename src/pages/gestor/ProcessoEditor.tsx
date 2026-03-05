import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

const BlockComponent = React.memo(React.forwardRef<
  HTMLDivElement,
  {
    block: ProcessBlock;
    onUpdate: (id: string, content: string) => void;
    onToggleCheck: (id: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
    onFocus: () => void;
    isUploading: boolean;
  }
>(({ block, onUpdate, onToggleCheck, onKeyDown, onFocus, isUploading }, ref) => {
  
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
}));

export const ProcessoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { processes, updateProcess, isDataLoading } = useApp();

  const process = useMemo(() => processes.find(p => p.id === id), [processes, id]);
  const [blocks, setBlocks] = useState<ProcessBlock[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const hasUnsavedChanges = useRef(false);

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

  const debouncedSave = useDebouncedCallback((processId: string, updatedBlocks: ProcessBlock[]) => {
    if (!hasUnsavedChanges.current) return;
    updateProcess(processId, { content: updatedBlocks })
      .then(() => {
        hasUnsavedChanges.current = false;
      })
      .catch(err => {
        toast.error(`Erro ao salvar: ${err.message}`);
      });
  }, 1500);

  const updateBlocksAndSave = (newBlocks: ProcessBlock[] | ((prev: ProcessBlock[]) => ProcessBlock[])) => {
    setBlocks(newBlocks);
    hasUnsavedChanges.current = true;
    if (process) {
      setBlocks(currentBlocks => {
        debouncedSave(process.id, currentBlocks);
        return currentBlocks;
      });
    }
  };

  const addBlock = useCallback((type: ProcessBlock['type'], index: number) => {
    const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { checked: false } };
    
    updateBlocksAndSave(currentBlocks => {
        const newBlocks = [...currentBlocks];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
    });
    
    setTimeout(() => {
      const newBlockEl = document.querySelector(`[data-block-id="${newBlock.id}"]`);
      if (newBlockEl) {
        (newBlockEl as HTMLElement).focus();
      }
    }, 50);
  }, []);

  const handleAddFileBlock = useCallback((type: 'image' | 'pdf', index: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'application/pdf';
      fileInputRef.current.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file || !process) return;

        const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { name: file.name } };
        
        setUploadingBlockId(newBlock.id);
        updateBlocksAndSave(currentBlocks => {
          const newBlocks = [...currentBlocks];
          newBlocks.splice(index + 1, 0, newBlock);
          return newBlocks;
        });

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('processId', process.id);

          const { data, error } = await supabase.functions.invoke('upload-process-file', {
            body: formData,
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          const publicUrl = data.publicUrl;

          updateBlocksAndSave(currentBlocks => currentBlocks.map(b => b.id === newBlock.id ? { ...b, content: publicUrl } : b));

        } catch (error: any) {
          toast.error(`Falha no upload do arquivo: ${error.message}`);
          updateBlocksAndSave(currentBlocks => currentBlocks.filter(b => b.id !== newBlock.id));
        } finally {
          setUploadingBlockId(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      fileInputRef.current.click();
    }
  }, [process?.id]);

  useEffect(() => {
    if (!isDataLoading && process && blocks.length === 0) {
      addBlock('text', -1);
    }
  }, [isDataLoading, process, blocks.length, addBlock]);

  const updateBlockContent = useCallback((id: string, content: string) => {
    updateBlocksAndSave(currentBlocks => {
        const currentBlock = currentBlocks.find(b => b.id === id);
        if (currentBlock && currentBlock.content === content) return currentBlocks;
        return currentBlocks.map(block =>
            block.id === id ? { ...block, content } : block
        );
    });
  }, []);

  const toggleTodoCheck = useCallback((id: string) => {
    updateBlocksAndSave(currentBlocks => currentBlocks.map(block =>
      block.id === id ? { ...block, data: { ...block.data, checked: !block.data.checked } } : block
    ));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    updateBlocksAndSave(currentBlocks => currentBlocks.filter(block => block.id !== id));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    const currentBlocks = blocksRef.current;
    const currentIndex = currentBlocks.findIndex(b => b.id === id);
    const currentBlock = currentBlocks[currentIndex];

    if (!currentBlock) return;

    if (e.key === '/') {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setSlashMenuPosition({ top: rect.top + window.scrollY + 30, left: rect.left });
      setSlashMenuBlockId(id);
      setIsSlashMenuOpen(true);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      updateBlockContent(id, e.currentTarget.innerHTML);
      
      const newBlockType = currentBlock.type === 'todo' ? 'todo' : 'text';
      addBlock(newBlockType, currentIndex);

    } else if (e.key === 'Backspace' && (e.currentTarget.innerHTML === '' || !['heading1', 'text', 'todo'].includes(currentBlock.type))) {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevBlockId = currentBlocks[currentIndex - 1].id;
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
      } else if (currentBlocks.length > 1) {
        deleteBlock(id);
      }
    }
  }, [addBlock, deleteBlock, updateBlockContent]);

  const handleSelectSlashCommand = (type: ProcessBlock['type']) => {
    if (!slashMenuBlockId) return;

    const index = blocks.findIndex(b => b.id === slashMenuBlockId);

    if (type === 'image' || type === 'pdf') {
      updateBlocksAndSave(blocks.filter(b => b.id !== slashMenuBlockId));
      handleAddFileBlock(type, index - 1);
    } else {
      updateBlocksAndSave(blocks.map(b => b.id === slashMenuBlockId ? { ...b, type, content: '' } : b));
      setTimeout(() => {
        const newBlockEl = document.querySelector(`[data-block-id="${slashMenuBlockId}"]`);
        if (newBlockEl) {
          (newBlockEl as HTMLElement).focus();
        }
      }, 50);
    }
    
    setIsSlashMenuOpen(false);
  };

  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setIsSlashMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSlashMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleCloseMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-500">Processo não encontrado</h1>
        <button onClick={() => navigate('/gestor/processos')} className="mt-4 flex items-center text-brand-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a lista de processos
        </button>
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
        <div className="text-sm text-gray-400 h-5">
          {/* Saving status removed */}
        </div>
      </div>
      
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">{process.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{process.description}</p>
      </div>

      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div 
            key={block.id} 
            className="flex items-start space-x-2 group"
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
          >
            <div className="flex items-center h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => addBlock('text', index)}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab">
                <GripVertical className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1">
              <BlockComponent 
                block={block} 
                onUpdate={updateBlockContent} 
                onToggleCheck={toggleTodoCheck}
                onKeyDown={handleKeyDown}
                onFocus={() => setHoveredBlockId(block.id)}
                isUploading={uploadingBlockId === block.id}
              />
            </div>
            <div className="flex items-center h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBlock(block.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
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

      <SlashCommandMenu
        ref={slashMenuRef}
        isOpen={isSlashMenuOpen}
        position={slashMenuPosition}
        onSelect={handleSelectSlashCommand}
      />
    </div>
  );
};