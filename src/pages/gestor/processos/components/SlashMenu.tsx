import React from 'react';
import { Type, Heading1, Heading2, Heading3, CheckSquare, Image, FileText } from 'lucide-react';
import { BlockType } from '@/types';

interface SlashMenuProps {
  onSelect: (type: BlockType) => void;
}

const blockOptions = [
  { type: 'text' as BlockType, label: 'Texto', icon: Type },
  { type: 'heading1' as BlockType, label: 'Título 1', icon: Heading1 },
  { type: 'heading2' as BlockType, label: 'Título 2', icon: Heading2 },
  { type: 'heading3' as BlockType, label: 'Título 3', icon: Heading3 },
  { type: 'todo' as BlockType, label: 'Lista de Tarefas', icon: CheckSquare },
  { type: 'image' as BlockType, label: 'Imagem', icon: Image },
  { type: 'pdf' as BlockType, label: 'PDF', icon: FileText },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({ onSelect }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-2 w-48">
      <p className="text-xs font-bold text-gray-400 px-2 py-1">BLOCOS BÁSICOS</p>
      <div className="space-y-1">
        {blockOptions.map(option => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-left"
          >
            <option.icon className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-800 dark:text-gray-200">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};