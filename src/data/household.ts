import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type Member = { user_id: string; email: string | null; role: 'owner' | 'member'; joined_at: string };

/** The household this account belongs to (everyone in it shares one budget) and who else is in it. */
export const useHousehold = create<{
  id: string | null;
  members: Member[];
  loadingMembers: boolean;
  refreshMembers: () => Promise<void>;
}>((set, get) => ({
  id: null,
  members: [],
  loadingMembers: false,
  refreshMembers: async () => {
    const id = get().id;
    if (!id) return;
    set({ loadingMembers: true });
    const { data } = await supabase.from('allot_members').select('user_id,email,role,joined_at').eq('household_id', id).order('joined_at');
    set({ members: (data as Member[] | null) ?? [], loadingMembers: false });
  },
}));

/** Maps the database's error codes to plain language. */
export function householdError(e: { message?: string } | null | undefined): string {
  const m = (e?.message ?? '').toLowerCase();
  if (m.includes('invalid_code')) return 'That code isn’t valid. It may have been used already or expired — ask for a new one.';
  if (m.includes('too_many_invites')) return 'You already have 5 unused invites. Use or wait for one to expire.';
  if (m.includes('not_owner')) return 'Only the household owner can remove people.';
  if (m.includes('fetch') || m.includes('network')) return 'Couldn’t reach the server. Check your connection and try again.';
  return e?.message || 'Something went wrong. Please try again.';
}
