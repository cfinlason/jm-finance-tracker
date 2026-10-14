import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChartColumn, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Card, Chip, Press, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { EmptyState, LockedCard } from '../src/ui/feedback';
import { Bars, Donut } from '../src/ui/charts';
import { ModalScreen, Reveal } from '../src/ui/layout';
import { useStore } from '../src/data/store';
import { addMonths, currentMonth, monthLabel } from '../src/data/dates';
import { money, moneyAuto, pct } from '../src/data/format';
import { merchantTotals, monthlySeries, spendByGroup, summarizeMonth } from '../src/data/selectors';

export default function Reports() {
  const p = useTheme();
  const router = useRouter();
  const { txs, budgets, isPremium } = useStore();
  const [month, setMonth] = useState(currentMonth());
  const [active, setActive] = useState<string | null>(null);
  const [span, setSpan] = useState<6 | 12>(6);

  const rows = useMemo(() => spendByGroup(txs, budgets[month], month), [txs, budgets, month]);
  const s = useMemo(() => summarizeMonth(txs, budgets[month], month), [txs, budgets, month]);
  const top = useMemo(() => merchantTotals(txs, month, 5), [txs, month]);
  const series = useMemo(() => monthlySeries(txs, currentMonth(), span), [txs, span]);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const savingsRate = s.receivedIncome > 0 ? (s.receivedIncome - s.spent) / s.receivedIncome : null;

  return (
    <ModalScreen back title="Reports">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => { setMonth(addMonths(month, -1)); setActive(null); }} accessibilityLabel="Previous month" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={p.text} /></Press>
        <Text variant="title">{monthLabel(month)}</Text>
        <Press onPress={() => { setMonth(addMonths(month, 1)); setActive(null); }} accessibilityLabel="Next month" disabled={month >= currentMonth()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={p.text} /></Press>
      </View>

      {total === 0 ? (
        <EmptyState icon={<ChartColumn size={38} color={p.accent} />} title="Nothing to chart yet" body={`There’s no spending in ${monthLabel(month)}. Log a few transactions and this fills in, or step back to an earlier month.`} action="Add a transaction" onAction={() => router.push('/add')} />
      ) : (
        <>
          <Reveal>
            <Card level={2} style={{ alignItems: 'center', gap: space.lg }}>
              <Donut
                slices={rows.map((r) => ({ id: r.id, label: r.name, value: r.amount }))}
                centerTop={moneyAuto(active ? rows.find((r) => r.id === active)?.amount ?? total : total)}
                centerBottom={active ? rows.find((r) => r.id === active)?.name : 'spent'}
                activeId={active}
              />
              <View style={{ alignSelf: 'stretch', gap: space.xs }}>
                {rows.map((r, i) => (
                  <Press key={r.id} haptics="select" scaleTo={0.985} onPress={() => setActive(active === r.id ? null : r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, opacity: active && active !== r.id ? 0.45 : 1 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: p.chart[i % p.chart.length] }} />
                    <Icon name={r.icon} size={16} color={p.textFaint} />
                    <Text variant="callout" style={{ flex: 1 }}>{r.name}</Text>
                    <Text variant="caption" tone="muted">{pct(r.amount / total)}</Text>
                    <Text variant="money" style={{ minWidth: 76, textAlign: 'right' }}>{moneyAuto(r.amount)}</Text>
                  </Press>
                ))}
              </View>
            </Card>
          </Reveal>

          <Reveal index={1}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Card style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" tone="muted">Income received</Text>
                <Text variant="moneyLg" tone="income" numberOfLines={1} adjustsFontSizeToFit>{moneyAuto(s.receivedIncome)}</Text>
              </Card>
              <Card style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" tone="muted">Kept</Text>
                <Text variant="moneyLg" numberOfLines={1} adjustsFontSizeToFit>{savingsRate === null ? '—' : pct(savingsRate)}</Text>
              </Card>
            </View>
          </Reveal>

          {top.length > 0 && (
            <Reveal index={2}>
              <Card style={{ gap: space.md }}>
                <Text variant="title">Top merchants</Text>
                {top.map((m, i) => (
                  <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Badge label={`${i + 1}`} tone="neutral" />
                    <View style={{ flex: 1 }}><Text variant="bodyStrong" numberOfLines={1}>{m.name}</Text><Text variant="caption" tone="muted">{m.count} {m.count === 1 ? 'purchase' : 'purchases'}</Text></View>
                    <Text variant="money">{money(m.amount, { cents: false })}</Text>
                  </View>
                ))}
              </Card>
            </Reveal>
          )}
        </>
      )}

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title">Trends</Text>
          {isPremium ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Chip label="6 mo" selected={span === 6} onPress={() => setSpan(6)} />
              <Chip label="12 mo" selected={span === 12} onPress={() => setSpan(12)} />
            </View>
          ) : <Badge label="PLUS" />}
        </View>
        {isPremium ? (
          <Card style={{ gap: space.md }}>
            <Bars data={series.map((m) => ({ label: monthLabel(m.month, true).slice(0, span === 12 ? 1 : 3), a: m.income, b: m.spent }))} />
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.accent }} /><Text variant="caption" tone="muted">Income</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.expense }} /><Text variant="caption" tone="muted">Spent</Text></View>
            </View>
          </Card>
        ) : (
          <LockedCard feature="reports" title="See the long view" body="Income against spending for the last 6 or 12 months, so you can spot the drift before it becomes a habit." />
        )}
      </View>
    </ModalScreen>
  );
}
