import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { initialState, useStore } from '../data/store';
import { Alert } from '../ui/alert';
import { supabase } from './supabase';
import { clearLocalImages, deleteAllRemoteImages, flushPendingUploads, queueUploads } from './receiptImages';

/**
 * Cloud sync. The whole budget is one JSON document per user (table allot_user_data), kept in step with the
 * local store:
 *  - the device keeps working offline from its local copy and pushes when it can,
 *  - every push carries a version number, so two devices can't silently overwrite each other,
 *  - signing in as a different user never leaks the previous user's cached data.
 */

const TABLE = 'allot_user_data';
const META_KEY = 'allot.sync.meta';

const SYNC_KEYS = ['onboarded', 'isPremium', 'plan', 'hasPurchased', 'trialEnds', 'budgets', 'txs', 'funds', 'debts', 'netEntries', 'netHistory', 'receipts', 'billsPaid', 'activity', 'dismissedTips', 'readArticles', 'settings'] as const;

type Meta = { userId: string | null; version: number; hash: string; changedAt: string };
type Row = { data: Record<string, unknown>; version: number; client_updated_at: string };

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export const useSync = create<{ status: SyncStatus; lastSynced: number | null; bootstrapped: boolean; message: string | null }>(() => ({
  status: 'idle',
  lastSynced: null,
  bootstrapped: false,
  message: null,
}));
const setSync = (p: Partial<ReturnType<typeof useSync.getState>>) => useSync.setState(p);

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
    if (raw) return JSON.parse(raw) as Meta;
  } catch {
    /* fall through */
  }
  return { userId: null, version: 0, hash: '', changedAt: new Date(0).toISOString() };
}

function applyRemote(data: Record<string, unknown>) {
  applying = true;
  const base = initialState();
  useStore.setState({ ...base, ...data, settings: { ...base.settings, ...((data.settings as object) ?? {}) }, hydrated: true, undo: null } as never);
  applying = false;
}

/** Asks which copy to keep. window.confirm on web (Alert is a no-op there), a two-button Alert on native. */
function chooseLocal(): Promise<boolean> {
  const title = 'Keep this device or your account?';
  const msg = 'This device already has a budget, and your account has a different one. Replace the account copy with this device’s data, or load the account data here?';
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${msg}\n\nOK = use this device’s data (replaces the account copy)\nCancel = load the account data`));
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Load account data', onPress: () => resolve(false) },
      { text: 'Use this device’s data', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** A brand-new account on a device that already holds a budget: bring it along, or start fresh? */
function askBringLocal(): Promise<boolean> {
  const title = 'Bring this device’s budget into your new account?';
  const msg = 'This device already has budget data. You can save it to your new account, or start with a clean slate.';
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}

${msg}

OK = bring it into my account
Cancel = start fresh (this device’s data is erased)`));
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Start fresh', style: 'destructive', onPress: () => resolve(false) },
      { text: 'Bring it along', onPress: () => resolve(true) },
    ]);
  });
}

// ---- engine state ----------------------------------------------------------------------------

let userId: string | null = null;
let meta: Meta = { userId: null, version: 0, hash: '', changedAt: new Date(0).toISOString() };
let applying = false;
let pushing = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;
let seenHash = '';
let cleanup: (() => void)[] = [];

const saveMeta = () => AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => undefined);
const hasLocalData = () => useStore.getState().onboarded;

async function fetchRow(): Promise<Row | null> {
  const { data, error } = await supabase.from(TABLE).select('data,version,client_updated_at').eq('user_id', userId as string).maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

async function adoptRemote(row: Row) {
  applyRemote(row.data);
  meta = { userId, version: row.version, hash: hashOf(snapshot()), changedAt: row.client_updated_at };
  seenHash = meta.hash;
  await saveMeta();
}

/** Both sides changed. The newer edit wins, and the loser is kept as a local backup so nothing is lost. */
async function resolveConflict() {
  const row = await fetchRow();
  if (!row) {
    meta.version = 0;
    return pushNow();
  }
  if (new Date(meta.changedAt) > new Date(row.client_updated_at)) {
    meta.version = row.version; // overwrite with our newer data
    return pushNow();
  }
  await AsyncStorage.setItem(`allot.conflict.${Date.now()}`, JSON.stringify(snapshot())).catch(() => undefined);
  await adoptRemote(row);
  setSync({ status: 'synced', lastSynced: Date.now(), message: 'Updated from another device' });
}

async function pushNow(): Promise<void> {
  if (!userId) return;
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
    const now = new Date().toISOString();
    if (meta.version === 0) {
      const { error } = await supabase.from(TABLE).insert({ user_id: userId, data: snap, version: 1, client_updated_at: now });
      if (error) {
        if (error.code === '23505') {
          pushing = false;
          return resolveConflict();
        }
        throw error;
      }
      meta.version = 1;
    } else {
      const { data: upd, error } = await supabase.from(TABLE).update({ data: snap, version: meta.version + 1, client_updated_at: now }).eq('user_id', userId).eq('version', meta.version).select('version');
      if (error) throw error;
      if (!upd || upd.length === 0) {
        pushing = false;
        return resolveConflict();
      }
      meta.version = (upd[0] as { version: number }).version;
    }
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

/** Checks whether another device saved something newer and loads it when this device has no unsynced edits. */
async function pull() {
  if (!userId || pushing) return;
  try {
    const { data } = await supabase.from(TABLE).select('version').eq('user_id', userId).maybeSingle();
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

export async function startSync(id: string): Promise<void> {
  stopSync();
  userId = id;
  setSync({ status: 'syncing', bootstrapped: false, message: null });
  meta = await loadMeta();

  // A different account used this device before: never show or upload its cached data.
  if (meta.userId && meta.userId !== id) {
    await wipeLocal();
    meta = { userId: null, version: 0, hash: '', changedAt: new Date(0).toISOString() };
  }
  const owned = meta.userId === id;

  try {
    const row = await fetchRow();
    if (!row) {
      if (hasLocalData() && (await askBringLocal())) {
        // Data created before accounts existed: it becomes this account's first cloud copy.
        meta = { userId: id, version: 0, hash: '', changedAt: new Date().toISOString() };
        await queueUploads(Object.keys(useStore.getState().receipts));
        await pushNow();
      } else {
        if (hasLocalData()) await wipeLocal(); // they chose a fresh start
        meta = { userId: id, version: 0, hash: hashOf(snapshot()), changedAt: new Date().toISOString() };
        await saveMeta();
      }
    } else if (!owned && hasLocalData() && hashOf(snapshot()) !== hashOf(row.data)) {
      if (await chooseLocal()) {
        meta = { userId: id, version: row.version, hash: '', changedAt: new Date().toISOString() };
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
    await saveMeta();
    setSync({ status: 'synced', lastSynced: Date.now(), bootstrapped: true });
  } catch {
    // Couldn't reach the server. With a cached copy of this account we keep working offline.
    meta.userId = owned ? id : meta.userId;
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

  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void pull();
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
  userId = null;
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

/** "Erase all data": empties the account's cloud copy and photos too, then resets this device. */
export async function eraseEverything(): Promise<void> {
  await deleteAllRemoteImages();
  const ids = Object.keys(useStore.getState().receipts);
  await clearLocalImages(ids);
  useStore.getState().resetAll(); // the store subscription pushes the empty state to the cloud
}
