import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarDays, ChartColumn, ChevronRight, Crown, Flame, Landmark, Lock, PiggyBank, Wallet } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius, shadow, space } from '../../src/theme/tokens';
import { Badge, Card, IconTile, Press, Text } from '../../src/ui/primitives';
import { Reveal, Screen } from '../../src/ui/layout';
import { useStore } from '../../src/data/store';
import { currentMonth } from '../../src/data/dates';
import { moneyAuto } from '../../src/data/format';
import { billsForMonth, fundBalances, sum } from '../../src/data/selectors';

function Tile({ title, value, caption, icon, premium, locked, onPress, index, width }: { title: string; value?: string; caption: string; icon: React.ReactNode; premium?: boolean; locked?: boolean; onPress: () => void; index: number; width: number }) {
  return (
    <Reveal index={index} style={{ width }}>
      <Card onPress={onPress} level={2} style={{ height: 172, justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <IconTile size={44}>{icon}</IconTile>
          {premium && (locked ? <Lock size={16} color="#9AA" /> : <Badge label="PLUS" />)}
        </View>
        <View style={{ gap: 2 }}>
          {value ? <Text variant="moneyLg" numberOfLines={1} adjustsFontSizeToFit>{value}</Text> : null}
          <Text variant="headline">{title}</Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>{caption}</Text>
        </View>
      </Card>
    </Reveal>
  );
}

export default function PlanTab() {
  const p = useTheme();
  const router = useRouter();
  const { width: sw } = useWindowDimensions();
  const tileW = Math.floor((sw - space.xl * 2 - space.md) / 2);
  const { funds, txs, budgets, billsPaid, debts, netEntries, isPremium } = useStore();
  const bal = useMemo(() => fundBalances({ funds, txs, budgets }), [funds, txs, budgets]);
  const totalFunds = sum(Object.values(bal));
  const bills = useMemo(() => billsForMonth(budgets[currentMonth()], currentMonth(), billsPaid), [budgets, billsPaid]);
  const nextBill = bills.find((b) => !b.paid);
  const unpaid = bills.filter((b) => !b.paid).length;
  const owed = sum(debts.map((d) => d.balance));
  const nw = sum(netEntries.map((e) => (e.kind === 'asset' ? e.amount : -e.amount)));

  return (
    <Screen tabBar title="Plan" subtitle="Beyond the month">
      {!isPremium && (
        <Reveal style={{ paddingHorizontal: space.xl, marginBottom: space.lg }}>
          <Press onPress={() => router.push('/paywall')} scaleTo={0.985} style={[{ borderRadius: radius.xl, overflow: 'hidden' }, shadow(p, 3), { shadowColor: p.accent }]}>
            <LinearGradient colors={[p.heroFrom, p.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: '#FFFFFF' }}>Allot Plus</Text>
                <Text variant="callout" style={{ color: 'rgba(255,255,255,0.85)' }}>Trends, paycheck planner, debt roadmap and net worth. 7 days free.</Text>
              </View>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </Press>
        </Reveal>
      )}

      <View style={{ paddingHorizontal: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <Tile width={tileW} index={1} title="Funds" value={moneyAuto(totalFunds)} caption={funds.length ? `${funds.length} saving toward goals` : 'Save for what’s coming'} icon={<PiggyBank size={22} color={p.accentStrong} />} onPress={() => router.push('/funds')} />
        <Tile width={tileW} index={2} title="Bills" value={unpaid ? `${unpaid} due` : bills.length ? 'All paid' : undefined} caption={nextBill ? `Next: ${nextBill.item.name}, ${moneyAuto(nextBill.item.planned)}` : 'Calendar of due dates'} icon={<CalendarDays size={22} color={p.accentStrong} />} onPress={() => router.push('/bills')} />
        <Tile width={tileW} index={3} title="Paycheck planner" caption="See which bills each paycheck covers" icon={<Wallet size={22} color={p.accentStrong} />} premium locked={!isPremium} onPress={() => router.push(isPremium ? '/paycheck' : { pathname: '/paywall', params: { feature: 'paycheck' } })} />
        <Tile width={tileW} index={4} title="Debt roadmap" value={debts.length ? moneyAuto(owed) : undefined} caption={debts.length ? 'Total owed · snowball or avalanche' : 'Snowball or avalanche payoff plan'} icon={<Flame size={22} color={p.accentStrong} />} premium locked={!isPremium} onPress={() => router.push(isPremium ? '/debt' : { pathname: '/paywall', params: { feature: 'debt' } })} />
        <Tile width={tileW} index={5} title="Net worth" value={netEntries.length ? moneyAuto(nw) : undefined} caption="Assets minus what you owe" icon={<Landmark size={22} color={p.accentStrong} />} premium locked={!isPremium} onPress={() => router.push(isPremium ? '/networth' : { pathname: '/paywall', params: { feature: 'networth' } })} />
        <Tile width={tileW} index={6} title="Reports" caption="Where it went, and the trend" icon={<ChartColumn size={22} color={p.accentStrong} />} onPress={() => router.push('/reports')} />
      </View>
    </Screen>
  );
}
