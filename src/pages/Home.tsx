import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export const Home = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  // O redirecionamento para /login se !user é tratado pelo RequireAuth
  // Este componente só será renderizado se o usuário estiver autenticado.
  if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
    return <Navigate to="/gestor/dashboard" replace />;
  }

  if (user?.role === 'CONSULTOR') {
    return <Navigate to="/consultor/dashboard" replace />;
  }

  if (user?.role === 'SECRETARIA') { // NOVO: Redirecionamento para Secretaria
    return <Navigate to="/secretaria/onboarding-admin" replace />;
  }

  // Fallback, embora o RequireAuth já devesse ter redirecionado
  return <Navigate to="/login" replace />;
};