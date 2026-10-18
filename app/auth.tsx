import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cloud, MailCheck, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Button, Card, Field, Press, Segmented, Text } from '../src/ui/primitives';
import { haptic } from '../src/ui/haptics';
import { useAuth } from '../src/data/auth';

type Mode = 'signin' | 'signup';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const validate = (needPassword = true): string | null => {
    if (!EMAIL.test(email.trim())) return 'Enter a valid email address.';
    if (needPassword && password.length < 8) return 'Use a password with at least 8 characters.';
    return null;
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    const v = validate();
    if (v) return setError(v);
    setBusy(true);
    if (mode === 'signin') {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
        haptic.warn();
      } else haptic.success();
    } else {
      const res = await signUp(email, password);
      if (res.error) {
        setError(res.error);
        haptic.warn();
      } else if (res.needsConfirm) {
        setConfirmSent(true);
        haptic.success();
      } else haptic.success();
    }
    setBusy(false);
  };

  const forgot = async () => {
    setError(null);
    const v = validate(false);
    if (v) return setError('Enter your email above first, then tap “Forgot password”.');
    setBusy(true);
    const err = await resetPassword(email);
    setBusy(false);
    if (err) setError(err);
    else setNotice('If that email has an account, a reset link is on its way.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <LinearGradient colors={[p.accentSoft, p.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl, gap: space.xl }}>
          <Animated.View entering={FadeInDown.springify()} style={{ gap: space.md }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Cloud size={30} color={p.onAccent} />
            </View>
            <Text variant="display">{confirmSent ? 'Check your email' : mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>
            <Text variant="body" tone="muted">
              {confirmSent
                ? `We sent a confirmation link to ${email.trim()}. Open it, then come back and sign in.`
                : 'Your budget, receipts and debts are saved to your account, so they follow you to any device.'}
            </Text>
          </Animated.View>

          {confirmSent ? (
            <Animated.View entering={FadeInDown.delay(80).springify()} style={{ gap: space.md }}>
              <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <MailCheck size={24} color={p.accent} />
                <Text variant="callout" tone="muted" style={{ flex: 1 }}>Didn’t get it? Check spam, or go back and try again with the right address.</Text>
              </Card>
              <Button title="I’ve confirmed — sign in" onPress={() => { setConfirmSent(false); setMode('signin'); setPassword(''); }} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(80).springify()} style={{ gap: space.lg }}>
              <Segmented<Mode> value={mode} onChange={(m) => { setMode(m); setError(null); setNotice(null); }} options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]} />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
              <Field label="Password" value={password} onChangeText={setPassword} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'} returnKeyType="go" onSubmitEditing={() => void submit()} />
              {error ? <Text variant="callout" tone="danger">{error}</Text> : null}
              {notice ? <Text variant="callout" tone="accent">{notice}</Text> : null}
              <Button title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={() => void submit()} loading={busy} />
              {mode === 'signin' ? (
                <Press onPress={() => void forgot()} hitSlop={10} style={{ alignSelf: 'center' }}>
                  <Text variant="callout" tone="accent">Forgot password?</Text>
                </Press>
              ) : null}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: space.sm, paddingTop: space.md }}>
            {[
              [ShieldCheck, 'Private to you. Your data is locked to your account.'],
              [Smartphone, 'Same budget on your phone, tablet and laptop.'],
              [Cloud, 'Keeps working offline and syncs when you’re back.'],
            ].map(([I, t]) => {
              const Icon = I as typeof Cloud;
              return (
                <View key={t as string} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md }}>
                  <Icon size={18} color={p.accent} />
                  <Text variant="callout" tone="muted" style={{ flex: 1 }}>{t as string}</Text>
                </View>
              );
            })}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
