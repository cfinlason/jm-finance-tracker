import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Sparkles, ShieldCheck, WifiOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { Badge, Button, Card, IconTile, Text } from '../ui/primitives';
import { Skeleton } from '../ui/feedback';
import { haptic } from '../ui/haptics';
import { useStore } from '../data/store';
import type { Debt } from '../data/types';
import { askDebtCoach, CoachError, CoachPlan, COACH_URL, localDebtPlan } from '../services/debtCoach';

type Status = { s: 'idle' } | { s: 'loading' } | { s: 'done'; plan: CoachPlan; offline?: string } | { s: 'error'; kind: CoachError['kind']; msg: string };

/** AI plan on top of the simulator's exact numbers. Opt-in, and says exactly what leaves the phone. */
export function DebtCoachCard({ debts, extra, onPickMethod }: { debts: Debt[]; extra: number; onPickMethod: (m: 'snowball' | 'avalanche') => void }) {
  const p = useTheme();
  const consent = useStore((s) => s.settings.coachConsent);
  const currency = useStore((s) => s.settings.currency);
  const setSettings = useStore((s) => s.setSettings);
  const [st, setSt] = useState<Status>({ s: 'idle' });

  // Any change to the debts or the extra amount makes an existing plan stale.
  const fingerprint = JSON.stringify([debts.map((d) => [d.id, d.balance, d.apr, d.minPayment]), extra]);
  useEffect(() => setSt({ s: 'idle' }), [fingerprint]);

  const run = async () => {
    if (!consent) setSettings({ coachConsent: true });
    setSt({ s: 'loading' });
    try {
      const plan = await askDebtCoach(debts, extra, currency);
      setSt({ s: 'done', plan });
      onPickMethod(plan.recommendation);
      haptic.success();
    } catch (e) {
      // Never dead-end: fall back to a plan built from the same simulator numbers, and say why.
      const err = e instanceof CoachError ? e : new CoachError('failed', 'Something went wrong.');
      const plan = localDebtPlan(debts, extra);
      setSt({ s: 'done', plan, offline: err.message });
      onPickMethod(plan.recommendation);
      haptic.tap();
    }
  };

  return (
    <Card level={2} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconTile><Sparkles size={20} color={p.accentStrong} /></IconTile>
        <View style={{ flex: 1 }}>
          <Text variant="title">Ask the debt coach</Text>
          <Text variant="caption" tone="muted">A written plan built on the numbers above</Text>
        </View>
        <Badge label="AI" tone="info" />
      </View>

      {st.s === 'idle' && (
        <>
          {!consent && (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <ShieldCheck size={18} color={p.accent} style={{ marginTop: 2 }} />
              <Text variant="callout" tone="muted" style={{ flex: 1 }}>
                Tapping below sends your balances, interest rates and minimum payments to Claude, through our server, to write the plan. Debt names are never sent. Nothing else leaves your phone.
              </Text>
            </View>
          )}
          <Button title={consent ? 'Map my fastest way out' : 'Allow and map my way out'} onPress={() => void run()} icon={<Sparkles size={18} color={p.onAccent} />} />
          {!COACH_URL && <Text variant="caption" tone="faint" align="center">The coach server isn’t connected in this build.</Text>}
        </>
      )}

      {st.s === 'loading' && (
        <View style={{ gap: space.sm }} accessibilityLabel="Writing your plan">
          <Text variant="callout" tone="muted">Comparing snowball and avalanche for your debts…</Text>
          <Skeleton height={18} width="90%" />
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={14} width="86%" />
        </View>
      )}

      {st.s === 'error' && (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <WifiOff size={18} color={p.warn} />
            <Text variant="callout" tone="warn" style={{ flex: 1 }}>{st.msg}</Text>
          </View>
          {st.kind !== 'not_configured' && <Button title="Try again" variant="secondary" small onPress={() => void run()} />}
        </View>
      )}

      {st.s === 'done' && (
        <View style={{ gap: space.md }}>
          {st.offline ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', backgroundColor: p.mode === 'dark' ? '#3A2E12' : '#FBEFD6', borderRadius: 14, padding: space.md }}>
              <WifiOff size={18} color={p.warn} style={{ marginTop: 1 }} />
              <Text variant="callout" style={{ flex: 1 }}>AI coach unavailable: {st.offline} Here’s a plan built from your numbers instead.</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Badge label={st.plan.recommendation === 'snowball' ? 'SNOWBALL' : 'AVALANCHE'} />
            <Text variant="caption" tone="muted">recommended</Text>
          </View>
          <Text variant="headline">{st.plan.headline}</Text>
          <Text variant="body" tone="muted" style={{ lineHeight: 24 }}>{st.plan.why}</Text>
          <View style={{ gap: space.sm }}>
            {st.plan.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text variant="caption" style={{ color: p.onAccent, fontFamily: 'Inter_700Bold' }}>{i + 1}</Text>
                </View>
                <Text variant="callout" style={{ flex: 1, lineHeight: 21 }}>{s}</Text>
              </View>
            ))}
          </View>
          {st.plan.watchOut.length > 0 && (
            <View style={{ backgroundColor: p.mode === 'dark' ? '#3A2E12' : '#FBEFD6', borderRadius: 14, padding: space.md, gap: 4 }}>
              <Text variant="overline" tone="warn">Watch out</Text>
              {st.plan.watchOut.map((w, i) => <Text key={i} variant="callout">{w}</Text>)}
            </View>
          )}
          <Text variant="callout" tone="accent">{st.plan.encouragement}</Text>
          <Text variant="caption" tone="faint">{st.offline ? 'Rule-based plan from the figures above' : 'AI-written guidance based on the figures above'}, not financial advice. Check the numbers before you act.</Text>
          <Button title={st.offline ? 'Try the AI coach again' : 'Ask again'} variant="ghost" small onPress={() => void run()} />
        </View>
      )}
    </Card>
  );
}
