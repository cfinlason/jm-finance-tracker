import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Minus, PartyPopper, Plus } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, Press, Segmented, Text } from '../src/ui/primitives';
import { EmptyState, LockedCard } from '../src/ui/feedback';
import { ProgressBar } from '../src/ui/charts';
import { Group, ModalScreen, Reveal, Row } from '../src/ui/layout';
import { useIsPremium, useStore } from '../src/data/store';
import { monthLabel } from '../src/data/dates';
import { CURRENCIES, CurrencyCode, money, moneyAuto } from '../src/data/format';
import { payoffDate, simulatePayoff, sum, toBase } from '../src/data/selectors';
import { DebtCoachCard } from '../src/features/DebtCoachCard';

export default function Debt() {
  const p = useTheme();
  const router = useRouter();
  const { debts, settings } = useStore();
  const isPremium = useIsPremium();
  const base = settings.currency;
  const [method, setMethod] = useState<'snowball' | 'avalanche'>('snowball');
  const unit = CURRENCIES[settings.currency as CurrencyCode]?.step ?? 5; // 5 for USD, 500 for JMD…
  const [extra, setExtra] = useState(unit * 20);
  // Everything is planned in the base currency, using the user's own exchange rates for foreign debts.
  const live = useMemo(
    () => debts.filter((d) => d.balance > 0).map((d) => ({ ...d, balance: toBase(d.balance, d.currency, base, settings.rates), minPayment: toBase(d.minPayment, d.currency, base, settings.rates) })),
    [debts, base, settings.rates],
  );
  const result = useMemo(() => simulatePayoff(live, extra, method), [live, extra, method]);
  const other = useMemo(() => simulatePayoff(live, extra, method === 'snowball' ? 'avalanche' : 'snowball'), [live, extra, method]);
  const baseline = useMemo(() => simulatePayoff(live, 0, method), [live, method]);
  const total = sum(live.map((d) => d.balance));
  const minTotal = sum(live.map((d) => d.minPayment));
  const saved = Math.max(0, baseline.interest - result.interest);
  const monthsSaved = Math.max(0, baseline.months - result.months);

  const footer = isPremium ? <Button title="Add a debt" onPress={() => router.push('/debt-edit')} icon={<Plus size={20} color={p.onAccent} />} /> : undefined;

  return (
    <ModalScreen back title="Debt roadmap" footer={footer}>
      {!isPremium ? (
        <LockedCard feature="debt" title="Your payoff date, in black and white" body="Compare snowball and avalanche with your own numbers, see the exact month you’re debt-free, and how much interest an extra payment saves." />
      ) : debts.length === 0 ? (
        <EmptyState icon={<Flame size={40} color={p.accent} />} title="No debts. Lovely." body="If you do owe something, add it here and Allot will map the fastest way out." secondary="Snowball vs avalanche" onSecondary={() => router.push({ pathname: '/article', params: { id: 'snowball-vs-avalanche' } })} />
      ) : live.length === 0 ? (
        <EmptyState icon={<PartyPopper size={40} color={p.accent} />} title="Debt-free!" body="Every balance is at zero. Put those old payments to work in a fund." action="Create a fund" onAction={() => router.push('/fund-edit')} />
      ) : (
        <>
          <Reveal>
            <Card level={2} style={{ gap: space.md }}>
              <Text variant="overline" tone="muted">You’re debt-free in</Text>
              <Text variant="moneyHero" style={{ fontSize: 40, lineHeight: 46 }}>{result.capped ? '50+ years' : monthLabel(payoffDate(result.months))}</Text>
              <Text variant="callout" tone="muted">{result.months} months · {money(result.interest, { cents: false })} total interest</Text>
              {extra > 0 && (saved > 0 || monthsSaved > 0) ? (
                <View style={{ backgroundColor: p.accentSoft, borderRadius: 14, padding: space.md }}>
                  <Text variant="callout" tone="accent">An extra {moneyAuto(extra)} a month saves {money(saved, { cents: false })} and {monthsSaved} {monthsSaved === 1 ? 'month' : 'months'}.</Text>
                </View>
              ) : null}
            </Card>
          </Reveal>

          <Reveal index={1}>
            <Segmented value={method} onChange={setMethod} options={[{ value: 'snowball', label: 'Snowball' }, { value: 'avalanche', label: 'Avalanche' }]} />
            <Text variant="caption" tone="muted" style={{ marginTop: space.sm }}>
              {method === 'snowball' ? 'Smallest balance first — quick wins build momentum.' : 'Highest interest first — the cheapest route on paper.'}
              {other.interest !== result.interest ? ` The other method would cost ${money(Math.abs(other.interest - result.interest), { cents: false })} ${other.interest > result.interest ? 'more' : 'less'} in interest.` : ''}
            </Text>
          </Reveal>

          <Reveal index={2}>
            <Card style={{ gap: space.md }}>
              <Text variant="headline">Extra each month</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Press onPress={() => setExtra(Math.max(0, extra - unit * 5))} accessibilityLabel="Decrease extra payment" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}><Minus size={22} color={p.text} /></Press>
                <Text variant="moneyLg">{moneyAuto(extra)}</Text>
                <Press onPress={() => setExtra(extra + unit * 5)} accessibilityLabel="Increase extra payment" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}><Plus size={22} color={p.text} /></Press>
              </View>
              <Text variant="caption" tone="muted" align="center">On top of {moneyAuto(minTotal)} in minimums · {moneyAuto(total)} owed</Text>
            </Card>
          </Reveal>

          <Reveal index={3}>
            <DebtCoachCard debts={live} extra={extra} onPickMethod={setMethod} />
          </Reveal>

          <Text variant="title">Payoff order</Text>
          <Group style={{ marginHorizontal: 0 }}>
            {[...result.order].map((o, i) => {
              const d = debts.find((x) => x.id === o.id);
              return (
                <Row key={o.id} icon={<Badge label={`#${i + 1}`} />} title={o.name} subtitle={`Paid off in ${monthLabel(payoffDate(o.monthDone))}`} right={<Text variant="callout" tone="muted">{d ? `${d.apr}% APR` : ''}</Text>} last={i === result.order.length - 1} />
              );
            })}
          </Group>

          <Text variant="title">Your debts</Text>
          {debts.map((d, i) => (
            <Reveal key={d.id} index={i + 3}>
              <Card onPress={() => router.push({ pathname: '/debt-edit', params: { id: d.id } })} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{d.name}</Text>
                  <Text variant="money">{moneyAuto(d.balance, d.currency)}</Text>
                </View>
                {d.currency && d.currency !== base ? <Text variant="caption" tone="muted">≈ {moneyAuto(toBase(d.balance, d.currency, base, settings.rates))} at 1 {d.currency} = {settings.rates[d.currency]?.perUnit ?? '?'} {base}</Text> : null}
                <ProgressBar value={d.balance > 0 ? Math.min(1, d.minPayment / d.balance) : 1} color={p.expense} height={6} />
                <Text variant="caption" tone="muted">{d.apr}% APR · {moneyAuto(d.minPayment, d.currency)} minimum</Text>
              </Card>
            </Reveal>
          ))}
        </>
      )}
    </ModalScreen>
  );
}
