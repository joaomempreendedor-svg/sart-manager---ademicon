import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedLayoutProps {
  allowedRoles: UserRole[];
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();
  const location = useLocation();

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica a necessidade de troca de senha
  if (user.needs_password_change && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  // Verifica se o usuário consultor está ativo
  if (user.role === 'CONSULTOR' && user.isActive === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Verifica se o usuário tem a role permitida para a rota atual
  if (!allowedRoles.includes(user.role)) {
    // Redireciona para o dashboard padrão do usuário se não for permitido para esta rota
    if (user.role === 'SECRETARIA') return <Navigate to="/secretaria/dashboard" replace />;
    if (user.role === 'CONSULTOR') return <Navigate to="/consultor/dashboard" replace />;
    return <Navigate to="/gestor/dashboard" replace />;
  }

  return <Outlet />;
};