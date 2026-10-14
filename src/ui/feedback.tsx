import React, { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Flame, Lock, TriangleAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { create } from 'zustand';
import { useTheme } from '../theme/ThemeProvider';
import { radius, shadow, space, spring } from '../theme/tokens';
import { Button, Card, Press, Text } from './primitives';
import { haptic } from './haptics';

// ---- Empty / error / locked states -------------------------------------------------

export function EmptyState({
  icon, title, body, action, onAction, secondary, onSecondary,
}: { icon: React.ReactNode; title: string; body: string; action?: string; onAction?: () => void; secondary?: string; onSecondary?: () => void }) {
  const p = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(320)} style={{ alignItems: 'center', paddingHorizontal: space.xxl, paddingVertical: space.huge, gap: space.md }}>
      <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm }}>{icon}</View>
      <Text variant="title" align="center">{title}</Text>
      <Text variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>{body}</Text>
      {action ? <Button title={action} onPress={onAction} small style={{ marginTop: space.md }} /> : null}
      {secondary ? <Button title={secondary} onPress={onSecondary} variant="ghost" small /> : null}
    </Animated.View>
  );
}

export function ErrorState({ title = 'Something went sideways', body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  const p = useTheme();
  return <EmptyState icon={<TriangleAlert size={38} color={p.warn} />} title={title} body={body} action={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
}

export function Skeleton({ height = 16, width = '100%', radiusPx = 8, style }: { height?: number; width?: number | `${number}%`; radiusPx?: number; style?: object }) {
  const p = useTheme();
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 750 }), withTiming(0.45, { duration: 750 })), -1);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height, width, borderRadius: radiusPx, backgroundColor: p.line }, a, style]} />;
}

export function ScreenSkeleton() {
  return (
    <View style={{ padding: space.xl, gap: space.lg }}>
      <Skeleton height={34} width="60%" radiusPx={10} />
      <Skeleton height={150} radiusPx={radius.lg} />
      <Skeleton height={70} radiusPx={radius.lg} />
      <Skeleton height={70} radiusPx={radius.lg} />
      <Skeleton height={70} radiusPx={radius.lg} />
    </View>
  );
}

/** Locked-behind-premium wrapper: shows a teaser card and a one-tap path to the paywall. */
export function LockedCard({ title, body, feature }: { title: string; body: string; feature?: string }) {
  const p = useTheme();
  const router = useRouter();
  return (
    <Card level={2} style={{ overflow: 'hidden', alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
      <LinearGradient colors={[p.accentSoft, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', ...shadow(p, 2), shadowColor: p.accent }}>
        <Lock size={28} color={p.onAccent} />
      </View>
      <Text variant="title" align="center">{title}</Text>
      <Text variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>{body}</Text>
      <Button title="Unlock Allot Plus" icon={<Crown size={18} color={p.onAccent} />} onPress={() => router.push({ pathname: '/paywall', params: feature ? { feature } : {} })} style={{ marginTop: space.sm, alignSelf: 'stretch' }} />
      <Text variant="caption" tone="faint">7-day free trial · cancel anytime</Text>
    </Card>
  );
}

export function Banner({ icon, title, body, tone = 'accent', onPress, onDismiss }: { icon?: React.ReactNode; title: string; body?: string; tone?: 'accent' | 'warn' | 'danger'; onPress?: () => void; onDismiss?: () => void }) {
  const p = useTheme();
  const bg = tone === 'accent' ? p.accentSoft : tone === 'warn' ? (p.mode === 'dark' ? '#3A2E12' : '#FBEFD6') : p.mode === 'dark' ? '#3E1A1E' : '#FBE3E4';
  const fg = tone === 'accent' ? p.accentStrong : tone === 'warn' ? p.warn : p.danger;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: bg }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ color: fg }}>{title}</Text>
        {body ? <Text variant="callout" tone="muted">{body}</Text> : null}
      </View>
      {onDismiss ? (
        <Press onPress={onDismiss} hitSlop={12}>
          <Text variant="callout" tone="muted">Dismiss</Text>
        </Press>
      ) : null}
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.985}>{inner}</Press> : inner;
}

// ---- Celebration --------------------------------------------------------------------

type CelebrationEvent = { id: number; kind: 'premium' | 'streak'; title: string; subtitle: string } | null;
export const useCelebration = create<{ event: CelebrationEvent; fire: (e: Omit<NonNullable<CelebrationEvent>, 'id'>) => void; clear: () => void }>((set) => ({
  event: null,
  fire: (e) => set({ event: { ...e, id: Date.now() } }),
  clear: () => set({ event: null }),
}));

const { width: SW, height: SH } = Dimensions.get('window');

function Particle({ i, colors }: { i: number; colors: string[] }) {
  const cfg = useMemo(() => {
    const angle = (Math.PI * 2 * i) / 42 + (i % 3) * 0.37;
    const dist = 130 + ((i * 53) % 190);
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 110, rot: ((i * 97) % 720) - 360, size: 7 + (i % 4) * 3, color: colors[i % colors.length], round: i % 3 === 0 };
  }, [i, colors]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay((i % 7) * 18, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, [t, i]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) * 4,
    transform: [{ translateX: cfg.dx * t.value }, { translateY: cfg.dy * t.value + 260 * t.value * t.value }, { rotate: `${cfg.rot * t.value}deg` }, { scale: 0.6 + 0.4 * Math.min(1, t.value * 4) }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: SW / 2 - cfg.size / 2, top: SH * 0.4, width: cfg.size, height: cfg.size * (cfg.round ? 1 : 0.5), borderRadius: cfg.round ? cfg.size : 2, backgroundColor: cfg.color }, style]} />;
}

export function CelebrationHost() {
  const p = useTheme();
  const { event, clear } = useCelebration();
  useEffect(() => {
    if (!event) return;
    haptic.success();
    const t = setTimeout(clear, 2800);
    return () => clearTimeout(t);
  }, [event, clear]);
  const colors = useMemo(() => [p.accent, p.chart[1], p.chart[2], p.chart[3], p.chart[4], '#FFFFFF'], [p]);
  if (!event) return null;
  return (
    <Animated.View key={event.id} entering={FadeIn.duration(160)} exiting={FadeOut.duration(320)} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Press onPress={clear} haptics="none" scaleTo={1} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.overlay }}>
        <View />
      </Press>
      {Array.from({ length: 42 }, (_, i) => (
        <Particle key={i} i={i} colors={colors} />
      ))}
      <Animated.View entering={ZoomIn.springify().damping(11).stiffness(150)} style={{ alignItems: 'center', gap: space.md, padding: space.xxl, borderRadius: radius.xl, backgroundColor: p.raised, marginHorizontal: space.xxl, ...shadow(p, 3) }}>
        <View style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
          {event.kind === 'premium' ? <Crown size={40} color={p.onAccent} /> : <Flame size={40} color={p.onAccent} />}
        </View>
        <Text variant="display" align="center">{event.title}</Text>
        <Text variant="body" tone="muted" align="center" style={{ maxWidth: 260 }}>{event.subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export { spring };
