import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Lock, Mail, Loader2, ArrowRight, RotateCcw } from 'lucide-react';

export const Login = () => {
  const { login, user, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(''); // Pode ser email ou CPF (4 dígitos)
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Verifique seu e-mail/CPF e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      // A função de reset de senha do Supabase Auth só funciona com e-mail.
      // Para consultores com login via CPF, o reset será feito pelo gestor.
      if (/^\d{4}$/.test(identifier)) {
        setError('Para redefinir a senha de um login via CPF, por favor, entre em contato com seu gestor.');
        setLoading(false);
        return;
      }
      await sendPasswordResetEmail(identifier);
      setResetMessage(`Se uma conta com o e-mail ${identifier} existir, um link de recuperação foi enviado.`);
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const AuthHeader = () => (
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
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <AuthHeader />
      
      {isResetMode ? (
        <>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900 dark:text-white">Recuperar Senha</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Digite seu e-mail para receber o link de recuperação.</p>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:border-slate-700">
              <form className="space-y-6" onSubmit={handleResetRequest}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                    <input id="identifier" name="identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 dark:bg-slate-700 dark:text-white" placeholder="seu@email.com" />
                  </div>
                </div>
                {resetMessage && <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm font-medium text-green-800 dark:text-green-200">{resetMessage}</div>}
                {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm font-medium text-red-800 dark:text-red-200">{error}</div>}
                <div>
                  <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">Enviar Link <ArrowRight className="w-4 h-4 ml-2" /></span>}
                  </button>
                </div>
                <div className="text-center">
                  <button type="button" onClick={() => setIsResetMode(false)} className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">Voltar para o Login</button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Acesse sua conta</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Ou{' '} <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">crie uma nova conta</Link></p>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:border-slate-700">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail ou Últimos 4 dígitos do CPF</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                    <input id="identifier" name="identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 dark:bg-slate-700 dark:text-white" placeholder="seu@email.com ou 1234" />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                    <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 dark:bg-slate-700 dark:text-white" placeholder="••••••••" />
                  </div>
                </div>
                <div className="text-sm text-right">
                  <button type="button" onClick={() => setIsResetMode(true)} className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">Esqueceu sua senha?</button>
                </div>
                {error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm font-medium text-red-800 dark:text-red-200">{error}</div>}
                <div>
                  <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">Entrar <ArrowRight className="w-4 h-4 ml-2" /></span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};