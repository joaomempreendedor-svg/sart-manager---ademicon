import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>; // identifier pode ser email ou CPF (4 dígitos)
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>; // Nova função para atualizar senha
  resetConsultantPasswordViaEdge: (userId: string, newPassword: string) => Promise<void>; // NOVO: Reset de senha via Edge Function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (session: Session): Promise<User | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, login, needs_password_change') // Adicionado login e needs_password_change
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // CORREÇÃO: Buscar team_member usando 'data->>id' para o ID do auth.users
      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from('team_members')
        .select('data')
        .eq('data->>id', session.user.id) // Corrigido para buscar no JSONB 'data'
        .maybeSingle();

      if (teamMemberError) console.error("Error fetching team member status:", teamMemberError);

      const name = profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : session.user.email?.split('@')[0] || 'Usuário';
        
      const isActive = teamMemberData ? (teamMemberData.data as any).isActive : true; // Default to true if not found or not a team member

      return { 
        id: session.user.id, 
        name, 
        email: session.user.email || '',
        role: (profile?.role || 'CONSULTOR').toUpperCase() as UserRole, // Garante que o papel seja sempre em maiúsculas
        isActive: isActive,
        login: profile?.login, // Adicionado
        hasLogin: !!profile?.login, // Adicionado
        needs_password_change: profile?.needs_password_change || false, // Adicionado
      };
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      return {
        id: session.user.id,
        name: session.user.email?.split('@')[0] || 'Usuário',
        email: session.user.email || '',
        role: 'CONSULTOR', // Fallback role
        isActive: false, // Default to inactive on error for safety
        hasLogin: false,
        needs_password_change: false,
      };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const updateUserState = async (currentSession: Session | null) => {
      if (!isMounted) return;

      if (currentSession) {
        const userProfile = await fetchUserProfile(currentSession);
        setUser(userProfile);
        setSession(currentSession);
      } else {
        setUser(null);
        setSession(null);
      }
      setIsLoading(false);
    };

    // Check initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserState(session);
    });

    // Set up the listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        updateUserState(newSession);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (identifier: string, password: string) => {
    const id = (identifier || '').trim();
    const pwd = (password || '').trim();
    let authError: Error | null = null;

    if (/^\d{4}$/.test(id)) {
      console.log(`[AuthContext] Tentando login com CPF (últimos 4): ${id}`);
      const { data: rpcResult, error: rpcError } = await supabase.rpc('sign_in_with_login', {
        login_val: id,
      });

      if (rpcError) {
        console.error(`[AuthContext] Erro RPC ao buscar email por CPF (4 dígitos):`, rpcError);
        authError = rpcError;
      } else if (rpcResult && typeof rpcResult === 'object' && 'email' in rpcResult) {
        const userEmail = (rpcResult as { email: string }).email;
        const { error: emailSignInError } = await supabase.auth.signInWithPassword({ email: userEmail.toLowerCase(), password: pwd });
        authError = emailSignInError;
      } else {
        console.log(`[AuthContext] RPC não retornou email para CPF (4): ${id}`);
        authError = new Error("Usuário não encontrado com o login fornecido. Se você é SECRETARIA/GESTOR, use seu e-mail.");
      }
    } else if (/^\d{11}$/.test(id)) {
      console.log(`[AuthContext] Tentando login com CPF completo: ${id}`);
      const { data: rpcResult, error: rpcError } = await supabase.rpc('sign_in_with_login', {
        login_val: id,
      });
      if (rpcError) {
        console.error(`[AuthContext] Erro RPC ao buscar email por CPF completo:`, rpcError);
        authError = rpcError;
      } else if (rpcResult && typeof rpcResult === 'object' && 'email' in rpcResult) {
        const userEmail = (rpcResult as { email: string }).email;
        const { error: emailSignInError } = await supabase.auth.signInWithPassword({ email: userEmail.toLowerCase(), password: pwd });
        authError = emailSignInError;
      } else {
        authError = new Error("Usuário não encontrado com o CPF informado.");
      }
    } else {
      const email = id.toLowerCase();
      console.log(`[AuthContext] Tentando login com email: ${email}`);
      const { error: emailSignInError } = await supabase.auth.signInWithPassword({ email, password: pwd });
      authError = emailSignInError;
    }

    if (authError) throw authError;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          first_name: cleanName.split(' ')[0],
          last_name: cleanName.split(' ').slice(1).join(' '),
        }
      }
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/update-password`,
    });
    if (error) throw error;
  }, []);

  const updateUserPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    // Após a troca de senha, marcar needs_password_change como false no perfil
    if (user?.id) {
      await supabase.from('profiles').update({ needs_password_change: false }).eq('id', user.id);
      setUser(prev => prev ? { ...prev, needs_password_change: false } : null);
    }
  }, [user]);

  const resetConsultantPasswordViaEdge = useCallback(async (userId: string, newPassword: string) => {
    const { data, error } = await supabase.functions.invoke('reset-consultant-password', {
      body: { userId, newPassword },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    sendPasswordResetEmail,
    updateUserPassword,
    resetConsultantPasswordViaEdge, // Adicionado
  }), [user, session, isLoading, login, register, logout, sendPasswordResetEmail, updateUserPassword, resetConsultantPasswordViaEdge]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};