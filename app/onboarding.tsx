import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, {
  FadeInDown, SlideInRight, SlideOutLeft, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Check, ChevronLeft, Coins, ShieldCheck, WifiOff } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, shadow, space } from '../src/theme/tokens';
import { Button, Card, Chip, Field, IconTile, Press, Text } from '../src/ui/primitives';
import { Icon } from '../src/ui/Icon';
import { Ring } from '../src/ui/charts';
import { TimeStepper } from '../src/ui/TimeStepper';
import { GOAL_OPTIONS, TEMPLATES, TemplateId, buildStarter } from '../src/data/templates';
import { Goal, Reminder } from '../src/data/types';
import { useStore } from '../src/data/store';
import { FEATURES } from '../src/config';
import { currentMonth } from '../src/data/dates';
import { CURRENCIES, CURRENCY_LIST, CurrencyCode, money, parseAmount, setCurrency as setActiveCurrency, sym } from '../src/data/format';
import { requestPermission } from '../src/services/notifications';
import { joinHousehold } from '../src/services/cloudSync';
import { haptic } from '../src/ui/haptics';

const STEPS = 6;

function Float({ children, delay = 0, amp = 8 }: { children: React.ReactNode; delay?: number; amp?: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-amp, { duration: 2200 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(amp, { duration: 2200 + delay, easing: Easing.inOut(Easing.sin) })), -1, true);
  }, [y, amp, delay]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

/** Someone invited you to their shared budget? Enter the code and skip setup. */
function JoinWithCode() {
  const p = useTheme();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setError(null);
    setBusy(true);
    const res = await joinHousehold(code);
    setBusy(false);
    if (res.error) setError(res.error);
  };
  if (!open) {
    return (
      <Press onPress={() => setOpen(true)} hitSlop={10} style={{ alignSelf: 'center', paddingVertical: space.sm }}>
        <Text variant="callout" tone="accent">Joining a family budget? Use an invite code</Text>
      </Press>
    );
  }
  return (
    <View style={{ gap: space.sm }}>
      <Field label="Invite code" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="8-character code" autoCapitalize="characters" autoCorrect={false} />
      {error ? <Text variant="callout" tone="danger">{error}</Text> : null}
      <Button title="Join the shared budget" variant="secondary" small onPress={() => void go()} loading={busy} disabled={code.length < 6} />
    </View>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  const p = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 300, height: 330 }}>
          <Float amp={6}>
            <Card level={3} style={{ position: 'absolute', top: 0, left: 8, right: 8, padding: space.xl, gap: space.md }}>
              <Text variant="overline" tone="muted">Left to budget</Text>
              <Text variant="moneyHero" style={{ color: p.accent }}>$0.00</Text>
              <Text variant="callout" tone="muted">Every dollar has a job.</Text>
            </Card>
          </Float>
          <View style={{ position: 'absolute', top: 150, left: 0 }}>
            <Float delay={400} amp={9}>
              <Card level={2} style={{ width: 190, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
                <IconTile><Icon name="cart" color={p.accentStrong} size={20} /></IconTile>
                <View><Text variant="callout">Groceries</Text><Text variant="caption" tone="muted">$318 of $450</Text></View>
              </Card>
            </Float>
          </View>
          <View style={{ position: 'absolute', top: 232, right: 0 }}>
            <Float delay={800} amp={7}>
              <Card level={2} style={{ width: 200, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
                <IconTile tone="info"><Icon name="plane" color={p.info} size={20} /></IconTile>
                <View><Text variant="callout">Trip fund</Text><Text variant="caption" tone="muted">$1,240 saved</Text></View>
              </Card>
            </Float>
          </View>
        </View>
      </View>
      <Animated.View entering={FadeInDown.delay(150).springify()} style={{ gap: space.md, paddingHorizontal: space.xl }}>
        <Text variant="hero" align="center">Give every dollar a job.</Text>
        <Text variant="body" tone="muted" align="center">A calm, private budget that lives entirely on your phone. No sign-up. No bank passwords. No ads.</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg, marginVertical: space.sm }}>
          {[[ShieldCheck, 'Private'], [WifiOff, 'Offline'], [Coins, 'Free to start']].map(([I, label]) => {
            const C = I as typeof Coins;
            return (
              <View key={label as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <C size={16} color={p.accent} />
                <Text variant="caption" tone="muted">{label as string}</Text>
              </View>
            );
          })}
        </View>
        <Button title="Build my budget" onPress={onNext} />
        <JoinWithCode />
      </Animated.View>
    </View>
  );
}

function Title({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: space.sm, marginBottom: space.xl }}>
      <Text variant="display">{title}</Text>
      <Text variant="body" tone="muted">{body}</Text>
    </View>
  );
}

