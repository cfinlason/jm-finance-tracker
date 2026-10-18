import React, { useMemo, useState } from 'react';
import { goBack } from '../src/ui/nav';
import { View } from 'react-native';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PiggyBank, Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Button, Card, Chip, Field, IconTile, Press, Text, Toggle } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { Group, ModalScreen, Row } from '../src/ui/layout';
import { Banner } from '../src/ui/feedback';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { currentMonth, prettyDate } from '../src/data/dates';
import { money, moneyAuto, parseAmount, sym } from '../src/data/format';
import { fundBalances, monthlyNeed, summarizeMonth } from '../src/data/selectors';

/** Put the leftover (or take out the overage) on a line with one tap. */
function AssignView({ month }: { month: string }) {
  const p = useTheme();
  const router = useRouter();
  const { budgets, txs, setPlanned } = useStore();
  const budget = budgets[month];
  const left = useMemo(() => summarizeMonth(txs, budget, month).leftToBudget, [txs, budget, month]);
  const apply = (itemId: string, planned: number) => {
    setPlanned(month, itemId, Math.max(0, planned + left));
    haptic.success();
    goBack(router);
  };
  return (
    <ModalScreen title={left >= 0 ? 'Assign what’s left' : 'Trim your plan'}>
      <Banner tone={left >= 0 ? 'accent' : 'warn'} title={left >= 0 ? `${money(left)} to give a job` : `${money(-left)} over-planned`} body={left >= 0 ? 'Tap a line and the whole amount is added to it.' : 'Tap a line to take the overage out of it.'} />
      {(budget?.groups ?? []).map((g) => (
        <View key={g.id} style={{ gap: space.sm }}>
          <Text variant="overline" tone="muted">{g.name}</Text>
          <Group style={{ marginHorizontal: 0 }}>
            {g.items.map((i, n) => (
              <Row key={i.id} icon={<IconTile><Icon name={g.icon} color={p.accentStrong} size={20} /></IconTile>} title={i.name} subtitle={`Planned ${moneyAuto(i.planned)}`} right={<Text variant="callout" tone="accent">{left >= 0 ? `+${moneyAuto(left)}` : `−${moneyAuto(Math.min(-left, i.planned))}`}</Text>} onPress={() => apply(i.id, i.planned)} last={n === g.items.length - 1} />
            ))}
          </Group>
        </View>
      ))}
    </ModalScreen>
  );
}

function ItemForm({ month, id, groupId }: { month: string; id?: string; groupId?: string }) {
  const p = useTheme();
  const router = useRouter();
  const { budgets, txs, funds, addItem, updateItem, removeItem, addFund, updateFund, moveItem, deleteWithUndo } = useStore();
  const found = useMemo(() => {
    for (const g of budgets[month]?.groups ?? []) for (const i of g.items) if (i.id === id) return { item: i, group: g };
    return null;
  }, [budgets, month, id]);
  const item = found?.item;
  const gid = found?.group.id ?? groupId ?? budgets[month]?.groups[0]?.id;
  const [name, setName] = useState(item?.name ?? '');
  const [planned, setPlannedStr] = useState(item ? String(item.planned) : '');
  const [due, setDue] = useState(item?.dueDay ? String(item.dueDay) : '');
  const [isFund, setIsFund] = useState(!!item?.fundId);
  const [targetGroup, setTargetGroup] = useState<string | undefined>(gid);
  const [error, setError] = useState<string | null>(null);
  const fund = item?.fundId ? funds.find((f) => f.id === item.fundId) : undefined;
  const bal = useMemo(() => fundBalances({ funds, txs, budgets }), [funds, txs, budgets]);
  const recent = txs.filter((t) => t.splits.some((s) => s.id === id)).slice(0, 5);
  const need = fund ? monthlyNeed(fund, bal[fund.id] ?? 0) : null;

  const save = () => {
    const amt = parseAmount(planned);
    const dueDay = due ? Math.min(31, Math.max(1, parseInt(due, 10) || 0)) : undefined;
    if (!name.trim()) return setError('Give this line a name.');
    if (!gid) return setError('Create a group first.');
    if (due && !dueDay) return setError('Due day must be between 1 and 31.');
    let fundId = item?.fundId;
    if (isFund && !fundId) fundId = addFund({ name: name.trim(), icon: 'piggy', goal: Math.max(amt * 6, 500), opening: 0 });
    if (!isFund && fundId) fundId = undefined;
    if (fund && isFund && fund.name !== name.trim()) updateFund(fund.id, { name: name.trim() });
    if (item) {
      updateItem(month, item.id, { name: name.trim(), planned: amt, dueDay, fundId });
      if (targetGroup && targetGroup !== found?.group.id) moveItem(month, item.id, targetGroup);
    }
    else addItem(month, gid, { name: name.trim(), planned: amt, dueDay, fundId });
    haptic.success();
    goBack(router);
  };

  const del = () => {
    if (!item) return;
    // No confirm dialog: Undo is faster and safer. Past transactions stay in history as uncategorized.
    deleteWithUndo(`Deleted ${item.name}`, () => removeItem(month, item.id));
    goBack(router);
  };

  return (
    <ModalScreen
      title={item ? 'Edit line' : 'New line'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={item ? 'Save changes' : 'Add line'} onPress={save} />
          {item ? <Button title="Delete line" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Groceries" autoCapitalize="words" />
      <Field label="Planned this month" prefix={sym()} value={planned} onChangeText={(t) => setPlannedStr(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
      {item && (budgets[month]?.groups.length ?? 0) > 1 ? (
        <View style={{ gap: 8 }}>
          <Text variant="overline" tone="muted">Group</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {budgets[month]?.groups.map((g) => <Chip key={g.id} label={g.name} selected={targetGroup === g.id} onPress={() => setTargetGroup(g.id)} />)}
          </View>
        </View>
      ) : null}
      <Field label="Due day (for bills)" value={due} onChangeText={(t) => setDue(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="Optional, e.g. 15" suffix="of the month" />
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile tone="info"><PiggyBank size={20} color={p.info} /></IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">This line is a fund</Text>
            <Text variant="caption" tone="muted">Savings roll over, and spending from the fund never counts against the month.</Text>
          </View>
          <Toggle value={isFund} onChange={setIsFund} />
        </View>
        {fund && need ? <Text variant="callout" tone="accent">To hit {moneyAuto(fund.goal)} by your date, set aside {money(need.perMonth)} a month.</Text> : null}
        {fund ? (
          <Press onPress={() => router.push({ pathname: '/fund-edit', params: { id: fund.id } })}>
            <Text variant="callout" tone="accent">Edit goal and date →</Text>
          </Press>
        ) : null}
      </Card>
      {recent.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text variant="title">Recent</Text>
          <Group style={{ marginHorizontal: 0 }}>
            {recent.map((t, n) => (
              <Row key={t.id} title={t.merchant || 'Expense'} subtitle={prettyDate(t.date)} right={<Text variant="money">{moneyAuto(t.splits.find((s) => s.id === id)?.amount ?? t.amount)}</Text>} onPress={() => router.push({ pathname: '/add', params: { id: t.id } })} last={n === recent.length - 1} />
            ))}
          </Group>
        </View>
      )}
    </ModalScreen>
  );
}

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id?: string; groupId?: string; month?: string; assign?: string }>();
  const month = params.month ?? currentMonth();
  if (params.assign) return <AssignView month={month} />;
  return <ItemForm key={`${month}:${params.id ?? params.groupId ?? 'new'}`} month={month} id={params.id} groupId={params.groupId} />;
}
