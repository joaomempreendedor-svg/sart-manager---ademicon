import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ChecklistProcessEditor } from '@/components/process/ChecklistProcessEditor';
import { MindMapProcessEditor } from '@/components/process/MindMapProcessEditor';

export const ProcessoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { processes, isDataLoading } = useApp();

  const process = useMemo(() => processes.find(p => p.id === id), [processes, id]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-500">Processo não encontrado</h1>
        <button onClick={() => navigate('/gestor/processos')} className="mt-4 flex items-center text-brand-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a lista de processos
        </button>
      </div>
    );
  }

  const renderEditor = () => {
    switch (process.type) {
      case 'checklist':
        return <ChecklistProcessEditor process={process} />;
      case 'mindmap':
        return <MindMapProcessEditor process={process} />;
      default:
        return (
          <div className="mt-8">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h2 className="font-bold text-red-800 dark:text-red-200">Tipo de Processo Desconhecido</h2>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Não há um editor disponível para o tipo "{process.type}".
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/gestor/processos')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Processos
      </button>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{process.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{process.description}</p>
        <p className="text-sm font-mono mt-4 bg-gray-100 dark:bg-slate-700 p-2 rounded-md inline-block">
          Tipo: <span className="font-semibold">{process.type}</span>
        </p>
      </div>

      {renderEditor()}
    </div>
  );
};