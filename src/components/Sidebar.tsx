import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Settings, FileText, Sun, Moon, Banknote, PlusCircle, Library, TrendingUp, Target, Users, LogOut, User as UserIcon, Calendar, Link as LinkIcon, Star, Video } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
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
    }`;

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 min-h-screen flex flex-col fixed left-0 top-0 transition-transform duration-300 z-50 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Area */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-center items-center h-24">
          <div className="flex items-center space-x-2">
              <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
                  <TrendingUp className="w-6 h-6" strokeWidth={3} />
              </div>
              <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Equipe</span>
                  <span className="text-2xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
              </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink to="/" className={linkClass} onClick={toggleSidebar}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/onboarding-admin" className={linkClass} onClick={toggleSidebar}>
            <Video className="w-5 h-5" />
            <span>Onboarding Online</span>
          </NavLink>
          <NavLink to="/commissions" className={linkClass} onClick={toggleSidebar}>
            <Banknote className="w-5 h-5" />
            <span>Comissões</span>
          </NavLink>
          <NavLink to="/feedbacks" className={linkClass} onClick={toggleSidebar}>
            <Star className="w-5 h-5" />
            <span>Feedbacks</span>
          </NavLink>
          <NavLink to="/materials" className={linkClass} onClick={toggleSidebar}>
            <Library className="w-5 h-5" />
            <span>Materiais de Apoio</span>
          </NavLink>
          <NavLink to="/links" className={linkClass} onClick={toggleSidebar}>
            <LinkIcon className="w-5 h-5" />
            <span>Links Importantes</span>
          </NavLink>
          <NavLink to="/profile" className={linkClass} onClick={toggleSidebar}>
            <UserIcon className="w-5 h-5" />
            <span>Meu Perfil</span>
          </NavLink>
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Configurações</p>
          </div>
          <NavLink to="/config-team" className={linkClass} onClick={toggleSidebar}>
            <Users className="w-5 h-5" />
            <span>Gestão de Equipe</span>
          </NavLink>
          <NavLink to="/config-process" className={linkClass} onClick={toggleSidebar}>
            <Settings className="w-5 h-5" />
            <span>Editar Processo</span>
          </NavLink>
          <NavLink to="/config-goals" className={linkClass} onClick={toggleSidebar}>
            <Target className="w-5 h-5" />
            <span>Configurar Metas</span>
          </NavLink>
          <NavLink to="/config-interview" className={linkClass} onClick={toggleSidebar}>
            <FileText className="w-5 h-5" />
            <span>Configurar Entrevista</span>
          </NavLink>
          <NavLink to="/config-templates" className={linkClass} onClick={toggleSidebar}>
            <MessageSquare className="w-5 h-5" />
            <span>Configurar Mensagens</span>
          </NavLink>
          <NavLink to="/config-cutoff" className={linkClass} onClick={toggleSidebar}>
            <Calendar className="w-5 h-5" />
            <span>Períodos de Corte</span>
          </NavLink>
        </nav>

        {/* Footer & Toggle */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex gap-2">
              <button 
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              title="Alternar Tema"
              >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              
              <button 
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
              title="Sair"
              >
              <LogOut className="w-4 h-4" />
              </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">
              {user?.email || 'Acesso Restrito'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};