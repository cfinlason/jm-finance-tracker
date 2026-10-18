import type { ReceiptItem } from '../data/types';
import { apiHeaders, apiUrl } from './api';

export type ScanResult = { merchant: string | null; date: string | null; currency: string | null; subtotal: number | null; tax: number | null; total: number | null; items: ReceiptItem[]; notes: string | null };

export class ScanError extends Error {
  constructor(public kind: 'not_configured' | 'offline' | 'busy' | 'timeout' | 'not_a_receipt' | 'too_large' | 'failed', message: string) {
    super(message);
  }
}

export const SCAN_URL = apiUrl('receipt-scan');

/** Sends the (already shrunk) photo to the scanner function and returns what it read. */
export async function scanReceipt(base64: string, currency: string): Promise<ScanResult> {
  if (!SCAN_URL) throw new ScanError('not_configured', 'The receipt scanner isn’t connected in this build.');
  let res: Response;
  try {
    res = await fetch(SCAN_URL, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', currency }), signal: AbortSignal.timeout(58_000) });
  } catch {
    throw new ScanError('offline', 'Couldn’t reach the scanner. Check your connection and try again.');
  }
  if (!res.ok) {
    let code = '';
    try { code = ((await res.json()) as { code?: string }).code ?? ''; } catch { /* html error page */ }
    if (code === 'access_code') throw new ScanError('not_configured', 'Enter your access code in Settings → AI access code.');
    if (code === 'not_a_receipt') throw new ScanError('not_a_receipt', 'That doesn’t look like a receipt. Try a clearer, flatter photo.');
    if (code === 'too_large' || res.status === 413) throw new ScanError('too_large', 'That photo is too large to scan. Try a smaller one.');
    if (res.status === 429 || code === 'busy') throw new ScanError('busy', 'You’ve scanned a lot in a short time. Try again in a bit.');
    if (res.status === 404) throw new ScanError('not_configured', 'The scanner server wasn’t found. It needs to be deployed with the app.');
    if (code === 'not_configured' || code === 'bad_key') throw new ScanError('not_configured', 'The scanner server is running but its AI key isn’t set up (or was rejected).');
    if (res.status === 504 || code === 'timeout') throw new ScanError('timeout', 'Reading the receipt took too long. Try again.');
    throw new ScanError('failed', 'Couldn’t read that receipt. You can still save it and type the details.');
  }
  return (await res.json()) as ScanResult;
}
