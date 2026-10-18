import React, { useState } from 'react';
import { goBack } from '../src/ui/nav';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { radius, space } from '../src/theme/tokens';
import { Button, Field, Press, Text } from '../src/ui/primitives';
import { ICON_CHOICES, Icon } from '../src/ui/Icon';
import { ModalScreen } from '../src/ui/layout';
import { haptic } from '../src/ui/haptics';
import { useStore } from '../src/data/store';
import { currentMonth } from '../src/data/dates';
import type { IconKey } from '../src/data/types';

export default function GroupScreen() {
  const p = useTheme();
  const router = useRouter();
  const { id, month: m } = useLocalSearchParams<{ id?: string; month?: string }>();
  const month = m ?? currentMonth();
  const { budgets, addGroup, updateGroup, removeGroup, deleteWithUndo } = useStore();
  const group = budgets[month]?.groups.find((g) => g.id === id);
  const [name, setName] = useState(group?.name ?? '');
  const [icon, setIcon] = useState<IconKey>(group?.icon ?? 'sparkles');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setError('Give this group a name.');
    if (group) updateGroup(month, group.id, { name: name.trim(), icon });
    else addGroup(month, name.trim(), icon);
    haptic.success();
    goBack(router);
  };
  const del = () =>
    Alert.alert(`Delete “${group?.name}”?`, `This also removes its ${group?.items.length ?? 0} line(s) from ${month}. Past transactions stay in your history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (group) deleteWithUndo(`Deleted ${group.name}`, () => removeGroup(month, group.id)); goBack(router); } },
    ]);

  return (
    <ModalScreen
      title={group ? 'Edit group' : 'New group'}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? <Text variant="callout" tone="danger" align="center">{error}</Text> : null}
          <Button title={group ? 'Save changes' : 'Add group'} onPress={save} />
          {group ? <Button title="Delete group" variant="danger" small onPress={del} icon={<Trash size={16} color={p.danger} />} /> : null}
        </View>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Housing" autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted">Icon</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ICON_CHOICES.map((k) => (
            <Press key={k} haptics="select" onPress={() => setIcon(k)} accessibilityLabel={k} style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: icon === k ? p.accent : p.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={k} size={22} color={icon === k ? p.onAccent : p.textMuted} />
            </Press>
          ))}
        </View>
      </View>
    </ModalScreen>
  );
}
