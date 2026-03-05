import React, { useRef, useEffect } from 'react';
import { Block as BlockType, BlockType as TBlockType } from '@/types';
import { CheckSquare, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
  onToggleCheck?: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
  onFocus: () => void;
  isUploading?: boolean;
}

export const Block: React.FC<BlockProps> = ({ block, onChange, onToggleCheck, onKeyDown, onFocus, isUploading }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(block.id, e.currentTarget.innerHTML);
  };

  const renderBlock = () => {
    const commonProps = {
      ref: contentRef,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: handleInput,
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block.id),
      onFocus: onFocus,
      className: "w-full focus:outline-none",
      "data-placeholder": "Digite '/' para comandos...",
    };

    switch (block.type) {
      case 'heading1':
        return <h1 {...commonProps} className={`${commonProps.className} text-3xl font-bold`} />;
      case 'heading2':
        return <h2 {...commonProps} className={`${commonProps.className} text-2xl font-semibold`} />;
      case 'heading3':
        return <h3 {...commonProps} className={`${commonProps.className} text-xl font-medium`} />;
      case 'todo':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={block.checked}
              onChange={() => onToggleCheck?.(block.id)}
              className="w-4 h-4 rounded"
            />
            <div {...commonProps} className={`${commonProps.className} ${block.checked ? 'line-through text-gray-400' : ''}`} />
          </div>
        );
      case 'image':
        return (
          <div className="p-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
            {isUploading ? (
              <div className="flex items-center justify-center h-32 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : block.fileUrl ? (
              <img src={block.fileUrl} alt={block.fileName || 'Uploaded image'} className="max-w-full rounded" />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400"><ImageIcon className="w-8 h-8" /></div>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="p-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
            {isUploading ? (
              <div className="flex items-center justify-center h-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : block.fileUrl ? (
              <a href={block.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-slate-700 rounded">
                <FileText className="w-6 h-6 text-red-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{block.fileName || 'Arquivo PDF'}</span>
              </a>
            ) : (
              <div className="flex items-center justify-center h-20 text-gray-400"><FileText className="w-8 h-8" /></div>
            )}
          </div>
        );
      case 'text':
      default:
        return <div {...commonProps} />;
    }
  };

  return <div className="relative">{renderBlock()}</div>;
};