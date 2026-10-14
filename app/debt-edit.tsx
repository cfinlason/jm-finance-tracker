import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Field, Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { parseAmount } from '../src/data/format';

export default function DebtEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { debts, addDebt, updateDebt, removeDebt } = useStore();
  const debt = debts.find((d) => d.id === id);
  const [name, setName] = useState(debt?.name ?? '');
  const [balance, setBalance] = useState(debt ? String(debt.balance) : '');
  const [apr, setApr] = useState(debt ? String(debt.apr) : '');
  const [min, setMin] = useState(debt ? String(debt.minPayment) : '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const b = parseAmount(balance);
    const m = parseAmount(min);
    const a = Math.min(100, parseFloat(apr) || 0);
    if (!name.trim()) return setError('Name this debt, like “Visa card”.');
    if (b < 0) return setError('Balance can’t be negative.');
    if (b > 0 && m <= 0) return setError('Enter the minimum monthly payment.');
    if (b > 0 && (a / 100 / 12) * b >= m && a > 0) return setError('That minimum doesn’t cover the monthly interest, so the balance would never fall. Double-check the numbers.');
    const patch = { name: name.trim(), balance: b, apr: a, minPayment: m };
    if (debt) updateDebt(debt.id, patch);
    else addDebt(patch);
    haptic.success();
    router.back();
  };
  const del = () =>
    Alert.alert(`Delete “${debt?.name}”?`, 'It will no longer appear in your payoff plan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (debt) removeDebt(debt.id); router.back(); } },
    ]);

  return (
    <ModalScreen
      title={debt ? 'Edit debt' : 'New debt'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={debt ? 'Save changes' : 'Add debt'} onPress={save} />
          {debt ? <Button title="Delete debt" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Visa card" autoCapitalize="words" />
      <Field label="Current balance" prefix="$" value={balance} onChangeText={(t) => setBalance(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
      <Field label="Interest rate" value={apr} onChangeText={(t) => setApr(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="% APR" placeholder="0" />
      <Field label="Minimum payment" prefix="$" value={min} onChangeText={(t) => setMin(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="/ month" />
    </ModalScreen>
  );
}
