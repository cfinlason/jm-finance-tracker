import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArrowDownLeft, Plus, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Card, Field, IconTile, Press, Text } from '../src/ui/primitives';
import { ProgressBar } from '../src/ui/charts';
import { Group, ModalScreen, Row } from '../src/ui/layout';
import { EmptyState } from '../src/ui/feedback';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { currentMonth, monthLabel, ordinal } from '../src/data/dates';
import { moneyAuto, parseAmount } from '../src/data/format';
import { summarizeMonth } from '../src/data/selectors';

export default function IncomeScreen() {
  const p = useTheme();
  const { month: m } = useLocalSearchParams<{ month?: string }>();
  const month = m ?? currentMonth();
  const { budgets, txs, addIncome, updateIncome, removeIncome, ensureBudget } = useStore();
  const budget = budgets[month];
  const s = useMemo(() => summarizeMonth(txs, budget, month), [txs, budget, month]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [name, setName] = useState('');
  const [planned, setPlanned] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = (id: string | 'new') => {
    const l = budget?.incomes.find((i) => i.id === id);
    setName(l?.name ?? '');
    setPlanned(l ? String(l.planned) : '');
    setDay(l?.payDay ? String(l.payDay) : '');
    setError(null);
    setEditing(id);
  };
  const save = () => {
    const amt = parseAmount(planned);
    if (!name.trim()) return setError('Give this income a name, like “Paycheck”.');
    if (amt <= 0) return setError('Enter the amount you expect.');
    const payDay = day ? Math.min(31, Math.max(1, parseInt(day, 10) || 1)) : undefined;
    if (!budget) ensureBudget(month);
    if (editing === 'new') addIncome(month, { name: name.trim(), planned: amt, payDay });
    else if (editing) updateIncome(month, editing, { name: name.trim(), planned: amt, payDay });
    haptic.success();
    setEditing(null);
  };
  const del = (id: string) =>
    Alert.alert('Remove this income?', 'Income you already logged stays in your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeIncome(month, id); setEditing(null); } },
    ]);

  return (
    <ModalScreen title={`Income · ${monthLabel(month, true)}`}>
      <Card style={{ gap: 4 }}>
        <Text variant="overline" tone="muted">Received so far</Text>
        <Text variant="moneyLg" tone="income">{moneyAuto(s.receivedIncome)}</Text>
        <Text variant="callout" tone="muted">of {moneyAuto(s.plannedIncome)} planned{s.extraIncome > 0 ? ` · ${moneyAuto(s.extraIncome)} extra to assign` : ''}</Text>
      </Card>

      {budget && budget.incomes.length > 0 ? (
        <Group style={{ marginHorizontal: 0 }}>
          {budget.incomes.map((i, n) => {
            const got = s.incomeReceived[i.id] ?? 0;
            return (
              <View key={i.id}>
                <Row
                  icon={<IconTile><ArrowDownLeft size={20} color={p.accentStrong} /></IconTile>}
                  title={i.name}
                  subtitle={`${moneyAuto(got)} of ${moneyAuto(i.planned)}${i.payDay ? ` · paid on the ${ordinal(i.payDay)}` : ''}`}
                  onPress={() => open(i.id)}
                  last={n === budget.incomes.length - 1 && editing !== i.id}
                />
                <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}><ProgressBar value={i.planned > 0 ? got / i.planned : 0} height={5} color={p.income} /></View>
              </View>
            );
          })}
        </Group>
      ) : (
        <EmptyState icon={<ArrowDownLeft size={36} color={p.accent} />} title="No income planned" body="Add each paycheck or income source so Allot knows what there is to give a job." />
      )}

      {editing ? (
        <Card style={{ gap: space.md }}>
          <Text variant="title">{editing === 'new' ? 'New income' : 'Edit income'}</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Paycheck" autoCapitalize="words" />
          <Field label="Expected this month" prefix="$" value={planned} onChangeText={(t) => setPlanned(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          <Field label="Payday (day of month)" value={day} onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="Optional" />
          {error ? <Text variant="callout" tone="danger">{error}</Text> : null}
          <Button title="Save income" onPress={save} small />
          {editing !== 'new' ? <Button title="Remove" variant="danger" small onPress={() => del(editing)} icon={<Trash size={16} color={p.danger} />} /> : null}
          <Button title="Cancel" variant="ghost" small onPress={() => setEditing(null)} />
        </Card>
      ) : (
        <Press onPress={() => open('new')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
          <Plus size={18} color={p.accent} />
          <Text variant="callout" tone="accent">Add income</Text>
        </Press>
      )}
    </ModalScreen>
  );
}
