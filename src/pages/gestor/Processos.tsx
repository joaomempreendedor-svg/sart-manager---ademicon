import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Process } from '@/types';
import { Loader2, FileText, Plus, Search, Edit2, Trash2, Eye, Filter, RotateCcw, CalendarDays, Image as ImageIcon, Video, Music, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProcessModal } from '@/components/gestor/ProcessModal';
import { ProcessViewModal } from '@/components/gestor/ProcessViewModal';

export const Processos = () => {
  const { processes, addProcess, updateProcess, deleteProcess, isDataLoading } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const handleOpenEditModal = (process: Process | null) => {
    setSelectedProcess(process);
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (process: Process) => {
    setSelectedProcess(process);
    setIsViewModalOpen(true);
  };

  const handleSaveProcess = async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Process, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => {
    if ('id' in processData) {
      await updateProcess(processData.id, processData, filesToAdd, linksToAdd);
      toast.success("Processo atualizado com sucesso!");
    } else {
      await addProcess(processData, filesToAdd, linksToAdd);
      toast.success("Processo criado com sucesso!");
    }
  };

  const handleDeleteProcess = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o processo "${process.title}"?`)) {
      try {
        await deleteProcess(process.id);
        toast.success("Processo excluído com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir: ${error.message}`);
      }
    }
  };

  const filteredProcesses = useMemo(() => {
    let currentProcesses = processes;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentProcesses = currentProcesses.filter(p =>
        p.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        (p.description && p.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.content && p.content.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
      const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;

      currentProcesses = currentProcesses.filter(process => {
        const processDate = new Date(process.updated_at);
        const matchesStart = !start || processDate >= start;
        const matchesEnd = !end || processDate <= end;
        return matchesStart && matchesEnd;
      });
    }

    return currentProcesses.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [processes, searchTerm, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters = searchTerm || filterStartDate || filterEndDate;

  const getProcessIcon = (process: Process) => {
    const hasAttachments = process.attachments && process.attachments.length > 0;
    if (!hasAttachments) return <FileText className="w-8 h-8 text-brand-500 mb-3" />;
    
    const firstType = process.attachments![0].file_type;
    switch (firstType) {
      case 'image': return <ImageIcon className="w-8 h-8 text-green-500 mb-3" />;
      case 'video': return <Video className="w-8 h-8 text-blue-500 mb-3" />;
      case 'audio': return <Music className="w-8 h-8 text-purple-500 mb-3" />;
      case 'link': return <LinkIcon className="w-8 h-8 text-blue-400 mb-3" />;
      default: return <FileText className="w-8 h-8 text-brand-500 mb-3" />;
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processos Internos</h1>
          <p className="text-gray-500 dark:text-gray-400">Crie e gerencie documentos e processos da sua equipe.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => handleOpenEditModal(null)}
            className="flex items-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Processo</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtros</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Título, descrição ou conteúdo..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Atualizado de</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Atualizado até</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcesses.map(process => (
          <div
            key={process.id}
            onClick={() => handleOpenViewModal(process)}
            className="block bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              {getProcessIcon(process)}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(process); }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteProcess(e, process)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600">{process.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{process.description || 'Nenhuma descrição'}</p>
            
            {process.attachments && process.attachments.length > 0 && (
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {process.attachments.length} anexo(s)
                </span>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">Atualizado em: {new Date(process.updated_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      {filteredProcesses.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
          <FileText className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum processo encontrado.</p>
          <p className="text-sm text-gray-400">Clique em "Novo Processo" para começar.</p>
        </div>
      )}

      <ProcessModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        process={selectedProcess}
        onSave={handleSaveProcess}
      />
      <ProcessViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        process={selectedProcess}
      />
    </div>
  );
};