import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, PressableProps, StyleProp, Switch, Text as RNText, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { font, Palette, radius, shadow, space, spring, type, TextVariant } from '../theme/tokens';
import { haptic } from './haptics';

export type Tone = 'text' | 'muted' | 'faint' | 'accent' | 'income' | 'expense' | 'warn' | 'danger' | 'onAccent' | 'info';

export const toneColor = (p: Palette, tone: Tone) =>
  ({ text: p.text, muted: p.textMuted, faint: p.textFaint, accent: p.accentStrong, income: p.income, expense: p.expense, warn: p.warn, danger: p.danger, onAccent: p.onAccent, info: p.info })[tone];

export function Text({
  variant = 'body', tone = 'text', style, children, align, numberOfLines, ...rest
}: {
  variant?: TextVariant; tone?: Tone; align?: TextStyle['textAlign']; style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number;
} & Omit<React.ComponentProps<typeof RNText>, 'style'>) {
  const p = useTheme();
  const isMoney = variant.startsWith('money');
  return (
    <RNText
      {...rest}
      numberOfLines={numberOfLines}
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[type[variant], { color: toneColor(p, tone) }, isMoney && { fontVariant: ['tabular-nums'] }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </RNText>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Every tappable surface compresses on press with a spring and a light haptic. */
export function Press({
  children, onPress, style, scaleTo = 0.97, haptics = 'tap', disabled, ...rest
}: Omit<PressableProps, 'style' | 'children'> & { children: React.ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: 'tap' | 'press' | 'select' | 'none' }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={() => (s.value = withSpring(scaleTo, spring.press))}
      onPressOut={() => (s.value = withSpring(1, spring.press))}
      onPress={(e) => {
        if (haptics !== 'none') haptic[haptics]();
        onPress?.(e);
      }}
      style={[a, style, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({
  title, onPress, variant = 'primary', icon, loading, disabled, style, small,
}: {
  title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: React.ReactNode; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const p = useTheme();
  const h = small ? 44 : 56;
  const base: ViewStyle = { height: h, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl };
  const label = (c: string) => <RNText style={{ fontFamily: font.semibold, fontSize: small ? 15 : 17, color: c, letterSpacing: -0.2 }}>{title}</RNText>;
  if (variant === 'primary') {
    return (
      <Press onPress={onPress} disabled={disabled || loading} haptics="press" style={[shadow(p, 2), { borderRadius: radius.pill, shadowColor: p.accent }, style]}>
        <LinearGradient colors={[p.accent, p.accentStrong === p.accent ? p.accent : p.mode === 'dark' ? '#22B88C' : '#0A8764']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={base}>
          {loading ? <ActivityIndicator color={p.onAccent} /> : (<>{icon}{label(p.onAccent)}</>)}
        </LinearGradient>
      </Press>
    );
  }
  const bg = variant === 'secondary' ? p.accentSoft : variant === 'danger' ? 'transparent' : 'transparent';
  const color = variant === 'danger' ? p.danger : variant === 'secondary' ? p.accentStrong : p.textMuted;
  return (
    <Press onPress={onPress} disabled={disabled || loading} style={[base, { backgroundColor: bg }, style]}>
      {loading ? <ActivityIndicator color={color} /> : (<>{icon}{label(color)}</>)}
    </Press>
  );
}

export function Card({ children, style, onPress, level = 1, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; level?: 1 | 2 | 3; padded?: boolean }) {
  const p = useTheme();
  const body: StyleProp<ViewStyle> = [
    { backgroundColor: p.surface, borderRadius: radius.lg, borderWidth: p.mode === 'dark' ? 1 : 0, borderColor: p.line },
    padded ? { padding: space.lg } : null,
    shadow(p, level),
    style,
  ];
  if (onPress) return <Press onPress={onPress} style={body}>{children}</Press>;
  return <View style={body}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const p = useTheme();
  return <View style={{ height: 1, backgroundColor: p.line, marginLeft: inset }} />;
}

export function IconTile({ children, tone = 'accent', size = 40 }: { children: React.ReactNode; tone?: 'accent' | 'expense' | 'info' | 'warn' | 'neutral'; size?: number }) {
  const p = useTheme();
  const bg = { accent: p.accentSoft, expense: p.mode === 'dark' ? '#3A1F18' : '#FCE6DF', info: p.mode === 'dark' ? '#18263F' : '#E3EBFA', warn: p.mode === 'dark' ? '#3A2E12' : '#FBEFD6', neutral: p.sunken }[tone];
  return <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: React.ReactNode }) {
  const p = useTheme();
  return (
    <Press onPress={onPress} haptics="select" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: selected ? p.accent : p.sunken }}>
      {icon}
      <RNText style={{ fontFamily: font.semibold, fontSize: 14, color: selected ? p.onAccent : p.textMuted }}>{label}</RNText>
    </Press>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const p = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const seg = w ? (w - 8) / options.length : 0;
  React.useEffect(() => {
    x.value = withSpring(idx * seg, spring.soft);
  }, [idx, seg, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: p.sunken, borderRadius: radius.pill, padding: 4 }}>
      {seg > 0 && <Animated.View style={[{ position: 'absolute', top: 4, left: 4, width: seg, bottom: 4, borderRadius: radius.pill, backgroundColor: p.raised }, shadow(p, 1), pill]} />}
      {options.map((o) => (
        <Press key={o.value} haptics="select" scaleTo={0.98} onPress={() => onChange(o.value)} style={{ flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <RNText style={{ fontFamily: font.semibold, fontSize: 14, color: o.value === value ? p.text : p.textMuted }}>{o.label}</RNText>
        </Press>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const p = useTheme();
  return <Switch value={value} onValueChange={(v) => { haptic.select(); onChange(v); }} trackColor={{ true: p.accent, false: p.sunken }} ios_backgroundColor={p.sunken} />;
}

export function Field({
  label, value, onChangeText, prefix, suffix, error, style, ...rest
}: { label?: string; prefix?: string; suffix?: string; error?: string | null; style?: StyleProp<ViewStyle> } & TextInputProps) {
  const p = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text variant="overline" tone="muted">{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: p.sunken, borderRadius: radius.md, paddingHorizontal: space.lg, height: 52, borderWidth: 1.5, borderColor: error ? p.danger : focus ? p.accent : 'transparent', gap: 6 }}>
        {prefix ? <RNText style={{ fontFamily: font.semibold, fontSize: 17, color: p.textMuted }}>{prefix}</RNText> : null}
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          placeholderTextColor={p.textFaint}
          selectionColor={p.accent}
          style={{ flex: 1, fontFamily: font.medium, fontSize: 17, color: p.text, paddingVertical: 0, fontVariant: rest.keyboardType === 'decimal-pad' ? ['tabular-nums'] : undefined }}
        />
        {suffix ? <RNText numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 15, color: p.textMuted, flexShrink: 0 }}>{suffix}</RNText> : null}
      </View>
      {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'warn' | 'danger' | 'neutral' | 'info' }) {
  const p = useTheme();
  const bg = { accent: p.accentSoft, warn: p.mode === 'dark' ? '#3A2E12' : '#FBEFD6', danger: p.mode === 'dark' ? '#3E1A1E' : '#FBE3E4', neutral: p.sunken, info: p.mode === 'dark' ? '#18263F' : '#E3EBFA' }[tone];
  const fg = { accent: p.accentStrong, warn: p.warn, danger: p.danger, neutral: p.textMuted, info: p.info }[tone];
  return (
    <View style={{ paddingHorizontal: 9, height: 22, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 0.4, color: fg }}>{label}</RNText>
    </View>
  );
}
