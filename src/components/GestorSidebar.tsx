import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  TrendingUp,
  Banknote,
  DollarSign,
  Star,
  Video,
  UserSearch,
  FileStack,
  FileText,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

interface GestorSidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
}

export const GestorSidebar: React.FC<GestorSidebarProps> = ({
  isSidebarOpen,
  toggleSidebar,
  isSidebarCollapsed,
  toggleSidebarCollapse,
}) => {
  const { theme, toggleTheme } = useApp();
  const { user, logout } = useAuth();

  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = async () => {
    await logout();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
    } ${isSidebarCollapsed ? 'justify-center space-x-0' : ''}`;

  const sectionTitleClass =
    'flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors';

  const userRole = user?.role || 'GESTOR';
  const baseRoute = userRole === 'SECRETARIA' ? '/secretaria' : '/gestor';
  const dashboardPath = `${baseRoute}/dashboard`;

  const allLinks = [
    { to: dashboardPath, icon: LayoutDashboard, label: 'Dashboard', roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'main' },
    { to: `${baseRoute}/hiring-pipeline`, icon: UserSearch, label: 'Contratação', roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'main' },
    { to: `${baseRoute}/team-config`, icon: Users, label: 'Gestão de Equipe', roles: ['GESTOR', 'ADMIN'], section: 'main' },
    { to: `${baseRoute}/commissions`, icon: Banknote, label: 'Comissões', roles: ['GESTOR', 'ADMIN'], section: 'main' },
    { to: `${baseRoute}/financial-panel`, icon: DollarSign, label: 'Financeiro', roles: ['GESTOR', 'ADMIN'], section: 'main' },
    { to: `${baseRoute}/feedbacks`, icon: Star, label: 'Feedbacks', roles: ['GESTOR', 'ADMIN'], section: 'main' },
    { to: `${baseRoute}/processos`, icon: FileText, label: 'Processos', roles: ['GESTOR', 'ADMIN'], section: 'main' },
    { to: `${baseRoute}/onboarding-admin`, icon: Video, label: 'Onboarding', roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'main' },
    { to: `${baseRoute}/form-cadastros`, icon: FileStack, label: 'Gerenciar Formulários', roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'main' },
  ];

  const visibleLinks = allLinks.filter((link) => link.roles.includes(userRole));
  const filteredMainLinks = visibleLinks.filter((link) =>
    link.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar}></div>
      )}

      <div
        className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      >
        <NavLink
          to={dashboardPath}
          className={`p-6 border-b border-gray-100 dark:border-slate-800 flex justify-center items-center h-24 cursor-pointer ${
            isSidebarCollapsed ? 'px-2' : ''
          }`}
          onClick={toggleSidebar}
        >
          <div className="flex items-center space-x-2">
            <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
              <TrendingUp className="w-6 h-6" strokeWidth={3} />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">
                  Equipe
                </span>
                <span className="text-2xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
              </div>
            )}
          </div>
        </NavLink>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="relative px-0 py-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar no menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-md text-sm bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          )}

          {filteredMainLinks.length > 0 && (
            <>
              {!isSidebarCollapsed && (
                <button onClick={() => setIsMainCollapsed(!isMainCollapsed)} className={sectionTitleClass}>
                  <span>Módulos</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isMainCollapsed ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              )}

              {!isSidebarCollapsed && !isMainCollapsed && (
                <>
                  {filteredMainLinks.map((link) => (
                    <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar}>
                      <link.icon className="w-5 h-5" />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </>
              )}

              {isSidebarCollapsed && (
                <>
                  {filteredMainLinks.map((link) => (
                    <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar} title={link.label}>
                      <link.icon className="w-5 h-5" />
                    </NavLink>
                  ))}
                </>
              )}
            </>
          )}

          {(!searchTerm || 'Meu Perfil'.toLowerCase().includes(searchTerm.toLowerCase())) && (
            <>
              {!isSidebarCollapsed && (
                <button onClick={() => setIsPersonalCollapsed(!isPersonalCollapsed)} className={`${sectionTitleClass} mt-4`}>
                  <span>Pessoal</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isPersonalCollapsed ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              )}

              {!isSidebarCollapsed && !isPersonalCollapsed && (
                <NavLink to="/profile" className={linkClass} onClick={toggleSidebar}>
                  <UserIcon className="w-5 h-5" />
                  <span>Meu Perfil</span>
                </NavLink>
              )}

              {isSidebarCollapsed && (
                <NavLink to="/profile" className={linkClass} onClick={toggleSidebar} title="Meu Perfil">
                  <UserIcon className="w-5 h-5" />
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className={`p-4 border-t border-gray-100 dark:border-slate-800 space-y-4 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`flex ${isSidebarCollapsed ? 'flex-col space-y-2' : 'gap-2'}`}>
            <button
              onClick={toggleTheme}
              className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition ${
                isSidebarCollapsed ? 'w-full' : ''
              }`}
              title="Alternar Tema"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {!isSidebarCollapsed && <span>Tema</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition ${
                isSidebarCollapsed ? 'w-full' : ''
              }`}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Sair</span>}
            </button>
          </div>

          <div className={`bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg ${isSidebarCollapsed ? 'hidden' : ''}`}>
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium truncate">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">
              {user?.email || 'Acesso Restrito'}
            </p>
          </div>

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