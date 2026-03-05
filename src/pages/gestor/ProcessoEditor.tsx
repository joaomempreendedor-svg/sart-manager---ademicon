import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, Plus, Trash2, GripVertical, Type, Pilcrow, CheckSquare } from 'lucide-react';
import { Process, ProcessBlock } from '@/types';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const BlockComponent: React.FC<{
  block: ProcessBlock;
  onUpdate: (id: string, content: string) => void;
  onToggleCheck?: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
  onFocus: () => void;
}> = ({ block, onUpdate, onToggleCheck, onKeyDown, onFocus }) => {
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onUpdate(block.id, e.currentTarget.innerText);
  };

  switch (block.type) {
    case 'heading1':
      return (
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={handleInput}
          onKeyDown={(e) => onKeyDown(e, block.id)}
          onFocus={onFocus}
          className="text-3xl font-bold outline-none focus:ring-2 focus:ring-brand-500 rounded px-1"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case 'text':
      return (
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={handleInput}
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
            onChange={() => onToggleCheck?.(block.id)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={handleInput}
            onKeyDown={(e) => onKeyDown(e, block.id)}
            onFocus={onFocus}
            className={`flex-grow outline-none focus:ring-2 focus:ring-brand-500 rounded px-1 ${block.data.checked ? 'line-through text-gray-400' : ''}`}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        </div>
      );
    default:
      return null;
  }
};

export const ProcessoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { processes, updateProcess, isDataLoading } = useApp();

  const process = useMemo(() => processes.find(p => p.id === id), [processes, id]);
  const [blocks, setBlocks] = useState<ProcessBlock[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (process?.content && Array.isArray(process.content)) {
      setBlocks(process.content);
    } else if (process) {
      setBlocks([]);
    }
  }, [process]);

  const debouncedUpdate = useDebouncedCallback((updatedBlocks: ProcessBlock[]) => {
    if (!process) return;
    updateProcess(process.id, { content: updatedBlocks })
      .then(() => toast.success('Salvo!'))
      .catch(err => toast.error(`Erro ao salvar: ${err.message}`));
  }, 1000);

  const updateBlocks = (newBlocks: ProcessBlock[]) => {
    setBlocks(newBlocks);
    debouncedUpdate(newBlocks);
  };

  const addBlock = (type: ProcessBlock['type'], index: number) => {
    const newBlock: ProcessBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      data: { checked: false },
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateBlocks(newBlocks);
  };

  const updateBlockContent = (id: string, content: string) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, content } : block
    );
    // Don't call updateBlocks here, as it will trigger a re-render and lose focus
    // The debounced update will be called on blur.
    setBlocks(newBlocks);
    debouncedUpdate(newBlocks);
  };

  const toggleTodoCheck = (id: string) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, data: { ...block.data, checked: !block.data.checked } } : block
    );
    updateBlocks(newBlocks);
  };

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter(block => block.id !== id);
    updateBlocks(newBlocks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentIndex = blocks.findIndex(b => b.id === id);
      addBlock('text', currentIndex);
    }
  };

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
      <button onClick={() => navigate('/gestor/processos')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Processos
      </button>
      
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
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => addBlock('text', index - 1)}>
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
              />
            </div>
            <div className="flex items-center h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBlock(block.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
        {blocks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Página vazia. Comece a adicionar conteúdo!</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center space-x-2">
        <Button variant="outline" onClick={() => addBlock('heading1', blocks.length - 1)} className="flex items-center space-x-1"><Type className="w-4 h-4" /><span>Título</span></Button>
        <Button variant="outline" onClick={() => addBlock('text', blocks.length - 1)} className="flex items-center space-x-1"><Pilcrow className="w-4 h-4" /><span>Texto</span></Button>
        <Button variant="outline" onClick={() => addBlock('todo', blocks.length - 1)} className="flex items-center space-x-1"><CheckSquare className="w-4 h-4" /><span>Tarefa</span></Button>
      </div>
    </div>
  );
};