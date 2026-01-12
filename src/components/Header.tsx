"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useApp } from '@/context/AppContext'; // Importar useApp para notificações
import { User as AuthUser } from '@/types'; // Importar o tipo User

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  user: AuthUser | null; // Reintroduzindo a prop user
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar, user }) => {
  const { notifications } = useApp(); // Usar notificações do AppContext
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const handleOpenNotifications = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleCloseNotifications = () => {
    setIsNotificationCenterOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm py-4 flex items-center px-4 justify-between md:hidden"> {/* Ajustado para justify-between */}
      <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      {/* Renderizar sino de notificações apenas para Gestores/Admins */}
      {(user?.role === 'GESTOR' || user?.role === 'ADMIN') && (
        <div className="flex items-center space-x-4">
          <NotificationBell
            notificationCount={notifications.length}
            onClick={handleOpenNotifications}
          />
          <NotificationCenter
            isOpen={isNotificationCenterOpen}
            onClose={handleCloseNotifications}
            notifications={notifications}
          />
        </div>
      )}
    </header>
  );
};