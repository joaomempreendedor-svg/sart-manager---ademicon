import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Upload, Search, FileText, Image as ImageIcon, Trash2, Download, Plus, Loader2, Link as LinkIcon, MessageSquare, Users, ToggleLeft, ToggleRight, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { SupportMaterialV2, SupportMaterialContentType } from '@/types';
import { SupportMaterialAssignmentModal } from '@/components/SupportMaterialAssignmentModal';
import toast from 'react-hot-toast'; // Importar toast

export const Materials = () => {
  const { user } = useAuth();
  const { 
    supportMaterialsV2, 
    supportMaterialAssignments,
    addSupportMaterialV2, 
    updateSupportMaterialV2,
    deleteSupportMaterialV2,
    teamMembers,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [contentTypeInput, setContentTypeInput] = useState<SupportMaterialContentType>('pdf');
  const [contentInput, setContentInput] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false); // Novo estado para controlar a visibilidade do formulário
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para o carregamento do botão de envio
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedMaterialForAssignment, setSelectedMaterialForAssignment] = useState<SupportMaterialV2 | null>(null);

  const resetForm = () => {
    setTitleInput('');
    setDescriptionInput('');
    setCategoryInput('');
    setContentTypeInput('pdf');
    setContentInput('');
    setSelectedFile(null);
    setIsSubmitting(false); // Garante que o estado de envio seja falso
  };

  const handleToggleForm = () => {
    setIsFormOpen(prev => !prev);
    if (!isFormOpen) { // Se o formulário está sendo aberto
      resetForm();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setContentTypeInput(file.type.includes('image') ? 'image' : 'pdf');
    setTitleInput(file.name.split('.').slice(0, -1).join('.'));
  };

  const handleAddMaterial = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para adicionar materiais.");
      return;
    }

    if (!titleInput.trim()) {
      toast.error("O título do material é obrigatório.");
      return;
    }
    if (contentTypeInput === 'link' && !contentInput.trim()) {
      toast.error("A URL do link é obrigatória.");
      return;
    }
    if (contentTypeInput === 'text' && !contentInput.trim()) {
      toast.error("O conteúdo do texto é obrigatório.");
      return;
    }
    if ((contentTypeInput === 'image' || contentTypeInput === 'pdf') && !selectedFile) {
      toast.error("Por favor, selecione um arquivo para upload.");
      return;
    }

    setIsSubmitting(true); // Ativa o estado de carregamento do botão
    try {
      const newMaterialData: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at' | 'is_active'> = {
        title: titleInput.trim(),
        description: descriptionInput.trim() || undefined,
        category: categoryInput.trim() || 'Geral',
        content_type: contentTypeInput,
        content: contentInput.trim(),
      };

      await addSupportMaterialV2(newMaterialData, selectedFile || undefined);
      toast.success("Material adicionado com sucesso!");

      resetForm(); // Reseta o formulário e o estado de envio
      setIsFormOpen(false); // Fecha o formulário após o sucesso
    } catch (error: any) {
      toast.error(`Erro ao adicionar material: ${error.message}`);
      console.error("Erro ao adicionar material:", error);
    } finally {
      setIsSubmitting(false); // Desativa o estado de carregamento do botão, mesmo em caso de erro
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o material "${title}"?`)) {
      try {
        await deleteSupportMaterialV2(id);
        toast.success("Material excluído com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (material: SupportMaterialV2) => {
    try {
      await updateSupportMaterialV2(material.id, { is_active: !material.is_active });
      toast.success(`Material ${material.is_active ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (error: any) {
      toast.error(`Erro ao alterar status do material: ${error.message}`);
    }
  };

  const handleOpenAssignmentModal = (material: SupportMaterialV2) => {
    setSelectedMaterialForAssignment(material);
    setIsAssignmentModalOpen(true);
  };

  // NOVO: Função para download direto de arquivos
  const handleDownloadClick = async (material: SupportMaterialV2) => {
    if (!material.content || (material.content_type !== 'image' && material.content_type !== 'pdf')) {
        toast.error("Este material não é um arquivo para download direto.");
        return;
    }

    try {
        const response = await fetch(material.content);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', material.title); // Define o nome do arquivo para download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // Limpa a URL do objeto

        toast.success(`Download de "${material.title}" iniciado.`);
    } catch (error) {
        console.error("Erro ao baixar o arquivo:", error);
        toast.error("Falha ao iniciar o download do arquivo.");
    }
  };

  const allConsultants = useMemo(() => teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado'))), [teamMembers]);

  const filteredMaterials = useMemo(() => {
    let materialsToDisplay = supportMaterialsV2;

    if (user?.role === 'CONSULTOR') {
      materialsToDisplay = supportMaterialsV2.filter(material => {
        if (!material.is_active) return false;

        const hasAssignments = supportMaterialAssignments.some(
          assignment => assignment.material_id === material.id
        );

        if (!hasAssignments) {
          return true;
        } else {
          return supportMaterialAssignments.some(
            assignment => assignment.material_id === material.id && assignment.consultant_id === user.id
          );
        }
      });
    } else if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
      materialsToDisplay = supportMaterialsV2.filter(material => material.user_id === user.id);
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return materialsToDisplay.filter(m => 
      m.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      (m.description && m.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (m.category && m.category.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [supportMaterialsV2, supportMaterialAssignments, searchTerm, user]);

  const groupedMaterials = filteredMaterials.reduce((acc, curr) => {
    const category = curr.category || 'Sem Categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(curr);
    return acc;
  }, {} as Record<string, SupportMaterialV2[]>);

  const renderMaterialContent = (material: SupportMaterialV2) => {
    switch (material.content_type) {
      case 'image':
        return <img src={material.content} alt={material.title} className="w-full h-full object-cover" />;
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-400" />;
      case 'link':
        return <LinkIcon className="w-12 h-12 text-blue-400" />;
      case 'text':
        return <MessageSquare className="w-12 h-12 text-purple-400" />;
      default:
        return <FileText className="w-12 h-12 text-gray-400" />;
    }
  };

  const getContentTypeIcon = (type: SupportMaterialContentType) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-3 h-3 mr-1" />;
      case 'pdf': return <FileText className="w-3 h-3 mr-1" />;
      case 'link': return <LinkIcon className="w-3 h-3 mr-1" />;
      case 'text': return <MessageSquare className="w-3 h-3 mr-1" />;
      default: return <FileText className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materiais de Apoio</h1>
          <p className="text-gray-500 dark:text-gray-400">Repositório de arquivos e links para consulta rápida (Tabelas, Scripts, Tutoriais).</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <div className="relative flex-1 w-full">
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
            
            {user?.role === 'GESTOR' || user?.role === 'ADMIN' ? (
              <button 
                  onClick={handleToggleForm}
                  className={`p-2 rounded-lg transition ${isFormOpen ? 'bg-gray-200 dark:bg-slate-700 text-gray-600' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
              >
                  <Plus className={`w-5 h-5 transition-transform ${isFormOpen ? 'rotate-45' : ''}`} />
              </button>
            ) : null}
        </div>
      </div>

      {isFormOpen && (user?.role === 'GESTOR' || user?.role === 'ADMIN') && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Adicionar Novo Material</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título do Material</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Tabela de Vendas 2024"
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Tabelas, Scripts, Links Úteis"
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição (Opcional)</label>
                    <textarea 
                        placeholder="Breve descrição do material..."
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                        value={descriptionInput}
                        onChange={(e) => setDescriptionInput(e.target.value)}
                        rows={2}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo de Conteúdo</label>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            type="button"
                            onClick={() => { setContentTypeInput('pdf'); setSelectedFile(null); setContentInput(''); }}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition ${contentTypeInput === 'pdf' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
                        >
                            <FileText className="w-4 h-4 mr-2" /> PDF
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setContentTypeInput('image'); setSelectedFile(null); setContentInput(''); }}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition ${contentTypeInput === 'image' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
                        >
                            <ImageIcon className="w-4 h-4 mr-2" /> Imagem
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setContentTypeInput('link'); setSelectedFile(null); setContentInput(''); }}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition ${contentTypeInput === 'link' ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
                        >
                            <LinkIcon className="w-4 h-4 mr-2" /> Link
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setContentTypeInput('text'); setSelectedFile(null); setContentInput(''); }}
                            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition ${contentTypeInput === 'text' ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" /> Texto
                        </button>
                    </div>
                </div>
                {(contentTypeInput === 'pdf' || contentTypeInput === 'image') && (
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Arquivo ({contentTypeInput === 'pdf' ? 'PDF' : 'Imagem'})</label>
                        <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition bg-white dark:bg-slate-700">
                            <Upload className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedFile ? selectedFile.name : 'Selecionar arquivo...'}</span>
                            <input type="file" className="hidden" accept={contentTypeInput === 'pdf' ? 'application/pdf' : 'image/*'} onChange={handleFileSelect} />
                        </label>
                    </div>
                )}
                {(contentTypeInput === 'link' || contentTypeInput === 'text') && (
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{contentTypeInput === 'link' ? 'URL do Link' : 'Conteúdo do Texto'}</label>
                        {contentTypeInput === 'link' ? (
                            <input 
                                type="url" 
                                placeholder="https://exemplo.com"
                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                                value={contentInput}
                                onChange={(e) => setContentInput(e.target.value)}
                                required
                            />
                        ) : (
                            <textarea 
                                placeholder="Digite o conteúdo do material aqui..."
                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                                value={contentInput}
                                onChange={(e) => setContentInput(e.target.value)}
                                rows={4}
                                required
                            />
                        )}
                    </div>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={handleAddMaterial} disabled={isSubmitting} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Adicionando...' : 'Adicionar Material'}</span>
                </button>
            </div>
        </div>
      )}

      {Object.keys(groupedMaterials).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum material encontrado.</p>
          </div>
      ) : (
          <div className="space-y-8 custom-scrollbar">
              {Object.entries(groupedMaterials).map(([category, materials]: [string, SupportMaterialV2[]]) => (
                  <div key={category}>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-1 border-l-4 border-brand-500 pl-3">
                          {category}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {materials.map(material => (
                              <div key={material.id} className={`group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col ${!material.is_active ? 'opacity-60' : ''}`}>
                                  <div className="h-32 bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center relative overflow-hidden">
                                      {renderMaterialContent(material)}
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                          {(material.content_type === 'image' || material.content_type === 'pdf') && (
                                              <button 
                                                  onClick={() => handleDownloadClick(material)} // Chama a nova função
                                                  className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition"
                                                  title="Baixar"
                                              >
                                                  <Download className="w-5 h-5" />
                                              </button>
                                          )}
                                          {material.content_type === 'link' && (
                                              <a 
                                                  href={material.content} 
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition"
                                                  title="Abrir Link"
                                              >
                                                  <LinkIcon className="w-5 h-5" />
                                              </a>
                                          )}
                                          {user?.role === 'GESTOR' || user?.role === 'ADMIN' ? (
                                            <>
                                              <button 
                                                  onClick={() => handleOpenAssignmentModal(material)}
                                                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                                  title="Atribuir a Consultores"
                                              >
                                                  <Users className="w-5 h-5" />
                                              </button>
                                              <button 
                                                  onClick={() => handleToggleActive(material)}
                                                  className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition"
                                                  title={material.is_active ? "Desativar Material" : "Ativar Material"}
                                              >
                                                  {material.is_active ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                                              </button>
                                              <button 
                                                  onClick={() => handleDelete(material.id, material.title)}
                                                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                                  title="Excluir"
                                              >
                                                  <Trash2 className="w-5 h-5" />
                                              </button>
                                            </>
                                          ) : null}
                                      </div>
                                  </div>
                                  <div className="p-4 flex-1 flex flex-col justify-between">
                                      <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={material.title}>{material.title}</h3>
                                        {material.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{material.description}</p>}
                                      </div>
                                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center text-xs text-gray-400">
                                          {getContentTypeIcon(material.content_type)}
                                          <span className="uppercase">{material.content_type}</span>
                                          {material.category && <span className="ml-auto px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300">{material.category}</span>}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {selectedMaterialForAssignment && (
        <SupportMaterialAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          material={selectedMaterialForAssignment}
        />
      )}
    </div>
  );
};