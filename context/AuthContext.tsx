import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConnectionReady: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectionReady, setIsConnectionReady] = useState(false);

  useEffect(() => {
    // 1. Protocolo de Despertar: Pinga o banco de dados para acordá-lo.
    const initializeConnection = async () => {
      try {
        // Uma query leve para "acordar" o banco de dados.
        await supabase.from('profiles').select('id').limit(1);
      } catch (error) {
        console.error("Database wake-up call failed, but proceeding. Auth will handle connectivity.", error);
      } finally {
        // Confirma que a tentativa de conexão foi feita.
        setIsConnectionReady(true);
      }
    };

    initializeConnection();

    // 2. Gerenciamento de Autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const currentUser = { 
          id: session.user.id, 
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Usuário', 
          email: session.user.email || '' 
        };
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const register = async (name: string, email: string, pass: string) => {
    const nameParts = name.trim().split(' ');
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ')
        }
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      alert("Ocorreu um erro ao sair.");
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isConnectionReady,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};