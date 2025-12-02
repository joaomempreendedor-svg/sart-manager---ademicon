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
    // This effect runs only once to set up the auth listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        
        if (event === 'SIGNED_OUT') {
          // Explicitly handle logout: clear user and session.
          setUser(null);
          setSession(null);
        } else if (session) {
          // Handle SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, and INITIAL_SESSION with a valid session.
          // This prevents clearing the user on temporary null sessions during token refreshes.
          setSession(session);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile:', error.message);
          }

          const name = profile && (profile.first_name || profile.last_name)
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : session.user.email?.split('@')[0] || 'Usuário';
          
          setUser({ id: session.user.id, name, email: session.user.email || '' });
        }

        // The initial session check is complete after the first event,
        // allowing the rest of the app to render. This is crucial to stop the loading state.
        if (event === 'INITIAL_SESSION') {
            setIsLoading(false);
        }
      }
    );

    // Immediately check for an existing session to speed up the initial load.
    // The listener above will still run for INITIAL_SESSION, but this can
    // prevent a flicker on fast connections if there's no session.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            setIsLoading(false);
        }
    });

    // Cleanup the subscription on unmount.
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