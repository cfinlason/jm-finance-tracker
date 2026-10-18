import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { initialState, useStore } from '../data/store';
import { householdError, useHousehold } from '../data/household';
import { Alert } from '../ui/alert';
import { supabase } from './supabase';
import { clearLocalImages, deleteAllRemoteImages, flushPendingUploads, queueUploads } from './receiptImages';

/**
 * Cloud sync. Every account belongs to a household, and the household owns ONE budget document
 * (table allot_households) that all of its members read and write — the joint view.
 *  - the device keeps working offline from its local copy and pushes when it can,
 *  - every push carries a version number, so two devices can't silently overwrite each other,
 *  - other members' edits arrive live (realtime) and on app focus,
 *  - signing in as a different user never leaks the previous user's cached data.
 */

const TABLE = 'allot_households';
const META_KEY = 'allot.sync.meta';

const SYNC_KEYS = ['onboarded', 'isPremium', 'plan', 'hasPurchased', 'trialEnds', 'budgets', 'txs', 'funds', 'debts', 'netEntries', 'netHistory', 'receipts', 'billsPaid', 'activity', 'dismissedTips', 'readArticles', 'settings'] as const;

type Meta = { userId: string | null; householdId: string | null; version: number; hash: string; changedAt: string };
type Row = { data: Record<string, unknown>; version: number; client_updated_at: string };

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export const useSync = create<{ status: SyncStatus; lastSynced: number | null; bootstrapped: boolean; message: string | null }>(() => ({
  status: 'idle',
  lastSynced: null,
  bootstrapped: false,
  message: null,
}));
const setSync = (p: Partial<ReturnType<typeof useSync.getState>>) => useSync.setState(p);

const emptyMeta = (): Meta => ({ userId: null, householdId: null, version: 0, hash: '', changedAt: new Date(0).toISOString() });

// ---- helpers ---------------------------------------------------------------------------------

function snapshot(): Record<string, unknown> {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  return Object.fromEntries(SYNC_KEYS.map((k) => [k, s[k]]));
}

