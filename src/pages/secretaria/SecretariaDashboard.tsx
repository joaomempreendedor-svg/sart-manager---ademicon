"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Bell, TrendingUp, CalendarDays, Users, FileText, ClipboardCheck, Video, FileStack, MapPin } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';

export const SecretariaDashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isDataLoading, notifications } = useApp();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = React.useState(false);

  const handleOpenNotifications = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleCloseNotifications = () => {
    setIsNotificationCenterOpen(false);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {user?.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 dark:text-gray-400">Bem-vinda ao seu Dashboard de Secretaria.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <NotificationBell
            notificationCount={notifications.filter(n => !n.isRead).length}
            onClick={handleOpenNotifications}
          />
          <NotificationCenter
            isOpen={isNotificationCenterOpen}
            onClose={handleCloseNotifications}
            notifications={notifications}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Boas-Vindas */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sua Central de Operações</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Secretaria SART</p>
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-blue-500" /> Ações Rápidas
          </h2>
          <ul className="space-y-2">
            <li>
              <a href="#/secretaria/candidate-screening" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">
                <Users className="w-4 h-4" /> <span>Gerenciar Candidaturas</span>
              </a>
            </li>
            <li>
              <a href="#/secretaria/onboarding-admin" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">
                <Video className="w-4 h-4" /> <span>Onboarding Online</span>
              </a>
            </li>
            <li>
              <a href="#/secretaria/form-cadastros" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">
                <FileStack className="w-4 h-4" /> <span>Gerenciar Formulários</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Informações Importantes */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-500" /> Avisos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Fique atenta às novas candidaturas e ao progresso dos consultores em onboarding.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Use o menu lateral para acessar as ferramentas de gestão.
          </p>
        </div>
      </div>
    </div>
  );
};