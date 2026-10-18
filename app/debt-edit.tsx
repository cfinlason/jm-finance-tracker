import React, { useState } from 'react';
import { goBack } from '../src/ui/nav';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Card, Field, Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { CurrencyFields } from '../src/features/CurrencyFields';
import { useStore } from '../src/data/store';
import { money, parseAmount, sym } from '../src/data/format';

export default function DebtEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { debts, addDebt, updateDebt, removeDebt, setRate, settings, deleteWithUndo } = useStore();
  const base = settings.currency;
  const debt = debts.find((d) => d.id === id);
  const [name, setName] = useState(debt?.name ?? '');
  const [currency, setCurrency] = useState(debt?.currency ?? base);
  const [rate, setRateStr] = useState(() => {
    const r = settings.rates[debt?.currency ?? ''];
    return r ? String(r.perUnit) : '';
  });
  const [balance, setBalance] = useState(debt ? String(debt.balance) : '');
  const [apr, setApr] = useState(debt ? String(debt.apr) : '');
  const [min, setMin] = useState(debt ? String(debt.minPayment) : '');
  const [payment, setPayment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const changeCurrency = (c: string) => {
    setCurrency(c);
    const r = settings.rates[c];
    setRateStr(r ? String(r.perUnit) : '');
  };

  const save = () => {
    const b = parseAmount(balance);
    const m = parseAmount(min);
    const a = Math.min(100, parseFloat(apr) || 0);
    if (!name.trim()) return setError('Name this debt, like “Visa card”.');
    if (b < 0) return setError('Balance can’t be negative.');
    if (b > 0 && m <= 0) return setError('Enter the minimum monthly payment.');
    if (b > 0 && (a / 100 / 12) * b >= m && a > 0) return setError('That minimum doesn’t cover the monthly interest, so the balance would never fall. Double-check the numbers.');
    const r = parseFloat(rate);
    if (currency !== base && !(r > 0)) return setError(`Enter today’s rate: how many ${base} one ${currency} is worth.`);
    if (currency !== base) setRate(currency, r);
    const patch = { name: name.trim(), balance: b, apr: a, minPayment: m, currency: currency === base ? undefined : currency };
    if (debt) updateDebt(debt.id, patch);
    else addDebt(patch);
    haptic.success();
    goBack(router);
  };

  const applyPayment = () => {
    const amt = parseAmount(payment);
    const cur = parseAmount(balance);
    if (amt <= 0) return setError('Enter the payment amount.');
    const next = Math.max(0, cur - amt);
    setBalance(String(next));
    setPayment('');
    setError(null);
    setNote(next === 0 ? 'Paid off — save to lock it in.' : `Balance is now ${money(next, { code: currency === base ? undefined : currency })}. Save to keep it.`);
    haptic.success();
  };

  const del = () =>
    Alert.alert(`Delete “${debt?.name}”?`, 'It will no longer appear in your payoff plan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (debt) deleteWithUndo(`Deleted ${debt.name}`, () => removeDebt(debt.id)); goBack(router); } },
    ]);

  const cs = currency === base ? sym() : sym(currency);
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
      <CurrencyFields value={currency} onChange={changeCurrency} rate={rate} onRate={setRateStr} label="Currency this debt is in" />
      <Field label="Current balance" prefix={cs} value={balance} onChangeText={(t) => setBalance(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
      <Field label="Interest rate" value={apr} onChangeText={(t) => setApr(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="% APR" placeholder="0" />
      <Field label="Minimum payment" prefix={cs} value={min} onChangeText={(t) => setMin(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="/ month" />
      {debt ? (
        <Card style={{ gap: space.md }}>
          <Text variant="title">Record a payment</Text>
          <Text variant="caption" tone="muted">Made a payment? Take it off the balance here so your roadmap stays accurate.</Text>
          <Field value={payment} onChangeText={(t) => setPayment(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" prefix={cs} placeholder="0" />
          <Button title="Apply payment" variant="secondary" small onPress={applyPayment} icon={<Minus size={16} color={p.accentStrong} />} />
          {note ? <Text variant="callout" tone="accent">{note}</Text> : null}
        </Card>
      ) : null}
    </ModalScreen>
  );
}
