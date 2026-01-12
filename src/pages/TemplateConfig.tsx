import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, MessageSquare, Paperclip, Search } from 'lucide-react';
import { ChecklistItem } from '@/types';

export const TemplateConfig = () => {
  const { templates, saveTemplate, checklistStructure } = useApp();
  
  const [selectedItemId, setSelectedItemId] = useState<string>(
    checklistStructure.length > 0 && checklistStructure[0].items.length > 0 
    ? checklistStructure[0].items[0].id 
    : ''
  );
  const [searchTerm, setSearchTerm] = useState('');

  const findItem = (id: string): { item: ChecklistItem, stageTitle: string } | null => {
    for (const stage of checklistStructure) {
      const found = stage.items.find(i => i.id === id);
      if (found) return { item: found, stageTitle: stage.title };
    }
    return null;
  };

  const selectedData = selectedItemId ? findItem(selectedItemId) : null;
  const currentTemplate = templates[selectedItemId] || { id: selectedItemId, label: selectedData?.item.label || '' };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItemId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Aviso: Limite de 2MB para demonstração.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      saveTemplate(selectedItemId, {
        id: selectedItemId,
        label: selectedData?.item.label,
        resource: {
          name: file.name,
          type: file.type.includes('image') ? 'image' : 'pdf',
          url: reader.result as string
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (text: string) => {
    if (!selectedItemId) return;
    saveTemplate(selectedItemId, {
      id: selectedItemId,
      label: selectedData?.item.label,
      text: text
    });
  };

  const handleRemoveResource = () => {
     if (!selectedItemId) return;
     saveTemplate(selectedItemId, {
        resource: undefined
     });
  };

  const filteredStages = checklistStructure.map(stage => ({
    ...stage,
    items: stage.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(stage => stage.items.length > 0);

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0">
        <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configurar Mensagens</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Personalize a comunicação para cada etapa do processo.</p>
        </div>
        <div className="relative w-full sm:w-64 mt-4 sm:mt-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Buscar tarefa..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700 overflow-y-auto flex-shrink-0 custom-scrollbar">
            <div className="p-4 space-y-6">
                {filteredStages.map(stage => (
                    <div key={stage.id}>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
                            {stage.title.split('–')[0].trim()}
                        </h3>
                        <div className="space-y-1">
                            {stage.items.map(item => {
                                const hasConfig = templates[item.id] && (templates[item.id].text || templates[item.id].resource);
                                const isSelected = selectedItemId === item.id;
                                
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-start group ${
                                            isSelected 
                                            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium' 
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <span className="line-clamp-2">{item.label}</span>
                                        {hasConfig && (
                                            <div className="flex space-x-1 shrink-0 ml-2 mt-0.5">
                                                {templates[item.id].text && <MessageSquare className="w-3 h-3 text-blue-500" />}
                                                {templates[item.id].resource && <Paperclip className="w-3 h-3 text-orange-500" />}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {filteredStages.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                        Nenhuma tarefa encontrada.
                    </div>
                )}
            </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            {selectedData ? (
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                    <div>
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-full">
                            {selectedData.stageTitle}
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{selectedData.item.label}</h2>
                        <p className="text-gray-400 text-xs font-mono mt-1">ID: {selectedItemId}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mensagem Padrão</h3>
                            </div>
                            
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                Configure o texto que será sugerido ao clicar no botão de WhatsApp desta tarefa.
                            </p>
                            
                            <textarea
                                className="w-full border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 border p-4 h-40 text-sm font-sans bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                value={currentTemplate.text || ''}
                                onChange={(e) => handleTextChange(e.target.value)}
                                placeholder="Olá [NOME], escreva sua mensagem aqui..."
                            />
                            
                            <div className="mt-2 flex gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => handleTextChange((currentTemplate.text || '') + ' [NOME]')}>[NOME]</span>
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => handleTextChange((currentTemplate.text || '') + ' [LINK]')}>[LINK]</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                             <div className="flex items-center space-x-2 mb-4">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <Paperclip className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Anexo / Arquivo</h3>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Adicione um PDF ou Imagem que deve ser enviado ou utilizado nesta etapa (ex: Apostilas, Cards).
                            </p>

                            <div className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-700/50 transition-colors hover:border-brand-300 dark:hover:border-brand-700">
                                {currentTemplate.resource ? (
                                    <div className="w-full">
                                        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm mb-4">
                                            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-slate-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                    {currentTemplate.resource.type === 'image' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[200px]">{currentTemplate.resource.name}</p>
                                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Arquivo ativo</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleRemoveResource}
                                                className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium px-3 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400">Deseja trocar?</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center mb-4">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-600 text-gray-400 dark:text-slate-400 mb-2">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-white">Nenhum arquivo selecionado</p>
                                    </div>
                                )}
                                
                                <label className="cursor-pointer inline-flex items-center space-x-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 px-6 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition shadow-sm mt-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {currentTemplate.resource ? 'Substituir Arquivo' : 'Escolher Arquivo'}
                                    </span>
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p>Selecione uma tarefa ao lado para configurar.</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};