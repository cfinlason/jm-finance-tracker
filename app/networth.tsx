import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Landmark, Plus } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, Text } from '../src/ui/primitives';
import { EmptyState, LockedCard } from '../src/ui/feedback';
import { Sparkline } from '../src/ui/charts';
import { Group, ModalScreen, Reveal, Row } from '../src/ui/layout';
import { useStore } from '../src/data/store';
import { money, moneyAuto } from '../src/data/format';
import { sum } from '../src/data/selectors';

export default function NetWorth() {
  const p = useTheme();
  const router = useRouter();
  const { netEntries, netHistory, isPremium } = useStore();
  const assets = sum(netEntries.filter((e) => e.kind === 'asset').map((e) => e.amount));
  const liabilities = sum(netEntries.filter((e) => e.kind === 'liability').map((e) => e.amount));
  const nw = assets - liabilities;
  const series = netHistory.map((h) => h.assets - h.liabilities);
  const delta = series.length > 1 ? series[series.length - 1] - series[0] : 0;

  return (
    <ModalScreen back title="Net worth" footer={isPremium && netEntries.length ? <Button title="Add an entry" onPress={() => router.push('/net-edit')} icon={<Plus size={20} color={p.onAccent} />} /> : undefined}>
      {!isPremium ? (
        <LockedCard feature="networth" title="Watch the real number climb" body="Track what you own minus what you owe. Allot Plus draws the trend so progress is something you can see." />
      ) : netEntries.length === 0 ? (
        <EmptyState icon={<Landmark size={40} color={p.accent} />} title="Start with one number" body="Add a savings balance or a loan. Allot saves a snapshot every time you update, so your trend builds itself." action="Add an entry" onAction={() => router.push('/net-edit')} secondary="Why net worth?" onSecondary={() => router.push({ pathname: '/article', params: { id: 'net-worth' } })} />
      ) : (
        <>
          <Reveal>
            <Card level={2} style={{ gap: space.md }}>
              <Text variant="overline" tone="muted">Net worth</Text>
              <Text variant="moneyHero" tone={nw < 0 ? 'expense' : 'text'} numberOfLines={1} adjustsFontSizeToFit>{money(nw, { cents: false })}</Text>
              {series.length > 1 ? (
                <>
                  <Sparkline values={series} color={delta >= 0 ? p.accent : p.expense} />
                  <Badge label={`${delta >= 0 ? '+' : '−'}${money(Math.abs(delta), { cents: false })} SINCE FIRST ENTRY`} tone={delta >= 0 ? 'accent' : 'danger'} />
                </>
              ) : (
                <Text variant="callout" tone="muted">Update your balances over time and a trend line appears here.</Text>
              )}
              <View style={{ flexDirection: 'row', gap: space.xl }}>
                <View><Text variant="caption" tone="muted">Assets</Text><Text variant="money" tone="income">{moneyAuto(assets)}</Text></View>
                <View><Text variant="caption" tone="muted">Owed</Text><Text variant="money" tone="expense">{moneyAuto(liabilities)}</Text></View>
              </View>
            </Card>
          </Reveal>
          {(['asset', 'liability'] as const).map((kind, k) => {
            const list = netEntries.filter((e) => e.kind === kind);
            if (!list.length) return null;
            return (
              <Reveal key={kind} index={k + 1}>
                <Text variant="title" style={{ marginBottom: space.sm }}>{kind === 'asset' ? 'Assets' : 'Liabilities'}</Text>
                <Group style={{ marginHorizontal: 0 }}>
                  {list.map((e, i) => (
                    <Row key={e.id} title={e.name} right={<Text variant="money">{moneyAuto(e.amount)}</Text>} onPress={() => router.push({ pathname: '/net-edit', params: { id: e.id } })} last={i === list.length - 1} />
                  ))}
                </Group>
              </Reveal>
            );
          })}
        </>
      )}
    </ModalScreen>
  );
}
