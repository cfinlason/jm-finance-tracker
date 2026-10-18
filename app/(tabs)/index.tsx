import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Flame, Lightbulb, Plus, Settings as SettingsIcon, Sparkles, CopyPlus } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius, shadow, space } from '../../src/theme/tokens';
import { Badge, Button, Card, Divider, IconTile, Press, Segmented, Text } from '../../src/ui/primitives';
import { Icon } from '../../src/ui/Icon';
import { Banner, EmptyState } from '../../src/ui/feedback';
import { ProgressBar, Ring } from '../../src/ui/charts';
import { Reveal, Screen } from '../../src/ui/layout';
import { computeStreak, useStore } from '../../src/data/store';
import { addMonths, currentMonth, greeting, monthLabel } from '../../src/data/dates';
import { money, moneyAuto, moneyShort } from '../../src/data/format';
import { fundBalances, summarizeMonth } from '../../src/data/selectors';
import { TIPS } from '../../src/content/learn';
import type { BudgetItem, Group } from '../../src/data/types';

type View3 = 'planned' | 'spent' | 'remaining';

function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const p = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Press onPress={() => onChange(addMonths(month, -1))} accessibilityLabel="Previous month" hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={18} color={p.text} />
      </Press>
      <Press onPress={() => onChange(currentMonth())} haptics="select" style={{ minWidth: 118, alignItems: 'center' }}>
        <Text variant="headline">{monthLabel(month)}</Text>
      </Press>
      <Press onPress={() => onChange(addMonths(month, 1))} accessibilityLabel="Next month" hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={18} color={p.text} />
      </Press>
    </View>
  );
}

