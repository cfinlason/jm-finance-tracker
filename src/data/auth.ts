import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  user: User | null;
  session: Session | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Returns an error message, or `{ confirm: true }`-style note when the email must be confirmed first. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

/** Turns Supabase's technical errors into something a person can act on. */
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match. Check them, or reset your password.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with that email already exists. Try signing in instead.';
  if (m.includes('email not confirmed')) return 'Confirm your email first — we sent you a link when you signed up.';
  if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('least'))) return 'Choose a longer password (at least 8 characters).';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('fetch') || m.includes('network')) return 'Couldn’t reach the server. Check your connection.';
  return msg;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  session: null,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, status: data.session ? 'signedIn' : 'signedOut' });
    }).catch(() => set({ status: 'signedOut' }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, status: session ? 'signedIn' : 'signedOut' });
    });
    return () => data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendly(error.message) : null;
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendly(error.message), needsConfirm: false };
    // With "Confirm email" switched on in Supabase there is no session until the link is clicked.
    return { error: null, needsConfirm: !data.session };
  },

  resetPassword: async (email) => {
    const redirectTo = typeof window !== 'undefined' && window.location ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    return error ? friendly(error.message) : null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
