import React from 'react';
import { View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { haptic } from './haptics';
import { Press, Text } from './primitives';

/** Applies one key to an amount string, capping at two decimals and 9 digits. */
export function applyKey(cur: string, key: string): string {
  if (key === 'del') return cur.length <= 1 ? '0' : cur.slice(0, -1);
  if (key === '.') return cur.includes('.') ? cur : `${cur}.`;
  if (cur === '0' && key !== '.') return key === '0' ? '0' : key;
  const [whole, frac] = cur.split('.');
  if (frac !== undefined && frac.length >= 2) return cur;
  if (frac === undefined && whole.length >= 9) return cur;
  return cur + key;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export function AmountPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const p = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {KEYS.map((k) => (
        <Press
          key={k}
          haptics="none"
          scaleTo={0.92}
          accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
          onPress={() => {
            haptic.tap();
            onChange(applyKey(value, k));
          }}
          style={{ width: '31.8%', height: 56, borderRadius: radius.md, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          {k === 'del' ? <Delete size={24} color={p.textMuted} /> : <Text variant="headline" style={{ fontSize: 26, lineHeight: 30, fontFamily: 'Inter_500Medium' }}>{k}</Text>}
        </Press>
      ))}
    </View>
  );
}
