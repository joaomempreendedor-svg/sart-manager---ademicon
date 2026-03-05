import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

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

      <div className="mt-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h2 className="font-bold text-yellow-800 dark:text-yellow-200">Em Construção</h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            O editor para este tipo de processo ainda está em desenvolvimento. Por enquanto, você pode ver o conteúdo bruto abaixo.
          </p>
        </div>
        
        <div className="mt-4">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Conteúdo (JSON):</h3>
          <pre className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg mt-2 text-sm overflow-auto custom-scrollbar">
            {JSON.stringify(process.content, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};