import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { NotificationCenter } from './NotificationCenter';
import { useApp } from '@/context/AppContext';
import { User as AuthUser } from '@/types'; // Importar o tipo User do types.ts

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  user: AuthUser | null; // Adicionado prop user
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
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 md:hidden h-16 flex items-center px-4 justify-between"> {/* Adicionado justify-between */}
      <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      
      {/* Renderiza o sino de notificação apenas para Gestores/Admins */}
      {(user?.role === 'GESTOR' || user?.role === 'ADMIN') && (
        <div className="flex items-center space-x-4"> {/* Container para o sino */}
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