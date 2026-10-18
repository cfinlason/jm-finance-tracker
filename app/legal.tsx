import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../src/ui/primitives';
import { ModalScreen } from '../src/ui/layout';
import { FEATURES } from '../src/config';

const DOCS = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['The short version', 'You sign in with an email and password. Your budget, debts and receipt photos are saved to your account so they follow you across devices. They are locked to your login with row-level security, so no other user can read them. There are no ads and no analytics.'],
      ['What we store', 'Your email address, plus your budget, transactions, funds, debts, net worth entries, settings and receipt photos. A copy is also cached on each device you use so the app works offline. “Erase all data” in Settings removes your data from the device and your account. Signing out clears the device.'],
      ['Family sharing (optional)', 'You can invite other people into your household with a single-use code. Everyone in a household can see and edit its shared budget, debts and receipts, and can see each other’s email address. Leaving a household gives you a private copy of the budget as it is at that moment.'],
      ['Notifications', 'Reminders are scheduled locally on your device. No push service is involved and nothing is sent to us.'],
      ['Purchases', 'Allot Plus is offered as an auto-renewing subscription handled by the App Store. In this build the purchase flow is a demonstration and no payment information is collected.'],
      ['AI debt coach (optional)', 'If you tap “Map my fastest way out” in the debt roadmap, your debt balances, interest rates, minimum payments and the extra amount you chose are sent through our server to Claude, an AI model from Anthropic, to write a payoff plan. Debt names are replaced with neutral labels before sending. Only signed-in users can use these features. Nothing is sent unless you tap the button, and the server does not store the request.'],
      ['Receipt scanning (optional)', 'If you scan a receipt, the photo is sent through our server to Claude to read the items and total, then discarded. Nothing is stored on the server. The original photo and the scanned items are saved in your private account storage (and cached on your device), and you can delete any receipt at any time. Erasing all data removes them too.'],
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
  const raw = doc === 'terms' ? DOCS.terms : DOCS.privacy;
  const d = { ...raw, sections: raw.sections.filter(([h]) => FEATURES.paywall || (h !== 'Purchases' && h !== 'Subscriptions')) };
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
