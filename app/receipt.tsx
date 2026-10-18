import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Download, Receipt as ReceiptIcon, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Button, Card, Text } from '../src/ui/primitives';
import { EmptyState, Skeleton } from '../src/ui/feedback';
import { Group, ModalScreen, Row } from '../src/ui/layout';
import { goBack } from '../src/ui/nav';
import { useStore } from '../src/data/store';
import { prettyDate } from '../src/data/dates';
import { money, moneyAuto } from '../src/data/format';
import { deleteReceiptImage, getReceiptImage } from '../src/services/receiptImages';

export default function ReceiptView() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const receipt = useStore((s) => (id ? s.receipts[id] : undefined));
  const removeReceipt = useStore((s) => s.removeReceipt);
  const [img, setImg] = useState<string | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let live = true;
    if (id) void getReceiptImage(id).then((v) => live && setImg(v));
    return () => {
      live = false;
    };
  }, [id]);

  if (!receipt) {
    return (
      <ModalScreen back title="Receipt">
        <EmptyState icon={<ReceiptIcon size={38} color={p.accent} />} title="Receipt not found" body="It may have been deleted. Your transactions are unaffected." action="Back" onAction={() => goBack(router)} />
      </ModalScreen>
    );
  }

  const download = () => {
    if (Platform.OS !== 'web' || !img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `receipt-${receipt.date}-${(receipt.merchant || 'receipt').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`;
    a.click();
  };
  const del = () =>
    Alert.alert('Delete this receipt?', 'The photo and scanned items are removed from this device. The transaction stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteReceiptImage(receipt.id);
          removeReceipt(receipt.id);
          goBack(router);
        },
      },
    ]);

  return (
    <ModalScreen back title={receipt.merchant || 'Receipt'}>
      <Card style={{ gap: 4 }}>
        <Text variant="caption" tone="muted">{prettyDate(receipt.date)}</Text>
        <Text variant="moneyLg">{moneyAuto(receipt.total, receipt.currency)}</Text>
        {receipt.tax ? <Text variant="callout" tone="muted">includes {money(receipt.tax, { code: receipt.currency })} tax</Text> : null}
      </Card>

      {img === undefined ? (
        <Skeleton height={360} radiusPx={radius.lg} />
      ) : img ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.sunken }}>
          <Image source={{ uri: img }} accessibilityLabel="Original receipt photo" style={{ width: '100%', aspectRatio: 0.72 }} resizeMode="contain" />
        </View>
      ) : (
        <Card>
          <Text variant="callout" tone="muted">The original photo isn’t on this device (it may have been cleared with the browser’s data).</Text>
        </Card>
      )}

      {img && Platform.OS === 'web' ? <Button title="Download photo" variant="secondary" small onPress={download} icon={<Download size={16} color={p.accentStrong} />} /> : null}

      {receipt.items.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="title">Items</Text>
          <Group style={{ marginHorizontal: 0 }}>
            {receipt.items.map((it, i) => (
              <Row key={i} title={`${it.qty > 1 ? `${it.qty}× ` : ''}${it.name}`} subtitle={it.category} right={<Text variant="money">{moneyAuto(it.price, receipt.currency)}</Text>} last={i === receipt.items.length - 1} />
            ))}
          </Group>
        </View>
      ) : (
        <Text variant="callout" tone="muted">No items were read from this receipt — only the photo is saved.</Text>
      )}
      <Button title="Delete receipt" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} />
    </ModalScreen>
  );
}
