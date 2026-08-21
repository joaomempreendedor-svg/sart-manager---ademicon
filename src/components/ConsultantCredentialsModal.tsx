import React, { useState } from 'react';
import { X, Copy, Check, User, Lock, TrendingUp, Mail } from 'lucide-react';

interface ConsultantCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultantName: string;
  login: string;
  password: string; // Agora sempre conterá a senha temporária (ou uma string vazia se não aplicável)
  wasExistingUser: boolean; // Nova prop para indicar se o usuário já existia
}

export const ConsultantCredentialsModal: React.FC<ConsultantCredentialsModalProps> = ({
  isOpen,
  onClose,
  consultantName,
  login,
  password,
  wasExistingUser, // Usar a nova prop
}) => {
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'login' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'login') {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Credenciais do Consultor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
                <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
                    <TrendingUp className="w-6 h-6" strokeWidth={3} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Equipe</span>
                    <span className="text-2xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
                </div>
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-lg font-medium">
              Bem-vindo(a), <span className="text-brand-600 dark:text-brand-400">{consultantName}</span>!
            </p>
            {wasExistingUser ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                A senha deste consultor foi **resetada** para a senha temporária abaixo. Ele será solicitado a trocá-la no primeiro acesso.
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use as credenciais abaixo para o primeiro acesso. O consultor será solicitado a trocar a senha.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login (E-mail)</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                readOnly
                value={login}
                className="w-full pl-10 pr-12 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-mono"
              />
              <button
                onClick={() => handleCopy(login, 'login')}
                className="absolute right-2 p-1 bg-white dark:bg-slate-800 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition text-brand-600 dark:text-brand-400"
                title="Copiar Login"
              >
                {copiedLogin ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sempre exibe a senha, pois a Edge Function garante que ela foi definida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Temporária</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                readOnly
                value={password}
                className="w-full pl-10 pr-12 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-mono"
              />
              <button
                onClick={() => handleCopy(password, 'password')}
                className="absolute right-2 p-1 bg-white dark:bg-slate-800 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition text-brand-600 dark:text-brand-400"
                title="Copiar Senha"
              >
                {copiedPassword ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};