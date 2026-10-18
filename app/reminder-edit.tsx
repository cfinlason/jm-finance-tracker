import React, { useState } from 'react';
import { goBack } from '../src/ui/nav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Button, Field } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { TimeStepper } from '../src/ui/TimeStepper';
import { useStore } from '../src/data/store';
import { requestPermission } from '../src/services/notifications';
import { uid } from '../src/data/format';

export default function ReminderEdit() {
  const p = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { settings, setReminders } = useStore();
  const existing = settings.reminders.find((r) => r.id === id);
  const [label, setLabel] = useState(existing?.label ?? 'Log today’s spending');
  const [t, setT] = useState({ h: existing?.hour ?? 12, m: existing?.minute ?? 0 });

  const save = async () => {
    await requestPermission();
    const next = { id: existing?.id ?? uid('rem'), label: label.trim() || 'Log today’s spending', hour: t.h, minute: t.m, enabled: true };
    setReminders(existing ? settings.reminders.map((r) => (r.id === existing.id ? next : r)) : [...settings.reminders, next]);
    goBack(router);
  };

  return (
    <ModalScreen
      title={existing ? 'Edit reminder' : 'New reminder'}
      footer={
        <>
          <Button title="Save reminder" onPress={() => void save()} />
          {existing && settings.reminders.length > 0 ? (
            <Button title="Delete reminder" variant="danger" small onPress={() => { setReminders(settings.reminders.filter((r) => r.id !== existing.id)); goBack(router); }} icon={<Trash size={16} color={p.danger} />} />
          ) : null}
        </>
      }
    >
      <TimeStepper hour={t.h} minute={t.m} onChange={(h, m) => setT({ h, m })} />
      <Field label="Message" value={label} onChangeText={setLabel} placeholder="Log today’s spending" />
    </ModalScreen>
  );
}
