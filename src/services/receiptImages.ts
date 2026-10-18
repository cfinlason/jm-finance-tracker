import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useAuth } from '../data/auth';

// Original receipt photos. Each lives in two places:
//  - a local copy on this device (IndexedDB on web, AsyncStorage on native) so it opens instantly and offline
//  - the signed-in user's private cloud folder (Supabase Storage bucket "receipts", <user id>/<receipt id>.jpg)
// Values are JPEG data URLs on the device and plain JPEG files in the cloud.

const DB = 'allot-receipts';
const STORE = 'images';
const PENDING_KEY = 'allot.sync.pendingImages';
const BUCKET = 'receipts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

const key = (id: string) => `allot.receipt.${id}`;
const web = () => Platform.OS === 'web' && typeof indexedDB !== 'undefined';
const uid = () => useAuth.getState().user?.id ?? null;
const path = (u: string, id: string) => `${u}/${id}.jpg`;

// ---- local copy ------------------------------------------------------------------------------

async function localPut(id: string, dataUrl: string) {
  if (web()) await idb('readwrite', (s) => s.put(dataUrl, id));
  else await AsyncStorage.setItem(key(id), dataUrl);
}
async function localGet(id: string): Promise<string | null> {
  try {
    if (web()) return ((await idb('readonly', (s) => s.get(id))) as string | undefined) ?? null;
    return await AsyncStorage.getItem(key(id));
  } catch {
    return null;
  }
}
async function localDelete(id: string) {
  try {
    if (web()) await idb('readwrite', (s) => s.delete(id));
    else await AsyncStorage.removeItem(key(id));
  } catch {
    /* already gone */
  }
}
export async function clearLocalImages(ids: string[]) {
  await Promise.all(ids.map(localDelete));
  await AsyncStorage.removeItem(PENDING_KEY);
}

// ---- conversion helpers ----------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.replace(/^data:[^,]+,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((b64.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const n = (B64.indexOf(b64[i]) << 18) | (B64.indexOf(b64[i + 1]) << 12) | ((B64.indexOf(b64[i + 2]) & 63) << 6) | (B64.indexOf(b64[i + 3]) & 63);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < b64.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < b64.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// ---- cloud copy ------------------------------------------------------------------------------

async function pendingIds(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? '[]') as string[];
  } catch {
    return [];
  }
}
async function setPending(ids: string[]) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...new Set(ids)]));
}

async function remotePut(id: string, dataUrl: string): Promise<boolean> {
  const u = uid();
  if (!u) return false;
  const { error } = await supabase.storage.from(BUCKET).upload(path(u, id), dataUrlToBytes(dataUrl), { contentType: 'image/jpeg', upsert: true });
  return !error;
}

/** Re-sends any photos that couldn't be uploaded earlier (offline, flaky network). Called by the sync loop. */
export async function flushPendingUploads(): Promise<void> {
  const ids = await pendingIds();
  if (!ids.length || !uid()) return;
  const left: string[] = [];
  for (const id of ids) {
    const img = await localGet(id);
    if (!img) continue; // receipt was deleted before it ever uploaded
    if (!(await remotePut(id, img))) left.push(id);
  }
  await setPending(left);
}

/** Saves the original photo on this device and uploads it to the user's private cloud folder. */
export async function putReceiptImage(id: string, dataUrl: string): Promise<void> {
  await localPut(id, dataUrl);
  if (!uid()) return;
  let ok = false;
  try {
    ok = await remotePut(id, dataUrl);
  } catch {
    ok = false;
  }
  if (!ok) await setPending([...(await pendingIds()), id]);
}

/** Local copy first (instant, works offline); otherwise download from the cloud and cache it. */
export async function getReceiptImage(id: string): Promise<string | null> {
  const local = await localGet(id);
  if (local) return local;
  const u = uid();
  if (!u) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path(u, id));
    if (error || !data) return null;
    const url = await blobToDataUrl(data);
    await localPut(id, url);
    return url;
  } catch {
    return null;
  }
}

export async function deleteReceiptImage(id: string): Promise<void> {
  await localDelete(id);
  const u = uid();
  if (u) {
    try {
      await supabase.storage.from(BUCKET).remove([path(u, id)]);
    } catch {
      /* orphaned file at worst */
    }
  }
}

/** Removes every receipt photo in the signed-in user's cloud folder (used by "Erase all data"). */
export async function deleteAllRemoteImages(): Promise<void> {
  const u = uid();
  if (!u) return;
  try {
    const { data } = await supabase.storage.from(BUCKET).list(u, { limit: 1000 });
    if (data?.length) await supabase.storage.from(BUCKET).remove(data.map((f) => `${u}/${f.name}`));
  } catch {
    /* best effort */
  }
}

/** Marks photos for upload (e.g. ones captured before the user had an account). */
export async function queueUploads(ids: string[]): Promise<void> {
  if (ids.length) await setPending([...(await pendingIds()), ...ids]);
}
