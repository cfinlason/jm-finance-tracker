import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Scissors, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Badge, Button, Card, Chip, Field, Press, Segmented, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { AmountPad } from '../src/ui/AmountPad';
import { ModalScreen } from '../src/ui/layout';
import { useCelebration } from '../src/ui/feedback';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { addDays, currentMonth, monthKey, prettyDate, todayISO } from '../src/data/dates';
import { money, moneyAuto, parseAmount, round2 } from '../src/data/format';
import { fundBalances, summarizeMonth } from '../src/data/selectors';
import type { Split, TxKind } from '../src/data/types';

type Mode = 'expense' | 'income' | 'fund';

export default function AddTransaction() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { txs, budgets, funds, addTx, updateTx, removeTx } = useStore();
  const editing = id ? txs.find((t) => t.id === id) : undefined;
  const fire = useCelebration((s) => s.fire);

  const initialMode: Mode = editing ? (editing.kind === 'income' ? 'income' : editing.kind.startsWith('fund') ? 'fund' : 'expense') : 'expense';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fundDir, setFundDir] = useState<'spend' | 'deposit'>(editing?.kind === 'fund_deposit' ? 'deposit' : 'spend');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '0');
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [target, setTarget] = useState<string | null>(editing && editing.splits.length === 1 ? editing.splits[0].id : null);
  const [split, setSplit] = useState(!!editing && editing.splits.length > 1 && editing.kind === 'expense');
  const [rows, setRows] = useState<{ id: string | null; amount: string }[]>(
    editing && editing.splits.length > 1 ? editing.splits.map((s) => ({ id: s.id, amount: String(s.amount) })) : [{ id: null, amount: '' }, { id: null, amount: '' }],
  );
  const [pickRow, setPickRow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const month = monthKey(date);
  const budget = budgets[month] ?? budgets[currentMonth()];
  const summary = useMemo(() => summarizeMonth(txs.filter((t) => t.id !== id), budget, month), [txs, budget, month, id]);
  const balances = useMemo(() => fundBalances({ funds, txs: txs.filter((t) => t.id !== id), budgets }), [funds, txs, budgets, id]);

  const total = parseAmount(amount);
  const assigned = round2(rows.reduce((a, r) => a + parseAmount(r.amount), 0));
  const remainder = round2(total - assigned);

  const itemName = (iid: string | null) => {
    if (!iid) return null;
    for (const g of budget?.groups ?? []) for (const i of g.items) if (i.id === iid) return i;
    return null;
  };
  const selectedItem = mode === 'expense' ? itemName(target) : null;
  const leftAfter = selectedItem ? round2(selectedItem.planned - (summary.itemSpent[selectedItem.id] ?? 0) - total) : null;

  const pickTarget = (tid: string) => {
    haptic.select();
    if (pickRow !== null) {
      setRows((rs) => rs.map((r, i) => (i === pickRow ? { ...r, id: tid } : r)));
      setPickRow(null);
    } else setTarget(tid);
  };

  const save = () => {
    setError(null);
    if (total <= 0) return setError('Enter an amount greater than zero.');
    let kind: TxKind;
    let splits: Split[];
    if (mode === 'expense') {
      kind = 'expense';
      if (split) {
        if (rows.some((r) => !r.id || parseAmount(r.amount) <= 0)) return setError('Give every split line a category and an amount.');
        if (Math.abs(remainder) > 0.004) return setError(`Split lines must add up to the total. ${money(Math.abs(remainder))} ${remainder > 0 ? 'left to assign' : 'over'}.`);
        splits = rows.map((r) => ({ id: r.id as string, amount: parseAmount(r.amount) }));
      } else {
        if (!target) return setError('Choose a category for this purchase.');
        splits = [{ id: target, amount: total }];
      }
    } else if (mode === 'income') {
      kind = 'income';
      if (!target) return setError('Choose which income this belongs to.');
      splits = [{ id: target, amount: total }];
    } else {
      kind = fundDir === 'deposit' ? 'fund_deposit' : 'fund_spend';
      if (!target) return setError('Choose a fund.');
      splits = [{ id: target, amount: total }];
    }
    const payload = { date, kind, merchant: merchant.trim(), note: note.trim() || undefined, amount: total, splits };
    if (editing) {
      updateTx(editing.id, payload);
      haptic.success();
      router.back();
      return;
    }
    const res = addTx(payload);
    haptic.success();
    router.back();
    if (res.streakExtended && res.streak > 1) {
      setTimeout(() => fire({ kind: 'streak', title: `${res.streak}-day streak`, subtitle: 'You logged today. Small habit, big picture.' }), 380);
    } else if (res.streakExtended) {
      setTimeout(() => fire({ kind: 'streak', title: 'Streak started', subtitle: 'Log something tomorrow to keep it going.' }), 380);
    }
  };

  const del = () => {
    if (!editing) return;
    haptic.warn();
    removeTx(editing.id);
    router.back();
  };

  const chips = () => {
    if (mode === 'income') {
      const lines = budget?.incomes ?? [];
      if (lines.length === 0) return <Text variant="callout" tone="muted">No income lines yet. Add one from the Budget tab (Income).</Text>;
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {lines.map((l) => <Chip key={l.id} label={l.name} selected={(pickRow === null ? target : null) === l.id} onPress={() => pickTarget(l.id)} />)}
        </View>
      );
    }
    if (mode === 'fund') {
      if (funds.length === 0) return <Text variant="callout" tone="muted">No funds yet. Create one in Plan → Funds.</Text>;
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {funds.map((f) => <Chip key={f.id} label={`${f.name} · ${moneyAuto(balances[f.id] ?? 0)}`} selected={target === f.id} onPress={() => pickTarget(f.id)} />)}
        </View>
      );
    }
    if (!budget || budget.groups.every((g) => g.items.length === 0)) return <Text variant="callout" tone="muted">Add budget lines first so purchases have a home.</Text>;
    return (
      <View style={{ gap: space.md }}>
        {budget.groups.filter((g) => g.items.length).map((g) => (
          <View key={g.id} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={g.icon} size={14} color={p.textFaint} />
              <Text variant="overline" tone="faint">{g.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {g.items.map((i) => (
                <Chip key={i.id} label={i.name} selected={pickRow === null ? target === i.id : rows[pickRow]?.id === i.id} onPress={() => pickTarget(i.id)} />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ModalScreen
      title={editing ? 'Edit transaction' : 'New transaction'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={editing ? 'Save changes' : 'Add transaction'} onPress={save} />
          {editing ? <Button title="Delete transaction" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Segmented<Mode> value={mode} onChange={(m) => { setMode(m); setTarget(null); setSplit(false); setPickRow(null); setError(null); }} options={[{ value: 'expense', label: 'Spent' }, { value: 'income', label: 'Income' }, { value: 'fund', label: 'Fund' }]} />

      <View style={{ alignItems: 'center', paddingVertical: space.md }}>
        <Text variant="overline" tone="muted">Amount</Text>
        <Text variant="moneyHero" tone={total > 0 ? (mode === 'income' ? 'income' : 'text') : 'faint'} numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: '100%' }}>
          ${amount}
        </Text>
        {leftAfter !== null && total > 0 && (
          <Text variant="callout" tone={leftAfter < 0 ? 'danger' : 'muted'}>
            {selectedItem?.name}: {leftAfter < 0 ? `${moneyAuto(Math.abs(leftAfter))} over` : `${moneyAuto(leftAfter)} left`}
          </Text>
        )}
      </View>

      <AmountPad value={amount} onChange={(v) => { setAmount(v); setError(null); }} />

      {mode === 'fund' && (
        <Segmented<'spend' | 'deposit'> value={fundDir} onChange={setFundDir} options={[{ value: 'spend', label: 'Spend from fund' }, { value: 'deposit', label: 'Add to fund' }]} />
      )}
      {mode === 'fund' && <Text variant="caption" tone="muted">Fund activity never changes this month’s budget — it only moves the fund’s balance.</Text>}

      {pickRow !== null && (
        <Card style={{ gap: space.md }}>
          <Text variant="headline">Choose a category</Text>
          {chips()}
          <Button title="Cancel" variant="ghost" small onPress={() => setPickRow(null)} />
        </Card>
      )}

      {pickRow === null && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="headline">{mode === 'income' ? 'Income line' : mode === 'fund' ? 'Fund' : split ? 'Split across lines' : 'Category'}</Text>
            {mode === 'expense' && (
              <Press onPress={() => { setSplit((s) => !s); setError(null); }} haptics="select" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Scissors size={16} color={p.accent} />
                <Text variant="callout" tone="accent">{split ? 'Single category' : 'Split'}</Text>
              </Press>
            )}
          </View>
          {mode === 'expense' && split ? (
            <View style={{ gap: space.sm }}>
              {rows.map((r, i) => {
                const it = itemName(r.id);
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Press onPress={() => setPickRow(i)} haptics="select" style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: p.sunken, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text variant="callout" tone={it ? 'text' : 'faint'} numberOfLines={1} style={{ flex: 1 }}>{it?.name ?? 'Choose category'}</Text>
                      <ChevronRight size={16} color={p.textFaint} />
                    </Press>
                    <Field value={r.amount} onChangeText={(t) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, amount: t.replace(/[^0-9.]/g, '') } : x)))} keyboardType="decimal-pad" prefix="$" placeholder="0" style={{ width: 120 }} />
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Press onPress={() => setRows((rs) => [...rs, { id: null, amount: '' }])} haptics="select"><Text variant="callout" tone="accent">+ Add line</Text></Press>
                <Badge label={Math.abs(remainder) < 0.005 ? 'BALANCED' : remainder > 0 ? `${money(remainder)} LEFT` : `${money(-remainder)} OVER`} tone={Math.abs(remainder) < 0.005 ? 'accent' : 'warn'} />
              </View>
            </View>
          ) : (
            chips()
          )}
        </Card>
      )}

      <Field label={mode === 'income' ? 'From' : 'Merchant'} value={merchant} onChangeText={setMerchant} placeholder={mode === 'income' ? 'Employer or source' : 'Where was it?'} autoCapitalize="words" />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to remember" />

      <View style={{ gap: 6 }}>
        <Text variant="overline" tone="muted">Date</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Press onPress={() => setDate(addDays(date, -1))} accessibilityLabel="Previous day" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={p.text} />
          </Press>
          <View style={{ flex: 1, alignItems: 'center' }}><Text variant="bodyStrong">{prettyDate(date)}</Text></View>
          <Press onPress={() => date < todayISO() && setDate(addDays(date, 1))} accessibilityLabel="Next day" disabled={date >= todayISO()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={20} color={p.text} />
          </Press>
        </View>
      </View>
    </ModalScreen>
  );
}
