import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import { useLocation } from 'react-router-dom'; // Importar useLocation

export const DailyChecklist = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();
  const location = useLocation(); // Hook para acessar o estado de navegação
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.highlightChecklistItemId && location.state?.highlightChecklistDate) {
      setHighlightedItemId(location.state.highlightChecklistItemId);
      setHighlightedDate(location.state.highlightChecklistDate);
      // Limpar o estado para que não persista em recarregamentos futuros
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Metas Diárias</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe suas tarefas e metas do dia.</p>
      </div>
      <DailyChecklistDisplay 
        user={user} 
        isDataLoading={isDataLoading} 
        highlightedItemId={highlightedItemId} // Passar para o componente de exibição
        highlightedDate={highlightedDate} // Passar para o componente de exibição
      />
    </div>
  );
};