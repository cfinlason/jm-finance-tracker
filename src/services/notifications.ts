import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Budget, Reminder } from '../data/types';
import { money } from '../data/format';
import { ordinal } from '../data/dates';

// Show reminders as banners even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  try {
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return p.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

const BODIES = [
  'Two minutes now keeps the month honest. Log what you spent today.',
  'Every dollar gets a job — tell Allot where today’s went.',
  'A quick check-in keeps your streak alive.',
  'Small habit, big picture. Add today’s spending.',
];

/**
 * Rebuilds every scheduled notification from current settings:
 * one daily reminder per enabled reminder, plus a day-before nudge for each bill with a due date.
 * Safe to call repeatedly; it clears first.
 */
export async function syncNotifications(reminders: Reminder[], bills: { name: string; amount: number; dueDay: number }[], billReminders: boolean): Promise<void> {
  try {
    const perm = await getPermission();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (perm !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
    }
    let i = 0;
    for (const r of reminders.filter((x) => x.enabled)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.label, body: BODIES[i++ % BODIES.length] },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute },
      });
    }
    if (billReminders) {
      for (const b of bills.slice(0, 40)) {
        const day = Math.max(1, Math.min(28, b.dueDay - 1 || 28));
        await Notifications.scheduleNotificationAsync({
          content: { title: `${b.name} is due tomorrow`, body: `${money(b.amount)} on the ${ordinal(b.dueDay)}. Mark it paid once it clears.` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, hour: 9, minute: 0 },
        });
      }
    }
  } catch {
    // Notifications are best-effort; the app never depends on them.
  }
}

export function collectBills(budget: Budget | undefined) {
  const out: { name: string; amount: number; dueDay: number }[] = [];
  budget?.groups.forEach((g) => g.items.forEach((i) => i.dueDay && out.push({ name: i.name, amount: i.planned, dueDay: i.dueDay })));
  return out;
}
