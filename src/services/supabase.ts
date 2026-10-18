import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Project URL and publishable key are public by design: every table and storage object is locked to its
// owner with Row Level Security, so this key alone grants no access to anyone else's data.
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ?? 'https://jqxwsejvdigtjenmiwcb.supabase.co';
export const SUPABASE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_xh_d6bE2RdvgKNbE9C6NWA_FoSz1AiR';

// The web build is pre-rendered in Node (no window), so use a throwaway in-memory store there.
const memory = new Map<string, string>();
const ssrStorage = {
  getItem: async (k: string) => memory.get(k) ?? null,
  setItem: async (k: string, v: string) => void memory.set(k, v),
  removeItem: async (k: string) => void memory.delete(k),
};
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: isServer ? ssrStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: Platform.OS === 'web', // password-reset / confirm links land on the web build
  },
});
