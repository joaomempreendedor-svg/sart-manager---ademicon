import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
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
    // 1. Fetch the initial session to hydrate the state quickly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // The listener will handle the profile fetching and loading state.
    });

    // 2. Set up a listener for all subsequent auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        
        // On SIGNED_OUT, explicitly clear the user state.
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } 
        // For any other event, if a session exists, update the user profile.
        // This handles SIGNED_IN, TOKEN_REFRESHED, and the initial INITIAL_SESSION event.
        else if (session) {
          setSession(session);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile on auth change:', error.message);
          }

          const name = profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : session.user.email?.split('@')[0] || 'Usuário';
          
          setUser({ id: session.user.id, name, email: session.user.email || '' });
        }
        
        // The initial loading is complete after the first auth event is processed.
        setIsLoading(false);
      }
    );

    // 3. Cleanup the subscription on unmount.
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  }, []);

  const register = useCallback(async (name: string, email: string, pass: string) => {
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
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      alert("Ocorreu um erro ao sair.");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    login,
    register,
    logout,
  }), [user, session, isLoading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};