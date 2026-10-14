import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';

const DOCS = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['The short version', 'Allot keeps everything on your device. There is no account, no server, and no analytics. We cannot see your budget because we never receive it.'],
      ['What we store', 'Your budget, transactions, funds, debts, net worth entries and settings are saved in your phone’s local storage. Deleting the app, or using “Erase all data” in Settings, removes them for good.'],
      ['Notifications', 'Reminders are scheduled locally on your device. No push service is involved and nothing is sent to us.'],
      ['Purchases', 'Allot Plus is offered as an auto-renewing subscription handled by the App Store. In this build the purchase flow is a demonstration and no payment information is collected.'],
      ['Export', 'If you export a CSV, it goes wherever you choose to share it. Allot does not transmit it anywhere itself.'],
      ['Questions', 'If you have any questions about privacy, contact the developer through the App Store listing.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      ['Using Allot', 'Allot is a personal budgeting tool. It provides organisation and education, not financial, tax or legal advice. Decisions about your money are yours.'],
      ['Subscriptions', 'Allot Plus renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID account settings. The free trial converts to a paid plan unless cancelled before it ends.'],
      ['Your data', 'You are responsible for backing up anything you can’t lose. Because data lives only on your device, deleting the app or erasing your data cannot be undone.'],
      ['Availability', 'We aim to keep Allot reliable and offline-friendly but provide it as-is, without warranties of any kind.'],
    ],
  },
} as const;

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const d = doc === 'terms' ? DOCS.terms : DOCS.privacy;
  return (
    <ModalScreen back title={d.title}>
      {d.sections.map(([h, b]) => (
        <React.Fragment key={h}>
          <Text variant="title">{h}</Text>
          <Text variant="body" tone="muted" style={{ lineHeight: 25 }}>{b}</Text>
        </React.Fragment>
      ))}
    </ModalScreen>
  );
}
