import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) console.error('Error fetching profile on initial load:', error.message);

          const name = profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : session.user.email?.split('@')[0] || 'Usuário';
          
          setUser({ id: session.user.id, name, email: session.user.email || '' });
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error fetching initial session:", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
       if (session) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) console.error('Error fetching profile on auth change:', error.message);

          const name = profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : session.user.email?.split('@')[0] || 'Usuário';
          
          setUser({ id: session.user.id, name, email: session.user.email || '' });
        } else {
          setUser(null);
        }
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