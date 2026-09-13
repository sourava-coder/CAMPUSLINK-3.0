import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        return { error: signUpError.message };
      }

      // Try to automatically sign in after signup
      if (data.user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInError) {
          // If email not confirmed, provide instructions
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            return {
              error: `✅ Account created! अब आप login कर सकते हैं। Supabase Dashboard में जाएं:\n1. Authentication → Users\n2. ${email} को ढूंढें\n3. "Confirm" बटन दबाएं\n4. फिर से Login करें।`,
            };
          }
          return { error: signInError.message };
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (!error) return { error: null };
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        error: `📧 Email confirm नहीं है। Supabase Dashboard में:\n1. Authentication → Users जाएं\n2. "${email}" को ढूंढें\n3. "Confirm" दबाएं\n4. फिर से Login करें`,
      };
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Email/password गलत है या यह user नए Supabase project में मौजूद नहीं है। पहले नए project में user बनाएं।' };
    }
    return { error: error.message };
  };

  const signOut = async () => {
    setSession(null);
    setLoading(false);

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
