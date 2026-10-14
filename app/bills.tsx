import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Badge, Button, Card, IconTile, Press, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { EmptyState } from '../src/ui/feedback';
import { ModalScreen, Reveal } from '../src/ui/layout';
import { useStore } from '../src/data/store';
import { addMonths, currentMonth, DOW, daysInMonth, fromISO, monthLabel, ordinal, todayISO } from '../src/data/dates';
import { moneyAuto } from '../src/data/format';
import { billsForMonth, sum } from '../src/data/selectors';
import { haptic } from '../src/ui/haptics';

export default function Bills() {
  const p = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const { budgets, billsPaid, togglePaid } = useStore();
  const bills = useMemo(() => billsForMonth(budgets[month], month, billsPaid), [budgets, month, billsPaid]);
  const [picked, setPicked] = useState<number | null>(null);

  const first = fromISO(`${month}-01`).getDay();
  const days = daysInMonth(month);
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<number, typeof bills>();
  bills.forEach((b) => {
    const d = Number(b.date.slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  });
  const today = todayISO();
  const shown = picked ? bills.filter((b) => Number(b.date.slice(8)) === picked) : bills;
  const totalDue = sum(bills.filter((b) => !b.paid).map((b) => b.item.planned));
  const overdue = bills.filter((b) => b.overdue).length;

  return (
    <ModalScreen back title="Bills">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => { setMonth(addMonths(month, -1)); setPicked(null); }} accessibilityLabel="Previous month" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={p.text} /></Press>
        <Text variant="title">{monthLabel(month)}</Text>
        <Press onPress={() => { setMonth(addMonths(month, 1)); setPicked(null); }} accessibilityLabel="Next month" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={p.text} /></Press>
      </View>

      {bills.length === 0 ? (
        <EmptyState icon={<CalendarDays size={38} color={p.accent} />} title="No bills with due dates" body="Open any budget line and set a due day. It shows up here, and you can get a reminder the day before." action="Back to budget" onAction={() => router.back()} />
      ) : (
        <>
          <Reveal>
            <Card level={2} style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View><Text variant="overline" tone="muted">Still to pay</Text><Text variant="moneyLg">{moneyAuto(totalDue)}</Text></View>
                {overdue > 0 ? <Badge label={`${overdue} OVERDUE`} tone="danger" /> : <Badge label="ON TRACK" />}
              </View>
              <View style={{ flexDirection: 'row' }}>
                {DOW.map((d) => <Text key={d} variant="caption" tone="faint" align="center" style={{ flex: 1 }}>{d.slice(0, 1)}</Text>)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((c, i) => {
                  const list = c ? byDay.get(c) : undefined;
                  const isToday = c && `${month}-${String(c).padStart(2, '0')}` === today;
                  const sel = picked === c;
                  const anyOver = list?.some((b) => b.overdue);
                  const allPaid = list?.every((b) => b.paid);
                  return (
                    <View key={i} style={{ width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                      {c ? (
                        <Press onPress={() => { haptic.select(); setPicked(sel ? null : c); }} haptics="none" scaleTo={0.9} accessibilityLabel={`${monthLabel(month)} ${c}${list ? `, ${list.length} bill${list.length > 1 ? 's' : ''}` : ''}`} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? p.accent : isToday ? p.accentSoft : 'transparent' }}>
                          <Text variant="callout" style={{ color: sel ? p.onAccent : p.text, fontFamily: list ? 'Inter_700Bold' : 'Inter_500Medium' }}>{c}</Text>
                          {list && <View style={{ position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: sel ? p.onAccent : anyOver ? p.danger : allPaid ? p.textFaint : p.accent }} />}
                        </Press>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Card>
          </Reveal>
          {picked ? <Button title="Show all bills" variant="ghost" small onPress={() => setPicked(null)} /> : null}
          {shown.map((b, i) => (
            <Reveal key={b.item.id} index={i + 1}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Press onPress={() => router.push({ pathname: '/item', params: { id: b.item.id, month } })} scaleTo={0.985} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <IconTile tone={b.overdue ? 'expense' : 'accent'}><Icon name={b.group.icon} color={b.overdue ? p.expense : p.accentStrong} size={20} /></IconTile>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{b.item.name}</Text>
                    <Text variant="caption" tone={b.overdue ? 'danger' : 'muted'}>
                      {b.paid ? 'Paid' : b.overdue ? `${Math.abs(b.daysAway)} day${Math.abs(b.daysAway) === 1 ? '' : 's'} overdue` : b.daysAway === 0 ? 'Due today' : b.daysAway < 0 ? 'Past due date' : `Due on the ${ordinal(Number(b.date.slice(8)))} · in ${b.daysAway} day${b.daysAway === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <Text variant="money" tone={b.paid ? 'faint' : 'text'}>{moneyAuto(b.item.planned)}</Text>
                </Press>
                <Press onPress={() => { togglePaid(month, b.item.id); haptic.success(); }} haptics="none" accessibilityLabel={b.paid ? 'Mark unpaid' : 'Mark paid'} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: b.paid ? p.accent : p.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={18} color={b.paid ? p.onAccent : p.textFaint} strokeWidth={3} />
                </Press>
              </Card>
            </Reveal>
          ))}
        </>
      )}
      <View style={{ height: 1, borderRadius: radius.sm }} />
    </ModalScreen>
  );
}
