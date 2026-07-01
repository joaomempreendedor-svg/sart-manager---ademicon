import React from 'react';
import { GestorTasksSection } from '@/components/gestor/GestorTasksSection';
import { Loader2, Settings2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const GestorTasksPage = () => {
  const { isDataLoading } = useApp();

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-brand-500" />
          Configurar tarefas do gestor
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Cadastre, edite e organize suas tarefas; no dashboard aparecem só as atividades do dia.
        </p>
      </div>
      <GestorTasksSection mode="config" />
    </div>
  );
};

export default GestorTasksPage;