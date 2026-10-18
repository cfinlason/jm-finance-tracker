import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Original receipt photos are kept on this device, separate from the budget data (they're far too big for it).
// Web: IndexedDB. Native: AsyncStorage, one key per photo. Values are JPEG data URLs.

const DB = 'allot-receipts';
const STORE = 'images';

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

export async function putReceiptImage(id: string, dataUrl: string): Promise<void> {
  if (web()) await idb('readwrite', (s) => s.put(dataUrl, id));
  else await AsyncStorage.setItem(key(id), dataUrl);
}

export async function getReceiptImage(id: string): Promise<string | null> {
  try {
    if (web()) return ((await idb('readonly', (s) => s.get(id))) as string | undefined) ?? null;
    return await AsyncStorage.getItem(key(id));
  } catch {
    return null;
  }
}

export async function deleteReceiptImage(id: string): Promise<void> {
  try {
    if (web()) await idb('readwrite', (s) => s.delete(id));
    else await AsyncStorage.removeItem(key(id));
  } catch {
    /* already gone */
  }
}
