import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthContext } from './auth-context';

function getAuthErrorMessage(message: string, action: 'sign in' | 'register'): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect. Check your details and try again.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email using the link we sent, then sign in.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (normalized.includes('invalid email') || normalized.includes('unable to validate email')) {
    return 'Enter a valid email address and try again.';
  }
  if (normalized.includes('password should be at least') || normalized.includes('password is too short')) {
    const minimumLength = message.match(/at least\s+(\d+)/i)?.[1] || '6';
    return `Password must be at least ${minimumLength} characters long.`;
  }
  if (normalized.includes('rate limit') || normalized.includes('security purposes')) {
    return 'Too many attempts. Wait a few minutes, then try again.';
  }
  if (normalized.includes('fetch') || normalized.includes('network')) {
    return 'Unable to reach the server. Check your internet connection and try again.';
  }

  return action === 'register'
    ? 'We could not create your account right now. Please try again.'
    : 'We could not sign you in right now. Please try again.';
}

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
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      return { error: error ? getAuthErrorMessage(error.message, 'register') : null };
    } catch (err) {
      return { error: getAuthErrorMessage(err instanceof Error ? err.message : '', 'register') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      return { error: error ? getAuthErrorMessage(error.message, 'sign in') : null };
    } catch (err) {
      return { error: getAuthErrorMessage(err instanceof Error ? err.message : '', 'sign in') };
    }
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
