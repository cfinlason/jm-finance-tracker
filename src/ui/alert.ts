import { Alert as NativeAlert, AlertButton, Platform } from 'react-native';

/**
 * Drop-in for React Native's Alert. react-native-web ships Alert as a no-op, which silently broke every
 * confirmation on the web build, so on web this uses the browser's own confirm/alert dialogs.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons);
    const text = message ? `${title}\n\n${message}` : title;
    const action = buttons?.find((b) => b.style !== 'cancel');
    const hasCancel = !!buttons?.some((b) => b.style === 'cancel');
    if (action && hasCancel) {
      if (window.confirm(text)) action.onPress?.();
    } else {
      window.alert(text);
      action?.onPress?.();
    }
  },
};
