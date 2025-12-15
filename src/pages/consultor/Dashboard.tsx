import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, User } from 'lucide-react';

const ConsultorDashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard do Consultor</h1>
      <p className="text-gray-500 dark:text-gray-400">Bem-vindo! Aqui estão seus atalhos.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/consultor/crm" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-brand-500 transition-all group">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meu CRM</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400">Gerenciar meus leads</p>
            </div>
          </div>
        </Link>
        <Link to="/profile" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-500 transition-all group">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meu Perfil</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">Atualizar minhas informações</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ConsultorDashboard;