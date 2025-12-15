import React from 'react';
import { TrendingUp, Clock, Mail } from 'lucide-react';

export const PendingApproval = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2">
            <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
                <TrendingUp className="w-8 h-8" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Equipe</span>
                <span className="text-3xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Aguardando Aprovação
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Seu cadastro foi enviado e está aguardando a aprovação de um gestor.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:border-slate-700 text-center">
          <Clock className="mx-auto h-16 w-16 text-brand-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Seu acesso está pendente</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Um gestor da equipe SART precisa ativar sua conta. Por favor, aguarde a liberação.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
            <Mail className="w-4 h-4 mr-2" />
            Em caso de dúvidas, entre em contato com seu gestor.
          </p>
        </div>
      </div>
    </div>
  );
};