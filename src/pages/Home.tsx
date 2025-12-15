import React from 'react';
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

  if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
    return <Navigate to="/gestor/dashboard" replace />;
  }

  if (user?.role === 'CONSULTOR') {
    return <Navigate to="/consultor/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};