import React, { forwardRef } from 'react';
import { Type, Pilcrow, CheckSquare, Image as ImageIcon, FileText } from 'lucide-react';
import { ProcessBlock } from '@/types';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  onSelect: (type: ProcessBlock['type']) => void;
}

const commandItems = [
  { type: 'heading1' as ProcessBlock['type'], icon: Type, title: 'Título', description: 'Crie um título de seção.' },
  { type: 'text' as ProcessBlock['type'], icon: Pilcrow, title: 'Texto', description: 'Comece a escrever um parágrafo.' },
  { type: 'todo' as ProcessBlock['type'], icon: CheckSquare, title: 'Tarefa', description: 'Crie um item de checklist.' },
  { type: 'image' as ProcessBlock['type'], icon: ImageIcon, title: 'Imagem', description: 'Faça upload de uma imagem.' },
  { type: 'pdf' as ProcessBlock['type'], icon: FileText, title: 'PDF', description: 'Faça upload de um arquivo PDF.' },
];

export const SlashCommandMenu = forwardRef<HTMLDivElement, SlashCommandMenuProps>(({ isOpen, position, onSelect }, ref) => {
  if (!isOpen || !position) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-2 animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <p className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">Blocos Básicos</p>
      <div className="mt-1">
        {commandItems.map(item => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className="w-full flex items-center space-x-3 p-2 rounded-md text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-md">
              <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});