/** Small, stable string hash (djb2) — enough to tell "changed" from "unchanged". */
function hashOf(v: unknown): string {
  const str = JSON.stringify(v);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${str.length}:${h}`;
}

async function loadMeta(): Promise<Meta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (raw) return { ...emptyMeta(), ...(JSON.parse(raw) as Partial<Meta>) };
  } catch {
    /* fall through */
  }
  return emptyMeta();
}

function applyRemote(data: Record<string, unknown>) {
  applying = true;
  const base = initialState();
  useStore.setState({ ...base, ...data, settings: { ...base.settings, ...((data.settings as object) ?? {}) }, hydrated: true, undo: null } as never);
  applying = false;
}

/** A brand-new household document is `{}`; a budget that has been set up always has `onboarded`. */
const isEmptyDoc = (row: Row) => !row.data || !('onboarded' in row.data);

/** window.confirm on web (Alert is a no-op there), a two-button Alert on native. */
function ask(title: string, msg: string, yes: string, no: string, destructiveYes = false): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${msg}\n\nOK = ${yes}\nCancel = ${no}`));
      return;
    }
    Alert.alert(title, msg, [
      { text: no, onPress: () => resolve(false) },
      { text: yes, style: destructiveYes ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

const chooseLocal = () =>
  ask('Keep this device or your account?', 'This device already has a budget, and your account has a different one. Replace the account copy with this device’s data, or load the account data here?', 'use this device’s data (replaces the account copy)', 'load the account data', true);
const askBringLocal = () =>
  ask('Bring this device’s budget into your account?', 'This device already has budget data. You can save it to your account, or start with a clean slate.', 'bring it into my account', 'start fresh (this device’s data is erased)');

// ---- engine state ----------------------------------------------------------------------------

let userId: string | null = null;
let householdId: string | null = null;
let meta: Meta = emptyMeta();
let applying = false;
let pushing = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;
let seenHash = '';
let cleanup: (() => void)[] = [];
let channel: RealtimeChannel | null = null;

const saveMeta = () => AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => undefined);
const hasLocalData = () => useStore.getState().onboarded;

async function fetchRow(): Promise<Row | null> {
  const { data, error } = await supabase.from(TABLE).select('data,version,client_updated_at').eq('id', householdId as string).maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

async function adoptRemote(row: Row) {
  applyRemote(isEmptyDoc(row) ? {} : row.data);
  meta = { ...meta, userId, householdId, version: row.version, hash: hashOf(snapshot()), changedAt: row.client_updated_at };
  seenHash = meta.hash;
  await saveMeta();
}

/** Both sides changed. The newer edit wins, and the loser is kept as a local backup so nothing is lost. */
async function resolveConflict() {
  const row = await fetchRow();
  if (!row) {
    // The household vanished (e.g. we were removed from it): re-join our own and start over from the local copy.
    if (userId) void startSync(userId);
    return;
  }
  if (!isEmptyDoc(row) && new Date(meta.changedAt) <= new Date(row.client_updated_at)) {
    await AsyncStorage.setItem(`allot.conflict.${Date.now()}`, JSON.stringify(snapshot())).catch(() => undefined);
    await adoptRemote(row);
    setSync({ status: 'synced', lastSynced: Date.now(), message: 'Updated from another device' });
    return;
  }
  meta.version = row.version; // our edit is newer: overwrite
  return pushNow();
}

async function pushNow(): Promise<void> {
  if (!userId || !householdId) return;
  if (pushing) {
    again = true;
    return;
  }
  const snap = snapshot();
  const h = hashOf(snap);
  if (h === meta.hash) {
    await flushPendingUploads().catch(() => undefined);
    setSync({ status: 'synced', lastSynced: useSync.getState().lastSynced ?? Date.now() });
    return;
  }
  pushing = true;
  setSync({ status: 'syncing', message: null });
  try {
    const { data: upd, error } = await supabase
      .from(TABLE)
      .update({ data: snap, version: meta.version + 1, client_updated_at: new Date().toISOString() })
      .eq('id', householdId)
      .eq('version', meta.version)
      .select('version');
    if (error) throw error;
    if (!upd || upd.length === 0) {
      pushing = false;
      return resolveConflict();
    }
    meta.version = (upd[0] as { version: number }).version;
    meta.hash = h;
    await saveMeta();
    await flushPendingUploads().catch(() => undefined);
    setSync({ status: 'synced', lastSynced: Date.now(), message: null });
  } catch {
    setSync({ status: 'offline', message: 'Offline — your changes are saved here and will sync when you’re back online.' });
    schedule(20_000);
  } finally {
    pushing = false;
    if (again) {
      again = false;
      schedule(500);
    }
  }
}

function schedule(ms = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void pushNow(), ms);
}

/** Checks whether someone (another device or household member) saved something newer and loads it. */
async function pull() {
  if (!userId || !householdId || pushing) return;
  try {
    const { data } = await supabase.from(TABLE).select('version').eq('id', householdId).maybeSingle();
    const remote = (data as { version: number } | null)?.version ?? 0;
    if (remote <= meta.version) return;
    const dirty = hashOf(snapshot()) !== meta.hash;
    if (dirty) return await resolveConflict();
    const row = await fetchRow();
    if (row) {
      await adoptRemote(row);
      setSync({ status: 'synced', lastSynced: Date.now(), message: 'Updated from another device' });
    }
  } catch {
    /* offline: try again next time */
  }
}

// ---- public API ------------------------------------------------------------------------------

/** `mode: 'remote'` = take the household's budget no matter what is on this device (used after joining one). */
export async function startSync(id: string, mode: 'normal' | 'remote' = 'normal'): Promise<void> {
  stopSync();
  userId = id;
  setSync({ status: 'syncing', bootstrapped: false, message: null });
  meta = await loadMeta();

  // A different account used this device before: never show or upload its cached data.
  if (meta.userId && meta.userId !== id) {
    await wipeLocal();
    meta = emptyMeta();
  }

  try {
    const { data: hid, error: hErr } = await supabase.rpc('allot_ensure_household');
    if (hErr || !hid) throw hErr ?? new Error('no household');
    householdId = hid as string;
    useHousehold.setState({ id: householdId });
    void useHousehold.getState().refreshMembers();

    const owned = meta.userId === id && meta.householdId === householdId;
    const row = await fetchRow();
    if (!row) throw new Error('household row missing');

    if (mode === 'remote') {
      await adoptRemote(row);
    } else if (isEmptyDoc(row)) {
      if (hasLocalData() && (await askBringLocal())) {
        // Data created before accounts existed: it becomes the household's first cloud copy.
        meta = { ...emptyMeta(), userId: id, householdId, version: row.version, changedAt: new Date().toISOString() };
        await queueUploads(Object.keys(useStore.getState().receipts));
        await pushNow();
      } else {
        if (hasLocalData()) await wipeLocal(); // they chose a fresh start
        meta = { ...emptyMeta(), userId: id, householdId, version: row.version, hash: hashOf(snapshot()), changedAt: new Date().toISOString() };
        await saveMeta();
      }
    } else if (!owned && hasLocalData() && hashOf(snapshot()) !== hashOf(row.data)) {
      if (await chooseLocal()) {
        meta = { ...emptyMeta(), userId: id, householdId, version: row.version, changedAt: new Date().toISOString() };
        await queueUploads(Object.keys(useStore.getState().receipts));
        await pushNow();
      } else {
        await adoptRemote(row);
      }
    } else if (!owned || !hasLocalData() || hashOf(snapshot()) === meta.hash) {
      await adoptRemote(row);
    } else if (row.version > meta.version) {
      await resolveConflict();
    } else {
      await pushNow();
    }
    meta.userId = id;
    meta.householdId = householdId;
    await saveMeta();
    setSync({ status: 'synced', lastSynced: Date.now(), bootstrapped: true });
  } catch {
    // Couldn't reach the server. With a cached copy of this account we keep working offline.
    householdId = householdId ?? meta.householdId;
    if (householdId) useHousehold.setState({ id: householdId });
    setSync({ status: 'offline', bootstrapped: true, message: 'Offline — showing the copy saved on this device.' });
    schedule(15_000);
  }

  seenHash = hashOf(snapshot());
  unsubStore = useStore.subscribe(() => {
    if (applying) return;
    const h = hashOf(snapshot());
    if (h === seenHash) return;
    seenHash = h;
    meta.changedAt = new Date().toISOString();
    void saveMeta();
    schedule();
  });

  // Live updates when another member (or another of your devices) saves.
  if (householdId) {
    channel = supabase
      .channel(`allot-household-${householdId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: `id=eq.${householdId}` }, (payload) => {
        const v = (payload.new as { version?: number } | undefined)?.version ?? 0;
        if (v > meta.version) void pull();
      })
      .subscribe();
  }

  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void pull();
    void useHousehold.getState().refreshMembers();
    schedule(300);
  };
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    cleanup.push(() => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    });
  } else {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && onVisible());
    cleanup.push(() => sub.remove());
  }
}

export function stopSync() {
  if (timer) clearTimeout(timer);
  timer = null;
  unsubStore?.();
  unsubStore = null;
  cleanup.forEach((f) => f());
  cleanup = [];
  if (channel) void supabase.removeChannel(channel);
  channel = null;
  userId = null;
  householdId = null;
  setSync({ status: 'idle', bootstrapped: false, message: null });
}

export async function syncNow(): Promise<void> {
  await pull();
  await pushNow();
}

async function wipeLocal() {
  applying = true;
  const ids = Object.keys(useStore.getState().receipts);
  useStore.setState({ ...initialState(), hydrated: true } as never);
  applying = false;
  await clearLocalImages(ids);
  await AsyncStorage.removeItem(META_KEY);
  useHousehold.setState({ id: null, members: [] });
}

/** Sign out: push what's pending, then clear this device so the next person never sees this budget. */
export async function signOutAndWipe(): Promise<void> {
  try {
    await pushNow();
  } catch {
    /* sign out anyway */
  }
  stopSync();
  await supabase.auth.signOut();
  await wipeLocal();
}

/** "Erase all data": empties the household's budget and photos, then resets this device. */
export async function eraseEverything(): Promise<void> {
  await deleteAllRemoteImages();
  const ids = Object.keys(useStore.getState().receipts);
  await clearLocalImages(ids);
  useStore.getState().resetAll(); // the store subscription pushes the empty state to the cloud
}

// ---- family actions --------------------------------------------------------------------------

type Result = { error: string | null };

/** Makes a single-use code (valid 7 days) that lets someone join this household. */
export async function createInvite(): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('allot_create_invite');
  return error ? { code: null, error: householdError(error) } : { code: data as string, error: null };
}

/** Joins another household. This account's current budget is replaced by the shared one. */
export async function joinHousehold(code: string): Promise<Result> {
  const uid = userId;
  if (!uid) return { error: 'Sign in first.' };
  await pushNow().catch(() => undefined);
  const { error } = await supabase.rpc('allot_join_household', { p_code: code.trim() });
  if (error) return { error: householdError(error) };
  await startSync(uid, 'remote');
  return { error: null };
}

/** Leaves a shared household; this account keeps a private copy of the budget. */
export async function leaveHousehold(): Promise<Result> {
  const uid = userId;
  if (!uid) return { error: 'Sign in first.' };
  const { error } = await supabase.rpc('allot_leave_household');
  if (error) return { error: householdError(error) };
  await startSync(uid, 'remote');
  return { error: null };
}

/** Owner removes a member; they keep a private copy. */
export async function removeMember(memberId: string): Promise<Result> {
  const { error } = await supabase.rpc('allot_remove_member', { p_user: memberId });
  if (error) return { error: householdError(error) };
  await useHousehold.getState().refreshMembers();
  return { error: null };
}
