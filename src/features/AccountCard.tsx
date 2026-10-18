import React from 'react';
import { View } from 'react-native';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { Alert } from '../ui/alert';
import { Badge, Button, Card, IconTile, Text } from '../ui/primitives';
import { useAuth } from '../data/auth';
import { signOutAndWipe, syncNow, useSync } from '../services/cloudSync';

function ago(ms: number | null): string {
  if (!ms) return 'not yet';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

/** Who is signed in, whether the budget is saved to the account, and sign out. */
export function AccountCard() {
  const p = useTheme();
  const user = useAuth((s) => s.user);
  const { status, lastSynced, message } = useSync();
  const offline = status === 'offline' || status === 'error';
  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'This clears the budget from this device. Everything stays safe in your account — sign in again to bring it back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOutAndWipe() },
    ]);
  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">Account</Text>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile>{offline ? <CloudOff size={20} color={p.warn} /> : <Cloud size={20} color={p.accentStrong} />}</IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>{user?.email ?? 'Signed in'}</Text>
            <Text variant="caption" tone="muted">
              {status === 'syncing' ? 'Saving to your account…' : offline ? 'Offline — changes saved on this device' : `Saved to your account · ${ago(lastSynced)}`}
            </Text>
          </View>
          <Badge label={status === 'syncing' ? 'SYNCING' : offline ? 'OFFLINE' : 'SYNCED'} tone={offline ? 'warn' : 'accent'} />
        </View>
        {message ? <Text variant="callout" tone={offline ? 'warn' : 'muted'}>{message}</Text> : null}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Sync now" small variant="secondary" style={{ flex: 1 }} onPress={() => void syncNow()} icon={<RefreshCw size={16} color={p.accentStrong} />} />
          <Button title="Sign out" small variant="ghost" style={{ flex: 1 }} onPress={confirmSignOut} icon={<LogOut size={16} color={p.textMuted} />} />
        </View>
      </Card>
    </View>
  );
}
