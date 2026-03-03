import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Home = () => {
  const { user } = useAuth();

  // O redirecionamento para /login se !user é tratado pelo RequireAuth
  if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
    return <Navigate to="/gestor/dashboard" replace />;
  }

  if (user?.role === 'CONSULTOR') {
    return <Navigate to="/consultor/dashboard" replace />;
  }

  if (user?.role === 'SECRETARIA') {
    return <Navigate to="/secretaria/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};