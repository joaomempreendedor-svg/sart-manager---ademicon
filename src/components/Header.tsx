import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { NotificationCenter } from './NotificationCenter';
import { useApp } from '@/context/AppContext';
import { User as AuthUser } from '@/types'; // Importar o tipo User do types.ts

interface HeaderProps {
  isSidebarOpen: boolean; // Apenas relevante para o toggle do menu mobile
  toggleSidebar: () => void; // Apenas relevante para o toggle do menu mobile
  user: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar, user }) => {
  const { notifications } = useApp();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const handleOpenNotifications = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleCloseNotifications = () => {
    setIsNotificationCenterOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 h-16 flex items-center px-4 justify-between">
      {/* Botão de menu para mobile, visível apenas em telas pequenas */}
      <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 md:hidden">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      
      {/* Um espaço flexível para empurrar o sino para a direita em desktop */}
      <div className="flex-grow md:flex-grow-0">
        {/* Você pode adicionar um título aqui para desktop, se desejar */}
      </div>

      {/* Renderiza o sino de notificação apenas para Gestores/Admins */}
      {(user?.role === 'GESTOR' || user?.role === 'ADMIN') && (
        <div className="flex items-center space-x-4 mr-4"> {/* Adicionado 'mr-4' aqui */}
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