import React from 'react';
import { Menu, X } from 'lucide-react';
// Removido NotificationBell, NotificationCenter, useApp, User as AuthUser

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  // Removido user prop
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm py-4 flex items-center px-4 justify-start md:hidden"> {/* Visível apenas em mobile, com padding reduzido */}
      <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </header>
  );
};