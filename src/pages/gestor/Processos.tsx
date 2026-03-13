import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Process } from '@/types';
import { Loader2, FileText, Plus, Search, Edit2, Trash2, Eye, Filter, RotateCcw, CalendarDays, Image as ImageIcon, Video, Music, Link as LinkIcon, Grid, List, LayoutDashboard, BarChart3, Clock, Paperclip } from 'lucide-react';
import { toast } from 'sonner'; // Using Sonner for toasts
import { ProcessModal } from '@/components/gestor/ProcessModal';
import { ProcessViewModal } from '@/components/gestor/ProcessViewModal';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessCard } from '@/components/gestor/ProcessCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { formatRelativeDate } from '@/utils/dateUtils';

export const Processos = () => {
  const { processes, addProcess, updateProcess, deleteProcess, isDataLoading } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'pdf' | 'video' | 'audio' | 'link' | 'text'>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // New state for view mode

  const debouncedSearchTerm = useDebouncedCallback((value: string) => {
    setSearchTerm(value);
  }, 300);

  const handleOpenEditModal = (process: Process | null) => {
    setSelectedProcess(process);
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (process: Process) => {
    setSelectedProcess(process);
    setIsViewModalOpen(true);
  };

  const handleSaveProcess = async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Process, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[], coverFile?: File) => {
    if ('id' in processData) {
      await updateProcess(processData.id, processData, filesToAdd, linksToAdd, coverFile);
      toast.success("Processo atualizado com sucesso!");
    } else {
      await addProcess(processData, filesToAdd, linksToAdd, coverFile);
      toast.success("Processo criado com sucesso!");
    }
  };

  const handleDeleteProcess = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    toast.promise(
      async () => {
        await deleteProcess(process.id);
      },
      {
        loading: `Excluindo processo "${process.title}"...`,
        success: `Processo "${process.title}" excluído com sucesso!`,
        error: `Erro ao excluir processo "${process.title}".`,
      }
    );
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

    if (filterType !== 'all') {
      currentProcesses = currentProcesses.filter(p => {
        if (filterType === 'text') {
          return p.content && !p.attachments?.length; // Only text content, no attachments
        }
        return p.attachments?.some(att => att.file_type === filterType);
      });
    }

    return currentProcesses.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [processes, searchTerm, filterStartDate, filterEndDate, filterType]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterType('all');
  };

  const hasActiveFilters = searchTerm || filterStartDate || filterEndDate || filterType !== 'all';

  const getProcessIconForStats = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      case 'text': return <LayoutDashboard className="w-4 h-4" />; // Using a generic icon for text-only
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalAttachmentsCount = useMemo(() => {
    return processes.reduce((sum, p) => sum + (p.attachments?.length || 0), 0);
  }, [processes]);

  const lastUpdatedProcess = useMemo(() => {
    if (processes.length === 0) return null;
    return processes.reduce((latest, current) => {
      return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
    }, processes[0]);
  }, [processes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header Section */}
      <div className="relative mb-8 p-6 rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-r from-brand-500 to-orange-400 dark:from-brand-700 dark:to-orange-600">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: "url('/path/to/subtle-pattern.png')" }}></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              Biblioteca de Processos
            </motion.h1>
            <motion.p 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-lg text-white/90 mt-1"
            >
              Crie, organize e compartilhe o conhecimento da sua equipe.
            </motion.p>
          </div>
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => handleOpenEditModal(null)}
            className="flex items-center space-x-2 bg-white text-brand-600 px-5 py-2.5 rounded-lg shadow-md hover:bg-gray-100 transition-all duration-300 mt-4 sm:mt-0 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-semibold">Novo Processo</span>
          </motion.button>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8"
      >
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Processos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{processes.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Paperclip className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Anexos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAttachmentsCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Última Atualização</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{lastUpdatedProcess ? formatRelativeDate(lastUpdatedProcess.updated_at) : 'N/A'}</p>
          </div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, descrição ou conteúdo..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
              onChange={(e) => debouncedSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${isFilterPanelOpen ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{hasActiveFilters ? 'Ativos' : ''}</span>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              title={viewMode === 'grid' ? 'Ver como Lista' : 'Ver como Grid'}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isFilterPanelOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden pt-4 border-t border-gray-200 dark:border-slate-700 mt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Atualizado de</label>
                  <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Atualizado até</label>
                  <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Tipo de Conteúdo</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value="all">Todos</option>
                    <option value="text">Somente Texto</option>
                    <option value="image">Imagens</option>
                    <option value="pdf">PDFs</option>
                    <option value="video">Vídeos</option>
                    <option value="audio">Áudios</option>
                    <option value="link">Links</option>
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 text-right">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearFilters}
                    className="flex items-center justify-end space-x-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar Filtros</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Process List/Grid */}
      {isDataLoading ? (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {[...Array(viewMode === 'grid' ? 6 : 3)].map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-72' : 'h-40'} />
          ))}
        </div>
      ) : filteredProcesses.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700"
        >
          <FileText className="mx-auto w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
          <p className="mt-4 text-lg font-semibold text-gray-500 dark:text-gray-400">Nenhum processo encontrado.</p>
          <p className="text-sm text-gray-400 mt-2">Clique em "Novo Processo" para começar a organizar o conhecimento da sua equipe.</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
        >
          <AnimatePresence>
            {filteredProcesses.map((process, index) => (
              <ProcessCard
                key={process.id}
                process={process}
                onView={handleOpenViewModal}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteProcess}
                index={index}
              />
            ))}
          </AnimatePresence>
        </motion.div>
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