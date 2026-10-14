import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Button, Field, Press, Text, Toggle } from '../src/ui/primitives';
import { ICON_CHOICES, Icon } from '../src/ui/Icon';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { addMonths, currentMonth, dateInMonth, monthKey, monthLabel } from '../src/data/dates';
import { parseAmount } from '../src/data/format';
import type { IconKey } from '../src/data/types';

export default function FundEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { funds, addFund, updateFund, removeFund } = useStore();
  const fund = funds.find((f) => f.id === id);
  const [name, setName] = useState(fund?.name ?? '');
  const [icon, setIcon] = useState<IconKey>(fund?.icon ?? 'piggy');
  const [goal, setGoal] = useState(fund ? String(fund.goal) : '');
  const [opening, setOpening] = useState(fund && fund.opening ? String(fund.opening) : '');
  const [hasDate, setHasDate] = useState(!!fund?.targetDate);
  const [dateMonth, setDateMonth] = useState(fund?.targetDate ? monthKey(fund.targetDate) : addMonths(currentMonth(), 6));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const g = parseAmount(goal);
    if (!name.trim()) return setError('Name your fund, like “Vacation”.');
    if (g <= 0) return setError('Set a goal amount greater than zero.');
    const targetDate = hasDate ? dateInMonth(dateMonth, 1) : undefined;
    const patch = { name: name.trim(), icon, goal: g, opening: parseAmount(opening), targetDate };
    if (fund) updateFund(fund.id, patch);
    else addFund(patch);
    haptic.success();
    router.back();
  };
  const del = () =>
    Alert.alert(`Delete “${fund?.name}”?`, 'Its balance is removed. Budget lines that fed it stay, but become regular lines.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (fund) removeFund(fund.id); router.back(); } },
    ]);

  return (
    <ModalScreen
      title={fund ? 'Edit fund' : 'New fund'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={fund ? 'Save changes' : 'Create fund'} onPress={save} />
          {fund ? <Button title="Delete fund" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Vacation" autoCapitalize="words" />
      <Field label="Goal" prefix="$" value={goal} onChangeText={(t) => setGoal(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="2,000" />
      <Field label="Already saved (optional)" prefix="$" value={opening} onChangeText={(t) => setOpening(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
      <View style={{ gap: space.sm, padding: space.lg, backgroundColor: p.surface, borderRadius: radius.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Target date</Text>
            <Text variant="caption" tone="muted">Allot works out the monthly amount for you.</Text>
          </View>
          <Toggle value={hasDate} onChange={setHasDate} />
        </View>
        {hasDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            <Press onPress={() => setDateMonth(addMonths(dateMonth, -1))} accessibilityLabel="Earlier month" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={p.text} /></Press>
            <View style={{ flex: 1, alignItems: 'center' }}><Text variant="title">{monthLabel(dateMonth)}</Text></View>
            <Press onPress={() => setDateMonth(addMonths(dateMonth, 1))} accessibilityLabel="Later month" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={p.text} /></Press>
          </View>
        )}
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted">Icon</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ICON_CHOICES.map((k) => (
            <Press key={k} haptics="select" onPress={() => setIcon(k)} accessibilityLabel={k} style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: icon === k ? p.accent : p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={k} size={22} color={icon === k ? p.onAccent : p.textMuted} />
            </Press>
          ))}
        </View>
      </View>
    </ModalScreen>
  );
}
