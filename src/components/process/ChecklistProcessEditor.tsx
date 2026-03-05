import React, { useState, useEffect } from 'react';
import { Process } from '@/types';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, Save, X, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChecklistItem {
  id: string;
  text: string;
}

interface ChecklistProcessEditorProps {
  process: Process;
}

export const ChecklistProcessEditor: React.FC<ChecklistProcessEditorProps> = ({ process }) => {
  const { updateProcess } = useApp();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  useEffect(() => {
    if (process.content && Array.isArray(process.content)) {
      setItems(process.content);
    } else {
      setItems([]);
    }
  }, [process]);

  const debouncedUpdate = useDebouncedCallback((updatedItems: ChecklistItem[]) => {
    updateProcess(process.id, { content: updatedItems })
      .then(() => toast.success('Alterações salvas automaticamente!'))
      .catch(err => toast.error(`Erro ao salvar: ${err.message}`));
  }, 1000);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewItemText('');
    debouncedUpdate(updatedItems);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    debouncedUpdate(updatedItems);
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingItemText.trim()) {
      toast.error("O texto da tarefa não pode ser vazio.");
      return;
    }
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, text: editingItemText.trim() } : item
    );
    setItems(updatedItems);
    setEditingItemId(null);
    setEditingItemText('');
    debouncedUpdate(updatedItems);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
    debouncedUpdate(newItems);
  };

  return (
    <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="p-6 space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 group">
            {editingItemId === item.id ? (
              <>
                <Input 
                  value={editingItemText}
                  onChange={(e) => setEditingItemText(e.target.value)}
                  className="flex-grow"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(item.id); }}
                />
                <Button size="icon" onClick={() => handleSaveEdit(item.id)} className="bg-green-500 hover:bg-green-600"><Save className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingItemId(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-brand-500" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-brand-500" onClick={() => handleMoveItem(index, 'down')} disabled={index === items.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <p className="flex-grow text-gray-800 dark:text-gray-200">{item.text}</p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  <Button size="icon" variant="ghost" onClick={() => startEditing(item)}><Edit2 className="w-4 h-4 text-blue-500" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum item neste checklist ainda. Adicione um abaixo.</p>
        )}
      </div>
      <form onSubmit={handleAddItem} className="flex items-center space-x-2 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
        <Input 
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Adicionar nova tarefa..."
          className="flex-grow"
        />
        <Button type="submit" className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </Button>
      </form>
    </div>
  );
};