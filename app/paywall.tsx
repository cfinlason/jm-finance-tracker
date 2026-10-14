import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellRing, Check, ChartColumn, Crown, FileDown, Flame, Landmark, Wallet, X } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, shadow, space } from '../src/theme/tokens';
import { Badge, Button, Press, Text } from '../src/ui/primitives';
import { useCelebration } from '../src/ui/feedback';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import type { PlanId } from '../src/data/types';

const FEATURES = [
  { id: 'reports', icon: ChartColumn, title: '12-month trends', body: 'Income vs spending, merchants and category history.' },
  { id: 'paycheck', icon: Wallet, title: 'Paycheck planner', body: 'See which bills each paycheck covers, before it lands.' },
  { id: 'debt', icon: Flame, title: 'Debt roadmap', body: 'Snowball or avalanche, with your payoff date.' },
  { id: 'networth', icon: Landmark, title: 'Net worth tracker', body: 'Watch assets minus debts climb over time.' },
  { id: 'export', icon: FileDown, title: 'Export to CSV', body: 'Your data, any time, in a spreadsheet.' },
];

const PLANS: Record<PlanId, { title: string; price: string; per: string; sub: string; cta: string; fine: string }> = {
  yearly: { title: 'Yearly', price: '$29.99', per: 'per year', sub: 'Just $2.50 a month', cta: 'Start 7-day free trial', fine: '7 days free, then $29.99 per year.' },
  weekly: { title: 'Weekly', price: '$2.99', per: 'per week', sub: 'Billed every week', cta: 'Subscribe weekly', fine: '$2.99 per week.' },
};

