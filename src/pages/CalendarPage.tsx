import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CalendarView } from '@/components/CalendarView';
import { Loader2, CalendarDays, Calendar, LayoutGrid } from 'lucide-react'; // Importar LayoutGrid

export const CalendarPage = () => {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week'); // NOVO: Estado para a visualização

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto text-center text-red-600 dark:text-red-400">
        Usuário não autenticado. Por favor, faça login.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Minha Agenda</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Visualize e gerencie seus eventos e tarefas semanais.</p>
      
      {/* Botões de visualização */}
      <div className="flex justify-end mb-6">
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 flex">
          <button
            onClick={() => setView('day')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${view === 'day' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <CalendarDays className="w-4 h-4 mr-2" />Dia
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${view === 'week' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <Calendar className="w-4 h-4 mr-2" />Semana
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${view === 'month' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />Mês
          </button>
        </div>
      </div>

      <CalendarView
        userId={user.id}
        userRole={user.role}
        showPersonalEvents={user.role === 'CONSULTOR'}
        showLeadMeetings={true}
        showGestorTasks={user.role === 'GESTOR' || user.role === 'ADMIN'}
        view={view} // NOVO: Passa a visualização selecionada
      />
    </div>
  );
};