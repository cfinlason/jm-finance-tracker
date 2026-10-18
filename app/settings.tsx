import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Crown, Download, FileText, Plus, ShieldCheck, Smartphone, Trash, Vibrate } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { space } from '../src/theme/tokens';
import { Banner } from '../src/ui/feedback';
import { Button, Field, IconTile, Press, Segmented, Text, Toggle } from '../src/ui/primitives';
import { Group, ModalScreen, Reveal, Row } from '../src/ui/layout';
import { useIsPremium, useStore } from '../src/data/store';
import { FEATURES } from '../src/config';
import { timeLabel } from '../src/data/dates';
import { getPermission, PermissionState, requestPermission } from '../src/services/notifications';
import { buildCsv } from '../src/services/export';
import { CurrencySettings } from '../src/features/CurrencySettings';
import { deleteReceiptImage } from '../src/services/receiptImages';
import type { ThemePref } from '../src/data/types';

export default function Settings() {
  const p = useTheme();
  const router = useRouter();
  const { settings, setSettings, setReminders, plan, resetAll, txs, budgets, funds } = useStore();
  const isPremium = useIsPremium();
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [name, setName] = useState(settings.name);

  useEffect(() => {
    void getPermission().then(setPerm);
  }, []);

  const toggleReminder = async (id: string, on: boolean) => {
    if (on && perm !== 'granted') {
      const r = await requestPermission();
      setPerm(r);
      if (r !== 'granted') return;
    }
    setReminders(settings.reminders.map((r) => (r.id === id ? { ...r, enabled: on } : r)));
  };

  const exportCsv = async () => {
    if (!isPremium) return router.push({ pathname: '/paywall', params: { feature: 'export' } });
    try {
      await Share.share({ title: 'Allot transactions', message: buildCsv({ txs, budgets, funds }) });
    } catch {
      Alert.alert('Couldn’t export', 'Something went wrong while preparing your file. Please try again.');
    }
  };

  const confirmReset = () =>
    Alert.alert('Erase everything?', 'This permanently deletes your budget, transactions, funds and settings from this device. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase all data', style: 'destructive', onPress: () => { Object.keys(useStore.getState().receipts).forEach((rid) => void deleteReceiptImage(rid)); resetAll(); } },
    ]);

  return (
    <ModalScreen back title="Settings">
      <Reveal>
        <Field label="Your name" value={name} onChangeText={setName} onEndEditing={() => setSettings({ name: name.trim() })} placeholder="Optional" autoCapitalize="words" />
      </Reveal>

      {FEATURES.paywall && (
      <Reveal index={1}>
        <Press onPress={() => router.push('/paywall')} scaleTo={0.985}>
          <Group style={{ marginHorizontal: 0 }}>
            <Row
              icon={<IconTile><Crown size={20} color={p.accentStrong} /></IconTile>}
              title={isPremium ? 'Allot Plus is active' : 'Upgrade to Allot Plus'}
              subtitle={isPremium ? `${plan === 'weekly' ? 'Weekly' : 'Yearly'} plan · manage` : '7 days free · trends, planner, roadmap'}
              right={<ChevronRight size={18} color={p.textFaint} />}
              last
            />
          </Group>
        </Press>
      </Reveal>
      )}

      <View style={{ gap: space.md }}>
        <Text variant="title">Reminders</Text>
        {Platform.OS === 'web' && (
          <Banner tone="warn" icon={<Bell size={20} color={p.warn} />} title="Reminders need the iOS app" body="Browsers can’t schedule daily reminders. Everything else works the same here." />
        )}
        {Platform.OS !== 'web' && perm === 'denied' && (
          <Banner tone="warn" icon={<Bell size={20} color={p.warn} />} title="Notifications are off" body="Allow them in iOS Settings to get your daily reminders." onPress={() => void Linking.openSettings()} />
        )}
        <Group style={{ marginHorizontal: 0 }}>
          {settings.reminders.map((r) => (
            <Row
              key={r.id}
              icon={<IconTile><Bell size={20} color={p.accentStrong} /></IconTile>}
              title={timeLabel(r.hour, r.minute)}
              subtitle={r.label}
              onPress={() => router.push({ pathname: '/reminder-edit', params: { id: r.id } })}
              right={<Toggle value={r.enabled} onChange={(v) => void toggleReminder(r.id, v)} />}
            />
          ))}
          <Row icon={<IconTile tone="neutral"><Plus size={20} color={p.text} /></IconTile>} title="Add a reminder time" onPress={() => router.push('/reminder-edit')} last />
        </Group>
        <Group style={{ marginHorizontal: 0 }}>
          <Row icon={<IconTile><FileText size={20} color={p.accentStrong} /></IconTile>} title="Bill due-date alerts" subtitle="The day before, at 9 AM" right={<Toggle value={settings.billReminders} onChange={(v) => setSettings({ billReminders: v })} />} last />
        </Group>
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="title">AI access code</Text>
        <Field
          label="Access code"
          value={settings.accessCode}
          onChangeText={(t) => setSettings({ accessCode: t })}
          placeholder="Only needed if your server asks for one"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text variant="caption" tone="muted">Protects the AI coaches and receipt scanner on your own server. Leave blank if you didn’t set one.</Text>
      </View>

      <CurrencySettings />

      <View style={{ gap: space.md }}>
        <Text variant="title">Appearance & feel</Text>
        <Segmented<ThemePref> value={settings.theme} onChange={(v) => setSettings({ theme: v })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <Group style={{ marginHorizontal: 0 }}>
          <Row icon={<IconTile><Vibrate size={20} color={p.accentStrong} /></IconTile>} title="Haptic feedback" right={<Toggle value={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />} last />
        </Group>
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="title">Your data</Text>
        <Group style={{ marginHorizontal: 0 }}>
          <Row icon={<IconTile><Smartphone size={20} color={p.accentStrong} /></IconTile>} title="Stored on this device only" subtitle="No account, no cloud, works offline" />
          <Row icon={<IconTile><Download size={20} color={p.accentStrong} /></IconTile>} title="Export transactions (CSV)" subtitle="Share a spreadsheet-ready file" onPress={() => void exportCsv()} right={<ChevronRight size={18} color={p.textFaint} />} last />
        </Group>
      </View>
      <Button title="Erase all data" variant="danger" onPress={confirmReset} icon={<Trash size={18} color={p.danger} />} />

      <View style={{ gap: space.md }}>
        <Text variant="title">About</Text>
        <Group style={{ marginHorizontal: 0 }}>
          <Row icon={<IconTile><ShieldCheck size={20} color={p.accentStrong} /></IconTile>} title="Privacy policy" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} right={<ChevronRight size={18} color={p.textFaint} />} />
          <Row icon={<IconTile><FileText size={20} color={p.accentStrong} /></IconTile>} title="Terms of use" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} right={<ChevronRight size={18} color={p.textFaint} />} last />
        </Group>
        <Text variant="caption" tone="faint" align="center">Allot 1.0 · Made to be calm</Text>
      </View>
    </ModalScreen>
  );
}
