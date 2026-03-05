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
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
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
          onInput={handleInput}
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
          onInput={handleInput}
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
            onInput={handleInput}
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
            <img src={block.content} alt={block.data.name || 'Imagem'} className="max-w-full rounded-lg" />
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
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasUnsavedChanges = useRef(false);
  const initialLoadRef = useRef(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (process?.content && Array.isArray(process.content)) {
      setBlocks(process.content);
    } else if (process) {
      setBlocks([]);
    }
    initialLoadRef.current = true;
  }, [process]);

  const debouncedSave = useDebouncedCallback((updatedBlocks: ProcessBlock[]) => {
    if (!process || !hasUnsavedChanges.current) return;
    setSavingStatus('saving');
    updateProcess(process.id, { content: updatedBlocks })
      .then(() => {
        setSavingStatus('saved');
        hasUnsavedChanges.current = false;
        setTimeout(() => setSavingStatus('idle'), 2000);
      })
      .catch(err => {
        toast.error(`Erro ao salvar: ${err.message}`);
        setSavingStatus('idle');
      });
  }, 1500);

  const updateBlocks = (newBlocks: ProcessBlock[]) => {
    setBlocks(newBlocks);
    hasUnsavedChanges.current = true;
    debouncedSave(newBlocks);
  };

  const addBlock = useCallback((type: ProcessBlock['type'], index: number) => {
    const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { checked: false } };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateBlocks(newBlocks);
    
    setTimeout(() => {
      const newBlockEl = document.querySelector(`[data-block-id="${newBlock.id}"]`);
      if (newBlockEl) {
        (newBlockEl as HTMLElement).focus();
      }
    }, 50);
  }, [blocks]);

  const handleAddFileBlock = (type: 'image' | 'pdf', index: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'application/pdf';
      fileInputRef.current.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !process) return;

        const newBlock: ProcessBlock = { id: crypto.randomUUID(), type, content: '', data: { name: file.name } };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        setBlocks(newBlocks);
        setUploadingBlockId(newBlock.id);

        try {
          const path = `process_files/${process.id}/${Date.now()}-${sanitizeFilename(file.name)}`;
          const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('form_uploads').getPublicUrl(path);
          const publicUrl = publicUrlData.publicUrl;

          const finalBlocks = newBlocks.map(b => b.id === newBlock.id ? { ...b, content: publicUrl } : b);
          updateBlocks(finalBlocks);

        } catch (error) {
          toast.error("Falha no upload do arquivo.");
          setBlocks(currentBlocks => currentBlocks.filter(b => b.id !== newBlock.id));
        } finally {
          setUploadingBlockId(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    if (!isDataLoading && process && blocks.length === 0) {
      addBlock('text', -1);
    }
  }, [isDataLoading, process, blocks.length, addBlock]);

  const updateBlockContent = useCallback((id: string, content: string) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, content } : block
    );
    updateBlocks(newBlocks);
  }, [blocks]);

  const toggleTodoCheck = useCallback((id: string) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, data: { ...block.data, checked: !block.data.checked } } : block
    );
    updateBlocks(newBlocks);
  }, [blocks]);

  const deleteBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter(block => block.id !== id);
    updateBlocks(newBlocks);
  }, [blocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    const currentIndex = blocks.findIndex(b => b.id === id);
    const currentBlock = blocks[currentIndex];

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock('text', currentIndex);
    } else if (e.key === 'Backspace' && (e.currentTarget.innerHTML === '' || !['heading1', 'text', 'todo'].includes(currentBlock.type))) {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevBlockId = blocks[currentIndex - 1].id;
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
      } else if (blocks.length > 1) {
        deleteBlock(id);
      }
    }
  }, [blocks, addBlock, deleteBlock]);

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
          {savingStatus === 'saving' && 'Salvando...'}
          {savingStatus === 'saved' && 'Salvo!'}
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
    </div>
  );
};