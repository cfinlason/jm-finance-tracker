import React, { useState } from 'react';
import { goBack } from '../src/ui/nav';
import { View } from 'react-native';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Field, Segmented, Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { CurrencyFields } from '../src/features/CurrencyFields';
import { useStore } from '../src/data/store';
import { parseAmount, sym } from '../src/data/format';

export default function NetEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { netEntries, addNetEntry, updateNetEntry, removeNetEntry, setRate, settings, deleteWithUndo } = useStore();
  const base = settings.currency;
  const entry = netEntries.find((e) => e.id === id);
  const [kind, setKind] = useState<'asset' | 'liability'>(entry?.kind ?? 'asset');
  const [name, setName] = useState(entry?.name ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [currency, setCurrency] = useState(entry?.currency ?? base);
  const [rate, setRateStr] = useState(() => {
    const r = settings.rates[entry?.currency ?? ''];
    return r ? String(r.perUnit) : '';
  });
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setError(kind === 'asset' ? 'Name it, like “Savings account”.' : 'Name it, like “Car loan”.');
    const a = parseAmount(amount);
    if (a < 0) return setError('Enter a positive amount.');
    const r = parseFloat(rate);
    if (currency !== base && !(r > 0)) return setError(`Enter today’s rate: how many ${base} one ${currency} is worth.`);
    if (currency !== base) setRate(currency, r);
    const patch = { name: name.trim(), amount: a, kind, currency: currency === base ? undefined : currency };
    if (entry) updateNetEntry(entry.id, patch);
    else addNetEntry(patch);
    haptic.success();
    goBack(router);
  };
  const del = () =>
    Alert.alert(`Delete “${entry?.name}”?`, 'Your net worth will be recalculated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (entry) deleteWithUndo(`Deleted ${entry.name}`, () => removeNetEntry(entry.id)); goBack(router); } },
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
      <CurrencyFields value={currency} onChange={(c) => { setCurrency(c); const r = settings.rates[c]; setRateStr(r ? String(r.perUnit) : ''); }} rate={rate} onRate={setRateStr} />
      <Field label="Current value" prefix={currency === base ? sym() : sym(currency)} value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
    </ModalScreen>
  );
}
