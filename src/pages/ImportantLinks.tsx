import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ImportantLink } from '@/types';
import { Plus, Trash2, Edit2, Link as LinkIcon, ExternalLink, Search, Tag } from 'lucide-react';
import { LinkModal } from '@/components/LinkModal';

export const ImportantLinks = () => {
  const { importantLinks, deleteImportantLink } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ImportantLink | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddNew = () => {
    setEditingLink(null);
    setIsModalOpen(true);
  };

  const handleEdit = (link: ImportantLink) => {
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o link "${title}"?`)) {
      try {
        await deleteImportantLink(id);
      } catch (error: any) {
        alert(`Erro ao excluir: ${error.message}`);
      }
    }
  };

  const filteredLinks = useMemo(() => {
    return importantLinks.filter(link =>
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [importantLinks, searchTerm]);

  const groupedLinks = useMemo(() => {
    return filteredLinks.reduce((acc, link) => {
      const category = link.category || 'Geral';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    }, {} as Record<string, ImportantLink[]>);
  }, [filteredLinks]);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Links Importantes</h1>
          <p className="text-gray-500 dark:text-gray-400">Acesse rapidamente sistemas, documentos e recursos essenciais.</p>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar link..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar Link</span>
          </button>
        </div>
      </div>

      {Object.keys(groupedLinks).length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <LinkIcon className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum link cadastrado ainda.</p>
          <p className="text-sm text-gray-400 mt-2">Clique em "Adicionar Link" para começar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedLinks).map(([category, links]) => (
            <div key={category}>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-1 border-l-4 border-brand-500 pl-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.map(link => (
                  <div key={link.id} className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 dark:text-white pr-4">{link.title}</h3>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(link)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(link.id, link.title)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{link.description || 'Sem descrição.'}</p>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Tag className="w-3 h-3 mr-1.5" />
                        <span>{link.category}</span>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">
                        <span>Acessar</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <LinkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          link={editingLink}
        />
      )}
    </div>
  );
};