import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { Button, Card, Chip, Field, Press, Text } from '../ui/primitives';
import { haptic } from '../ui/haptics';
import { useStore } from '../data/store';
import { CURRENCIES, CURRENCY_LIST, CurrencyCode } from '../data/format';
import { shortDate } from '../data/dates';

function RateRow({ code, base }: { code: string; base: string }) {
  const p = useTheme();
  const rate = useStore((s) => s.settings.rates[code]);
  const setRate = useStore((s) => s.setRate);
  const removeRate = useStore((s) => s.removeRate);
  const inUse = useStore((s) => s.debts.some((d) => d.currency === code) || s.netEntries.some((e) => e.currency === code));
  const [v, setV] = useState(rate ? String(rate.perUnit) : '');
  const commit = () => {
    const n = parseFloat(v);
    if (n > 0 && n !== rate?.perUnit) {
      setRate(code, n);
      haptic.success();
    }
  };
  const stale = rate ? (Date.now() - new Date(rate.updated).getTime()) / 86400000 > 30 : false;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <Field style={{ flex: 1 }} label={CURRENCIES[code as CurrencyCode]?.name ?? code} prefix={`1 ${code} =`} suffix={base} value={v} onChangeText={(t) => setV(t.replace(/[^0-9.]/g, ''))} onEndEditing={commit} onBlur={commit} keyboardType="decimal-pad" placeholder="0.00" />
        <Press
          accessibilityLabel={`Remove ${code} rate`}
          onPress={() => {
            if (inUse) return Alert.alert('Still in use', `A debt or net-worth entry is held in ${code}. Change or delete it first.`);
            removeRate(code);
          }}
          style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}
        >
          <Trash size={18} color={p.textMuted} />
        </Press>
      </View>
      {rate ? <Text variant="caption" tone={stale ? 'warn' : 'muted'}>Updated {shortDate(rate.updated)}{stale ? ' — over a month ago, worth refreshing' : ''}</Text> : null}
    </View>
  );
}

/** Base-currency picker plus the hand-entered exchange rates for any foreign debts or accounts. */
export function CurrencySettings() {
  const p = useTheme();
  const { settings, setSettings, debts, txs, budgets, netEntries } = useStore();
  const base = settings.currency;
  const codes = Array.from(new Set([...Object.keys(settings.rates), ...debts.map((d) => d.currency), ...netEntries.map((e) => e.currency)].filter((c): c is string => !!c && c !== base)));
  const [adding, setAdding] = useState<string | null>(null);
  const [addRate, setAddRate] = useState('');
  const setRate = useStore((s) => s.setRate);

  const hasData = txs.length > 0 || Object.values(budgets).some((b) => b.groups.some((g) => g.items.some((i) => i.planned > 0)));
  const choose = (code: string) => {
    if (code === base) return;
    const apply = () => {
      setSettings({ currency: code });
      haptic.success();
    };
    if (!hasData) return apply();
    Alert.alert(`Switch to ${code}?`, `This changes the symbol and formatting only. Your existing amounts keep the same numbers and are NOT converted. Enter new amounts in ${code} where needed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Use ${code}`, onPress: apply },
    ]);
  };
  const addable = CURRENCY_LIST.filter((c) => c.code !== base && !codes.includes(c.code));

  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">Currency</Text>
      <Card style={{ gap: space.md }}>
        <Text variant="callout" tone="muted">Everything in your budget is kept in one main currency.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CURRENCY_LIST.map((c) => (
            <Chip key={c.code} label={`${c.code} ${c.symbol}`} selected={base === c.code} onPress={() => choose(c.code)} />
          ))}
        </View>
      </Card>

      <Text variant="title" style={{ marginTop: space.sm }}>Exchange rates</Text>
      <Card style={{ gap: space.lg }}>
        <Text variant="callout" tone="muted">
          Owe money in another currency? Enter today’s rate and Allot converts it to {base} for your totals and payoff plan. Check the rate now and then — if it moves, update it here.
        </Text>
        {codes.map((c) => <RateRow key={c} code={c} base={base} />)}
        {codes.length === 0 && !adding ? <Text variant="callout" tone="faint">No foreign currencies yet.</Text> : null}
        {adding ? (
          <View style={{ gap: space.sm }}>
            <Field label={CURRENCIES[adding as CurrencyCode].name} prefix={`1 ${adding} =`} suffix={base} value={addRate} onChangeText={(t) => setAddRate(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Save rate" small style={{ flex: 1 }} onPress={() => { const n = parseFloat(addRate); if (n > 0) { setRate(adding, n); setAdding(null); setAddRate(''); haptic.success(); } }} />
              <Button title="Cancel" variant="ghost" small onPress={() => { setAdding(null); setAddRate(''); }} />
            </View>
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="muted">Add a rate</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {addable.map((c) => <Chip key={c.code} label={c.code} onPress={() => setAdding(c.code)} />)}
            </View>
          </View>
        )}
        <Text variant="caption" tone="faint" style={{ color: p.textFaint }}>
          Tip: converting yourself works well. Use the rate your bank or card actually gives you, since that’s what you’ll really pay.
        </Text>
      </Card>
    </View>
  );
}
