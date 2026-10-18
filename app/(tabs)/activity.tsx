import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, Paperclip, ChevronLeft, ChevronRight, Receipt, Search, PiggyBank, SearchX } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { font, radius, space } from '../../src/theme/tokens';
import { Card, Chip, IconTile, Press, Text } from '../../src/ui/primitives';
import { Icon } from '../../src/ui/Icon';
import { EmptyState } from '../../src/ui/feedback';
import { Reveal, Screen } from '../../src/ui/layout';
import { useStore } from '../../src/data/store';
import { addMonths, currentMonth, monthLabel, prettyDate } from '../../src/data/dates';
import { money, moneyAuto } from '../../src/data/format';
import { allItems, summarizeMonth, txsInMonth } from '../../src/data/selectors';
import type { Tx } from '../../src/data/types';

type Filter = 'all' | 'expense' | 'income' | 'fund';

export default function Activity() {
  const p = useTheme();
  const router = useRouter();
  const { txs, budgets, funds } = useStore();
  const [month, setMonth] = useState(currentMonth());
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => allItems(budgets), [budgets]);
  const s = useMemo(() => summarizeMonth(txs, budgets[month], month), [txs, budgets, month]);
  const monthTxs = useMemo(() => txsInMonth(txs, month), [txs, month]);

  const describe = (t: Tx): { title: string; sub: string; icon: React.ReactNode; tone: 'accent' | 'expense' | 'info' } => {
    const first = t.splits[0];
    if (t.kind === 'income') return { title: t.merchant || 'Income', sub: 'Income', icon: <ArrowDownLeft size={20} color={p.accentStrong} />, tone: 'accent' };
    if (t.kind === 'fund_deposit' || t.kind === 'fund_spend') {
      const f = funds.find((x) => x.id === first?.id);
      return { title: t.merchant || (t.kind === 'fund_deposit' ? 'Added to fund' : 'Fund spend'), sub: `${t.kind === 'fund_deposit' ? 'To' : 'From'} ${f?.name ?? 'fund'}`, icon: <PiggyBank size={20} color={p.info} />, tone: 'info' };
    }
    const ref = first ? items.get(first.id) : undefined;
    const label = t.splits.length > 1 ? `Split · ${t.splits.length} lines` : ref?.item.name ?? 'Uncategorized';
    return { title: t.merchant || ref?.item.name || 'Expense', sub: t.merchant || t.splits.length > 1 ? label : ref?.group.name ?? label, icon: ref ? <Icon name={ref.group.icon} color={p.expense} size={20} /> : <Receipt size={20} color={p.expense} />, tone: 'expense' };
  };

  const filtered = monthTxs
    .filter((t) => (filter === 'all' ? true : filter === 'fund' ? t.kind.startsWith('fund') : t.kind === filter))
    .filter((t) => {
      if (!q.trim()) return true;
      const d = describe(t);
      return `${t.merchant} ${t.note ?? ''} ${d.sub}`.toLowerCase().includes(q.trim().toLowerCase());
    })
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

  const byDate = filtered.reduce<Record<string, Tx[]>>((acc, t) => ((acc[t.date] ??= []).push(t), acc), {});
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <Screen tabBar title="Activity" subtitle={monthLabel(month)}>
      <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Press onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color={p.text} />
            </Press>
            <Press onPress={() => setMonth(addMonths(month, 1))} accessibilityLabel="Next month" hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={18} color={p.text} />
            </Press>
          </View>
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" tone="muted">In</Text>
              <Text variant="money" tone="income">{moneyAuto(s.receivedIncome)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" tone="muted">Out</Text>
              <Text variant="money" tone="expense">{moneyAuto(s.spent)}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: p.surface, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 46 }}>
          <Search size={18} color={p.textFaint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search merchants and notes" placeholderTextColor={p.textFaint} selectionColor={p.accent} style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: p.text }} returnKeyType="search" />
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['all', 'expense', 'income', 'fund'] as Filter[]).map((f) => (
            <Chip key={f} label={f === 'all' ? 'All' : f === 'expense' ? 'Spending' : f === 'income' ? 'Income' : 'Funds'} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>
      </View>

      {txs.length === 0 ? (
        <EmptyState icon={<Receipt size={38} color={p.accent} />} title="No transactions yet" body="Tap the green + to log your first purchase. It takes about ten seconds and starts your streak." action="Add a transaction" onAction={() => router.push('/add')} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={q ? <SearchX size={38} color={p.accent} /> : <Receipt size={38} color={p.accent} />}
          title={q ? 'Nothing matches' : `Nothing in ${monthLabel(month)}`}
          body={q ? 'Try a different word, or clear the search and filters.' : 'Switch months with the arrows, or add something for this one.'}
          action={q || filter !== 'all' ? 'Clear filters' : 'Add a transaction'}
          onAction={() => (q || filter !== 'all' ? (setQ(''), setFilter('all')) : router.push('/add'))}
        />
      ) : (
        <View style={{ marginTop: space.lg, gap: space.lg, paddingHorizontal: space.xl }}>
          {dates.map((d, di) => (
            <Reveal key={d} index={di}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm, paddingHorizontal: 4 }}>
                <Text variant="overline" tone="muted">{prettyDate(d)}</Text>
                <Text variant="caption" tone="faint">
                  {money(byDate[d].reduce((a, t) => a + (t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : 0), 0), { sign: true })}
                </Text>
              </View>
              <Card padded={false}>
                {byDate[d].map((t, i) => {
                  const info = describe(t);
                  const plus = t.kind === 'income' || t.kind === 'fund_deposit';
                  return (
                    <View key={t.id}>
                      <Press onPress={() => router.push({ pathname: '/add', params: { id: t.id } })} scaleTo={0.985} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
                        <IconTile tone={info.tone}>{info.icon}</IconTile>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{info.title}</Text>
                            {t.receiptId ? <Paperclip size={14} color={p.textFaint} /> : null}
                          </View>
                          <Text variant="caption" tone="muted" numberOfLines={1}>{info.sub}{t.note ? ` · ${t.note}` : ''}</Text>
                        </View>
                        <Text variant="money" tone={t.kind === 'income' ? 'income' : t.kind.startsWith('fund') ? 'info' : 'text'}>
                          {plus ? '+' : '−'}{moneyAuto(t.amount)}
                        </Text>
                      </Press>
                      {i < byDate[d].length - 1 && <View style={{ height: 1, backgroundColor: p.line, marginLeft: space.lg + 52, opacity: 0.7 }} />}
                    </View>
                  );
                })}
              </Card>
            </Reveal>
          ))}
        </View>
      )}
    </Screen>
  );
}

