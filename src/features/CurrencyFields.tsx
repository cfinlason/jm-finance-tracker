import React from 'react';
import { View } from 'react-native';
import { useStore } from '../data/store';
import { CURRENCIES, CURRENCY_LIST, CurrencyCode } from '../data/format';
import { shortDate } from '../data/dates';
import { Chip, Field, Text } from '../ui/primitives';

/**
 * Pick the currency an amount is held in. For anything other than the base currency, shows the exchange-rate
 * the user maintains ("1 CAD = 112.50 JMD"). Rates are entered by hand so the app stays fully offline.
 */
export function CurrencyFields({ value, onChange, rate, onRate, label = 'Currency' }: { value: string; onChange: (c: string) => void; rate: string; onRate: (r: string) => void; label?: string }) {
  const base = useStore((s) => s.settings.currency);
  const saved = useStore((s) => s.settings.rates[value]);
  const foreign = value !== base;
  const stale = saved ? (Date.now() - new Date(saved.updated).getTime()) / 86400000 > 30 : false;
  return (
    <View style={{ gap: 10 }}>
      <Text variant="overline" tone="muted">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[CURRENCIES[base as CurrencyCode] ?? CURRENCIES.USD, ...CURRENCY_LIST.filter((c) => c.code !== base)].map((c) => (
          <Chip key={c.code} label={c.code} selected={value === c.code} onPress={() => onChange(c.code)} />
        ))}
      </View>
      {foreign && (
        <View style={{ gap: 6 }}>
          <Field
            label={`Exchange rate`}
            prefix={`1 ${value} =`}
            suffix={base}
            value={rate}
            onChangeText={(t) => onRate(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Text variant="caption" tone={stale ? 'warn' : 'muted'}>
            {saved ? `Last set ${shortDate(saved.updated)}${stale ? ' — over a month old, check today’s rate' : ''}. ` : ''}Used to convert this to {base} for totals and payoff plans.
          </Text>
        </View>
      )}
    </View>
  );
}
