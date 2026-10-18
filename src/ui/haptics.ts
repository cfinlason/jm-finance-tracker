import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../data/store';

const on = () => useStore.getState().settings.haptics;
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web' || !on()) return; // browsers have no haptics (navigator.vibrate just logs errors)
  fn().catch(() => undefined);
};

export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
