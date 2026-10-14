import React from 'react';
import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { timeLabel } from '../data/dates';
import { Press, Text } from './primitives';

function Nudge({ onPress, kind, label }: { onPress: () => void; kind: 'minus' | 'plus'; label: string }) {
  const p = useTheme();
  const I = kind === 'minus' ? Minus : Plus;
  return (
    <Press onPress={onPress} haptics="select" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <I size={20} color={p.text} />
    </Press>
  );
}

/** Time picker built from steppers: hours in 1h steps, minutes in 5-minute steps. No native picker dependency. */
export function TimeStepper({ hour, minute, onChange }: { hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  const p = useTheme();
  const setH = (d: number) => onChange((hour + d + 24) % 24, minute);
  const setM = (d: number) => {
    const total = (hour * 60 + minute + d + 1440) % 1440;
    onChange(Math.floor(total / 60), total % 60);
  };
  return (
    <View style={{ backgroundColor: p.surface, borderRadius: radius.lg, padding: space.lg, gap: space.lg, alignItems: 'center' }}>
      <Text variant="hero" style={{ fontSize: 46 }}>{timeLabel(hour, minute)}</Text>
      <View style={{ flexDirection: 'row', gap: space.xxl }}>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Text variant="overline" tone="muted">Hour</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Nudge kind="minus" label="Earlier hour" onPress={() => setH(-1)} />
            <Nudge kind="plus" label="Later hour" onPress={() => setH(1)} />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Text variant="overline" tone="muted">Minutes</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Nudge kind="minus" label="Earlier by five minutes" onPress={() => setM(-5)} />
            <Nudge kind="plus" label="Later by five minutes" onPress={() => setM(5)} />
          </View>
        </View>
      </View>
    </View>
  );
}
