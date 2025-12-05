import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ImportantLink } from '@/types';
import { X, Save, Loader2, Link as LinkIcon, Type, FileText, Tag } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: ImportantLink | null;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, link }) => {
  const { addImportantLink, updateImportantLink } = useApp();
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (link) {
      setFormData({
        title: link.title,
        url: link.url,
        description: link.description,
        category: link.category,
      });
    } else {
      setFormData({ title: '', url: '', description: '', category: 'Geral' });
    }
  }, [link, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url) {
      alert('Título e URL são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      if (link) {
        await updateImportantLink(link.id, formData);
      } else {
        const newLink: ImportantLink = {
          id: crypto.randomUUID(),
          ...formData,
        };
        await addImportantLink(newLink);
      }
      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{link ? 'Editar Link' : 'Adicionar Novo Link'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
              <Type className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
              <LinkIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="url" name="url" value={formData.url} onChange={handleChange} required placeholder="https://..." className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <Tag className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
              <FileText className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center space-x-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};