export default function Paywall() {
  const p = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { feature, from } = useLocalSearchParams<{ feature?: string; from?: string }>();
  const { isPremium, plan: ownedPlan, purchase, restore, cancelPremium } = useStore();
  const fire = useCelebration((s) => s.fire);
  const [selected, setSelected] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showClose, setShowClose] = useState(from !== 'onboarding');

  useEffect(() => {
    const t = setTimeout(() => setShowClose(true), 900);
    return () => clearTimeout(t);
  }, []);

  const shimmer = useSharedValue(-1);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1);
  }, [shimmer]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: shimmer.value * 320 }, { rotate: '18deg' }] }));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const buy = () => {
    setBusy('buy');
    setNote(null);
    // Mocked purchase: a short, believable pause, then the local flag flips.
    setTimeout(() => {
      purchase(selected);
      setBusy(null);
      close();
      setTimeout(() => fire({ kind: 'premium', title: 'Welcome to Plus', subtitle: 'Everything is unlocked. Enjoy your 7-day free trial.' }), 420);
    }, 1300);
  };

  const doRestore = () => {
    setBusy('restore');
    setNote(null);
    setTimeout(() => {
      const ok = restore();
      setBusy(null);
      if (ok) {
        close();
        setTimeout(() => fire({ kind: 'premium', title: 'Purchases restored', subtitle: 'Allot Plus is active again.' }), 420);
      } else setNote('No previous purchases were found for this device.');
    }, 900);
  };

  if (isPremium) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, padding: space.xl, paddingTop: insets.top + space.xl, justifyContent: 'center', gap: space.lg }}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}><Crown size={42} color={p.onAccent} /></View>
          <Text variant="display" align="center">You’re on Allot Plus</Text>
          <Text variant="body" tone="muted" align="center">{ownedPlan === 'weekly' ? 'Weekly plan' : 'Yearly plan'} · every feature unlocked.</Text>
        </View>
        <Button title="Done" onPress={close} />
        <Button title="Cancel subscription (demo)" variant="ghost" small onPress={() => { cancelPremium(); haptic.warn(); }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[p.heroFrom, p.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + space.xl, paddingBottom: space.xl, paddingHorizontal: space.xl, alignItems: 'center', gap: space.md, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -80, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ position: 'absolute', bottom: -70, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <Animated.View entering={FadeInDown.springify().damping(12)} style={{ width: 72, height: 72, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow(p, 3) }}>
            <Crown size={36} color={p.heroTo} />
            <Animated.View style={[{ position: 'absolute', width: 26, height: 160, backgroundColor: 'rgba(255,255,255,0.7)' }, shine]} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(80).springify()} style={{ alignItems: 'center', gap: 6 }}>
            <Text variant="overline" style={{ color: 'rgba(255,255,255,0.8)' }}>Allot Plus</Text>
            <Text variant="display" align="center" style={{ color: '#FFFFFF', fontSize: 34, lineHeight: 38 }}>See the whole picture.</Text>
            <Text variant="body" align="center" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 300 }}>Budgeting, funds, bills and reminders stay free forever. Plus adds the planning tools.</Text>
          </Animated.View>
        </LinearGradient>

        <View style={{ padding: space.lg, paddingTop: space.md, gap: space.xs }}>
          {FEATURES.map((f, i) => {
            const hot = feature === f.id;
            const I = f.icon;
            return (
              <Animated.View key={f.id} entering={FadeInDown.delay(160 + i * 55).springify()} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.sm, borderRadius: radius.lg, backgroundColor: hot ? p.accentSoft : 'transparent' }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' }}><I size={22} color={p.accentStrong} /></View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{f.title}</Text>
                  <Text variant="callout" tone="muted">{f.body}</Text>
                </View>
                <Check size={18} color={p.accent} strokeWidth={3} />
              </Animated.View>
            );
          })}
          <Animated.View entering={FadeIn.delay(520)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' }}><BellRing size={22} color={p.accentStrong} /></View>
            <Text variant="callout" tone="muted" style={{ flex: 1 }}>No bank logins, no ads, no data leaving your phone. Ever.</Text>
          </Animated.View>
        </View>
      </ScrollView>

      {showClose && (
        <Animated.View entering={FadeIn.duration(400)} style={{ position: 'absolute', top: insets.top + space.sm, left: space.lg }}>
          <Press onPress={close} accessibilityLabel="Close" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#FFFFFF" />
          </Press>
        </Animated.View>
      )}

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: p.bg, paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: insets.bottom + space.md, gap: space.md, borderTopWidth: 1, borderTopColor: p.line, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, shadow(p, 3)]}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          {(['yearly', 'weekly'] as PlanId[]).map((id) => {
            const pl = PLANS[id];
            const on = selected === id;
            return (
              <Press key={id} haptics="select" onPress={() => setSelected(id)} accessibilityLabel={`${pl.title} plan, ${pl.price} ${pl.per}`} accessibilityState={{ selected: on }} style={{ flex: 1, padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? p.accent : p.line, backgroundColor: on ? p.accentSoft : p.surface, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 22 }}>
                  <Text variant="callout" tone="muted">{pl.title}</Text>
                  {id === 'yearly' ? <Badge label="SAVE 81%" /> : null}
                </View>
                <Text variant="moneyLg" style={{ fontSize: 24 }}>{pl.price}</Text>
                <Text variant="caption" tone="muted">{pl.per} · {pl.sub}</Text>
                {id === 'yearly' ? <Text variant="caption" tone="accent" style={{ fontFamily: 'Inter_700Bold' }}>7-DAY FREE TRIAL</Text> : <View style={{ height: 15 }} />}
              </Press>
            );
          })}
        </View>
        <Button title={PLANS[selected].cta} onPress={buy} loading={busy === 'buy'} />
        {note ? <Text variant="callout" tone="warn" align="center">{note}</Text> : null}
        <Text variant="caption" tone="faint" align="center">{PLANS[selected].fine} Cancel anytime. Demo build — no payment is actually taken.</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg }}>
          <Press onPress={doRestore} hitSlop={8}><Text variant="caption" tone="muted">{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text></Press>
          <Press onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} hitSlop={8}><Text variant="caption" tone="muted">Terms</Text></Press>
          <Press onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} hitSlop={8}><Text variant="caption" tone="muted">Privacy</Text></Press>
          {from === 'onboarding' && <Press onPress={close} hitSlop={8}><Text variant="caption" tone="muted">Maybe later</Text></Press>}
        </View>
      </View>
    </View>
  );
}
