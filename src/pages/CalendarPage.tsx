import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { CalendarView } from '@/components/CalendarView';
import { Loader2 } from 'lucide-react';

export const CalendarPage = () => {
  const { user, isLoading } = useAuth();

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
      <p className="text-gray-500 dark:text-gray-400 mb-8">Visualize e gerencie seus eventos e tarefas semanais.</p>
      
      <CalendarView
        userId={user.id}
        userRole={user.role}
        showPersonalEvents={user.role === 'CONSULTOR'}
        showLeadMeetings={true}
        showGestorTasks={user.role === 'GESTOR' || user.role === 'ADMIN'}
      />
    </div>
  );
};