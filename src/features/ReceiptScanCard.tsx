import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Camera, Check, ImageIcon, ScanLine, TriangleAlert, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { Badge, Button, Card, Press, Text } from '../ui/primitives';
import { Skeleton } from '../ui/feedback';
import { haptic } from '../ui/haptics';
import { moneyAuto } from '../data/format';
import { useStore } from '../data/store';
import { pickReceipt, PickedReceipt } from '../services/receiptPicker';
import { scanReceipt, ScanError, ScanResult } from '../services/receiptScan';

export type Captured = { image: PickedReceipt; result: ScanResult | null; error?: string };

/**
 * Take or pick a receipt photo, read it with AI, and hand the result up so the form can fill itself in.
 * The photo is always kept (even if reading fails) so it can be stored as a digital copy.
 */
export function ReceiptScanCard({ value, onChange, onScanned }: { value: Captured | null; onChange: (c: Captured | null) => void; onScanned: (r: ScanResult) => void }) {
  const p = useTheme();
  const currency = useStore((s) => s.settings.currency);
  const [busy, setBusy] = useState<'picking' | 'reading' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async (source: 'camera' | 'library') => {
    setNote(null);
    setBusy('picking');
    const picked = await pickReceipt(source);
    if (!picked.ok) {
      setBusy(null);
      if (picked.reason === 'denied') setNote('Camera access is off. Allow it in your phone’s settings, or choose a photo instead.');
      else if (picked.reason === 'failed') setNote('Couldn’t open that photo. Try another.');
      return;
    }
    onChange({ image: picked.image, result: null });
    setBusy('reading');
    try {
      const result = await scanReceipt(picked.image.base64, currency);
      onChange({ image: picked.image, result });
      onScanned(result);
      haptic.success();
    } catch (e) {
      const err = e instanceof ScanError ? e : new ScanError('failed', 'Couldn’t read that receipt.');
      onChange({ image: picked.image, result: null, error: err.message });
      haptic.warn();
    } finally {
      setBusy(null);
    }
  };

  if (!value) {
    return (
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={22} color={p.accentStrong} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Scan a receipt</Text>
            <Text variant="caption" tone="muted">Fills in the amount, store and date, and keeps a digital copy.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Camera" small style={{ flex: 1 }} onPress={() => void run('camera')} loading={busy === 'picking'} icon={<Camera size={18} color={p.onAccent} />} />
          <Button title="Choose photo" small variant="secondary" style={{ flex: 1 }} onPress={() => void run('library')} icon={<ImageIcon size={18} color={p.accentStrong} />} />
        </View>
        {note ? <Text variant="callout" tone="warn">{note}</Text> : null}
      </Card>
    );
  }

  const r = value.result;
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Image source={{ uri: value.image.dataUrl }} accessibilityLabel="Receipt photo" style={{ width: 76, height: 100, borderRadius: radius.md, backgroundColor: p.sunken }} resizeMode="cover" />
        <View style={{ flex: 1, gap: 6 }}>
          {busy === 'reading' ? (
            <View style={{ gap: 8 }}>
              <Text variant="headline">Reading your receipt…</Text>
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width="60%" />
              <Skeleton height={14} width="70%" />
            </View>
          ) : r ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label="SCANNED" />
                <Check size={16} color={p.accent} />
              </View>
              <Text variant="headline" numberOfLines={1}>{r.merchant ?? 'Receipt'}</Text>
              <Text variant="callout" tone="muted">{r.items.length} item{r.items.length === 1 ? '' : 's'}{r.total !== null ? ` · ${moneyAuto(r.total)}` : ''}</Text>
              <Text variant="caption" tone="faint">Check the amount below — AI can misread blurry print.</Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TriangleAlert size={16} color={p.warn} />
                <Text variant="headline">Couldn’t read it</Text>
              </View>
              <Text variant="callout" tone="muted">{value.error ?? 'Something went wrong.'}</Text>
              <Text variant="caption" tone="faint">The photo is still saved with this transaction — fill in the details yourself.</Text>
            </>
          )}
        </View>
        <Press onPress={() => { onChange(null); setNote(null); }} accessibilityLabel="Remove receipt" hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={p.textMuted} />
        </Press>
      </View>
      {r && r.items.length > 0 ? (
        <View style={{ gap: 4 }}>
          {r.items.slice(0, 5).map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <Text variant="callout" numberOfLines={1} style={{ flex: 1 }}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</Text>
              <Text variant="callout" tone="muted">{moneyAuto(it.price)}</Text>
            </View>
          ))}
          {r.items.length > 5 ? <Text variant="caption" tone="faint">+ {r.items.length - 5} more saved with the receipt</Text> : null}
        </View>
      ) : null}
      {busy !== 'reading' && !r ? <Button title="Try scanning again" variant="secondary" small onPress={() => void run('library')} /> : null}
    </Card>
  );
}
