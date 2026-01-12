import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay'; // Importar o novo componente

export const DailyChecklist = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Metas Diárias</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe suas tarefas e metas do dia.</p>
      </div>
      <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
    </div>
  );
};