function Hero({ s, mode }: { s: ReturnType<typeof summarizeMonth>; mode: View3 }) {
  const p = useTheme();
  const router = useRouter();
  const zero = Math.abs(s.leftToBudget) < 0.005;
  const over = s.leftToBudget < -0.005;
  const headline = zero ? '$0.00' : money(Math.abs(s.leftToBudget));
  const label = zero ? 'Every dollar has a job' : over ? 'Over-planned by' : 'Left to budget';
  const planned = s.plannedExpenses;
  const used = planned > 0 ? s.spent / planned : 0;
  return (
    <View style={[{ marginHorizontal: space.xl, borderRadius: radius.xl, overflow: 'hidden' }, shadow(p, 3), { shadowColor: p.accent }]}>
      <LinearGradient colors={[p.heroFrom, p.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.xl, gap: space.lg }}>
        <View style={{ position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.09)' }} />
        <View style={{ position: 'absolute', right: 60, bottom: -90, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text variant="overline" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text variant="moneyHero" style={{ color: '#FFFFFF' }} numberOfLines={1} adjustsFontSizeToFit>{headline}</Text>
              {zero && <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Check size={18} color={p.heroTo} strokeWidth={3.2} /></View>}
            </View>
          </View>
          <Ring progress={used} size={64} stroke={7} color="#FFFFFF" track="rgba(255,255,255,0.25)">
            <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold' }}>{Math.round(Math.min(used, 9.99) * 100)}%</Text>
          </Ring>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: radius.md, padding: space.md }}>
          {[
            { k: 'Income', v: s.plannedIncome, sub: s.receivedIncome > 0 ? `${moneyShort(s.receivedIncome)} in` : 'planned', on: false },
            { k: 'Planned', v: s.plannedExpenses, sub: 'to spend', on: mode === 'planned' },
            { k: 'Spent', v: s.spent, sub: s.spent > planned && planned > 0 ? 'over plan' : 'so far', on: mode === 'spent' },
          ].map((c, i) => (
            <View key={c.k} style={{ flex: 1, paddingLeft: i ? space.md : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.18)' }}>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.k}</Text>
              <Text variant="headline" style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{moneyShort(c.v)}</Text>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>{c.sub}</Text>
            </View>
          ))}
        </View>
        {!zero && (
          <Button
            title={over ? 'Trim some lines' : 'Assign what’s left'}
            small
            variant="secondary"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
            onPress={() => router.push({ pathname: '/item', params: { assign: '1' } })}
            icon={<Sparkles size={16} color={p.heroTo} />}
          />
        )}
      </LinearGradient>
    </View>
  );
}

function ItemRow({ item, spent, mode, balance, onPress, last }: { item: BudgetItem; spent: number; mode: View3; balance?: number; onPress: () => void; last: boolean }) {
  const p = useTheme();
  const remaining = item.planned - spent;
  const ratio = item.planned > 0 ? spent / item.planned : spent > 0 ? 1.01 : 0;
  const over = remaining < -0.005;
  const value = mode === 'planned' ? item.planned : mode === 'spent' ? spent : remaining;
  return (
    <View>
      <Press onPress={onPress} scaleTo={0.985} style={{ paddingVertical: space.md, paddingHorizontal: space.lg, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{item.name}</Text>
            {item.fundId ? <Badge label="FUND" tone="info" /> : null}
          </View>
          <Text variant="money" tone={mode === 'remaining' && over ? 'danger' : mode === 'remaining' && remaining > 0.005 ? 'accent' : 'text'}>
            {mode === 'remaining' && over ? `${moneyAuto(Math.abs(remaining))} over` : moneyAuto(value)}
          </Text>
        </View>
        <ProgressBar value={ratio} height={6} />
        {item.fundId && balance !== undefined ? <Text variant="caption" tone="muted">Fund balance {moneyAuto(balance)}</Text> : null}
      </Press>
      {!last && <Divider inset={space.lg} />}
    </View>
  );
}

function GroupCard({ group, month, mode, s, balances, index }: { group: Group; month: string; mode: View3; s: ReturnType<typeof summarizeMonth>; balances: Record<string, number>; index: number }) {
  const p = useTheme();
  const router = useRouter();
  const planned = s.groupPlanned[group.id] ?? 0;
  const spent = s.groupSpent[group.id] ?? 0;
  return (
    <Reveal index={index} style={{ paddingHorizontal: space.xl }}>
      <Animated.View layout={LinearTransition.springify().damping(20)}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <Press onPress={() => router.push({ pathname: '/group', params: { id: group.id, month } })} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingBottom: space.md }}>
            <IconTile><Icon name={group.icon} color={p.accentStrong} size={20} /></IconTile>
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>{group.name}</Text>
              <Text variant="caption" tone="muted">{moneyAuto(spent)} of {moneyAuto(planned)}</Text>
              <View style={{ marginTop: 6 }}><ProgressBar value={planned > 0 ? spent / planned : spent > 0 ? 1.01 : 0} height={6} /></View>
            </View>
            <ChevronRight size={18} color={p.textFaint} />
          </Press>
          <Divider />
          {group.items.length === 0 ? (
            <View style={{ padding: space.lg }}>
              <Text variant="callout" tone="muted">No lines yet. Add the first one below.</Text>
            </View>
          ) : (
            group.items.map((it, i) => (
              <ItemRow key={it.id} item={it} spent={s.itemSpent[it.id] ?? 0} mode={mode} balance={it.fundId ? balances[it.fundId] : undefined} last={i === group.items.length - 1} onPress={() => router.push({ pathname: '/item', params: { id: it.id, month } })} />
            ))
          )}
          <Divider />
          <Press onPress={() => router.push({ pathname: '/item', params: { groupId: group.id, month } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.lg }}>
            <Plus size={18} color={p.accent} />
            <Text variant="callout" tone="accent">Add a line</Text>
          </Press>
        </Card>
      </Animated.View>
    </Reveal>
  );
}

function Checklist() {
  const p = useTheme();
  const router = useRouter();
  const { txs, funds, settings, readArticles, dismissedTips, dismissTip } = useStore();
  const items = [
    { id: 'tx', label: 'Log your first transaction', done: txs.length > 0, go: () => router.push('/add') },
    { id: 'fund', label: 'Give a fund a goal and a date', done: funds.some((f) => !!f.targetDate), go: () => router.push('/funds') },
    { id: 'rem', label: 'Turn on a daily reminder', done: settings.reminders.some((r) => r.enabled), go: () => router.push('/settings') },
    { id: 'read', label: 'Read “Give every dollar a job”', done: readArticles.includes('every-dollar-a-job'), go: () => router.push({ pathname: '/article', params: { id: 'every-dollar-a-job' } }) },
  ];
  const done = items.filter((i) => i.done).length;
  if (dismissedTips.includes('checklist') || done === items.length) return null;
  return (
    <Reveal index={1} style={{ paddingHorizontal: space.xl, marginTop: space.lg }}>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Getting started</Text>
            <Text variant="caption" tone="muted">{done} of {items.length} done</Text>
          </View>
          <Press onPress={() => dismissTip('checklist')} hitSlop={10}><Text variant="callout" tone="muted">Hide</Text></Press>
        </View>
        <ProgressBar value={done / items.length} height={6} />
        {items.map((it) => (
          <Press key={it.id} onPress={it.go} haptics="tap" scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: it.done ? p.accent : p.sunken, alignItems: 'center', justifyContent: 'center' }}>
              {it.done ? <Check size={14} color={p.onAccent} strokeWidth={3.2} /> : null}
            </View>
            <Text variant="callout" tone={it.done ? 'faint' : 'text'} style={{ flex: 1, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.label}</Text>
            {!it.done && <ChevronRight size={16} color={p.textFaint} />}
          </Press>
        ))}
      </Card>
    </Reveal>
  );
}

export default function BudgetScreen() {
  const p = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [mode, setMode] = useState<View3>('remaining');
  const state = useStore();
  const { budgets, txs, funds, activity, settings, ensureBudget, copyBudgetFrom } = state;
  const budget = budgets[month];

  useEffect(() => {
    if (month >= currentMonth()) ensureBudget(month);
  }, [month, ensureBudget]);

  const s = useMemo(() => summarizeMonth(txs, budget, month), [txs, budget, month]);
  const balances = useMemo(() => fundBalances({ funds, txs, budgets }), [funds, txs, budgets]);
  const streak = computeStreak(activity);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const prevKey = Object.keys(budgets).sort().reverse().find((k) => k < month);

  return (
    <Screen
      tabBar
      title={settings.name ? `${greeting()}, ${settings.name}` : greeting()}
      subtitle="Your plan"
      right={
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: p.accentSoft }} accessibilityLabel={`${streak} day streak`}>
              <Flame size={16} color={p.accent} />
              <Text variant="callout" tone="accent" style={{ fontFamily: 'Inter_700Bold' }}>{streak}</Text>
            </View>
          )}
          <Press onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={19} color={p.text} />
          </Press>
        </View>
      }
    >
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <MonthSwitcher month={month} onChange={setMonth} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Press onPress={() => router.push('/budget-coach')} haptics="tap" hitSlop={8} accessibilityLabel="Open budget coach" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Sparkles size={15} color={p.accent} />
            <Text variant="callout" tone="accent">Coach</Text>
          </Press>
          <Press onPress={() => router.push({ pathname: '/income', params: { month } })} haptics="tap" hitSlop={8}>
            <Text variant="callout" tone="accent">Income</Text>
          </Press>
        </View>
      </View>

      {!budget ? (
        <EmptyState
          icon={<CopyPlus size={38} color={p.accent} />}
          title={`No plan for ${monthLabel(month)}`}
          body={prevKey ? `Start from ${monthLabel(prevKey)} and tweak what changed, or begin with a clean slate.` : 'Create a plan for this month to start giving every dollar a job.'}
          action={prevKey ? `Copy ${monthLabel(prevKey, true)}` : 'Create plan'}
          onAction={() => (prevKey ? copyBudgetFrom(prevKey, month) : ensureBudget(month))}
          secondary="Start blank"
          onSecondary={() => ensureBudget(month)}
        />
      ) : (
        <>
          <Reveal>
            <Hero s={s} mode={mode} />
          </Reveal>

          {s.extraIncome > 0.005 && (
            <Reveal index={1} style={{ paddingHorizontal: space.xl, marginTop: space.lg }}>
              <Banner
                icon={<Sparkles size={22} color={p.accent} />}
                title={`${money(s.extraIncome)} more than planned`}
                body="Extra income counts right away. Give it a job before it disappears."
                onPress={() => router.push({ pathname: '/item', params: { assign: '1', month } })}
              />
            </Reveal>
          )}

          <Reveal index={1} style={{ paddingHorizontal: space.xl, marginTop: space.lg }}>
            <Segmented<View3>
              value={mode}
              onChange={setMode}
              options={[{ value: 'planned', label: 'Planned' }, { value: 'spent', label: 'Spent' }, { value: 'remaining', label: 'Remaining' }]}
            />
          </Reveal>

          <Checklist />

          {budget.groups.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={38} color={p.accent} />}
              title="A blank canvas"
              body="Add a group like Housing or Food, then the lines inside it. Allot keeps the total at zero for you."
              action="Add a group"
              onAction={() => router.push({ pathname: '/group', params: { month } })}
            />
          ) : (
            <View style={{ gap: space.lg, marginTop: space.lg }}>
              {budget.groups.map((g, i) => (
                <GroupCard key={g.id} group={g} month={month} mode={mode} s={s} balances={balances} index={i + 2} />
              ))}
              <Reveal index={budget.groups.length + 2} style={{ paddingHorizontal: space.xl }}>
                <Button title="Add a group" variant="secondary" small onPress={() => router.push({ pathname: '/group', params: { month } })} icon={<Plus size={18} color={p.accentStrong} />} />
              </Reveal>
            </View>
          )}

          <Reveal index={budget.groups.length + 3} style={{ paddingHorizontal: space.xl, marginTop: space.xl }}>
            <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <IconTile tone="warn"><Lightbulb size={20} color={p.warn} /></IconTile>
              <View style={{ flex: 1 }}>
                <Text variant="overline" tone="muted">Today’s nudge</Text>
                <Text variant="callout" style={{ marginTop: 2 }}>{tip}</Text>
              </View>
            </Card>
          </Reveal>
        </>
      )}
    </Screen>
  );
}
