import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Settings, FileText, Sun, Moon, Banknote, PlusCircle, Library, TrendingUp, Target, Users, LogOut, User as UserIcon, Star, Video, ListChecks, ClipboardCheck, UserPlus, ChevronLeft, ChevronRight, ChevronDown, UserSearch, BarChart3, MapPin, DollarSign, FileStack, UserCheck, Clock, Calendar, UsersRound, ListTodo, PieChart } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types'; // Importar UserRole

interface GestorSidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
}

export const GestorSidebar: React.FC<GestorSidebarProps> = ({ isSidebarOpen, toggleSidebar, isSidebarCollapsed, toggleSidebarCollapse }) => {
  const { theme, toggleTheme } = useApp();
  const { user, logout } = useAuth();

  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
    } ${isSidebarCollapsed ? 'justify-center space-x-0' : ''}`;

  const sectionTitleClass = `flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors`;

  const userRole = user?.role || 'CONSULTOR'; // Default para CONSULTOR se não houver usuário ou role

  const baseRoute = userRole === 'SECRETARIA' ? "/secretaria" : "/gestor";
  const dashboardPath = `${baseRoute}/dashboard`;

  const allLinks = useMemo(() => [
    // Dashboard (conditional path)
    { to: dashboardPath, icon: LayoutDashboard, label: "Dashboard", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'overview' },

    // CRM & Sales (Gestor/Admin only)
    { to: `${baseRoute}/crm`, icon: TrendingUp, label: "CRM", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/crm-sales-reports`, icon: BarChart3, label: "Relatórios de Vendas", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/commissions`, icon: Banknote, label: "Comissões", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/financial-panel`, icon: DollarSign, label: "Painel Financeiro", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/feedbacks`, icon: Star, label: "Feedbacks", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/team-production-goals`, icon: Target, label: "Metas de Produção", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/my-tasks`, icon: ListTodo, label: "Minhas Tarefas", roles: ['GESTOR', 'ADMIN'], section: 'overview' },

    // Hiring & Onboarding (Shared, but some pages might be Gestor/Admin specific)
    { to: `${baseRoute}/hiring-pipeline`, icon: UserSearch, label: "Pipeline Contratação", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'overview' },
    { to: `${baseRoute}/hiring-origins-report`, icon: MapPin, label: "Candidaturas por Origem", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'overview' },
    { to: `${baseRoute}/onboarding-admin`, icon: Video, label: "Onboarding Online", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'overview' },
    { to: `${baseRoute}/form-cadastros`, icon: FileStack, label: "Gerenciar Formulários", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'overview' },
    { to: `${baseRoute}/daily-checklist-monitoring`, icon: ClipboardCheck, label: "Monitorar Metas Diárias", roles: ['GESTOR', 'ADMIN'], section: 'overview' },
    { to: `${baseRoute}/daily-checklist`, icon: ListChecks, label: "Minhas Rotinas Diárias", roles: ['SECRETARIA'], section: 'overview' }, // Specific for Secretaria

    // Materials (Gestor/Admin only, as per current GestorSidebar)
    { to: `${baseRoute}/materials`, icon: Library, label: "Materiais de Apoio", roles: ['GESTOR', 'ADMIN'], section: 'overview' },

    // Config Links (Gestor/Admin only)
    { to: `${baseRoute}/config-team`, icon: Users, label: "Gestão de Equipe", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/daily-checklist-config`, icon: ListChecks, label: "Config. Metas Diárias", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/config-goals`, icon: Target, label: "Configurar Metas", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/config-interview`, icon: FileText, label: "Configurar Entrevista", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/config-templates`, icon: MessageSquare, label: "Configurar Mensagens", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/config-cutoff`, icon: Clock, label: "Períodos de Corte", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/crm-config`, icon: PlusCircle, label: "Configurar CRM", roles: ['GESTOR', 'ADMIN'], section: 'config' },
    { to: `${baseRoute}/config-origins`, icon: MapPin, label: "Configurar Origens", roles: ['GESTOR', 'ADMIN', 'SECRETARIA'], section: 'config' }, {/* Adicionado SECRETARIA */}
    { to: `${baseRoute}/config-process`, icon: Settings, label: "Editar Processo (Antigo)", roles: ['GESTOR', 'ADMIN'], section: 'config' },
  ], [dashboardPath, baseRoute, userRole]);

  const overviewLinks = allLinks.filter(link => link.section === 'overview' && link.roles.includes(userRole));
  const configLinks = allLinks.filter(link => link.section === 'config' && link.roles.includes(userRole));

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
        <NavLink 
          to={dashboardPath} 
          className={`p-6 border-b border-gray-100 dark:border-slate-800 flex justify-center items-center h-24 cursor-pointer ${isSidebarCollapsed ? 'px-2' : ''}`}
          onClick={toggleSidebar}
        >
          <div className="flex items-center space-x-2">
              <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
                  <TrendingUp className="w-6 h-6" strokeWidth={3} />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Equipe</span>
                    <span className="text-2xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
                </div>
              )}
          </div>
        </NavLink>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {/* Visão Geral e Operação */}
          {!isSidebarCollapsed && (
            <button onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)} className={sectionTitleClass}>
              <span>Visão Geral e Operação</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOverviewCollapsed ? 'rotate-0' : '-rotate-90'}`} />
            </button>
          )}
          {(!isSidebarCollapsed && !isOverviewCollapsed) && (
            <>
              {overviewLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar}>
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </>
          )}
          {isSidebarCollapsed && (
            <>
              {overviewLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar} title={link.label}>
                  <link.icon className="w-5 h-5" />
                </NavLink>
              ))}
            </>
          )}

          {/* Configurações do Sistema */}
          {userRole !== 'SECRETARIA' && ( // Renderiza a seção de configurações apenas para Gestor/Admin
            <>
              {!isSidebarCollapsed && (
                <button onClick={() => setIsConfigCollapsed(!isConfigCollapsed)} className={`${sectionTitleClass} mt-4`}>
                  <span>Configurações do Sistema</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isConfigCollapsed ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              )}
              {(!isSidebarCollapsed && !isConfigCollapsed) && (
                <>
                  {configLinks.map(link => (
                    <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar}>
                      <link.icon className="w-5 h-5" />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </>
              )}
              {isSidebarCollapsed && (
                <>
                  {configLinks.map(link => (
                    <NavLink key={link.to} to={link.to} className={linkClass} onClick={toggleSidebar} title={link.label}>
                      <link.icon className="w-5 h-5" />
                    </NavLink>
                  ))}
                </>
              )}
            </>
          )}
          {/* Configurações do Sistema para Secretaria (apenas Configurar Origens) */}
          {userRole === 'SECRETARIA' && (
            <>
              {!isSidebarCollapsed && (
                <button onClick={() => setIsConfigCollapsed(!isConfigCollapsed)} className={`${sectionTitleClass} mt-4`}>
                  <span>Configurações do Sistema</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isConfigCollapsed ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              )}
              {(!isSidebarCollapsed && !isConfigCollapsed) && (
                <NavLink to={`${baseRoute}/config-origins`} className={linkClass} onClick={toggleSidebar}>
                  <MapPin className="w-5 h-5" />
                  <span>Configurar Origens</span>
                </NavLink>
              )}
              {isSidebarCollapsed && (
                <NavLink to={`${baseRoute}/config-origins`} className={linkClass} onClick={toggleSidebar} title="Configurar Origens">
                  <MapPin className="w-5 h-5" />
                </NavLink>
              )}
            </>
          )}


          {/* Pessoal */}
          {!isSidebarCollapsed && (
            <button onClick={() => setIsPersonalCollapsed(!isPersonalCollapsed)} className={`${sectionTitleClass} mt-4`}>
              <span>Pessoal</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isPersonalCollapsed ? 'rotate-0' : '-rotate-90'}`} />
            </button>
          )}
          {(!isSidebarCollapsed && !isPersonalCollapsed) && (
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
        </nav>

        {/* Footer & Toggle */}
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

          <div className={`bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg ${isSidebarCollapsed ? 'hidden' : ''}`}>
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium truncate">
              {user?.name || 'Usuário'}
            </p>
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