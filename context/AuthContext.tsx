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
    // This is called once on initial load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // The onAuthStateChange listener will handle the user state and loading.
      // We set loading to false here only if there's no session, otherwise the listener will do it.
      if (!session) {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        if (session) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .single();

          // Log error but don't block auth if profile is missing
          if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
            console.error('Error fetching profile:', error.message);
          }

          const name = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
            : session.user.email?.split('@')[0] || 'Usuário';

          const currentUser = { 
            id: session.user.id, 
            name: name || session.user.email || 'Usuário',
            email: session.user.email || '' 
          };
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error in onAuthStateChange handler:", e);
        setUser(null);
      } finally {
        // Ensure loading is set to false after the logic runs.
        setIsLoading(false);
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