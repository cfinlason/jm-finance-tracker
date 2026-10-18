import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, Text } from '../src/ui/primitives';
import { EmptyState, LockedCard } from '../src/ui/feedback';
import { ProgressBar } from '../src/ui/charts';
import { ModalScreen, Reveal } from '../src/ui/layout';
import { useIsPremium, useStore } from '../src/data/store';
import { currentMonth, monthLabel, ordinal } from '../src/data/dates';
import { money, moneyAuto } from '../src/data/format';
import { sum } from '../src/data/selectors';

export default function Paycheck() {
  const p = useTheme();
  const router = useRouter();
  const { budgets } = useStore();
  const isPremium = useIsPremium();
  const month = currentMonth();
  const budget = budgets[month];

  const periods = useMemo(() => {
    if (!budget) return [];
    const paid = budget.incomes.filter((i) => i.payDay).sort((a, b) => (a.payDay ?? 0) - (b.payDay ?? 0));
    if (paid.length === 0) return [];
    const bills = budget.groups.flatMap((g) => g.items.filter((i) => i.dueDay).map((i) => ({ name: i.name, amount: i.planned, day: i.dueDay as number })));
    return paid.map((inc, idx) => {
      const start = inc.payDay as number;
      const end = idx < paid.length - 1 ? (paid[idx + 1].payDay as number) - 1 : 31;
      // Bills due before the first payday are covered by the first paycheck.
      const items = bills.filter((b) => (idx === 0 ? b.day < start || (b.day >= start && b.day <= end) : b.day >= start && b.day <= end));
      const total = sum(items.map((b) => b.amount));
      return { inc, start, end: Math.min(end, 31), items, total, left: inc.planned - total };
    });
  }, [budget]);

  return (
    <ModalScreen back title="Paycheck planner">
      {!isPremium ? (
        <LockedCard feature="paycheck" title="Know what each paycheck covers" body="Allot Plus matches your bills to the paycheck that pays them, so a bill never lands before the money does." />
      ) : periods.length === 0 ? (
        <EmptyState icon={<Wallet size={38} color={p.accent} />} title="Add payday dates" body="Give each income a payday (day of the month) and add due days to your bills. The planner does the rest." action="Edit income" onAction={() => router.push({ pathname: '/income', params: { month } })} />
      ) : (
        <>
          <Text variant="callout" tone="muted">{monthLabel(month)} · bills grouped by the paycheck that covers them</Text>
          {periods.map((pr, i) => {
            const short = pr.left < 0;
            return (
              <Reveal key={pr.inc.id} index={i}>
                <Card level={2} style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text variant="title">{pr.inc.name}</Text>
                      <Text variant="caption" tone="muted">Paid on the {ordinal(pr.start)} · {moneyAuto(pr.inc.planned)}</Text>
                    </View>
                    <Badge label={short ? 'SHORT' : 'COVERED'} tone={short ? 'danger' : 'accent'} />
                  </View>
                  <ProgressBar value={pr.inc.planned > 0 ? pr.total / pr.inc.planned : 0} />
                  {pr.items.length === 0 ? <Text variant="callout" tone="muted">No bills fall in this window.</Text> : pr.items.sort((a, b) => a.day - b.day).map((b) => (
                    <View key={b.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="callout">{b.name} <Text variant="caption" tone="faint">· {ordinal(b.day)}</Text></Text>
                      <Text variant="callout">{moneyAuto(b.amount)}</Text>
                    </View>
                  ))}
                  <View style={{ height: 1, backgroundColor: p.line }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyStrong">{short ? 'Short by' : 'Left for everything else'}</Text>
                    <Text variant="bodyStrong" tone={short ? 'danger' : 'accent'}>{money(Math.abs(pr.left))}</Text>
                  </View>
                </Card>
              </Reveal>
            );
          })}
          <Button title="Adjust income & paydays" variant="secondary" small onPress={() => router.push({ pathname: '/income', params: { month } })} />
        </>
      )}
    </ModalScreen>
  );
}
