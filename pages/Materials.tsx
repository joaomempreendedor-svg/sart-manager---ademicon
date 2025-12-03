import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, Search, FileText, Image as ImageIcon, Trash2, Download, Plus, Loader2 } from 'lucide-react';
import { SupportMaterial } from '../types';

export const Materials = () => {
  const { supportMaterials, addSupportMaterial, deleteSupportMaterial } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleAddMaterial = async () => {
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo.");
      return;
    }
    setIsAdding(true);
    try {
      const category = categoryInput.trim() || 'Geral';
      const finalTitle = titleInput.trim() || selectedFile.name.split('.').slice(0, -1).join('.');
      
      await addSupportMaterial({
        title: finalTitle,
        fileName: selectedFile.name,
        category: category,
        type: selectedFile.type.includes('image') ? 'image' : 'pdf',
      }, selectedFile);

      // Reset form
      setIsUploading(false);
      setCategoryInput('');
      setTitleInput('');
      setSelectedFile(null);
    } catch (error: any) {
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredMaterials = supportMaterials.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by category
  const groupedMaterials = filteredMaterials.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, SupportMaterial[]>);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materiais de Apoio</h1>
          <p className="text-gray-500 dark:text-gray-400">Repositório de arquivos para consulta rápida (Tabelas, Scripts, Tutoriais).</p>
        </div>
        
        <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar material..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setIsUploading(!isUploading)}
                className={`p-2 rounded-lg transition ${isUploading ? 'bg-gray-200 dark:bg-slate-700 text-gray-600' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
            >
                <Plus className={`w-5 h-5 transition-transform ${isUploading ? 'rotate-45' : ''}`} />
            </button>
        </div>
      </div>

      {isUploading && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Adicionar Novo Material</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do Material</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Tabela de Vendas 2024"
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Tabelas, Scripts"
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                            value={categoryInput}
                            onChange={(e) => setCategoryInput(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Arquivo (PDF ou Imagem)</label>
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                        <Upload className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedFile ? selectedFile.name : 'Selecionar arquivo...'}</span>
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
                    </label>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={handleAddMaterial} disabled={isAdding || !selectedFile} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isAdding ? 'Enviando...' : 'Adicionar Material'}</span>
                </button>
            </div>
        </div>
      )}

      {Object.keys(groupedMaterials).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum material encontrado.</p>
          </div>
      ) : (
          <div className="space-y-8">
              {Object.entries(groupedMaterials).map(([category, materials]: [string, SupportMaterial[]]) => (
                  <div key={category}>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-1 border-l-4 border-brand-500 pl-3">
                          {category}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {materials.map(material => (
                              <div key={material.id} className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
                                  <div className="h-32 bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center relative overflow-hidden">
                                      {material.type === 'image' ? (
                                          <img src={material.url} alt={material.title} className="w-full h-full object-cover" />
                                      ) : (
                                          <FileText className="w-12 h-12 text-red-400" />
                                      )}
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                          <a 
                                              href={material.url} 
                                              download={material.fileName}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition"
                                              title="Baixar"
                                          >
                                              <Download className="w-5 h-5" />
                                          </a>
                                          <button 
                                              onClick={() => deleteSupportMaterial(material.id)}
                                              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                              title="Excluir"
                                          >
                                              <Trash2 className="w-5 h-5" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="p-4 flex-1 flex flex-col justify-between">
                                      <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={material.title}>{material.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{material.fileName}</p>
                                      </div>
                                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center text-xs text-gray-400">
                                          {material.type === 'pdf' ? <FileText className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                                          <span className="uppercase">{material.type}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};