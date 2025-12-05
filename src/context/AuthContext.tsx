import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (session: Session): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      const name = profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : session.user.email?.split('@')[0] || 'Usuário';
        
      return { id: session.user.id, name, email: session.user.email || '' };
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      return {
        id: session.user.id,
        name: session.user.email?.split('@')[0] || 'Usuário',
        email: session.user.email || '',
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

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/update-password`,
    });
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    sendPasswordResetEmail,
  }), [user, session, isLoading, login, register, logout, sendPasswordResetEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};