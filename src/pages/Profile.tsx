import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Lock, Save, Loader2 } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.name.split(' ').slice(1).join(' ') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage('');
    setProfileError('');

    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfileMessage('Perfil atualizado com sucesso!');
    } catch (error: any) {
      setProfileError(error.message || 'Erro ao atualizar o perfil.');
    } finally {
      setLoadingProfile(false);
      setTimeout(() => {
        setProfileMessage('');
        setProfileError('');
      }, 3000);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPassword(true);
    setPasswordMessage('');
    setPasswordError('');

    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      setLoadingPassword(false);
      return;
    }
    if (password.length < 6) {
      setPasswordError('A senha deve ter no mínimo 6 caracteres.');
      setLoadingPassword(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setPasswordMessage('Senha atualizada com sucesso!');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'Erro ao atualizar a senha.');
    } finally {
      setLoadingPassword(false);
      setTimeout(() => {
        setPasswordMessage('');
        setPasswordError('');
      }, 3000);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie suas informações de conta.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Info */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações Pessoais</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
              <div className="mt-1 flex items-center space-x-2 p-2 bg-gray-100 dark:bg-slate-700 rounded-md">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{user?.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 w-full border-gray-300 dark:border-slate-600 rounded-md p-2 border bg-white dark:bg-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sobrenome</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 w-full border-gray-300 dark:border-slate-600 rounded-md p-2 border bg-white dark:bg-slate-700" />
            </div>
            {profileMessage && <p className="text-sm text-green-600 dark:text-green-400">{profileMessage}</p>}
            {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
            <button type="submit" disabled={loadingProfile} className="w-full flex justify-center items-center space-x-2 bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {loadingProfile ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Alterações</span>
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alterar Senha</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border-gray-300 dark:border-slate-600 rounded-md p-2 border bg-white dark:bg-slate-700" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full border-gray-300 dark:border-slate-600 rounded-md p-2 border bg-white dark:bg-slate-700" />
            </div>
            {passwordMessage && <p className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</p>}
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <button type="submit" disabled={loadingPassword} className="w-full flex justify-center items-center space-x-2 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {loadingPassword ? <Loader2 className="animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Atualizar Senha</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};