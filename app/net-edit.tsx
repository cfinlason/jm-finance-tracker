import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Field, Segmented, Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { parseAmount } from '../src/data/format';

export default function NetEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { netEntries, addNetEntry, updateNetEntry, removeNetEntry } = useStore();
  const entry = netEntries.find((e) => e.id === id);
  const [kind, setKind] = useState<'asset' | 'liability'>(entry?.kind ?? 'asset');
  const [name, setName] = useState(entry?.name ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setError(kind === 'asset' ? 'Name it, like “Savings account”.' : 'Name it, like “Car loan”.');
    const a = parseAmount(amount);
    if (a < 0) return setError('Enter a positive amount.');
    if (entry) updateNetEntry(entry.id, { name: name.trim(), amount: a, kind });
    else addNetEntry({ name: name.trim(), amount: a, kind });
    haptic.success();
    router.back();
  };
  const del = () =>
    Alert.alert(`Delete “${entry?.name}”?`, 'Your net worth will be recalculated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (entry) removeNetEntry(entry.id); router.back(); } },
    ]);

  return (
    <ModalScreen
      title={entry ? 'Edit entry' : 'New entry'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={entry ? 'Save changes' : 'Add entry'} onPress={save} />
          {entry ? <Button title="Delete entry" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Segmented value={kind} onChange={setKind} options={[{ value: 'asset', label: 'I own' }, { value: 'liability', label: 'I owe' }]} />
      <Field label="Name" value={name} onChangeText={setName} placeholder={kind === 'asset' ? 'Savings account' : 'Car loan'} autoCapitalize="words" />
      <Field label="Current value" prefix="$" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
    </ModalScreen>
  );
}
