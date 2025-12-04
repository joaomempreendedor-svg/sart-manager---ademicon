import React from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 md:hidden h-16 flex items-center px-4">
      <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </header>
  );
};