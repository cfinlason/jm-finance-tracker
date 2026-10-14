import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PiggyBank, Plus } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, IconTile, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { ProgressBar, Ring } from '../src/ui/charts';
import { EmptyState } from '../src/ui/feedback';
import { ModalScreen, Reveal } from '../src/ui/layout';
import { useStore } from '../src/data/store';
import { money, moneyAuto, pct } from '../src/data/format';
import { fundBalances, monthlyNeed, sum } from '../src/data/selectors';
import { monthLabel, monthKey } from '../src/data/dates';

export default function Funds() {
  const p = useTheme();
  const router = useRouter();
  const { funds, txs, budgets } = useStore();
  const bal = useMemo(() => fundBalances({ funds, txs, budgets }), [funds, txs, budgets]);
  const total = sum(Object.values(bal));
  const goal = sum(funds.map((f) => f.goal));

  return (
    <ModalScreen back title="Funds" footer={funds.length ? <Button title="New fund" onPress={() => router.push('/fund-edit')} icon={<Plus size={20} color={p.onAccent} />} /> : undefined}>
      {funds.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={40} color={p.accent} />}
          title="Save for what’s coming"
          body="A fund holds money for something that isn’t a monthly expense — a trip, car repairs, an annual bill. Spending from one never throws off your month."
          action="Create your first fund"
          onAction={() => router.push('/fund-edit')}
          secondary="How funds work"
          onSecondary={() => router.push({ pathname: '/article', params: { id: 'funds-explained' } })}
        />
      ) : (
        <>
          <Reveal>
            <Card level={2} style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Ring progress={goal > 0 ? total / goal : 0} size={96} stroke={11}>
                <Text variant="callout" style={{ fontFamily: 'Inter_700Bold' }}>{pct(goal > 0 ? Math.min(1, total / goal) : 0)}</Text>
              </Ring>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="overline" tone="muted">Saved across funds</Text>
                <Text variant="moneyLg">{moneyAuto(total)}</Text>
                <Text variant="callout" tone="muted">of {moneyAuto(goal)} in goals</Text>
              </View>
            </Card>
          </Reveal>
          {funds.map((f, i) => {
            const b = bal[f.id] ?? 0;
            const need = monthlyNeed(f, b);
            const done = b >= f.goal;
            return (
              <Reveal key={f.id} index={i + 1}>
                <Card onPress={() => router.push({ pathname: '/fund-edit', params: { id: f.id } })} style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <IconTile size={46}><Icon name={f.icon} color={p.accentStrong} size={22} /></IconTile>
                    <View style={{ flex: 1 }}>
                      <Text variant="title" numberOfLines={1}>{f.name}</Text>
                      <Text variant="caption" tone="muted">{f.targetDate ? `Goal by ${monthLabel(monthKey(f.targetDate))}` : 'No target date'}</Text>
                    </View>
                    {done ? <Badge label="FUNDED" /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Text variant="moneyLg">{moneyAuto(b)}</Text>
                    <Text variant="callout" tone="muted">of {moneyAuto(f.goal)}</Text>
                  </View>
                  <ProgressBar value={f.goal > 0 ? b / f.goal : 0} color={done ? p.accent : p.info} />
                  {need && !done ? <Text variant="callout" tone="accent">Set aside {money(need.perMonth)} a month for {need.months || 'the next'} {need.months === 1 ? 'month' : 'months'} to get there.</Text> : null}
                </Card>
              </Reveal>
            );
          })}
        </>
      )}
    </ModalScreen>
  );
}
