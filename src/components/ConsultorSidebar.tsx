import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, LogOut, User as UserIcon, Sun, Moon, ListChecks, ChevronLeft, ChevronRight, Library } from 'lucide-react'; // Import ListChecks, Library e LinkIcon
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

interface ConsultorSidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean; // Nova prop
  toggleSidebarCollapse: () => void; // Nova prop
}

export const ConsultorSidebar: React.FC<ConsultorSidebarProps> = ({ isSidebarOpen, toggleSidebar, isSidebarCollapsed, toggleSidebarCollapse }) => {
  const { theme, toggleTheme } = useApp();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
    } ${isSidebarCollapsed ? 'justify-center space-x-0' : ''}`; // Centraliza ícones quando recolhido

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 min-h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}> {/* Ajusta largura */}
        <div className={`p-6 border-b border-gray-100 dark:border-slate-800 flex justify-center items-center h-24 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className="flex items-center space-x-2">
              <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
                  <TrendingUp className="w-6 h-6" strokeWidth={3} />
              </div>
              {!isSidebarCollapsed && ( // Esconde texto quando recolhido
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Equipe</span>
                    <span className="text-2xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
                </div>
              )}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavLink to="/consultor/dashboard" className={linkClass} onClick={toggleSidebar}>
            <LayoutDashboard className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/consultor/crm" className={linkClass} onClick={toggleSidebar}>
            <TrendingUp className="w-5 h-5" />
            {!isSidebarCollapsed && <span>CRM</span>}
          </NavLink>
          {/* <NavLink to="/consultor/daily-checklist" className={linkClass} onClick={toggleSidebar}> 
            <ListChecks className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Checklist do Dia</span>}
          </NavLink> */}
          <NavLink to="/consultor/materials" className={linkClass} onClick={toggleSidebar}>
            <Library className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Materiais de Apoio</span>}
          </NavLink>
          {/* <NavLink to="/consultor/links" className={linkClass} onClick={toggleSidebar}>
            <LinkIcon className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Links Importantes</span>}
          </NavLink> */}
          <NavLink to="/profile" className={linkClass} onClick={toggleSidebar}>
            <UserIcon className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Meu Perfil</span>}
          </NavLink>
        </nav>

        <div className={`p-4 border-t border-gray-100 dark:border-slate-800 space-y-4 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`flex ${isSidebarCollapsed ? 'flex-col space-y-2' : 'gap-2'}`}>
              <button 
              onClick={toggleTheme}
              className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition ${isSidebarCollapsed ? 'w-full' : ''}`}
              title="Alternar Tema"
              >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {!isSidebarCollapsed && <span>Tema</span>}
              </button>
              
              <button 
              onClick={handleLogout}
              className={`flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition ${isSidebarCollapsed ? 'w-full' : ''}`}
              title="Sair"
              >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Sair</span>}
              </button>
          </div>

          <div className={`bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg ${isSidebarCollapsed ? 'hidden' : ''}`}> {/* Esconde info do usuário quando recolhido */}
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">
              {user?.email || 'Acesso Restrito'}
            </p>
          </div>

          {/* Botão de recolher/expandir */}
          <button 
            onClick={toggleSidebarCollapse}
            className="hidden md:flex items-center justify-center w-full p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
};