export default function Onboarding() {
  const p = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const complete = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [income, setIncome] = useState('4000');
  const pickCurrency = (c: CurrencyCode) => {
    // Swap the sample income only if the user hasn't typed their own number.
    if (income === String(CURRENCIES[currency].sampleIncome)) setIncome(String(CURRENCIES[c].sampleIncome));
    setCurrencyState(c);
    setActiveCurrency(c); // so every money() on these screens already shows the chosen symbol
  };
  const [payDay, setPayDay] = useState('1');
  const [template, setTemplate] = useState<TemplateId>('balanced');
  const [time, setTime] = useState({ h: 20, m: 0 });
  const [remindOn, setRemindOn] = useState(true);
  const [permNote, setPermNote] = useState<string | null>(null);

  const amount = parseAmount(income);
  const incomeError = amount <= 0 ? 'Enter your monthly take-home pay' : amount > 10_000_000 ? 'That looks too large' : null;
  const preview = amount > 0 ? buildStarter(currentMonth(), amount, template, 'Paycheck', 1, CURRENCIES[currency].step) : null;

  const next = () => {
    haptic.tap();
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    let granted = false;
    if (remindOn) {
      const res = await requestPermission();
      granted = res === 'granted';
    }
    const reminders: Reminder[] = [{ id: 'rem_evening', label: 'Log today’s spending', hour: time.h, minute: time.m, enabled: remindOn && granted }];
    complete({ name: name.trim(), goals, monthlyIncome: amount, template, payDay: Math.min(31, Math.max(1, parseInt(payDay, 10) || 1)), reminders, currency });
    haptic.success();
    if (FEATURES.paywall) setTimeout(() => router.push({ pathname: '/paywall', params: { from: 'onboarding' } }), 450);
  };

  const canContinue = step === 1 ? goals.length > 0 : step === 2 ? !incomeError : true;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <LinearGradient colors={[p.accentSoft, p.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, height: 44, gap: space.md }}>
          {step > 0 ? (
            <Press onPress={back} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={22} color={p.text} />
            </Press>
          ) : <View style={{ width: 40 }} />}
          <View style={{ flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i <= step ? p.accent : p.line }} />
            ))}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View key={step} entering={SlideInRight.springify().damping(20).stiffness(160)} exiting={SlideOutLeft.duration(160)} style={{ flex: 1 }}>
          {step === 0 && <Welcome onNext={next} />}

          {step === 1 && (
            <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }} showsVerticalScrollIndicator={false}>
              <Title title="What brings you here?" body="Pick everything that fits. We’ll tune your plan and tips around it." />
              {GOAL_OPTIONS.map((g, i) => {
                const on = goals.includes(g.id);
                return (
                  <Animated.View key={g.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Press haptics="select" onPress={() => setGoals((cur) => (on ? cur.filter((x) => x !== g.id) : [...cur, g.id]))} style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: p.surface, borderWidth: 2, borderColor: on ? p.accent : 'transparent' }, shadow(p, 1)]}>
                      <IconTile><Icon name={g.icon} color={p.accentStrong} /></IconTile>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">{g.title}</Text>
                        <Text variant="callout" tone="muted">{g.blurb}</Text>
                      </View>
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: on ? p.accent : p.sunken, alignItems: 'center', justifyContent: 'center' }}>
                        {on ? <Check size={16} color={p.onAccent} strokeWidth={3} /> : null}
                      </View>
                    </Press>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}

          {step === 2 && (
            <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Title title="Let’s start with income" body="What lands in your account each month after taxes? A rough number is fine — you can change it any time." />
              <Field label="First name (optional)" value={name} onChangeText={setName} placeholder="Alex" autoCapitalize="words" returnKeyType="next" />
              <View style={{ gap: 10 }}>
                <Text variant="overline" tone="muted">Currency</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CURRENCY_LIST.map((c) => <Chip key={c.code} label={`${c.code} ${c.symbol}`} selected={currency === c.code} onPress={() => pickCurrency(c.code)} />)}
                </View>
              </View>
              <Field label="Monthly take-home" prefix={sym()} value={income} onChangeText={(t) => setIncome(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder={String(CURRENCIES[currency].sampleIncome)} error={incomeError} />
              <Field label="Usual payday (day of month)" value={payDay} onChangeText={(t) => setPayDay(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="1" suffix="of the month" />
              <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <ShieldCheck size={22} color={p.accent} />
                <Text variant="callout" tone="muted" style={{ flex: 1 }}>Everything stays on this device. Allot never asks for a bank login.</Text>
              </Card>
            </ScrollView>
          )}

          {step === 3 && (
            <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }} showsVerticalScrollIndicator={false}>
              <Title title="Pick a starting plan" body={`We’ll split ${money(amount, { cents: false })} into lines that add up to zero. Everything is editable.`} />
              {TEMPLATES.map((t, i) => {
                const on = template === t.id;
                const pv = amount > 0 ? buildStarter(currentMonth(), amount, t.id, 'Paycheck', 1, CURRENCIES[currency].step) : null;
                const lines = pv?.budget.groups.reduce((a, g) => a + g.items.length, 0) ?? 0;
                return (
                  <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Press haptics="select" onPress={() => setTemplate(t.id)} style={[{ padding: space.lg, borderRadius: radius.lg, backgroundColor: p.surface, borderWidth: 2, borderColor: on ? p.accent : 'transparent', gap: space.sm }, shadow(p, 1)]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                        <IconTile><Icon name={t.icon} color={p.accentStrong} /></IconTile>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyStrong">{t.title}</Text>
                          <Text variant="callout" tone="muted">{t.blurb}</Text>
                        </View>
                      </View>
                      {pv && lines > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {pv.budget.groups.map((g) => (
                            <View key={g.id} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: p.sunken, justifyContent: 'center' }}>
                              <Text variant="caption" tone="muted">{g.name} · {money(g.items.reduce((a, x) => a + x.planned, 0), { cents: false })}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Press>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}

          {step === 4 && (
            <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} showsVerticalScrollIndicator={false}>
              <Title title="A gentle daily nudge" body="Logging takes seconds, and a reminder makes it a habit. Choose when — you can add more later in Settings." />
              <View style={{ alignItems: 'center', marginBottom: space.sm }}>
                <View style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={38} color={p.accent} />
                </View>
              </View>
              <TimeStepper hour={time.h} minute={time.m} onChange={(h, m) => setTime({ h, m })} />
              <Press onPress={() => setRemindOn((v) => !v)} haptics="select" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, backgroundColor: p.surface, borderRadius: radius.lg }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: remindOn ? p.accent : p.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  {remindOn ? <Check size={16} color={p.onAccent} strokeWidth={3} /> : null}
                </View>
                <Text variant="bodyStrong" style={{ flex: 1 }}>Remind me every day</Text>
              </Press>
              {permNote ? <Text variant="callout" tone="warn">{permNote}</Text> : null}
              <Text variant="caption" tone="faint" align="center">Reminders are scheduled on your device. Nothing is sent anywhere.</Text>
            </ScrollView>
          )}

          {step === 5 && (
            <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              <Animated.View entering={FadeInDown.springify()} style={{ marginTop: space.xl }}>
                <Ring progress={1} size={168} stroke={14}>
                  <View style={{ alignItems: 'center' }}>
                    <Check size={44} color={p.accent} strokeWidth={3} />
                  </View>
                </Ring>
              </Animated.View>
              <Text variant="display" align="center">{name.trim() ? `You’re set, ${name.trim()}.` : 'You’re all set.'}</Text>
              <Text variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
                Your {TEMPLATES.find((t) => t.id === template)?.title.toLowerCase()} plan is ready: {preview?.budget.groups.reduce((a, g) => a + g.items.length, 0) ?? 0} lines, {preview?.funds.length ?? 0} funds, every one of your {money(amount, { cents: false })} given a job.
              </Text>
              <Card style={{ alignSelf: 'stretch', gap: space.sm }}>
                <Text variant="overline" tone="muted">Quick tips</Text>
                <Text variant="callout">• Tap the green + to log spending in seconds.</Text>
                <Text variant="callout">• Funds keep savings separate from your month.</Text>
                <Text variant="callout">• The Learn tab has short guides for every step.</Text>
              </Card>
            </ScrollView>
          )}
        </Animated.View>

        {step > 0 && (
          <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, gap: space.sm }}>
            {step < STEPS - 1 ? (
              <Button title="Continue" onPress={next} disabled={!canContinue} />
            ) : (
              <Button title="Open my budget" onPress={finish} />
            )}
            {step === 4 && <Button title="Not now" variant="ghost" small onPress={() => { setRemindOn(false); setPermNote(null); next(); }} />}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
