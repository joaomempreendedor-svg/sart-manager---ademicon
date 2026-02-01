import React from 'react';
import { GestorTasksSection } from '@/components/gestor/GestorTasksSection';
import { Loader2 } from 'lucide-react';
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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Tarefas Pessoais</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie suas tarefas diárias e recorrentes.</p>
      </div>
      <GestorTasksSection />
    </div>
  );
};

export default GestorTasksPage;