import { Platform } from 'react-native';
import { supabase } from './supabase';

/** Base URL for the serverless functions: same origin on the web build, or the configured host in dev. */
export function apiUrl(name: 'debt-coach' | 'budget-coach' | 'receipt-scan'): string {
  const debt = process.env.EXPO_PUBLIC_DEBT_COACH_URL as string | undefined;
  if (name === 'debt-coach') return debt ?? (Platform.OS === 'web' ? '/api/debt-coach' : '');
  const override = process.env[name === 'budget-coach' ? 'EXPO_PUBLIC_BUDGET_COACH_URL' : 'EXPO_PUBLIC_RECEIPT_SCAN_URL'] as string | undefined;
  if (override) return override;
  if (debt) return debt.replace('debt-coach', name);
  return Platform.OS === 'web' ? `/api/${name}` : '';
}

/** Headers for every API call. The signed-in user's token proves who is asking, so only account holders can use the AI. */
export async function apiHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { 'content-type': 'application/json', Authorization: `Bearer ${token}` } : { 'content-type': 'application/json' };
}
