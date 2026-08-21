import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Loader2, ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const UpdatePassword = () => {
  const { session, updateUserPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      setMessage('Aguardando token de recuperação...');
      const timer = setTimeout(() => {
        if (!session) {
          setError('Token de recuperação inválido ou expirado. Por favor, solicite um novo link.');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(password);
      setMessage('Senha atualizada com sucesso! Redirecionando para a tela de login...');
      
      // Desconecta o usuário e redireciona imediatamente
      await logout();
      navigate('/login');
      
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          Cadastre uma nova senha
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 dark:bg-slate-700 dark:text-white" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 dark:bg-slate-700 dark:text-white" placeholder="Repita a nova senha" />
              </div>
            </div>
            {message && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 flex items-start space-x-3"><CheckCircle2 className="h-5 w-5 text-green-400" /><p className="text-sm font-medium text-green-800 dark:text-green-200">{message}</p></div>}
            {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm font-medium text-red-800 dark:text-red-200">{error}</div>}
            <div>
              <button type="submit" disabled={loading || !session || !!message} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">Atualizar Senha <ArrowRight className="w-4 h-4 ml-2" /></span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};