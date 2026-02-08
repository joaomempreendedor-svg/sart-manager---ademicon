import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Settings, FileText, Sun, Moon, Banknote, PlusCircle, Library, TrendingUp, Target, Users, LogOut, User as UserIcon, Star, Video, ListChecks, ClipboardCheck, UserPlus, ChevronLeft, ChevronRight, ChevronDown, UserSearch, BarChart3, UserCog, MapPin, DollarSign, FileStack, UserCheck, Clock, Calendar, UsersRound, ListTodo } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

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

  const isSecretaria = user?.role === 'SECRETARIA';

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}>
        <div className={`p-6 border-b border-gray-100 dark:border-slate-800 flex justify-center items-center h-24 ${isSidebarCollapsed ? 'px-2' : ''}`}>
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
        </div>
        
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
              {isSecretaria ? (
                // Links específicos para a Secretaria
                <>
                  <NavLink to="/secretaria/hiring-pipeline" className={linkClass} onClick={toggleSidebar}>
                    <UserSearch className="w-5 h-5" />
                    <span>Pipeline Contratação</span>
                  </NavLink>
                  <NavLink to="/secretaria/candidate-screening" className={linkClass} onClick={toggleSidebar}>
                    <UserCheck className="w-5 h-5" />
                    <span>Controle Candidaturas</span>
                  </NavLink>
                  <NavLink to="/secretaria/all-candidates" className={linkClass} onClick={toggleSidebar}>
                    <UsersRound className="w-5 h-5" />
                    <span>Todos os Candidatos</span>
                  </NavLink>
                  <NavLink to="/secretaria/hiring-reports" className={linkClass} onClick={toggleSidebar}>
                    <UserCog className="w-5 h-5" />
                    <span>Relatórios Contratação</span>
                  </NavLink>
                  <NavLink to="/secretaria/onboarding-admin" className={linkClass} onClick={toggleSidebar}>
                    <Video className="w-5 h-5" />
                    <span>Onboarding Online</span>
                  </NavLink>
                  <NavLink to="/secretaria/form-cadastros" className={linkClass} onClick={toggleSidebar}>
                    <FileStack className="w-5 h-5" />
                    <span>Gerenciar Formulários</span>
                  </NavLink>
                  <NavLink to="/secretaria/config-origins" className={linkClass} onClick={toggleSidebar}>
                    <MapPin className="w-5 h-5" />
                    <span>Configurar Origens</span>
                  </NavLink>
                </>
              ) : (
                // Links para Gestor/Admin
                <>
                  <NavLink to="/gestor/dashboard" className={linkClass} onClick={toggleSidebar}>
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </NavLink>
                  
                  <NavLink to="/gestor/crm" className={linkClass} onClick={toggleSidebar}>
                    <TrendingUp className="w-5 h-5" />
                    <span>CRM</span>
                  </NavLink>
                  <NavLink to="/gestor/crm-sales-reports" className={linkClass} onClick={toggleSidebar}>
                    <BarChart3 className="w-5 h-5" />
                    <span>Relatórios de Vendas</span>
                  </NavLink>
                  <NavLink to="/gestor/hiring-pipeline" className={linkClass} onClick={toggleSidebar}>
                    <UserSearch className="w-5 h-5" />
                    <span>Pipeline Contratação</span>
                  </NavLink>
                  <NavLink to="/gestor/candidate-screening" className={linkClass} onClick={toggleSidebar}>
                    <UserCheck className="w-5 h-5" />
                    <span>Controle Candidaturas</span>
                  </NavLink>
                  <NavLink to="/gestor/all-candidates" className={linkClass} onClick={toggleSidebar}>
                    <UsersRound className="w-5 h-5" />
                    <span>Todos os Candidatos</span>
                  </NavLink>
                  <NavLink to="/gestor/hiring-reports" className={linkClass} onClick={toggleSidebar}>
                    <UserCog className="w-5 h-5" />
                    <span>Relatórios Contratação</span>
                  </NavLink>
                  <NavLink to="/gestor/onboarding-admin" className={linkClass} onClick={toggleSidebar}>
                    <Video className="w-5 h-5" />
                    <span>Onboarding Online</span>
                  </NavLink>
                  <NavLink to="/gestor/form-cadastros" className={linkClass} onClick={toggleSidebar}>
                    <FileStack className="w-5 h-5" />
                    <span>Gerenciar Formulários</span>
                  </NavLink>
                  <NavLink to="/gestor/commissions" className={linkClass} onClick={toggleSidebar}>
                    <Banknote className="w-5 h-5" />
                    <span>Comissões</span>
                  </NavLink>
                  <NavLink to="/gestor/financial-panel" className={linkClass} onClick={toggleSidebar}>
                    <DollarSign className="w-5 h-5" />
                    <span>Painel Financeiro</span>
                  </NavLink>
                  <NavLink to="/gestor/feedbacks" className={linkClass} onClick={toggleSidebar}>
                    <Star className="w-5 h-5" />
                    <span>Feedbacks</span>
                  </NavLink>
                  <NavLink to="/gestor/daily-checklist-monitoring" className={linkClass} onClick={toggleSidebar}>
                    <ClipboardCheck className="w-5 h-5" />
                    <span>Monitorar Metas Diárias</span>
                  </NavLink>
                  <NavLink to="/gestor/team-production-goals" className={linkClass} onClick={toggleSidebar}>
                    <Target className="w-5 h-5" />
                    <span>Metas de Produção</span>
                  </NavLink>
                  <NavLink to="/gestor/my-tasks" className={linkClass} onClick={toggleSidebar}>
                    <ListTodo className="w-5 h-5" />
                    <span>Minhas Tarefas</span>
                  </NavLink>
                </>
              )}
            </>
          )}
          {isSidebarCollapsed && (
            <>
              {isSecretaria ? (
                // Links específicos para a Secretaria (colapsado)
                <>
                  <NavLink to="/secretaria/hiring-pipeline" className={linkClass} onClick={toggleSidebar} title="Pipeline Contratação">
                    <UserSearch className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/candidate-screening" className={linkClass} onClick={toggleSidebar} title="Controle Candidaturas">
                    <UserCheck className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/all-candidates" className={linkClass} onClick={toggleSidebar} title="Todos os Candidatos">
                    <UsersRound className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/hiring-reports" className={linkClass} onClick={toggleSidebar} title="Relatórios Contratação">
                    <UserCog className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/onboarding-admin" className={linkClass} onClick={toggleSidebar} title="Onboarding Online">
                    <Video className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/form-cadastros" className={linkClass} onClick={toggleSidebar} title="Gerenciar Formulários">
                    <FileStack className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/secretaria/config-origins" className={linkClass} onClick={toggleSidebar} title="Configurar Origens">
                    <MapPin className="w-5 h-5" />
                  </NavLink>
                </>
              ) : (
                // Links para Gestor/Admin (colapsado)
                <>
                  <NavLink to="/gestor/dashboard" className={linkClass} onClick={toggleSidebar} title="Dashboard">
                    <LayoutDashboard className="w-5 h-5" />
                  </NavLink>
                  
                  <NavLink to="/gestor/crm" className={linkClass} onClick={toggleSidebar} title="CRM">
                    <TrendingUp className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/crm-sales-reports" className={linkClass} onClick={toggleSidebar} title="Relatórios de Vendas">
                    <BarChart3 className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/hiring-pipeline" className={linkClass} onClick={toggleSidebar} title="Pipeline Contratação">
                    <UserSearch className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/candidate-screening" className={linkClass} onClick={toggleSidebar} title="Controle Candidaturas">
                    <UserCheck className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/all-candidates" className={linkClass} onClick={toggleSidebar} title="Todos os Candidatos">
                    <UsersRound className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/hiring-reports" className={linkClass} onClick={toggleSidebar} title="Relatórios Contratação">
                    <UserCog className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/onboarding-admin" className={linkClass} onClick={toggleSidebar} title="Onboarding Online">
                    <Video className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/form-cadastros" className={linkClass} onClick={toggleSidebar} title="Gerenciar Formulários">
                    <FileStack className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/commissions" className={linkClass} onClick={toggleSidebar} title="Comissões">
                    <Banknote className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/financial-panel" className={linkClass} onClick={toggleSidebar} title="Painel Financeiro">
                    <DollarSign className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/feedbacks" className={linkClass} onClick={toggleSidebar} title="Feedbacks">
                    <Star className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/daily-checklist-monitoring" className={linkClass} onClick={toggleSidebar} title="Monitorar Metas Diárias">
                    <ClipboardCheck className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/team-production-goals" className={linkClass} onClick={toggleSidebar} title="Metas de Produção">
                    <Target className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/my-tasks" className={linkClass} onClick={toggleSidebar} title="Minhas Tarefas">
                    <ListTodo className="w-5 h-5" />
                  </NavLink>
                </>
              )}
            </>
          )}

          {/* Configurações do Sistema */}
          {!isSidebarCollapsed && (
            <button onClick={() => setIsConfigCollapsed(!isConfigCollapsed)} className={`${sectionTitleClass} mt-4`}>
              <span>Configurações do Sistema</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isConfigCollapsed ? 'rotate-0' : '-rotate-90'}`} />
            </button>
          )}
          {(!isSidebarCollapsed && !isConfigCollapsed) && (
            <>
              {/* Itens para Gestor/Admin */}
              {!isSecretaria && (
                <>
                  <NavLink to="/gestor/config-team" className={linkClass} onClick={toggleSidebar}>
                    <Users className="w-5 h-5" />
                    <span>Gestão de Equipe</span>
                  </NavLink>
                  <NavLink to="/gestor/daily-checklist-config" className={linkClass} onClick={toggleSidebar}>
                    <ListChecks className="w-5 h-5" />
                    <span>Config. Metas Diárias</span>
                  </NavLink>
                  <NavLink to="/gestor/config-goals" className={linkClass} onClick={toggleSidebar}>
                    <Target className="w-5 h-5" />
                    <span>Configurar Metas</span>
                  </NavLink>
                  <NavLink to="/gestor/config-interview" className={linkClass} onClick={toggleSidebar}>
                    <FileText className="w-5 h-5" />
                    <span>Configurar Entrevista</span>
                  </NavLink>
                  <NavLink to="/gestor/config-templates" className={linkClass} onClick={toggleSidebar}>
                    <MessageSquare className="w-5 h-5" />
                    <span>Configurar Mensagens</span>
                  </NavLink>
                  <NavLink to="/gestor/config-cutoff" className={linkClass} onClick={toggleSidebar}>
                    <Clock className="w-5 h-5" />
                    <span>Períodos de Corte</span>
                  </NavLink>
                  <NavLink to="/gestor/crm-config" className={linkClass} onClick={toggleSidebar}>
                    <PlusCircle className="w-5 h-5" />
                    <span>Configurar CRM</span>
                  </NavLink>
                  <NavLink to="/gestor/config-origins" className={linkClass} onClick={toggleSidebar}>
                    <MapPin className="w-5 h-5" />
                    <span>Configurar Origens</span>
                  </NavLink>
                  <NavLink to="/gestor/config-process" className={linkClass} onClick={toggleSidebar}>
                    <Settings className="w-5 h-5" />
                    <span>Editar Processo (Antigo)</span>
                  </NavLink>
                </>
              )}
            </>
          )}
          {isSidebarCollapsed && (
            <>
              {/* Itens para Gestor/Admin (colapsado) */}
              {!isSecretaria && (
                <>
                  <NavLink to="/gestor/config-team" className={linkClass} onClick={toggleSidebar} title="Gestão de Equipe">
                    <Users className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/daily-checklist-config" className={linkClass} onClick={toggleSidebar} title="Config. Metas Diárias">
                    <ListChecks className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-goals" className={linkClass} onClick={toggleSidebar} title="Configurar Metas">
                    <Target className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-interview" className={linkClass} onClick={toggleSidebar} title="Configurar Entrevista">
                    <FileText className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-templates" className={linkClass} onClick={toggleSidebar} title="Configurar Mensagens">
                    <MessageSquare className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-cutoff" className={linkClass} onClick={toggleSidebar} title="Períodos de Corte">
                    <Clock className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/crm-config" className={linkClass} onClick={toggleSidebar} title="Configurar CRM">
                    <PlusCircle className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-origins" className={linkClass} onClick={toggleSidebar} title="Configurar Origens">
                    <MapPin className="w-5 h-5" />
                  </NavLink>
                  <NavLink to="/gestor/config-process" className={linkClass} onClick={toggleSidebar} title="Editar Processo (Antigo)">
                    <Settings className="w-5 h-5" />
                  </NavLink>
                </>
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
              className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition ${isSidebarCollapsed ? 'w-full' : ''}`}
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