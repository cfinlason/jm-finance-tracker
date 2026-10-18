import React, { useMemo, useState } from 'react';
import { goBack } from '../src/ui/nav';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ShieldCheck, Sparkles, WifiOff } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Badge, Button, Card, Text } from '../src/ui/primitives';
import { EmptyState, Skeleton } from '../src/ui/feedback';
import { Group, ModalScreen, Reveal, Row } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { addMonths, currentMonth } from '../src/data/dates';
import { CURRENCIES, CurrencyCode, moneyAuto, round2 } from '../src/data/format';
import { summarizeMonth, toBase } from '../src/data/selectors';
import { askBudgetCoach, BudgetCoachError, BudgetPlan, CoachInput, CoachLine, localBudgetPlan } from '../src/services/budgetCoach';

type Status = { s: 'idle' } | { s: 'loading' } | { s: 'done'; plan: BudgetPlan; note?: string };

export default function BudgetCoach() {
  const p = useTheme();
  const router = useRouter();
  const { budgets, txs, debts, settings, setPlanned, setSettings } = useStore();
  const month = currentMonth();
  const budget = budgets[month];
  const [st, setSt] = useState<Status>({ s: 'idle' });
  const base = settings.currency;

  const { lines, input, income, plannedTotal } = useMemo(() => {
    const prev = summarizeMonth(txs, budgets[addMonths(month, -1)], addMonths(month, -1));
    const flat: CoachLine[] = [];
    budget?.groups.forEach((g) => g.items.forEach((it) => flat.push({ i: flat.length, id: it.id, group: g.name, name: it.name, planned: it.planned, lastMonthSpent: prev.itemSpent[it.id] || undefined, isFund: !!it.fundId })));
    const live = debts.filter((d) => d.balance > 0);
    const conv = (n: number, c?: string) => toBase(n, c, base, settings.rates);
    const inc = budget ? budget.incomes.reduce((a, i) => a + i.planned, 0) : 0;
    const inp: CoachInput = {
      income: inc,
      currency: base,
      goals: settings.goals,
      lines: flat,
      step: CURRENCIES[base as CurrencyCode]?.step ?? 5,
      debts: live.length ? { count: live.length, totalOwed: round2(live.reduce((a, d) => a + conv(d.balance, d.currency), 0)), totalMinimums: round2(live.reduce((a, d) => a + conv(d.minPayment, d.currency), 0)), highestApr: Math.max(...live.map((d) => d.apr)) } : undefined,
    };
    return { lines: flat, input: inp, income: inc, plannedTotal: round2(flat.reduce((a, l) => a + l.planned, 0)) };
  }, [budget, budgets, txs, debts, settings.goals, settings.rates, base, month]);

  const run = async () => {
    setSettings({ coachConsent: true });
    setSt({ s: 'loading' });
    try {
      const plan = await askBudgetCoach(input);
      setSt({ s: 'done', plan });
      haptic.success();
    } catch (e) {
      const msg = e instanceof BudgetCoachError ? e.message : 'Something went wrong.';
      setSt({ s: 'done', plan: localBudgetPlan(input), note: msg });
      haptic.tap();
    }
  };

  const apply = (plan: BudgetPlan) => {
    plan.changes.forEach((c) => {
      const line = lines.find((l) => l.i === c.i);
      if (line) setPlanned(month, line.id, c.planned);
    });
    haptic.success();
    goBack(router);
  };

  if (!budget || lines.length === 0 || income <= 0) {
    return (
      <ModalScreen title="Budget coach">
        <EmptyState icon={<Sparkles size={38} color={p.accent} />} title="Add income and a few lines first" body="The coach reshapes the budget you already have. Add your income and at least one budget line, then come back." action="Open income" onAction={() => router.replace({ pathname: '/income', params: { month } })} />
      </ModalScreen>
    );
  }

  const after = st.s === 'done' ? round2(lines.reduce((a, l) => a + (st.plan.changes.find((c) => c.i === l.i)?.planned ?? l.planned), 0)) : plannedTotal;
  return (
    <ModalScreen title="Budget coach">
      <Card level={2} style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted">This month</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View><Text variant="caption" tone="muted">Income</Text><Text variant="moneyLg">{moneyAuto(income)}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text variant="caption" tone="muted">Planned</Text><Text variant="moneyLg" tone={plannedTotal > income ? 'danger' : 'text'}>{moneyAuto(plannedTotal)}</Text></View>
        </View>
        <Text variant="callout" tone="muted">
          {debts.some((d) => d.balance > 0) ? `You have ${debts.filter((d) => d.balance > 0).length} debt${debts.filter((d) => d.balance > 0).length === 1 ? '' : 's'} on file, so the coach will favour paying them down.` : 'No debts on file. Add them in Plan → Debt roadmap to have the coach work around them.'}
        </Text>
      </Card>

      {st.s === 'idle' && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <ShieldCheck size={18} color={p.accent} style={{ marginTop: 2 }} />
            <Text variant="callout" tone="muted" style={{ flex: 1 }}>
              Tapping below sends your monthly income, budget line names and amounts, and a summary of your debts (totals only, no debt names) to Claude through our server. You review every change before anything is applied.
            </Text>
          </View>
          <Button title="Build my plan" onPress={() => void run()} icon={<Sparkles size={18} color={p.onAccent} />} />
        </Card>
      )}

      {st.s === 'loading' && (
        <Card style={{ gap: space.sm }}>
          <Text variant="callout" tone="muted">Reading your budget and debts…</Text>
          <Skeleton height={18} width="85%" />
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </Card>
      )}

      {st.s === 'done' && (
        <>
          {st.note ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', backgroundColor: p.mode === 'dark' ? '#3A2E12' : '#FBEFD6', borderRadius: 14, padding: space.md }}>
              <WifiOff size={18} color={p.warn} style={{ marginTop: 1 }} />
              <Text variant="callout" style={{ flex: 1 }}>AI coach unavailable: {st.note} Here’s a plan built from your numbers instead.</Text>
            </View>
          ) : null}
          <Reveal>
            <Card level={2} style={{ gap: space.md }}>
              <Badge label={st.plan.source === 'ai' ? 'AI PLAN' : 'RULE-BASED PLAN'} tone={st.plan.source === 'ai' ? 'info' : 'neutral'} />
              <Text variant="headline" style={{ fontSize: 19, lineHeight: 25 }}>{st.plan.headline}</Text>
              <Text variant="body" tone="muted" style={{ lineHeight: 24 }}>{st.plan.summary}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: p.accentSoft, borderRadius: 14, padding: space.md }}>
                <Text variant="callout" tone="accent">Planned after changes</Text>
                <Text variant="callout" tone="accent" style={{ fontFamily: 'Inter_700Bold' }}>{moneyAuto(after)} of {moneyAuto(income)}</Text>
              </View>
            </Card>
          </Reveal>
          <Text variant="title">Suggested changes</Text>
          <Group style={{ marginHorizontal: 0 }}>
            {st.plan.changes.map((c, n) => {
              const l = lines.find((x) => x.i === c.i);
              if (!l) return null;
              const up = c.planned > l.planned;
              return (
                <Row
                  key={c.i}
                  title={l.name}
                  subtitle={c.reason || l.group}
                  right={
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="caption" tone="muted">{moneyAuto(l.planned)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ArrowRight size={13} color={p.textFaint} />
                        <Text variant="money" tone={up ? 'accent' : 'expense'}>{moneyAuto(c.planned)}</Text>
                      </View>
                    </View>
                  }
                  last={n === st.plan.changes.length - 1}
                />
              );
            })}
          </Group>
          {st.plan.tips.map((t, i) => <Text key={i} variant="callout" tone="muted">• {t}</Text>)}
          <Text variant="caption" tone="faint">Suggestions, not financial advice. Nothing changes until you apply it, and you can edit any line afterwards.</Text>
          <Button title={`Apply ${st.plan.changes.length} change${st.plan.changes.length === 1 ? '' : 's'}`} onPress={() => apply(st.plan)} disabled={st.plan.changes.length === 0} />
          <Button title={st.note ? 'Try the AI coach again' : 'Ask again'} variant="ghost" small onPress={() => void run()} />
        </>
      )}
    </ModalScreen>
  );
}
