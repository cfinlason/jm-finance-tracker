import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Copy, Crown, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { Alert } from '../ui/alert';
import { Badge, Button, Card, Field, IconTile, Press, Text } from '../ui/primitives';
import { haptic } from '../ui/haptics';
import { useAuth } from '../data/auth';
import { useHousehold } from '../data/household';
import { createInvite, joinHousehold, leaveHousehold, removeMember } from '../services/cloudSync';

async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

/** Share one budget with family: invite by code, join with a code, see who's in, leave or remove. */
export function FamilyCard() {
  const p = useTheme();
  const me = useAuth((s) => s.user?.id);
  const { members } = useHousehold();
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'invite' | 'join' | 'leave' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const mine = members.find((m) => m.user_id === me);
  const isOwner = mine?.role === 'owner';
  const shared = members.length > 1;

  const invite = async () => {
    setError(null);
    setNote(null);
    setBusy('invite');
    const res = await createInvite();
    setBusy(null);
    if (res.error) return setError(res.error);
    setCode(res.code);
    haptic.success();
  };

  const join = () => {
    setError(null);
    setNote(null);
    if (joinCode.trim().length < 6) return setError('Enter the 8-character code from the person who invited you.');
    Alert.alert('Join this household?', 'You’ll see and edit their shared budget. The budget currently on your account is replaced by theirs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        style: 'destructive',
        onPress: async () => {
          setBusy('join');
          const res = await joinHousehold(joinCode);
          setBusy(null);
          if (res.error) return setError(res.error);
          setJoinCode('');
          setNote('You’re in. This is now your shared budget.');
          haptic.success();
        },
      },
    ]);
  };

  const leave = () =>
    Alert.alert('Leave this household?', 'You’ll keep a private copy of the budget as it is now. The others keep the shared one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy('leave');
          const res = await leaveHousehold();
          setBusy(null);
          if (res.error) setError(res.error);
          else setNote('You left. You now have your own private copy.');
        },
      },
    ]);

  const remove = (id: string, email: string | null) =>
    Alert.alert(`Remove ${email ?? 'this person'}?`, 'They keep a private copy of the budget as it is now, and lose access to the shared one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const res = await removeMember(id);
          if (res.error) setError(res.error);
        },
      },
    ]);

  return (
    <View style={{ gap: space.md }}>
      <Text variant="title">Family</Text>
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile><Users size={20} color={p.accentStrong} /></IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{shared ? `Shared budget · ${members.length} people` : 'Just you for now'}</Text>
            <Text variant="caption" tone="muted">{shared ? 'Everyone here sees and edits the same budget, receipts and debts.' : 'Invite your partner or family to manage one budget together.'}</Text>
          </View>
        </View>

        {members.length > 0 && (
          <View style={{ gap: space.sm }}>
            {members.map((m) => (
              <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text variant="callout" numberOfLines={1} style={{ flex: 1 }}>{m.email ?? 'Member'}{m.user_id === me ? ' (you)' : ''}</Text>
                {m.role === 'owner' ? <Badge label="OWNER" /> : null}
                {isOwner && m.user_id !== me ? (
                  <Press onPress={() => remove(m.user_id, m.email)} accessibilityLabel={`Remove ${m.email ?? 'member'}`} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.sunken, alignItems: 'center', justifyContent: 'center' }}>
                    <UserMinus size={16} color={p.textMuted} />
                  </Press>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {code ? (
          <View style={{ gap: space.sm, backgroundColor: p.accentSoft, borderRadius: 16, padding: space.lg, alignItems: 'center' }}>
            <Text variant="overline" tone="muted">Invite code · works once, for 7 days</Text>
            <Text variant="display" style={{ letterSpacing: 4 }} selectable>{code}</Text>
            <Text variant="caption" tone="muted" align="center">They create their own account, then enter this under Settings → Family → Join with a code.</Text>
            <Button title="Copy invite" small variant="secondary" icon={<Copy size={16} color={p.accentStrong} />} onPress={async () => { if (await copyText(`Join my budget on Allot. Create an account, then enter this code under Settings → Family: ${code}`)) setNote('Invite copied.'); }} />
          </View>
        ) : null}

        <Button title={code ? 'Make another code' : 'Invite someone'} small onPress={() => void invite()} loading={busy === 'invite'} icon={<UserPlus size={16} color={p.onAccent} />} />

        <View style={{ gap: space.sm }}>
          <Field label="Have a code?" value={joinCode} onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="8-character code" autoCapitalize="characters" autoCorrect={false} />
          <Button title="Join with a code" small variant="secondary" onPress={join} loading={busy === 'join'} disabled={joinCode.length < 6} />
        </View>

        {shared ? <Button title="Leave this household" small variant="ghost" onPress={leave} loading={busy === 'leave'} /> : null}
        {isOwner && shared ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Crown size={14} color={p.textFaint} /><Text variant="caption" tone="faint">You’re the owner, so you can remove people.</Text></View> : null}
        {error ? <Text variant="callout" tone="danger">{error}</Text> : null}
        {note ? <Text variant="callout" tone="accent">{note}</Text> : null}
      </Card>
    </View>
  );
}
