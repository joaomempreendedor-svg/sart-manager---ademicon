import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  UserSearch,
  Video,
  X,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/secretaria/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/secretaria/checklists', label: 'Checklists', icon: CheckSquare },
  { to: '/secretaria/hiring-dashboard', label: 'Contratação', icon: CalendarDays },
  { to: '/secretaria/hiring-pipeline', label: 'Pipeline', icon: UserSearch },
  { to: '/secretaria/onboarding-admin', label: 'Onboarding', icon: Video },
  { to: '/secretaria/form-cadastros', label: 'Formulários', icon: FileStack },
];

export const SecretariaLayout = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
    }`;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-100 px-6 dark:border-slate-800 md:justify-center">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-500 p-2 text-white shadow-lg shadow-brand-500/30">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-white">
                Área
              </p>
              <p className="text-lg font-black tracking-tight text-brand-500">Secretaria</p>
            </div>
          </div>
          <button
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100vh-5rem)] flex-col justify-between p-4">
          <div className="space-y-6">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setIsSidebarOpen(false)}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>

          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="truncate text-sm font-semibold text-blue-900 dark:text-blue-200">
              {user?.name || 'Secretaria'}
            </p>
            <p className="truncate text-xs text-blue-700 dark:text-blue-300">
              {user?.email || 'Acesso operacional'}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-72">
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <button
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Secretaria</p>
            <div className="w-9" />
          </div>
        </div>

        <div className="hidden md:block">
          <Header isSidebarOpen={false} toggleSidebar={() => undefined} user={user} />
        </div>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};