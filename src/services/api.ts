import { Platform } from 'react-native';
import { useStore } from '../data/store';

/** Base URL for the serverless functions: same origin on the web build, or the configured host in dev. */
export function apiUrl(name: 'debt-coach' | 'budget-coach' | 'receipt-scan'): string {
  const debt = process.env.EXPO_PUBLIC_DEBT_COACH_URL as string | undefined;
  if (name === 'debt-coach') return debt ?? (Platform.OS === 'web' ? '/api/debt-coach' : '');
  const override = process.env[name === 'budget-coach' ? 'EXPO_PUBLIC_BUDGET_COACH_URL' : 'EXPO_PUBLIC_RECEIPT_SCAN_URL'] as string | undefined;
  if (override) return override;
  if (debt) return debt.replace('debt-coach', name);
  return Platform.OS === 'web' ? `/api/${name}` : '';
}

/** Headers for every API call, including the optional access code the owner set in Settings. */
export function apiHeaders(): Record<string, string> {
  const code = useStore.getState().settings.accessCode?.trim();
  return code ? { 'content-type': 'application/json', 'x-access-code': code } : { 'content-type': 'application/json' };
}
