import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Per-weight imports keep unused font files out of the app bundle.
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { useStore } from '../src/data/store';
import { currentMonth } from '../src/data/dates';
import { CelebrationHost, ScreenSkeleton } from '../src/ui/feedback';
import { collectBills, syncNotifications } from '../src/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Root() {
  const p = useTheme();
  const onboarded = useStore((s) => s.onboarded);
  const hydrated = useStore((s) => s.hydrated);
  const reminders = useStore((s) => s.settings.reminders);
  const billReminders = useStore((s) => s.settings.billReminders);
  const budget = useStore((s) => s.budgets[currentMonth()]);

  // Keep scheduled notifications in lockstep with settings and the current month's bills.
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    void syncNotifications(reminders, collectBills(budget), billReminders);
  }, [hydrated, onboarded, reminders, billReminders, budget]);

  // Make sure the current month always has a plan (carried forward from the last one).
  useEffect(() => {
    if (hydrated && onboarded) useStore.getState().ensureBudget(currentMonth());
  }, [hydrated, onboarded]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: 80 }}>
        <ScreenSkeleton />
      </View>
    );
  }

  const modal = { presentation: 'modal' as const, animation: 'slide_from_bottom' as const, gestureEnabled: true };
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style={p.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="add" options={modal} />
          <Stack.Screen name="paywall" options={{ ...modal, gestureEnabled: false }} />
          <Stack.Screen name="item" options={modal} />
          <Stack.Screen name="group" options={modal} />
          <Stack.Screen name="income" options={modal} />
          <Stack.Screen name="fund-edit" options={modal} />
          <Stack.Screen name="debt-edit" options={modal} />
          <Stack.Screen name="net-edit" options={modal} />
          <Stack.Screen name="reminder-edit" options={modal} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="funds" />
          <Stack.Screen name="bills" />
          <Stack.Screen name="paycheck" />
          <Stack.Screen name="debt" />
          <Stack.Screen name="networth" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="article" />
          <Stack.Screen name="legal" />
        </Stack.Protected>
      </Stack>
      <CelebrationHost />
    </View>
  );
}

export default function Layout() {
  const [loaded] = useFonts({ Fraunces_500Medium_Italic, Fraunces_600SemiBold, Fraunces_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (loaded && hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, hydrated]);
  // Fallback: never leave the user on the splash if hydration somehow stalls.
  useEffect(() => {
    const t = setTimeout(() => useStore.getState().setHydrated(), 2500);
    return () => clearTimeout(t);
  }, []);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
