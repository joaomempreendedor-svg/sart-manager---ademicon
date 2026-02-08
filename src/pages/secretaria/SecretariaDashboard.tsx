"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export const SecretariaDashboard = () => {
  const { isLoading: isAuthLoading } = useAuth();
  const { isDataLoading } = useApp();

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))] bg-gray-50 dark:bg-slate-900">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">tela de secretaria</h1>
    </div>
  );
};