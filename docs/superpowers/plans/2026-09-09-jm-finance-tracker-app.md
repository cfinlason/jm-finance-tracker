# JM Finance Tracker App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional, interactive-preview iOS personal finance tracker using React Native + Expo (Expo Go compatible), per `docs/superpowers/specs/2026-09-09-finance-tracker-design.md` and the visual system in `design.md.txt`.

**Architecture:** Expo Router (file-based nav) for screens, Zustand + AsyncStorage (`persist` middleware) for one store per domain entity, plain-TypeScript pure functions for all calculations (Safe to Spend, debt payoff, insights), a small shared component library implementing the design token system. No backend — 100% local, single-profile.

**Tech Stack:** Expo (managed workflow) + TypeScript, Expo Router, Zustand, `@react-native-async-storage/async-storage`, `@expo-google-fonts/archivo`, `lucide-react-native`, Jest (`jest-expo` preset).

## Global Constraints

- All money is JMD, formatted `J$1,234.50` (comma thousands, 2 decimals, tabular figures via `fontVariant: ['tabular-nums']`). Never use red for negative/expense amounts — plain text color; only income uses accent lime with a `+` prefix.
- Colors, spacing, radius, and typography values come from `design.md.txt` §2–§7 exactly (see Task 2 for the full token module) — never hardcode a color/spacing value in a screen file.
- Categories are never color-coded — neutral icon-on-chip treatment only, per `design.md.txt` §2.
- Every list-driven screen needs an empty state (icon + message + CTA); first-launch store hydration shows a loading state — no screen may render against un-hydrated store data.
- Destructive actions (delete account/transaction/goal/debt/recurring rule) require a confirmation alert.
- No component/E2E tests in v1 — only Jest unit tests on pure calculation logic and the cross-store transaction actions, per spec §8. Manual verification is via Expo web preview + Expo Go.
- No backend, no auth, no bank-linking — manual data entry only, single local profile.

---

## File Structure Overview

```
app/
  _layout.tsx                    Root layout: font loading, splash, modal stack config
  index.tsx                      Hydration gate + redirect to onboarding or tabs
  onboarding/
    _layout.tsx  welcome.tsx  accounts.tsx  income.tsx  recurring.tsx  goals.tsx  done.tsx
  (tabs)/
    _layout.tsx  index.tsx (Home)  transactions.tsx  insights.tsx  goals.tsx  more.tsx
  transaction/[id].tsx           Add/Edit Transaction (modal, id === 'new' for add)
  goal/[id].tsx                  Goal detail / create (id === 'new' for create)
  debt.tsx                       Debt overview + payoff projection
  debts/[id].tsx                 Add/Edit Debt
  cash-flow.tsx
  accounts/index.tsx  accounts/[id].tsx
  categories/index.tsx  categories/add.tsx
  recurring/index.tsx  recurring/[id].tsx
  notifications.tsx

src/
  theme/tokens.ts                 Colors, spacing, radius, typography constants
  types/index.ts                  All data model types
  lib/
    id.ts  money.ts  date.ts  iconMap.ts
    safeToSpend.ts  debtPayoff.ts  insights.ts
    storage.ts  transactionActions.ts
  stores/
    errorBannerStore.ts  settingsStore.ts  accountsStore.ts  categoriesStore.ts
    transactionsStore.ts  recurringStore.ts  goalsStore.ts  debtsStore.ts  useAppHydrated.ts
  components/
    Screen.tsx  Card.tsx  IconChip.tsx  CategoryIcon.tsx  ListRow.tsx  GroupedList.tsx
    Button.tsx  ProgressBar.tsx  Toggle.tsx  SegmentedControl.tsx  Alert.tsx
    StatFigure.tsx  EmptyState.tsx  LoadingState.tsx  FormField.tsx  ErrorBanner.tsx
  lib/__tests__/  (jest unit tests co-located with the lib they cover)
```

---

### Task 1: Project scaffolding & dependencies

**Files:**
- Create: `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `jest.setup.js`
- Create: `app/_layout.tsx` (placeholder, replaced fully in Task 13)

**Interfaces:**
- Produces: a runnable Expo project (`npx expo start`) with TypeScript, Expo Router, and Jest wired up, ready for every later task to add files into `app/` and `src/`.

- [ ] **Step 1: Scaffold the Expo project**

Run:
```bash
npx create-expo-app@latest . -t expo-template-blank-typescript
```
Expected: project files created in the current directory (`package.json`, `app/`, `App.tsx`, `tsconfig.json`, etc.). Since this scaffolds into a git repo, allow overwrite prompts as needed.

- [ ] **Step 2: Remove the default template's App.tsx (Expo Router replaces it)**

Run:
```bash
rm -f App.tsx
```

- [ ] **Step 3: Install runtime dependencies**

Run:
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-splash-screen expo-font react-native-safe-area-context react-native-screens react-native-svg
```
Then:
```bash
npx expo install @react-native-async-storage/async-storage @expo-google-fonts/archivo lucide-react-native zustand
```
Expected: all packages added to `package.json` at Expo-compatible versions.

- [ ] **Step 4: Install dev dependencies for testing**

Run:
```bash
npm install --save-dev jest jest-expo @types/jest
```

- [ ] **Step 5: Configure `package.json` scripts and Jest**

Edit `package.json` — set `"main": "expo-router/entry"` and add:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFiles": ["<rootDir>/jest.setup.js"],
    "testPathIgnorePatterns": ["/node_modules/", "/.expo/"]
  }
}
```

- [ ] **Step 6: Create the AsyncStorage jest mock setup file**

Create `jest.setup.js`:
```js
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

- [ ] **Step 7: Configure `app.json` for Expo Router**

Edit `app.json` — ensure it has:
```json
{
  "expo": {
    "name": "JM Finance Tracker",
    "slug": "jm-finance-tracker",
    "scheme": "jmfinancetracker",
    "userInterfaceStyle": "dark",
    "plugins": ["expo-router"],
    "ios": { "supportsTablet": false },
    "web": { "bundler": "metro" }
  }
}
```

- [ ] **Step 8: Add a minimal placeholder root layout so `expo start` boots**

Create `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

- [ ] **Step 9: Add a minimal placeholder index route**

Create `app/index.tsx`:
```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>JM Finance Tracker — scaffold OK</Text>
    </View>
  );
}
```

- [ ] **Step 10: Verify the project boots**

Run: `npx expo start --web --non-interactive &` (or run `npx expo start` and press `w`).
Expected: web preview loads and shows "JM Finance Tracker — scaffold OK" with no red-box errors. Stop the server after confirming.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo Router project with TypeScript and Jest"
```

---

### Task 2: Theme tokens & typography

**Files:**
- Create: `src/theme/tokens.ts`

**Interfaces:**
- Produces: `colors`, `spacing`, `radius`, `typography` constant objects — imported by every component and screen from here on. Exact keys: `colors.bg/surface/surfaceMuted/text/textSecondary/textMuted/accent/accentInk/warning/border/borderStrong/borderHairline`; `spacing.xs/sm/sm2/md/md2/lg/xl/xxl/xxxl`; `radius.sm/md/lg/pill`.

- [ ] **Step 1: Create the token module**

Create `src/theme/tokens.ts`:
```ts
export const colors = {
  bg: '#101110',
  surface: '#1B1D18',
  surfaceMuted: 'rgba(255,255,255,0.06)',
  text: '#F4F5F0',
  textSecondary: '#C7C9C2',
  textMuted: '#8B8D86',
  accent: '#CFFF3B',
  accentInk: '#101110',
  warning: '#FFB020',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderHairline: 'rgba(255,255,255,0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  sm2: 10,
  md: 12,
  md2: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 11,
  md: 14,
  lg: 19,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 60, lineHeight: 60, fontFamily: 'Archivo_800ExtraBold', letterSpacing: -1.2 },
  sectionStat: { fontSize: 22, lineHeight: 24, fontFamily: 'Archivo_800ExtraBold' },
  cardTitle: { fontSize: 24, lineHeight: 29, fontFamily: 'Archivo_700Bold' },
  subHeader: { fontSize: 21, lineHeight: 25, fontFamily: 'Archivo_700Bold' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: 'Archivo_400Regular' },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontFamily: 'Archivo_600SemiBold' },
  caption: { fontSize: 10, lineHeight: 12, fontFamily: 'Archivo_600SemiBold', textTransform: 'uppercase' as const, letterSpacing: 1.1 },
  amount: { fontSize: 16, lineHeight: 19, fontFamily: 'Archivo_800ExtraBold' },
} as const;

export const tabularNums = { fontVariant: ['tabular-nums'] as const };
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/theme/tokens.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/theme/tokens.ts
git commit -m "feat: add design token module (colors, spacing, radius, typography)"
```

---

### Task 3: Core types module

**Files:**
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: `Account`, `Category`, `Transaction`, `RecurringRule`, `Goal`, `Debt`, `UserSettings` types — consumed by every store, calculation, and screen from here on. Types match the spec's data model exactly (§4 of the design spec).

- [ ] **Step 1: Create the types module**

Create `src/types/index.ts`:
```ts
export type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'credit';
  balance: number; // JMD, signed
  currency: 'JMD';
  createdAt: string; // ISO
};

export type Category = {
  id: string;
  name: string;
  icon: string; // lucide icon name, see src/lib/iconMap.ts
  isCustom: boolean;
  isIncome: boolean;
};

export type TransactionType = 'income' | 'expense' | 'goal_contribution';

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number; // JMD, signed (+income / -expense)
  note: string;
  date: string; // ISO
  type: TransactionType;
  recurringRuleId?: string;
  goalId?: string; // set when type === 'goal_contribution'
};

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export type RecurringRule = {
  id: string;
  name: string;
  categoryId: string;
  accountId: string;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: string; // ISO
  dayOfMonth?: number;
  dayOfWeek?: number;
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number; // derived from sum of goal_contribution transactions, cached
  targetDate?: string;
};

export type Debt = {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // APR %
  minPayment: number;
  dueDayOfMonth: number;
};

export type UserSettings = {
  hasCompletedOnboarding: boolean;
  monthlyIncomeEstimate: number;
  currency: 'JMD';
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add core data model types"
```

---

### Task 4: Utilities — id generator, money formatter, date helpers (TDD)

**Files:**
- Create: `src/lib/id.ts`, `src/lib/money.ts`, `src/lib/date.ts`
- Test: `src/lib/__tests__/money.test.ts`, `src/lib/__tests__/date.test.ts`

**Interfaces:**
- Produces: `generateId(): string`; `formatMoney(amount: number): string`; `addDays(iso: string, days: number): string`, `addMonths(iso: string, months: number): string`, `isBefore(a: string, b: string): boolean`, `nextOccurrence(fromISO: string, frequency: RecurringFrequency): string`. Consumed by every store and calculation module from here on.

- [ ] **Step 1: Write the failing tests for `formatMoney`**

Create `src/lib/__tests__/money.test.ts`:
```ts
import { formatMoney } from '../money';

describe('formatMoney', () => {
  it('formats a positive amount with commas and two decimals', () => {
    expect(formatMoney(1234.5)).toBe('J$1,234.50');
  });

  it('formats a negative amount with a leading minus', () => {
    expect(formatMoney(-42)).toBe('-J$42.00');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('J$0.00');
  });

  it('formats large amounts with multiple comma groups', () => {
    expect(formatMoney(1234567.89)).toBe('J$1,234,567.89');
  });
});
```

- [ ] **Step 2: Write the failing tests for the date helpers**

Create `src/lib/__tests__/date.test.ts`:
```ts
import { addDays, addMonths, isBefore, nextOccurrence } from '../date';

describe('date helpers', () => {
  it('addDays adds the given number of days', () => {
    expect(addDays('2026-01-01T00:00:00.000Z', 7).slice(0, 10)).toBe('2026-01-08');
  });

  it('addMonths adds the given number of months', () => {
    expect(addMonths('2026-01-15T00:00:00.000Z', 1).slice(0, 10)).toBe('2026-02-15');
  });

  it('addMonths supports negative months', () => {
    expect(addMonths('2026-03-15T00:00:00.000Z', -1).slice(0, 10)).toBe('2026-02-15');
  });

  it('isBefore compares ISO dates correctly', () => {
    expect(isBefore('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')).toBe(true);
    expect(isBefore('2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false);
  });

  it('nextOccurrence advances weekly/biweekly/monthly correctly', () => {
    const start = '2026-01-01T00:00:00.000Z';
    expect(nextOccurrence(start, 'weekly').slice(0, 10)).toBe('2026-01-08');
    expect(nextOccurrence(start, 'biweekly').slice(0, 10)).toBe('2026-01-15');
    expect(nextOccurrence(start, 'monthly').slice(0, 10)).toBe('2026-02-01');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/money.test.ts src/lib/__tests__/date.test.ts`
Expected: FAIL — `Cannot find module '../money'` and `Cannot find module '../date'`.

- [ ] **Step 4: Implement `id.ts`**

Create `src/lib/id.ts`:
```ts
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 5: Implement `money.ts`**

Create `src/lib/money.ts`:
```ts
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}J$${withCommas}.${decPart}`;
}
```

- [ ] **Step 6: Implement `date.ts`**

Create `src/lib/date.ts`:
```ts
import { RecurringFrequency } from '../types';

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function isBefore(a: string, b: string): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}

export function nextOccurrence(fromISO: string, frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'weekly':
      return addDays(fromISO, 7);
    case 'biweekly':
      return addDays(fromISO, 14);
    case 'monthly':
      return addMonths(fromISO, 1);
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/money.test.ts src/lib/__tests__/date.test.ts`
Expected: PASS, 8 tests total.

- [ ] **Step 8: Commit**

```bash
git add src/lib/id.ts src/lib/money.ts src/lib/date.ts src/lib/__tests__/money.test.ts src/lib/__tests__/date.test.ts
git commit -m "feat: add id, money formatting, and date utilities with tests"
```

### Task 5: Calculation — Safe to Spend (TDD)

**Files:**
- Create: `src/lib/safeToSpend.ts`
- Test: `src/lib/__tests__/safeToSpend.test.ts`

**Interfaces:**
- Consumes: `Account`, `RecurringRule` from `src/types`; `isBefore`, `addMonths` from `src/lib/date.ts`.
- Produces: `calculateSafeToSpend(accounts: Account[], recurringRules: RecurringRule[], now?: string): number` — used by the Home screen (Task 17).
- Design decision (spec left this open): "next expected income date" = exactly one calendar month after `now`, matching the spec's `monthlyIncomeEstimate` cadence.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/safeToSpend.test.ts`:
```ts
import { calculateSafeToSpend } from '../safeToSpend';
import { Account, RecurringRule } from '../../types';

const now = '2026-01-01T00:00:00.000Z';

function makeAccount(balance: number, id = 'a1'): Account {
  return { id, name: 'Checking', type: 'checking', balance, currency: 'JMD', createdAt: now };
}

function makeRule(amount: number, nextDueDate: string): RecurringRule {
  return { id: 'r1', name: 'Rent', categoryId: 'c1', accountId: 'a1', amount, frequency: 'monthly', nextDueDate };
}

describe('calculateSafeToSpend', () => {
  it('subtracts bills due before the next expected income date', () => {
    const accounts = [makeAccount(10000)];
    const rules = [makeRule(3000, '2026-01-15T00:00:00.000Z')];
    expect(calculateSafeToSpend(accounts, rules, now)).toBe(7000);
  });

  it('ignores bills due after the next expected income date', () => {
    const accounts = [makeAccount(10000)];
    const rules = [makeRule(3000, '2026-03-01T00:00:00.000Z')];
    expect(calculateSafeToSpend(accounts, rules, now)).toBe(10000);
  });

  it('sums balances across multiple accounts', () => {
    const accounts = [makeAccount(5000, 'a1'), makeAccount(2000, 'a2')];
    expect(calculateSafeToSpend(accounts, [], now)).toBe(7000);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/safeToSpend.test.ts`
Expected: FAIL — `Cannot find module '../safeToSpend'`.

- [ ] **Step 3: Implement `safeToSpend.ts`**

Create `src/lib/safeToSpend.ts`:
```ts
import { Account, RecurringRule } from '../types';
import { isBefore, addMonths } from './date';

export function calculateSafeToSpend(
  accounts: Account[],
  recurringRules: RecurringRule[],
  now: string = new Date().toISOString()
): number {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const nextIncomeDate = addMonths(now, 1);
  const upcomingBills = recurringRules
    .filter((r) => isBefore(r.nextDueDate, nextIncomeDate))
    .reduce((sum, r) => sum + r.amount, 0);
  return totalBalance - upcomingBills;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/safeToSpend.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/safeToSpend.ts src/lib/__tests__/safeToSpend.test.ts
git commit -m "feat: add Safe to Spend calculation with tests"
```

---

### Task 6: Calculation — Debt payoff projection, snowball & avalanche (TDD)

**Files:**
- Create: `src/lib/debtPayoff.ts`
- Test: `src/lib/__tests__/debtPayoff.test.ts`

**Interfaces:**
- Consumes: `Debt` from `src/types`.
- Produces: `type PayoffResult = { months: number; totalInterest: number }`; `projectDebtPayoff(debts: Debt[], extraPayment: number): { snowball: PayoffResult; avalanche: PayoffResult }` — used by the Debt screen (Task 22).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/debtPayoff.test.ts`:
```ts
import { projectDebtPayoff } from '../debtPayoff';
import { Debt } from '../../types';

function makeDebt(overrides: Partial<Debt>): Debt {
  return { id: 'd1', name: 'Card', balance: 1200, interestRate: 0, minPayment: 100, dueDayOfMonth: 1, ...overrides };
}

describe('projectDebtPayoff', () => {
  it('pays off a single zero-interest debt in balance/minPayment months', () => {
    const debts = [makeDebt({ balance: 1200, minPayment: 100 })];
    const result = projectDebtPayoff(debts, 0);
    expect(result.snowball.months).toBe(12);
    expect(result.snowball.totalInterest).toBe(0);
  });

  it('avalanche never accrues more total interest than snowball for the same debts', () => {
    const debts: Debt[] = [
      makeDebt({ id: 'd1', balance: 500, interestRate: 5, minPayment: 50 }),
      makeDebt({ id: 'd2', balance: 3000, interestRate: 22, minPayment: 100 }),
    ];
    const result = projectDebtPayoff(debts, 200);
    expect(result.avalanche.totalInterest).toBeLessThanOrEqual(result.snowball.totalInterest);
  });

  it('extra payments reduce months to debt-free', () => {
    const debts = [makeDebt({ balance: 1200, minPayment: 100, interestRate: 0 })];
    const withoutExtra = projectDebtPayoff(debts, 0);
    const withExtra = projectDebtPayoff(debts, 200);
    expect(withExtra.snowball.months).toBeLessThan(withoutExtra.snowball.months);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/debtPayoff.test.ts`
Expected: FAIL — `Cannot find module '../debtPayoff'`.

- [ ] **Step 3: Implement `debtPayoff.ts`**

Create `src/lib/debtPayoff.ts`:
```ts
import { Debt } from '../types';

export type PayoffStrategy = 'snowball' | 'avalanche';
export type PayoffResult = { months: number; totalInterest: number };

const MAX_MONTHS = 600; // 50-year safety cap against infinite loops

function simulate(debts: Debt[], extraPayment: number, strategy: PayoffStrategy): PayoffResult {
  const order = debts.map((d) => ({ ...d }));
  if (strategy === 'snowball') {
    order.sort((a, b) => a.balance - b.balance);
  } else {
    order.sort((a, b) => b.interestRate - a.interestRate);
  }

  let months = 0;
  let totalInterest = 0;

  while (order.some((d) => d.balance > 0.01) && months < MAX_MONTHS) {
    months++;
    for (const debt of order) {
      if (debt.balance <= 0) continue;
      const monthlyInterest = debt.balance * (debt.interestRate / 100 / 12);
      totalInterest += monthlyInterest;
      debt.balance += monthlyInterest;
      debt.balance -= Math.min(debt.balance, debt.minPayment);
    }
    let remainingExtra = extraPayment;
    for (const debt of order) {
      if (remainingExtra <= 0) break;
      if (debt.balance <= 0) continue;
      const applied = Math.min(debt.balance, remainingExtra);
      debt.balance -= applied;
      remainingExtra -= applied;
    }
  }

  return { months, totalInterest: Math.round(totalInterest * 100) / 100 };
}

export function projectDebtPayoff(
  debts: Debt[],
  extraPayment: number
): { snowball: PayoffResult; avalanche: PayoffResult } {
  return {
    snowball: simulate(debts, extraPayment, 'snowball'),
    avalanche: simulate(debts, extraPayment, 'avalanche'),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/debtPayoff.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debtPayoff.ts src/lib/__tests__/debtPayoff.test.ts
git commit -m "feat: add debt payoff projection (snowball/avalanche) with tests"
```

---

### Task 7: Calculation — Insights aggregation (TDD)

**Files:**
- Create: `src/lib/insights.ts`
- Test: `src/lib/__tests__/insights.test.ts`

**Interfaces:**
- Consumes: `Transaction` from `src/types`; `isBefore` from `src/lib/date.ts`.
- Produces: `type CategoryTotal = { categoryId: string; total: number; previousTotal: number; percentChange: number | null }`; `categoryTotals(transactions, periodStart, periodEnd, previousPeriodStart, previousPeriodEnd): CategoryTotal[]`; `type TrendBucket = { label: string; income: number; spending: number }`; `incomeVsSpendingTrend(transactions, bucketBy: 'week' | 'month', numBuckets: number, endISO: string): TrendBucket[]`; `topTransactions(transactions, periodStart, periodEnd, n?: number): Transaction[]`. Used by the Insights screen (Task 20).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/insights.test.ts`:
```ts
import { categoryTotals, incomeVsSpendingTrend, topTransactions } from '../insights';
import { Transaction } from '../../types';

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    accountId: 'a1',
    categoryId: 'food',
    amount: -100,
    note: '',
    date: '2026-01-15T00:00:00.000Z',
    type: 'expense',
    ...overrides,
  };
}

describe('categoryTotals', () => {
  it('sums current-period expenses by category and computes percent change', () => {
    const transactions = [
      makeTx({ categoryId: 'food', amount: -100, date: '2026-01-15T00:00:00.000Z' }),
      makeTx({ categoryId: 'food', amount: -50, date: '2025-12-15T00:00:00.000Z' }),
    ];
    const result = categoryTotals(
      transactions,
      '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z',
      '2025-12-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
    );
    expect(result[0]).toEqual({ categoryId: 'food', total: 100, previousTotal: 50, percentChange: 100 });
  });
});

describe('incomeVsSpendingTrend', () => {
  it('buckets income and spending by week', () => {
    const transactions = [
      makeTx({ type: 'income', amount: 500, date: '2026-01-14T00:00:00.000Z' }),
      makeTx({ type: 'expense', amount: -200, date: '2026-01-14T00:00:00.000Z' }),
    ];
    const buckets = incomeVsSpendingTrend(transactions, 'week', 2, '2026-01-15T00:00:00.000Z');
    expect(buckets).toHaveLength(2);
    expect(buckets[1].income).toBe(500);
    expect(buckets[1].spending).toBe(200);
  });
});

describe('topTransactions', () => {
  it('returns the top N transactions by absolute amount within the period', () => {
    const transactions = [
      makeTx({ amount: -50, date: '2026-01-05T00:00:00.000Z' }),
      makeTx({ amount: -900, date: '2026-01-10T00:00:00.000Z' }),
      makeTx({ amount: 300, date: '2026-01-12T00:00:00.000Z' }),
    ];
    const top = topTransactions(transactions, '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', 2);
    expect(top.map((t) => t.amount)).toEqual([-900, 300]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/insights.test.ts`
Expected: FAIL — `Cannot find module '../insights'`.

- [ ] **Step 3: Implement `insights.ts`**

Create `src/lib/insights.ts`:
```ts
import { Transaction } from '../types';
import { isBefore } from './date';

export type CategoryTotal = {
  categoryId: string;
  total: number;
  previousTotal: number;
  percentChange: number | null;
};

function inRange(t: Transaction, start: string, end: string): boolean {
  return !isBefore(t.date, start) && isBefore(t.date, end);
}

function sumByCategory(list: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of list) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + Math.abs(t.amount));
  }
  return map;
}

export function categoryTotals(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  previousPeriodStart: string,
  previousPeriodEnd: string
): CategoryTotal[] {
  const current = transactions.filter((t) => inRange(t, periodStart, periodEnd) && t.type === 'expense');
  const previous = transactions.filter((t) => inRange(t, previousPeriodStart, previousPeriodEnd) && t.type === 'expense');

  const currentMap = sumByCategory(current);
  const previousMap = sumByCategory(previous);
  const categoryIds = new Set([...currentMap.keys(), ...previousMap.keys()]);

  return Array.from(categoryIds)
    .map((categoryId) => {
      const total = currentMap.get(categoryId) ?? 0;
      const previousTotal = previousMap.get(categoryId) ?? 0;
      const percentChange =
        previousTotal === 0 ? null : Math.round(((total - previousTotal) / previousTotal) * 1000) / 10;
      return { categoryId, total, previousTotal, percentChange };
    })
    .sort((a, b) => b.total - a.total);
}

export type TrendBucket = { label: string; income: number; spending: number };

export function incomeVsSpendingTrend(
  transactions: Transaction[],
  bucketBy: 'week' | 'month',
  numBuckets: number,
  endISO: string
): TrendBucket[] {
  const bucketMs = bucketBy === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const end = new Date(endISO).getTime();
  const buckets: TrendBucket[] = [];

  for (let i = numBuckets - 1; i >= 0; i--) {
    const bucketEnd = end - i * bucketMs;
    const bucketStart = bucketEnd - bucketMs;
    const inBucket = transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return time >= bucketStart && time < bucketEnd;
    });
    const income = inBucket.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const spending = inBucket.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    buckets.push({ label: new Date(bucketStart).toISOString().slice(0, 10), income, spending });
  }
  return buckets;
}

export function topTransactions(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  n: number = 5
): Transaction[] {
  return transactions
    .filter((t) => inRange(t, periodStart, periodEnd))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, n);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/insights.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights.ts src/lib/__tests__/insights.test.ts
git commit -m "feat: add insights aggregation (category totals, trend, top transactions) with tests"
```

### Task 8: Zustand stores — settings, accounts, categories, transactions, recurring, goals, debts

**Files:**
- Create: `src/stores/errorBannerStore.ts`, `src/lib/storage.ts`
- Create: `src/stores/settingsStore.ts`, `src/stores/accountsStore.ts`, `src/stores/categoriesStore.ts`, `src/stores/transactionsStore.ts`, `src/stores/recurringStore.ts`, `src/stores/goalsStore.ts`, `src/stores/debtsStore.ts`
- Create: `src/stores/useAppHydrated.ts`

**Interfaces:**
- Consumes: `generateId` from `src/lib/id.ts`; `Account/Category/Transaction/RecurringRule/Goal/Debt/UserSettings` from `src/types`.
- Produces: `useSettingsStore`, `useAccountsStore`, `useCategoriesStore`, `useTransactionsStore`, `useRecurringStore`, `useGoalsStore`, `useDebtsStore` (each a Zustand hook with a `hasHydrated: boolean` field), and `useAppHydrated(): boolean`. Every screen from Task 13 onward reads from these; Task 9's transaction actions call these stores' actions directly via `.getState()`.

- [ ] **Step 1: Create the error banner store (non-persisted)**

Create `src/stores/errorBannerStore.ts`:
```ts
import { create } from 'zustand';

type ErrorBannerState = {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
};

export const useErrorBannerStore = create<ErrorBannerState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));
```

- [ ] **Step 2: Create the AsyncStorage wrapper that surfaces failures via the error banner**

Create `src/lib/storage.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useErrorBannerStore } from '../stores/errorBannerStore';

export const persistedStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      useErrorBannerStore.getState().show("Couldn't load — try again");
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      useErrorBannerStore.getState().show("Couldn't save — try again");
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      useErrorBannerStore.getState().show("Couldn't save — try again");
    }
  },
};
```

- [ ] **Step 3: Create `settingsStore.ts`**

Create `src/stores/settingsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings } from '../types';
import { persistedStorage } from '../lib/storage';

type SettingsState = UserSettings & {
  hasHydrated: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  setMonthlyIncomeEstimate: (value: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      monthlyIncomeEstimate: 0,
      currency: 'JMD',
      hasHydrated: false,
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      setMonthlyIncomeEstimate: (value) => set({ monthlyIncomeEstimate: value }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 4: Create `accountsStore.ts`**

Create `src/stores/accountsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Account } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';

type AccountsState = {
  accounts: Account[];
  hasHydrated: boolean;
  addAccount: (input: Omit<Account, 'id' | 'createdAt' | 'currency'>) => string;
  updateAccount: (id: string, updates: Partial<Omit<Account, 'id'>>) => void;
  removeAccount: (id: string) => void;
};

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set) => ({
      accounts: [],
      hasHydrated: false,
      addAccount: (input) => {
        const id = generateId();
        const account: Account = { ...input, id, currency: 'JMD', createdAt: new Date().toISOString() };
        set((state) => ({ accounts: [...state.accounts, account] }));
        return id;
      },
      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAccount: (id) =>
        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),
    }),
    {
      name: 'accounts-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useAccountsStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 5: Create `categoriesStore.ts` with seeded presets**

Create `src/stores/categoriesStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Category } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';

const PRESET_CATEGORIES: Category[] = [
  { id: 'preset-food', name: 'Food', icon: 'utensils', isCustom: false, isIncome: false },
  { id: 'preset-transport', name: 'Transport', icon: 'car', isCustom: false, isIncome: false },
  { id: 'preset-bills', name: 'Bills & Utilities', icon: 'receipt', isCustom: false, isIncome: false },
  { id: 'preset-shopping', name: 'Shopping', icon: 'shopping-bag', isCustom: false, isIncome: false },
  { id: 'preset-entertainment', name: 'Entertainment', icon: 'film', isCustom: false, isIncome: false },
  { id: 'preset-health', name: 'Health', icon: 'heart-pulse', isCustom: false, isIncome: false },
  { id: 'preset-housing', name: 'Housing', icon: 'home', isCustom: false, isIncome: false },
  { id: 'preset-income', name: 'Income', icon: 'wallet', isCustom: false, isIncome: true },
  { id: 'preset-transfer', name: 'Transfer', icon: 'arrow-left-right', isCustom: false, isIncome: false },
  { id: 'preset-other', name: 'Other', icon: 'more-horizontal', isCustom: false, isIncome: false },
];

type CategoriesState = {
  categories: Category[];
  hasHydrated: boolean;
  addCategory: (name: string, icon: string, isIncome: boolean) => void;
  removeCategory: (id: string) => void;
};

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      categories: PRESET_CATEGORIES,
      hasHydrated: false,
      addCategory: (name, icon, isIncome) =>
        set((state) => ({
          categories: [...state.categories, { id: generateId(), name, icon, isCustom: true, isIncome }],
        })),
      removeCategory: (id) =>
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
    }),
    {
      name: 'categories-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useCategoriesStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 6: Create `transactionsStore.ts`**

Create `src/stores/transactionsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Transaction } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';

type TransactionsState = {
  transactions: Transaction[];
  hasHydrated: boolean;
  addTransaction: (input: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  removeTransaction: (id: string) => void;
};

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set) => ({
      transactions: [],
      hasHydrated: false,
      addTransaction: (input) => {
        const id = generateId();
        set((state) => ({ transactions: [...state.transactions, { ...input, id }] }));
        return id;
      },
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
    }),
    {
      name: 'transactions-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useTransactionsStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 7: Create `recurringStore.ts`**

Create `src/stores/recurringStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RecurringRule } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';
import { nextOccurrence } from '../lib/date';

type RecurringState = {
  rules: RecurringRule[];
  hasHydrated: boolean;
  addRule: (input: Omit<RecurringRule, 'id'>) => string;
  updateRule: (id: string, updates: Partial<Omit<RecurringRule, 'id'>>) => void;
  removeRule: (id: string) => void;
  advanceNextDueDate: (id: string) => void;
};

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set, get) => ({
      rules: [],
      hasHydrated: false,
      addRule: (input) => {
        const id = generateId();
        set((state) => ({ rules: [...state.rules, { ...input, id }] }));
        return id;
      },
      updateRule: (id, updates) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      removeRule: (id) => set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),
      advanceNextDueDate: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return;
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, nextDueDate: nextOccurrence(r.nextDueDate, r.frequency) } : r
          ),
        }));
      },
    }),
    {
      name: 'recurring-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useRecurringStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 8: Create `goalsStore.ts`**

Create `src/stores/goalsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Goal } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';

type GoalsState = {
  goals: Goal[];
  hasHydrated: boolean;
  addGoal: (input: Omit<Goal, 'id' | 'currentAmount'>) => string;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
  removeGoal: (id: string) => void;
  incrementCurrentAmount: (id: string, amount: number) => void;
};

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: [],
      hasHydrated: false,
      addGoal: (input) => {
        const id = generateId();
        set((state) => ({ goals: [...state.goals, { ...input, id, currentAmount: 0 }] }));
        return id;
      },
      updateGoal: (id, updates) =>
        set((state) => ({ goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) })),
      removeGoal: (id) => set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),
      incrementCurrentAmount: (id, amount) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)),
        })),
    }),
    {
      name: 'goals-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useGoalsStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 9: Create `debtsStore.ts`**

Create `src/stores/debtsStore.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Debt } from '../types';
import { generateId } from '../lib/id';
import { persistedStorage } from '../lib/storage';

type DebtsState = {
  debts: Debt[];
  hasHydrated: boolean;
  addDebt: (input: Omit<Debt, 'id'>) => string;
  updateDebt: (id: string, updates: Partial<Omit<Debt, 'id'>>) => void;
  removeDebt: (id: string) => void;
};

export const useDebtsStore = create<DebtsState>()(
  persist(
    (set) => ({
      debts: [],
      hasHydrated: false,
      addDebt: (input) => {
        const id = generateId();
        set((state) => ({ debts: [...state.debts, { ...input, id }] }));
        return id;
      },
      updateDebt: (id, updates) =>
        set((state) => ({ debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
      removeDebt: (id) => set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),
    }),
    {
      name: 'debts-store',
      storage: createJSONStorage(() => persistedStorage),
      onRehydrateStorage: () => () => {
        useDebtsStore.setState({ hasHydrated: true });
      },
    }
  )
);
```

- [ ] **Step 10: Create the combined hydration hook**

Create `src/stores/useAppHydrated.ts`:
```ts
import { useAccountsStore } from './accountsStore';
import { useCategoriesStore } from './categoriesStore';
import { useTransactionsStore } from './transactionsStore';
import { useRecurringStore } from './recurringStore';
import { useGoalsStore } from './goalsStore';
import { useDebtsStore } from './debtsStore';
import { useSettingsStore } from './settingsStore';

export function useAppHydrated(): boolean {
  const settings = useSettingsStore((s) => s.hasHydrated);
  const accounts = useAccountsStore((s) => s.hasHydrated);
  const categories = useCategoriesStore((s) => s.hasHydrated);
  const transactions = useTransactionsStore((s) => s.hasHydrated);
  const recurring = useRecurringStore((s) => s.hasHydrated);
  const goals = useGoalsStore((s) => s.hasHydrated);
  const debts = useDebtsStore((s) => s.hasHydrated);
  return settings && accounts && categories && transactions && recurring && goals && debts;
}
```

- [ ] **Step 11: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add src/stores src/lib/storage.ts
git commit -m "feat: add Zustand stores for all domain entities with AsyncStorage persistence"
```

---

### Task 9: Transaction actions — cross-store orchestration (TDD)

**Files:**
- Create: `src/lib/transactionActions.ts`
- Test: `src/lib/__tests__/transactionActions.test.ts`

**Interfaces:**
- Consumes: `useAccountsStore`, `useTransactionsStore`, `useGoalsStore` from Task 8; `Transaction` from `src/types`.
- Produces: `createTransaction(input: Omit<Transaction, 'id'>): string`, `editTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): void`, `deleteTransaction(id: string): void` — the **only** way screens should create/edit/delete transactions (Tasks 17, 19, 21), since these functions keep account balances and goal progress in sync.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/transactionActions.test.ts`:
```ts
import { createTransaction, editTransaction, deleteTransaction } from '../transactionActions';
import { useAccountsStore } from '../../stores/accountsStore';
import { useTransactionsStore } from '../../stores/transactionsStore';
import { useGoalsStore } from '../../stores/goalsStore';

beforeEach(() => {
  useAccountsStore.setState({
    accounts: [{ id: 'a1', name: 'Checking', type: 'checking', balance: 1000, currency: 'JMD', createdAt: '2026-01-01T00:00:00.000Z' }],
  });
  useTransactionsStore.setState({ transactions: [] });
  useGoalsStore.setState({ goals: [{ id: 'g1', name: 'Fund', icon: 'target', targetAmount: 1000, currentAmount: 0 }] });
});

describe('createTransaction', () => {
  it('adjusts the account balance by the transaction amount', () => {
    createTransaction({ accountId: 'a1', categoryId: 'c1', amount: -100, note: '', date: '2026-01-02T00:00:00.000Z', type: 'expense' });
    expect(useAccountsStore.getState().accounts[0].balance).toBe(900);
  });

  it('increments the goal current amount for a goal_contribution', () => {
    createTransaction({ accountId: 'a1', categoryId: 'c1', amount: -100, note: '', date: '2026-01-02T00:00:00.000Z', type: 'goal_contribution', goalId: 'g1' });
    expect(useGoalsStore.getState().goals[0].currentAmount).toBe(100);
  });
});

describe('deleteTransaction', () => {
  it('reverses the account balance effect and removes the transaction', () => {
    const id = createTransaction({ accountId: 'a1', categoryId: 'c1', amount: -100, note: '', date: '2026-01-02T00:00:00.000Z', type: 'expense' });
    deleteTransaction(id);
    expect(useAccountsStore.getState().accounts[0].balance).toBe(1000);
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);
  });
});

describe('editTransaction', () => {
  it('reverses the old amount and applies the new one', () => {
    const id = createTransaction({ accountId: 'a1', categoryId: 'c1', amount: -100, note: '', date: '2026-01-02T00:00:00.000Z', type: 'expense' });
    editTransaction(id, { amount: -300 });
    expect(useAccountsStore.getState().accounts[0].balance).toBe(700);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/__tests__/transactionActions.test.ts`
Expected: FAIL — `Cannot find module '../transactionActions'`.

- [ ] **Step 3: Implement `transactionActions.ts`**

Create `src/lib/transactionActions.ts`:
```ts
import { useAccountsStore } from '../stores/accountsStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useGoalsStore } from '../stores/goalsStore';
import { Transaction } from '../types';

function applyToAccount(accountId: string, delta: number): void {
  const account = useAccountsStore.getState().accounts.find((a) => a.id === accountId);
  if (!account) return;
  useAccountsStore.getState().updateAccount(accountId, { balance: account.balance + delta });
}

function applyToGoal(transaction: Pick<Transaction, 'type' | 'goalId' | 'amount'>, sign: 1 | -1): void {
  if (transaction.type === 'goal_contribution' && transaction.goalId) {
    useGoalsStore.getState().incrementCurrentAmount(transaction.goalId, sign * Math.abs(transaction.amount));
  }
}

export function createTransaction(input: Omit<Transaction, 'id'>): string {
  const id = useTransactionsStore.getState().addTransaction(input);
  applyToAccount(input.accountId, input.amount);
  applyToGoal(input, 1);
  return id;
}

export function deleteTransaction(id: string): void {
  const tx = useTransactionsStore.getState().transactions.find((t) => t.id === id);
  if (!tx) return;
  applyToAccount(tx.accountId, -tx.amount);
  applyToGoal(tx, -1);
  useTransactionsStore.getState().removeTransaction(id);
}

export function editTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): void {
  const original = useTransactionsStore.getState().transactions.find((t) => t.id === id);
  if (!original) return;

  applyToAccount(original.accountId, -original.amount);
  applyToGoal(original, -1);

  const merged: Transaction = { ...original, ...updates };
  applyToAccount(merged.accountId, merged.amount);
  applyToGoal(merged, 1);

  useTransactionsStore.getState().updateTransaction(id, updates);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/lib/__tests__/transactionActions.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the full test suite so far**

Run: `npx jest`
Expected: PASS, all suites (money, date, safeToSpend, debtPayoff, insights, transactionActions).

- [ ] **Step 6: Commit**

```bash
git add src/lib/transactionActions.ts src/lib/__tests__/transactionActions.test.ts
git commit -m "feat: add transaction actions that keep account balances and goal progress in sync"
```

### Task 10: Icon mapping + base components part 1 (Screen, Card, IconChip, CategoryIcon, ListRow, GroupedList)

**Files:**
- Create: `src/lib/iconMap.ts`
- Create: `src/components/Screen.tsx`, `src/components/Card.tsx`, `src/components/IconChip.tsx`, `src/components/CategoryIcon.tsx`, `src/components/ListRow.tsx`, `src/components/GroupedList.tsx`

**Interfaces:**
- Consumes: `colors/spacing/radius/typography` from `src/theme/tokens.ts`; `formatMoney` from `src/lib/money.ts`.
- Produces: `getIcon(name: string): LucideIcon`; `<Screen scroll? padded?>`, `<Card emphasis? style?>`, `<IconChip size?>`, `<CategoryIcon name size?>`, `<ListRow icon title caption? amount? showChevron? onPress? isLast?>`, `<GroupedList>` — used by every screen from Task 14 onward.

- [ ] **Step 1: Create the icon name → Lucide component map**

Create `src/lib/iconMap.ts`:
```ts
import {
  Utensils, Car, Receipt, ShoppingBag, Film, HeartPulse, Home as HomeIcon,
  Wallet, ArrowLeftRight, MoreHorizontal, Target, LucideIcon,
} from 'lucide-react-native';

export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  'shopping-bag': ShoppingBag,
  film: Film,
  'heart-pulse': HeartPulse,
  home: HomeIcon,
  wallet: Wallet,
  'arrow-left-right': ArrowLeftRight,
  'more-horizontal': MoreHorizontal,
  target: Target,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MoreHorizontal;
}
```

- [ ] **Step 2: Create `Screen.tsx`**

Create `src/components/Screen.tsx`:
```tsx
import React from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
};

export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      {scroll ? (
        <ScrollView style={styles.flex} contentContainerStyle={padded ? styles.padded : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
});
```

- [ ] **Step 3: Create `Card.tsx`**

Create `src/components/Card.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type CardProps = {
  children: React.ReactNode;
  emphasis?: boolean;
  style?: ViewStyle;
};

export function Card({ children, emphasis = false, style }: CardProps) {
  return <View style={[styles.base, emphasis ? styles.emphasis : styles.normal, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: spacing.lg },
  normal: { borderWidth: 1, borderColor: colors.border },
  emphasis: {
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
```

- [ ] **Step 4: Create `IconChip.tsx`**

Create `src/components/IconChip.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';

type IconChipProps = { children: React.ReactNode; size?: number };

export function IconChip({ children, size = 34 }: IconChipProps) {
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: radius.sm }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 5: Create `CategoryIcon.tsx`**

Create `src/components/CategoryIcon.tsx`:
```tsx
import React from 'react';
import { getIcon } from '../lib/iconMap';
import { colors } from '../theme/tokens';

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = getIcon(name);
  return <Icon size={size} color={colors.textSecondary} />;
}
```

- [ ] **Step 6: Create `ListRow.tsx`**

Create `src/components/ListRow.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing } from '../theme/tokens';
import { IconChip } from './IconChip';
import { formatMoney } from '../lib/money';

type ListRowProps = {
  icon: React.ReactNode;
  title: string;
  caption?: string;
  amount?: number;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
};

export function ListRow({ icon, title, caption, amount, showChevron, onPress, isLast }: ListRowProps) {
  const content = (
    <View style={[styles.row, !isLast && styles.divider]}>
      <IconChip>{icon}</IconChip>
      <View style={styles.textStack}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {caption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
      {amount !== undefined ? (
        <Text style={[styles.amount, amount > 0 && styles.positive]}>
          {amount > 0 ? '+' : ''}
          {formatMoney(amount)}
        </Text>
      ) : null}
      {showChevron ? <ChevronRight size={18} color={colors.textMuted} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md2, gap: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  textStack: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  caption: { color: colors.textMuted, fontSize: 12 },
  amount: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  positive: { color: colors.accent },
});
```

- [ ] **Step 7: Create `GroupedList.tsx`**

Create `src/components/GroupedList.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';

export function GroupedList({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 8: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/iconMap.ts src/components/Screen.tsx src/components/Card.tsx src/components/IconChip.tsx src/components/CategoryIcon.tsx src/components/ListRow.tsx src/components/GroupedList.tsx
git commit -m "feat: add icon map and base layout/list components"
```

---

### Task 11: Base components part 2 (Button, ProgressBar, Toggle, SegmentedControl, Alert)

**Files:**
- Create: `src/components/Button.tsx`, `src/components/ProgressBar.tsx`, `src/components/Toggle.tsx`, `src/components/SegmentedControl.tsx`, `src/components/Alert.tsx`

**Interfaces:**
- Consumes: `colors/radius/spacing` from `src/theme/tokens.ts`.
- Produces: `<Button label onPress disabled? loading? variant?>`, `<ProgressBar progress>`, `<Toggle value onValueChange>`, `<SegmentedControl options value onChange>`, `<Alert variant? text>` — used throughout every form and the Debt screen (Task 22).

- [ ] **Step 1: Create `Button.tsx`**

Create `src/components/Button.tsx`:
```tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, disabled, loading, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, isPrimary ? styles.primary : styles.secondary, (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.accentInk : colors.text} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingVertical: spacing.md2, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '700' },
  primaryLabel: { color: colors.accentInk },
  secondaryLabel: { color: colors.text },
});
```

- [ ] **Step 2: Create `ProgressBar.tsx`**

Create `src/components/ProgressBar.tsx`:
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';

export function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
});
```

- [ ] **Step 3: Create `Toggle.tsx`**

Create `src/components/Toggle.tsx`:
```tsx
import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceMuted, colors.accent] });
  const thumbLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 18] });

  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { left: thumbLeft }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 40, height: 24, borderRadius: radius.pill, justifyContent: 'center' },
  thumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: colors.text },
});
```

- [ ] **Step 4: Create `SegmentedControl.tsx`**

Create `src/components/SegmentedControl.tsx`:
```tsx
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type SegmentedControlProps<T extends string> = {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={[styles.segment, active && styles.active]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.sm2, borderRadius: radius.pill, alignItems: 'center' },
  active: { backgroundColor: colors.accent },
  label: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  activeLabel: { color: colors.accentInk },
});
```

- [ ] **Step 5: Create `Alert.tsx`**

Create `src/components/Alert.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { colors, radius, spacing } from '../theme/tokens';

type AlertProps = { variant?: 'default' | 'warning'; text: string };

export function Alert({ variant = 'default', text }: AlertProps) {
  const isWarning = variant === 'warning';
  return (
    <View style={[styles.base, isWarning ? styles.warning : styles.default]}>
      {isWarning ? <AlertTriangle size={16} color={colors.warning} /> : <CheckCircle2 size={16} color={colors.accent} />}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  default: { borderColor: colors.border },
  warning: { borderColor: 'rgba(255,176,32,0.4)' },
  text: { color: colors.text, fontSize: 13, flex: 1 },
});
```

- [ ] **Step 6: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Button.tsx src/components/ProgressBar.tsx src/components/Toggle.tsx src/components/SegmentedControl.tsx src/components/Alert.tsx
git commit -m "feat: add button, progress bar, toggle, segmented control, and alert components"
```

---

### Task 12: Base components part 3 (StatFigure, EmptyState, LoadingState, FormField)

**Files:**
- Create: `src/components/StatFigure.tsx`, `src/components/EmptyState.tsx`, `src/components/LoadingState.tsx`, `src/components/FormField.tsx`

**Interfaces:**
- Consumes: `colors/spacing` from `src/theme/tokens.ts`; `formatMoney` from `src/lib/money.ts`; `Button` from Task 11.
- Produces: `<StatFigure label amount tone?>`, `<EmptyState icon message ctaLabel? onPressCta?>`, `<LoadingState>`, `<FormField label value onChangeText keyboardType? placeholder? error?>` — used by nearly every screen from Task 13 onward.

- [ ] **Step 1: Create `StatFigure.tsx`**

Create `src/components/StatFigure.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { formatMoney } from '../lib/money';

export function StatFigure({
  label,
  amount,
  tone = 'neutral',
}: {
  label: string;
  amount: number;
  tone?: 'neutral' | 'positive';
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'positive' && styles.positive]}>
        {tone === 'positive' && amount > 0 ? '+' : ''}
        {formatMoney(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1 },
  value: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  positive: { color: colors.accent },
});
```

- [ ] **Step 2: Create `EmptyState.tsx`**

Create `src/components/EmptyState.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Button } from './Button';

type EmptyStateProps = {
  icon: React.ReactNode;
  message: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

export function EmptyState({ icon, message, ctaLabel, onPressCta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onPressCta ? (
        <View style={styles.cta}>
          <Button label={ctaLabel} onPress={onPressCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  message: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  cta: { marginTop: spacing.sm, minWidth: 160 },
});
```

- [ ] **Step 3: Create `LoadingState.tsx`**

Create `src/components/LoadingState.tsx`:
```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
```

- [ ] **Step 4: Create `FormField.tsx`**

Create `src/components/FormField.tsx`:
```tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
  error?: string;
};

export function FormField({ label, value, onChangeText, keyboardType = 'default', placeholder, error }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.warning },
  error: { color: colors.warning, fontSize: 12 },
});
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/StatFigure.tsx src/components/EmptyState.tsx src/components/LoadingState.tsx src/components/FormField.tsx
git commit -m "feat: add stat figure, empty/loading state, and form field components"
```

### Task 13: Root layout, font loading, hydration gate, tab navigation scaffold

**Files:**
- Modify: `app/_layout.tsx` (replace Task 1's placeholder)
- Modify: `app/index.tsx` (replace Task 1's placeholder)
- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/transactions.tsx`, `app/(tabs)/insights.tsx`, `app/(tabs)/goals.tsx`, `app/(tabs)/more.tsx` (temporary stub screens — filled in fully by Tasks 17–21, 24)
- Create: `app/onboarding/_layout.tsx`, `app/onboarding/welcome.tsx` (temporary stub — filled in fully by Task 14)

**Interfaces:**
- Consumes: `useAppHydrated` from Task 8; `LoadingState` from Task 12; `colors` from Task 2.
- Produces: the app now boots to either `/onboarding/welcome` or `/(tabs)` depending on `hasCompletedOnboarding`, with a 5-tab bottom nav shell in place for later tasks to fill in.

- [ ] **Step 1: Replace the root layout with font loading + hydration-aware splash**

Overwrite `app/_layout.tsx`:
```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { colors } from '../src/theme/tokens';
import { LoadingState } from '../src/components/LoadingState';
import { ErrorBanner } from '../src/components/ErrorBanner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', headerShown: true, title: '' }} />
      </Stack>
      <ErrorBanner />
    </View>
  );
}
```

Note: `src/components/ErrorBanner.tsx` does not exist yet — it is created in Task 27. Create a temporary minimal version now so this task compiles standalone:

Create `src/components/ErrorBanner.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useErrorBannerStore } from '../stores/errorBannerStore';
import { colors, radius, spacing } from '../theme/tokens';

export function ErrorBanner() {
  const message = useErrorBannerStore((s) => s.message);
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { color: colors.text, fontSize: 13, textAlign: 'center' },
});
```
(Task 27 upgrades this with a tap-to-dismiss and auto-hide timer — this version is fully functional as-is.)

- [ ] **Step 2: Replace the root index route with the hydration gate + redirect**

Overwrite `app/index.tsx`:
```tsx
import { Redirect } from 'expo-router';
import { useAppHydrated } from '../src/stores/useAppHydrated';
import { useSettingsStore } from '../src/stores/settingsStore';
import { LoadingState } from '../src/components/LoadingState';

export default function Index() {
  const hydrated = useAppHydrated();
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);

  if (!hydrated) return <LoadingState />;
  return hasCompletedOnboarding ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding/welcome" />;
}
```

- [ ] **Step 3: Create the onboarding stack layout and a stub welcome screen**

Create `app/onboarding/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
```

Create `app/onboarding/welcome.tsx` (stub, replaced fully in Task 14):
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function WelcomeScreen() {
  return (
    <Screen>
      <Text>Welcome — onboarding coming in Task 14</Text>
    </Screen>
  );
}
```

- [ ] **Step 4: Create the tab bar layout**

Create `app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Home, List, PieChart, Target, Menu } from 'lucide-react-native';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.borderStrong, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: ({ color, size }) => <List color={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} /> }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: ({ color, size }) => <Target color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Create stub tab screens (replaced fully in Tasks 17, 18, 20, 21, 24)**

Create `app/(tabs)/index.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function HomeScreen() {
  return (
    <Screen>
      <Text>Home — built in Task 17</Text>
    </Screen>
  );
}
```

Create `app/(tabs)/transactions.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function TransactionsScreen() {
  return (
    <Screen>
      <Text>Transactions — built in Task 18</Text>
    </Screen>
  );
}
```

Create `app/(tabs)/insights.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function InsightsScreen() {
  return (
    <Screen>
      <Text>Insights — built in Task 20</Text>
    </Screen>
  );
}
```

Create `app/(tabs)/goals.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function GoalsScreen() {
  return (
    <Screen>
      <Text>Goals — built in Task 21</Text>
    </Screen>
  );
}
```

Create `app/(tabs)/more.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';

export default function MoreScreen() {
  return (
    <Screen>
      <Text>More — built in Task 24</Text>
    </Screen>
  );
}
```

- [ ] **Step 6: Verify in Expo web preview**

Run: `npx expo start --web`
Expected: app boots, shows the loading spinner briefly, then redirects to the Welcome stub screen (fresh install → `hasCompletedOnboarding` is `false`). No red-box errors.

- [ ] **Step 7: Commit**

```bash
git add app/_layout.tsx app/index.tsx app/onboarding app/"(tabs)" src/components/ErrorBanner.tsx
git commit -m "feat: wire up root layout, font loading, hydration gate, and tab navigation shell"
```

### Task 14: Onboarding — Welcome + Add Account(s)

**Files:**
- Modify: `app/onboarding/welcome.tsx` (replace Task 13's stub)
- Create: `app/onboarding/accounts.tsx`

**Interfaces:**
- Consumes: `Screen`, `Button`, `FormField`, `Card`, `ListRow` from Tasks 10–12; `useAccountsStore` from Task 8.
- Produces: the first two onboarding steps; navigates to `/onboarding/income` on completion (built in Task 15).

- [ ] **Step 1: Replace the Welcome screen**

Overwrite `app/onboarding/welcome.tsx`:
```tsx
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, spacing } from '../../src/theme/tokens';

export default function WelcomeScreen() {
  return (
    <Screen>
      <Text style={styles.eyebrow}>WELCOME TO</Text>
      <Text style={styles.title}>JM Finance Tracker</Text>
      <Text style={styles.body}>
        Track your accounts, transactions, bills, and goals — all in Jamaican dollars, all on your device.
      </Text>
      <Button label="Get Started" onPress={() => router.push('/onboarding/accounts')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1, marginTop: spacing.xxxl },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.lg },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: spacing.xxxl },
});
```

- [ ] **Step 2: Create the Add Account(s) screen**

Create `app/onboarding/accounts.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { ListRow } from '../../src/components/ListRow';
import { Card } from '../../src/components/Card';
import { colors, spacing } from '../../src/theme/tokens';
import { useAccountsStore } from '../../src/stores/accountsStore';

export default function OnboardingAccountsScreen() {
  const accounts = useAccountsStore((s) => s.accounts);
  const addAccount = useAccountsStore((s) => s.addAccount);
  const [name, setName] = useState('');
  const [balanceText, setBalanceText] = useState('');

  function handleAdd() {
    const balance = parseFloat(balanceText);
    if (!name || isNaN(balance)) return;
    addAccount({ name, type: 'checking', balance });
    setName('');
    setBalanceText('');
  }

  return (
    <Screen>
      <Text style={styles.title}>Add your accounts</Text>
      <Text style={styles.body}>Add at least one account to get started. You can add more or edit later.</Text>
      {accounts.length > 0 ? (
        <Card style={{ marginBottom: spacing.lg }}>
          {accounts.map((a, i) => (
            <ListRow
              key={a.id}
              icon={<Wallet size={16} color={colors.textSecondary} />}
              title={a.name}
              amount={a.balance}
              isLast={i === accounts.length - 1}
            />
          ))}
        </Card>
      ) : null}
      <FormField label="Account name" value={name} onChangeText={setName} placeholder="e.g. NCB Checking" />
      <View style={{ height: spacing.md }} />
      <FormField label="Balance (J$)" value={balanceText} onChangeText={setBalanceText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <Button label="Add Account" variant="secondary" onPress={handleAdd} disabled={!name || !balanceText} />
      <View style={{ height: spacing.xl }} />
      <Button label="Continue" onPress={() => router.push('/onboarding/income')} disabled={accounts.length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xl },
});
```

- [ ] **Step 3: Verify in Expo web preview**

Run: `npx expo start --web`. From Welcome, tap "Get Started". Add an account with a name and balance, confirm it appears in the list and "Continue" becomes enabled.
Expected: no errors; "Continue" is disabled until at least one account exists; navigates toward `/onboarding/income` (a 404/blank screen is expected until Task 15 creates it — that's fine for this task).

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/welcome.tsx app/onboarding/accounts.tsx
git commit -m "feat: build onboarding Welcome and Add Account(s) screens"
```

---

### Task 15: Onboarding — Set Monthly Income + Recurring Bills (skippable)

**Files:**
- Create: `app/onboarding/income.tsx`, `app/onboarding/recurring.tsx`

**Interfaces:**
- Consumes: `useSettingsStore` (Task 8), `useRecurringStore`, `useAccountsStore`, `useCategoriesStore` (Task 8), `Screen`/`FormField`/`Button`/`Card`/`ListRow` (Tasks 10–12).
- Produces: navigates `/onboarding/income` → `/onboarding/recurring` → `/onboarding/goals` (built in Task 16).

- [ ] **Step 1: Create the income estimate screen**

Create `app/onboarding/income.tsx`:
```tsx
import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { colors, spacing } from '../../src/theme/tokens';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function OnboardingIncomeScreen() {
  const setMonthlyIncomeEstimate = useSettingsStore((s) => s.setMonthlyIncomeEstimate);
  const [incomeText, setIncomeText] = useState('');

  function handleContinue() {
    const income = parseFloat(incomeText);
    if (!isNaN(income)) setMonthlyIncomeEstimate(income);
    router.push('/onboarding/recurring');
  }

  return (
    <Screen>
      <Text style={styles.title}>Estimate your monthly income</Text>
      <Text style={styles.body}>This helps calculate your Safe to Spend figure.</Text>
      <FormField label="Monthly income (J$)" value={incomeText} onChangeText={setIncomeText} keyboardType="decimal-pad" placeholder="0.00" />
      <View style={{ height: spacing.xl }} />
      <Button label="Continue" onPress={handleContinue} disabled={!incomeText} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xl },
});
```

- [ ] **Step 2: Create the recurring bills screen (skippable)**

Create `app/onboarding/recurring.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { ListRow } from '../../src/components/ListRow';
import { Card } from '../../src/components/Card';
import { colors, spacing } from '../../src/theme/tokens';
import { useRecurringStore } from '../../src/stores/recurringStore';
import { useAccountsStore } from '../../src/stores/accountsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

export default function OnboardingRecurringScreen() {
  const rules = useRecurringStore((s) => s.rules);
  const addRule = useRecurringStore((s) => s.addRule);
  const accounts = useAccountsStore((s) => s.accounts);
  const categories = useCategoriesStore((s) => s.categories);
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');

  function handleAdd() {
    const amount = parseFloat(amountText);
    if (!name || isNaN(amount) || accounts.length === 0 || categories.length === 0) return;
    addRule({
      name,
      amount,
      frequency: 'monthly',
      accountId: accounts[0].id,
      categoryId: categories[0].id,
      nextDueDate: new Date().toISOString(),
    });
    setName('');
    setAmountText('');
  }

  return (
    <Screen>
      <Text style={styles.title}>Recurring bills</Text>
      <Text style={styles.body}>Add any regular bills. You can skip this and add them later.</Text>
      {rules.length > 0 ? (
        <Card style={{ marginBottom: spacing.lg }}>
          {rules.map((r, i) => (
            <ListRow key={r.id} icon={<Repeat size={16} color={colors.textSecondary} />} title={r.name} amount={-r.amount} isLast={i === rules.length - 1} />
          ))}
        </Card>
      ) : null}
      <FormField label="Bill name" value={name} onChangeText={setName} placeholder="e.g. Rent" />
      <View style={{ height: spacing.md }} />
      <FormField label="Amount (J$)" value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <Button label="Add Bill" variant="secondary" onPress={handleAdd} disabled={!name || !amountText} />
      <View style={{ height: spacing.xl }} />
      <Button label="Continue" onPress={() => router.push('/onboarding/goals')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xl },
});
```
Note this screen is "skippable" per spec: unlike the accounts step, "Continue" here has no `disabled` condition — a user can proceed with zero recurring rules.

- [ ] **Step 3: Verify in Expo web preview**

Walk through Welcome → Add Account → Income (enter a number, Continue) → Recurring (tap Continue without adding a bill — should proceed).
Expected: no errors; income screen requires a value; recurring screen does not.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/income.tsx app/onboarding/recurring.tsx
git commit -m "feat: build onboarding income estimate and skippable recurring bills screens"
```

---

### Task 16: Onboarding — Choose Goals + Done

**Files:**
- Create: `app/onboarding/goals.tsx`, `app/onboarding/done.tsx`

**Interfaces:**
- Consumes: `useGoalsStore` (Task 8), `useSettingsStore.setHasCompletedOnboarding` (Task 8), `Screen`/`FormField`/`Button`/`Card`/`ListRow` (Tasks 10–12).
- Produces: completes the onboarding stack — `done.tsx` sets `hasCompletedOnboarding = true` and replaces the route stack with `/(tabs)`, closing the loop back to `app/index.tsx` (Task 13).

- [ ] **Step 1: Create the goals selection screen**

Create `app/onboarding/goals.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Target } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { ListRow } from '../../src/components/ListRow';
import { Card } from '../../src/components/Card';
import { colors, spacing } from '../../src/theme/tokens';
import { useGoalsStore } from '../../src/stores/goalsStore';

export default function OnboardingGoalsScreen() {
  const goals = useGoalsStore((s) => s.goals);
  const addGoal = useGoalsStore((s) => s.addGoal);
  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');

  function handleAdd() {
    const target = parseFloat(targetText);
    if (!name || isNaN(target)) return;
    addGoal({ name, icon: 'target', targetAmount: target });
    setName('');
    setTargetText('');
  }

  return (
    <Screen>
      <Text style={styles.title}>Choose your goals</Text>
      <Text style={styles.body}>Set savings goals to work toward. Optional — you can add these later too.</Text>
      {goals.length > 0 ? (
        <Card style={{ marginBottom: spacing.lg }}>
          {goals.map((g, i) => (
            <ListRow key={g.id} icon={<Target size={16} color={colors.textSecondary} />} title={g.name} amount={g.targetAmount} isLast={i === goals.length - 1} />
          ))}
        </Card>
      ) : null}
      <FormField label="Goal name" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
      <View style={{ height: spacing.md }} />
      <FormField label="Target amount (J$)" value={targetText} onChangeText={setTargetText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <Button label="Add Goal" variant="secondary" onPress={handleAdd} disabled={!name || !targetText} />
      <View style={{ height: spacing.xl }} />
      <Button label="Continue" onPress={() => router.push('/onboarding/done')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xl },
});
```

- [ ] **Step 2: Create the Done screen**

Create `app/onboarding/done.tsx`:
```tsx
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, spacing } from '../../src/theme/tokens';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function OnboardingDoneScreen() {
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);

  function handleFinish() {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <Text style={styles.title}>You're all set</Text>
      <Text style={styles.body}>Your finance tracker is ready to go.</Text>
      <Button label="Go to Home" onPress={handleFinish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: spacing.xxxl, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: 15, marginBottom: spacing.xxxl },
});
```

- [ ] **Step 3: Verify the full onboarding flow end-to-end in Expo web preview**

Walk through all 6 steps: Welcome → Add Account → Income → Recurring (skip) → Goals (skip) → Done → tap "Go to Home".
Expected: lands on the Home tab stub ("Home — built in Task 17"); reloading the page (web) now skips onboarding entirely and goes straight to the tab stub, proving `hasCompletedOnboarding` persisted.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/goals.tsx app/onboarding/done.tsx
git commit -m "feat: build onboarding goals selection and done screens, completing the onboarding flow"
```

### Task 17: Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx` (replace Task 13's stub)

**Interfaces:**
- Consumes: `calculateSafeToSpend` (Task 5); `useAccountsStore`, `useRecurringStore`, `useTransactionsStore`, `useCategoriesStore` (Task 8); `Screen`, `Card`, `StatFigure`, `ListRow`, `EmptyState`, `IconChip`, `CategoryIcon` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: the Home tab — Safe-to-Spend hero, income/spending/upcoming stat row, quick actions, recent transactions. Links to `/transaction/new` (Task 19), `/debt` (Task 22), `/cash-flow` (Task 23).

- [ ] **Step 1: Replace the Home screen**

Overwrite `app/(tabs)/index.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Plus, CreditCard, TrendingUp } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { StatFigure } from '../../src/components/StatFigure';
import { ListRow } from '../../src/components/ListRow';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { colors, spacing } from '../../src/theme/tokens';
import { formatMoney } from '../../src/lib/money';
import { calculateSafeToSpend } from '../../src/lib/safeToSpend';
import { useAccountsStore } from '../../src/stores/accountsStore';
import { useRecurringStore } from '../../src/stores/recurringStore';
import { useTransactionsStore } from '../../src/stores/transactionsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

export default function HomeScreen() {
  const accounts = useAccountsStore((s) => s.accounts);
  const recurringRules = useRecurringStore((s) => s.rules);
  const transactions = useTransactionsStore((s) => s.transactions);
  const categories = useCategoriesStore((s) => s.categories);

  const safeToSpend = calculateSafeToSpend(accounts, recurringRules);
  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const monthIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthSpending = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const upcoming = recurringRules.reduce((s, r) => s + r.amount, 0);

  return (
    <Screen>
      <Card emphasis style={styles.hero}>
        <Text style={styles.eyebrow}>SAFE TO SPEND</Text>
        <Text style={styles.heroFigure}>{formatMoney(safeToSpend)}</Text>
      </Card>

      <View style={styles.statRow}>
        <StatFigure label="Income" amount={monthIncome} tone="positive" />
        <StatFigure label="Spending" amount={monthSpending} />
        <StatFigure label="Upcoming" amount={upcoming} />
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.quickAction} onPress={() => router.push('/transaction/new')}>
          <Plus size={18} color={colors.text} />
          <Text style={styles.quickActionLabel}>Add Transaction</Text>
        </Pressable>
        <Pressable style={styles.quickAction} onPress={() => router.push('/debt')}>
          <CreditCard size={18} color={colors.text} />
          <Text style={styles.quickActionLabel}>View Debt</Text>
        </Pressable>
        <Pressable style={styles.quickAction} onPress={() => router.push('/cash-flow')}>
          <TrendingUp size={18} color={colors.text} />
          <Text style={styles.quickActionLabel}>Cash Flow</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {recent.length === 0 ? (
        <EmptyState
          icon={<IconChip><Plus size={16} color={colors.textMuted} /></IconChip>}
          message="No transactions yet."
          ctaLabel="Add Transaction"
          onPressCta={() => router.push('/transaction/new')}
        />
      ) : (
        <Card>
          {recent.map((t, i) => {
            const category = categories.find((c) => c.id === t.categoryId);
            return (
              <ListRow
                key={t.id}
                icon={<CategoryIcon name={category?.icon ?? 'more-horizontal'} />}
                title={category?.name ?? 'Uncategorized'}
                caption={t.note || new Date(t.date).toLocaleDateString()}
                amount={t.amount}
                isLast={i === recent.length - 1}
                onPress={() => router.push(`/transaction/${t.id}`)}
              />
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', marginBottom: spacing.xl, gap: spacing.sm },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1 },
  heroFigure: { color: colors.text, fontSize: 60, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  quickActions: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: spacing.xl },
  quickAction: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.lg },
  quickActionLabel: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
});
```

- [ ] **Step 2: Verify in Expo web preview**

Run `npx expo start --web`. Complete onboarding with one account and no transactions.
Expected: Home shows Safe to Spend equal to the account balance, all stat figures at `J$0.00`, and the empty state under "Recent Transactions" with a working "Add Transaction" CTA (navigates to a 404 until Task 19 — expected for now).

- [ ] **Step 3: Commit**

```bash
git add app/"(tabs)"/index.tsx
git commit -m "feat: build Home screen with Safe to Spend hero and recent transactions"
```

---

### Task 18: Transactions screen (grouped list, filter, search)

**Files:**
- Modify: `app/(tabs)/transactions.tsx` (replace Task 13's stub)

**Interfaces:**
- Consumes: `useTransactionsStore`, `useCategoriesStore`, `useAccountsStore` (Task 8); `Screen`, `Card`, `ListRow`, `EmptyState`, `IconChip`, `CategoryIcon`, `SegmentedControl` (Tasks 10–12).
- Produces: the Transactions tab. Links to `/transaction/new` and `/transaction/:id` (Task 19).

- [ ] **Step 1: Replace the Transactions screen**

Overwrite `app/(tabs)/transactions.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SectionList } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListRow } from '../../src/components/ListRow';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors, spacing } from '../../src/theme/tokens';
import { useTransactionsStore } from '../../src/stores/transactionsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';
import { useAccountsStore } from '../../src/stores/accountsStore';

export default function TransactionsScreen() {
  const transactions = useTransactionsStore((s) => s.transactions);
  const categories = useCategoriesStore((s) => s.categories);
  const accounts = useAccountsStore((s) => s.accounts);
  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId);
      const matchesQuery =
        query === '' ||
        t.note.toLowerCase().includes(query.toLowerCase()) ||
        (category?.name.toLowerCase().includes(query.toLowerCase()) ?? false);
      const matchesAccount = accountFilter === 'all' || t.accountId === accountFilter;
      return matchesQuery && matchesAccount;
    });
  }, [transactions, categories, query, accountFilter]);

  const sections = useMemo(() => {
    const byDate = new Map<string, typeof filtered>();
    for (const t of [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1))) {
      const day = t.date.slice(0, 10);
      byDate.set(day, [...(byDate.get(day) ?? []), t]);
    }
    return Array.from(byDate.entries()).map(([date, data]) => ({ title: date, data }));
  }, [filtered]);

  return (
    <Screen scroll={false} padded={false}>
      <Text style={styles.title}>Transactions</Text>
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.filterRow}>
        <SegmentedControl
          options={[{ label: 'All Accounts', value: 'all' }, ...accounts.map((a) => ({ label: a.name, value: a.id }))]}
          value={accountFilter}
          onChange={setAccountFilter}
        />
      </View>
      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={<IconChip><Plus size={16} color={colors.textMuted} /></IconChip>}
            message="No transactions match."
            ctaLabel="Add Transaction"
            onPressCta={() => router.push('/transaction/new')}
          />
        </View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => {
            const category = categories.find((c) => c.id === item.categoryId);
            return (
              <Card style={styles.rowCard}>
                <ListRow
                  icon={<CategoryIcon name={category?.icon ?? 'more-horizontal'} />}
                  title={category?.name ?? 'Uncategorized'}
                  caption={item.note}
                  amount={item.amount}
                  isLast
                  onPress={() => router.push(`/transaction/${item.id}`)}
                />
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.lg, paddingHorizontal: spacing.xl },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: spacing.md },
  filterRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  emptyWrap: { paddingHorizontal: spacing.xl },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  rowCard: { marginBottom: spacing.sm, padding: spacing.md },
});
```

- [ ] **Step 2: Verify in Expo web preview**

Expected: empty state shows with zero transactions; search box and account filter render without errors (filter has no effect yet since there's nothing to filter).

- [ ] **Step 3: Commit**

```bash
git add app/"(tabs)"/transactions.tsx
git commit -m "feat: build Transactions screen with search, account filter, and date grouping"
```

---

### Task 19: Add/Edit Transaction modal

**Files:**
- Create: `app/transaction/[id].tsx`

**Interfaces:**
- Consumes: `createTransaction`, `editTransaction`, `deleteTransaction` (Task 9); `useAccountsStore`, `useCategoriesStore`, `useTransactionsStore` (Task 8); `Screen`, `FormField`, `Button`, `SegmentedControl` (Tasks 10–12).
- Produces: the shared add/edit modal reused by every "Add Transaction" entry point (Home, Transactions, onboarding). `id === 'new'` renders create mode; any other `id` loads and pre-fills that transaction for editing, with a Delete action.

- [ ] **Step 1: Create the Add/Edit Transaction screen**

Create `app/transaction/[id].tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert as RNAlert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors, spacing } from '../../src/theme/tokens';
import { useAccountsStore } from '../../src/stores/accountsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';
import { useTransactionsStore } from '../../src/stores/transactionsStore';
import { createTransaction, editTransaction, deleteTransaction } from '../../src/lib/transactionActions';

export default function AddEditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useTransactionsStore((s) => s.transactions.find((t) => t.id === id));
  const accounts = useAccountsStore((s) => s.accounts);
  const categories = useCategoriesStore((s) => s.categories);

  const [type, setType] = useState<'expense' | 'income'>(existing?.type === 'income' ? 'income' : 'expense');
  const [amountText, setAmountText] = useState(existing ? Math.abs(existing.amount).toString() : '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');

  const amount = parseFloat(amountText);
  const isValid = !isNaN(amount) && amount > 0 && accountId !== '' && categoryId !== '';

  function handleSave() {
    if (!isValid) {
      setError('Enter a valid amount, account, and category.');
      return;
    }
    const signedAmount = type === 'income' ? amount : -amount;
    if (isNew) {
      createTransaction({ accountId, categoryId, amount: signedAmount, note, date: new Date().toISOString(), type });
    } else if (existing) {
      editTransaction(existing.id, { accountId, categoryId, amount: signedAmount, note, type });
    }
    router.back();
  }

  function handleDelete() {
    if (!existing) return;
    RNAlert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTransaction(existing.id); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.title}>{isNew ? 'Add Transaction' : 'Edit Transaction'}</Text>
      <SegmentedControl
        options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }] as const}
        value={type}
        onChange={setType}
      />
      <View style={{ height: spacing.lg }} />
      <FormField label="Amount (J$)" value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0.00" error={error} />
      <View style={{ height: spacing.md }} />
      <Text style={styles.label}>Account</Text>
      <View style={styles.chipRow}>
        {accounts.map((a) => (
          <Pressable key={a.id} onPress={() => setAccountId(a.id)} style={[styles.chip, accountId === a.id && styles.chipActive]}>
            <Text style={[styles.chipLabel, accountId === a.id && styles.chipLabelActive]}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, categoryId === c.id && styles.chipActive]}>
            <Text style={[styles.chipLabel, categoryId === c.id && styles.chipLabelActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      <FormField label="Note" value={note} onChangeText={setNote} placeholder="Optional note" />
      <View style={{ height: spacing.xl }} />
      <Button label="Save" onPress={handleSave} disabled={!isValid} />
      {!isNew ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Delete" variant="secondary" onPress={handleDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipLabelActive: { color: colors.accentInk },
});
```

- [ ] **Step 2: Verify the full add → edit → delete cycle in Expo web preview**

From Home or Transactions, tap "Add Transaction". Enter an amount, pick an account/category, save. Confirm: the transaction now appears on Home and Transactions, and the account balance (visible once Task 24's Accounts screen exists, or infer from Home's Safe to Spend) has shifted by the signed amount. Tap the transaction to edit it, change the amount, save, confirm the balance shifts by the difference. Tap Delete, confirm the balance returns to its pre-transaction value and the transaction disappears from both lists.
Expected: all three flows work with no errors; the modal presents distinctly (slide-up on iOS/web).

- [ ] **Step 3: Commit**

```bash
git add app/transaction
git commit -m "feat: build Add/Edit Transaction modal with delete confirmation"
```

### Task 20: Insights screen

**Files:**
- Modify: `app/(tabs)/insights.tsx` (replace Task 13's stub)

**Interfaces:**
- Consumes: `categoryTotals`, `incomeVsSpendingTrend`, `topTransactions` (Task 7); `addMonths` (Task 4); `useTransactionsStore`, `useCategoriesStore` (Task 8); `Screen`, `Card`, `EmptyState`, `IconChip`, `CategoryIcon` (Tasks 10–12).
- Produces: the Insights tab — category breakdown with % change, weekly income-vs-spending trend, top 5 transactions.

- [ ] **Step 1: Replace the Insights screen**

Overwrite `app/(tabs)/insights.tsx`:
```tsx
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { colors, spacing } from '../../src/theme/tokens';
import { formatMoney } from '../../src/lib/money';
import { categoryTotals, incomeVsSpendingTrend, topTransactions } from '../../src/lib/insights';
import { addMonths } from '../../src/lib/date';
import { useTransactionsStore } from '../../src/stores/transactionsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

export default function InsightsScreen() {
  const transactions = useTransactionsStore((s) => s.transactions);
  const categories = useCategoriesStore((s) => s.categories);

  const now = new Date().toISOString();
  const periodStart = addMonths(now, -1);
  const previousPeriodStart = addMonths(now, -2);

  const totals = useMemo(
    () => categoryTotals(transactions, periodStart, now, previousPeriodStart, periodStart),
    [transactions]
  );
  const trend = useMemo(() => incomeVsSpendingTrend(transactions, 'week', 6, now), [transactions]);
  const top5 = useMemo(() => topTransactions(transactions, periodStart, now, 5), [transactions]);

  if (transactions.length === 0) {
    return (
      <Screen>
        <Text style={styles.title}>Insights</Text>
        <EmptyState icon={<IconChip><PieChart size={16} color={colors.textMuted} /></IconChip>} message="Add transactions to see insights." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Insights</Text>

      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      <Card style={styles.section}>
        {totals.map((t, i) => {
          const category = categories.find((c) => c.id === t.categoryId);
          return (
            <View key={t.categoryId} style={[styles.categoryRow, i < totals.length - 1 && styles.divider]}>
              <IconChip><CategoryIcon name={category?.icon ?? 'more-horizontal'} /></IconChip>
              <View style={styles.categoryTextStack}>
                <Text style={styles.categoryName}>{category?.name ?? 'Uncategorized'}</Text>
                {t.percentChange !== null ? (
                  <Text style={styles.categoryChange}>
                    {t.percentChange > 0 ? '+' : ''}
                    {t.percentChange}% vs last period
                  </Text>
                ) : null}
              </View>
              <Text style={styles.categoryAmount}>{formatMoney(t.total)}</Text>
            </View>
          );
        })}
      </Card>

      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <Card style={styles.section}>
        {trend.map((bucket) => (
          <View key={bucket.label} style={styles.trendRow}>
            <Text style={styles.trendLabel}>{bucket.label}</Text>
            <Text style={styles.trendIncome}>+{formatMoney(bucket.income)}</Text>
            <Text style={styles.trendSpending}>-{formatMoney(bucket.spending)}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Top Transactions</Text>
      <Card style={styles.section}>
        {top5.map((t, i) => {
          const category = categories.find((c) => c.id === t.categoryId);
          return (
            <View key={t.id} style={[styles.categoryRow, i < top5.length - 1 && styles.divider]}>
              <IconChip><CategoryIcon name={category?.icon ?? 'more-horizontal'} /></IconChip>
              <Text style={styles.categoryTextStack}>{category?.name ?? 'Uncategorized'}</Text>
              <Text style={styles.categoryAmount}>{formatMoney(t.amount)}</Text>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  section: { marginBottom: spacing.lg },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  categoryTextStack: { flex: 1, gap: 2 },
  categoryName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  categoryChange: { color: colors.textMuted, fontSize: 11 },
  categoryAmount: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  trendLabel: { color: colors.textMuted, fontSize: 12, flex: 1 },
  trendIncome: { color: colors.accent, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trendSpending: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: spacing.md },
});
```

- [ ] **Step 2: Verify in Expo web preview**

With zero transactions: Insights shows the empty state. After adding 2–3 transactions in different categories (via Task 19's modal): Category Breakdown lists them sorted by total descending, Weekly Trend shows 6 week buckets, Top Transactions lists up to 5 sorted by absolute amount.
Expected: no errors; percent-change text only appears where a previous-period value exists.

- [ ] **Step 3: Commit**

```bash
git add app/"(tabs)"/insights.tsx
git commit -m "feat: build Insights screen with category breakdown, trend, and top transactions"
```

---

### Task 21: Goals screen + Goal detail/create screen

**Files:**
- Modify: `app/(tabs)/goals.tsx` (replace Task 13's stub)
- Create: `app/goal/[id].tsx`

**Interfaces:**
- Consumes: `useGoalsStore`, `useAccountsStore`, `useCategoriesStore` (Task 8); `createTransaction` (Task 9); `Screen`, `Card`, `ProgressBar`, `EmptyState`, `IconChip`, `FormField`, `Button` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: the Goals tab (list + progress bars) and `/goal/[id]` — `id === 'new'` creates a goal, any other `id` shows progress + an "Add contribution" action that creates a `goal_contribution` transaction via `createTransaction`.

- [ ] **Step 1: Replace the Goals list screen**

Overwrite `app/(tabs)/goals.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Target, Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ProgressBar } from '../../src/components/ProgressBar';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { colors, spacing } from '../../src/theme/tokens';
import { formatMoney } from '../../src/lib/money';
import { useGoalsStore } from '../../src/stores/goalsStore';

export default function GoalsScreen() {
  const goals = useGoalsStore((s) => s.goals);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Pressable onPress={() => router.push('/goal/new')}>
          <Plus size={22} color={colors.accent} />
        </Pressable>
      </View>
      {goals.length === 0 ? (
        <EmptyState
          icon={<IconChip><Target size={16} color={colors.textMuted} /></IconChip>}
          message="No goals yet."
          ctaLabel="Add Goal"
          onPressCta={() => router.push('/goal/new')}
        />
      ) : (
        goals.map((g) => (
          <Pressable key={g.id} onPress={() => router.push(`/goal/${g.id}`)}>
            <Card style={styles.goalCard}>
              <Text style={styles.goalName}>{g.name}</Text>
              <ProgressBar progress={g.currentAmount / g.targetAmount} />
              <Text style={styles.goalAmounts}>
                {formatMoney(g.currentAmount)} of {formatMoney(g.targetAmount)}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  goalCard: { marginBottom: spacing.md, gap: spacing.sm },
  goalName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  goalAmounts: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Create the Goal detail/create screen**

Create `app/goal/[id].tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { ProgressBar } from '../../src/components/ProgressBar';
import { colors, spacing } from '../../src/theme/tokens';
import { formatMoney } from '../../src/lib/money';
import { useGoalsStore } from '../../src/stores/goalsStore';
import { useAccountsStore } from '../../src/stores/accountsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';
import { createTransaction } from '../../src/lib/transactionActions';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const goal = useGoalsStore((s) => s.goals.find((g) => g.id === id));
  const addGoal = useGoalsStore((s) => s.addGoal);
  const accounts = useAccountsStore((s) => s.accounts);
  const categories = useCategoriesStore((s) => s.categories);
  const transferCategory = categories.find((c) => c.name === 'Transfer');

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [contribution, setContribution] = useState('');

  function handleCreate() {
    const target = parseFloat(targetAmount);
    if (!name || isNaN(target) || target <= 0) return;
    addGoal({ name, icon: 'target', targetAmount: target });
    router.back();
  }

  function handleAddContribution() {
    const amount = parseFloat(contribution);
    if (!goal || isNaN(amount) || amount <= 0 || accounts.length === 0 || !transferCategory) return;
    createTransaction({
      accountId: accounts[0].id,
      categoryId: transferCategory.id,
      amount: -amount,
      note: `Contribution to ${goal.name}`,
      date: new Date().toISOString(),
      type: 'goal_contribution',
      goalId: goal.id,
    });
    setContribution('');
  }

  if (isNew) {
    return (
      <Screen>
        <Text style={styles.title}>New Goal</Text>
        <FormField label="Goal name" value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" />
        <View style={{ height: spacing.md }} />
        <FormField label="Target amount (J$)" value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" placeholder="0.00" />
        <View style={{ height: spacing.xl }} />
        <Button label="Create Goal" onPress={handleCreate} disabled={!name || !targetAmount} />
      </Screen>
    );
  }

  if (!goal) {
    return (
      <Screen>
        <Text style={styles.title}>Goal not found</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{goal.name}</Text>
      <ProgressBar progress={goal.currentAmount / goal.targetAmount} />
      <Text style={styles.amounts}>
        {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}
      </Text>
      <View style={{ height: spacing.xl }} />
      <FormField label="Add contribution (J$)" value={contribution} onChangeText={setContribution} keyboardType="decimal-pad" placeholder="0.00" />
      <View style={{ height: spacing.md }} />
      <Button label="Add Contribution" onPress={handleAddContribution} disabled={!contribution} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  amounts: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 3: Verify the full create → contribute cycle in Expo web preview**

Tap "+" on Goals, create a goal with a target. Tap into it, add a contribution smaller than the target. Confirm the progress bar and amounts update, and the contribution shows up as a `Transfer`-category transaction on the Transactions screen.
Expected: no errors; progress bar clamps at 100% if a contribution exceeds the target.

- [ ] **Step 4: Commit**

```bash
git add app/"(tabs)"/goals.tsx app/goal
git commit -m "feat: build Goals list and Goal detail/create screen with contributions"
```

### Task 22: Debt screen + Add/Edit Debt

**Files:**
- Create: `app/debt.tsx`, `app/debts/[id].tsx`

**Interfaces:**
- Consumes: `projectDebtPayoff` (Task 6); `useDebtsStore` (Task 8); `Screen`, `Card`, `EmptyState`, `IconChip`, `SegmentedControl`, `FormField`, `Button` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: `/debt` (linked from Home's quick actions and More) and `/debts/[id]` for add/edit/delete. The spec's Screens table (§6) does not list a separate debt-entry screen, so debts are managed the same way as accounts/recurring bills — via a "+" on the Debt overview — for consistency with every other entity in the app.

- [ ] **Step 1: Create the Debt overview screen**

Create `app/debt.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { EmptyState } from '../src/components/EmptyState';
import { IconChip } from '../src/components/IconChip';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { FormField } from '../src/components/FormField';
import { colors, spacing } from '../src/theme/tokens';
import { formatMoney } from '../src/lib/money';
import { projectDebtPayoff } from '../src/lib/debtPayoff';
import { useDebtsStore } from '../src/stores/debtsStore';

export default function DebtScreen() {
  const debts = useDebtsStore((s) => s.debts);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [extraText, setExtraText] = useState('0');

  const totalOwed = debts.reduce((s, d) => s + d.balance, 0);
  const extra = parseFloat(extraText) || 0;
  const projection = useMemo(() => projectDebtPayoff(debts, extra), [debts, extra]);
  const result = projection[strategy];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Debt</Text>
        <Pressable onPress={() => router.push('/debts/new')}>
          <Plus size={22} color={colors.accent} />
        </Pressable>
      </View>
      {debts.length === 0 ? (
        <EmptyState
          icon={<IconChip><CreditCard size={16} color={colors.textMuted} /></IconChip>}
          message="No debts tracked."
          ctaLabel="Add Debt"
          onPressCta={() => router.push('/debts/new')}
        />
      ) : (
        <>
          <Card style={styles.totalCard}>
            <Text style={styles.eyebrow}>TOTAL OWED</Text>
            <Text style={styles.totalFigure}>{formatMoney(totalOwed)}</Text>
          </Card>

          <Card emphasis style={styles.projectionCard}>
            <Text style={styles.sectionTitle}>Payoff Projection</Text>
            <SegmentedControl
              options={[{ label: 'Snowball', value: 'snowball' }, { label: 'Avalanche', value: 'avalanche' }] as const}
              value={strategy}
              onChange={setStrategy}
            />
            <View style={{ height: spacing.md }} />
            <FormField label="Extra monthly payment (J$)" value={extraText} onChangeText={setExtraText} keyboardType="decimal-pad" />
            <View style={styles.resultRow}>
              <View>
                <Text style={styles.resultLabel}>Months to debt-free</Text>
                <Text style={styles.resultValue}>{result.months}</Text>
              </View>
              <View>
                <Text style={styles.resultLabel}>Total interest</Text>
                <Text style={styles.resultValue}>{formatMoney(result.totalInterest)}</Text>
              </View>
            </View>
          </Card>

          {debts.map((d) => (
            <Pressable key={d.id} onPress={() => router.push(`/debts/${d.id}`)}>
              <Card style={styles.debtRow}>
                <Text style={styles.debtName}>{d.name}</Text>
                <Text style={styles.debtDetail}>
                  {formatMoney(d.balance)} · {d.interestRate}% APR · Min {formatMoney(d.minPayment)}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  totalCard: { marginBottom: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1 },
  totalFigure: { color: colors.text, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  projectionCard: { marginBottom: spacing.lg, gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  resultLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  resultValue: { color: colors.accent, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  debtRow: { marginBottom: spacing.sm, gap: 4 },
  debtName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  debtDetail: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Create the Add/Edit Debt screen**

Create `app/debts/[id].tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert as RNAlert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { colors, spacing } from '../../src/theme/tokens';
import { useDebtsStore } from '../../src/stores/debtsStore';

export default function DebtEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const debt = useDebtsStore((s) => s.debts.find((d) => d.id === id));
  const addDebt = useDebtsStore((s) => s.addDebt);
  const updateDebt = useDebtsStore((s) => s.updateDebt);
  const removeDebt = useDebtsStore((s) => s.removeDebt);

  const [name, setName] = useState(debt?.name ?? '');
  const [balanceText, setBalanceText] = useState(debt ? debt.balance.toString() : '');
  const [rateText, setRateText] = useState(debt ? debt.interestRate.toString() : '');
  const [minPaymentText, setMinPaymentText] = useState(debt ? debt.minPayment.toString() : '');

  function handleSave() {
    const balance = parseFloat(balanceText);
    const interestRate = parseFloat(rateText);
    const minPayment = parseFloat(minPaymentText);
    if (!name || isNaN(balance) || isNaN(interestRate) || isNaN(minPayment)) return;
    if (isNew) {
      addDebt({ name, balance, interestRate, minPayment, dueDayOfMonth: 1 });
    } else if (debt) {
      updateDebt(debt.id, { name, balance, interestRate, minPayment });
    }
    router.back();
  }

  function handleDelete() {
    if (!debt) return;
    RNAlert.alert('Delete debt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeDebt(debt.id); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.title}>{isNew ? 'Add Debt' : 'Edit Debt'}</Text>
      <FormField label="Debt name" value={name} onChangeText={setName} placeholder="e.g. Credit Card" />
      <View style={{ height: spacing.md }} />
      <FormField label="Balance (J$)" value={balanceText} onChangeText={setBalanceText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <FormField label="Interest rate (APR %)" value={rateText} onChangeText={setRateText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <FormField label="Minimum payment (J$)" value={minPaymentText} onChangeText={setMinPaymentText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.xl }} />
      <Button label="Save" onPress={handleSave} disabled={!name || !balanceText || !rateText || !minPaymentText} />
      {!isNew ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Delete" variant="secondary" onPress={handleDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
});
```

- [ ] **Step 3: Verify in Expo web preview**

Add two debts with different balances/interest rates. On the Debt screen, toggle Snowball/Avalanche and adjust the extra payment field; confirm months/interest update live. Edit a debt's balance and confirm the projection recalculates. Delete a debt and confirm it's removed and the total updates.
Expected: no errors; empty state shows with zero debts.

- [ ] **Step 4: Commit**

```bash
git add app/debt.tsx app/debts
git commit -m "feat: build Debt overview with snowball/avalanche projection and Add/Edit Debt"
```

---

### Task 23: Cash Flow screen

**Files:**
- Create: `app/cash-flow.tsx`

**Interfaces:**
- Consumes: `useAccountsStore`, `useRecurringStore` (Task 8); `Screen`, `Card`, `EmptyState`, `IconChip` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: `/cash-flow`, linked from Home's quick actions — a timeline of upcoming recurring bills plotted against a running projected balance.

- [ ] **Step 1: Create the Cash Flow screen**

Create `app/cash-flow.tsx`:
```tsx
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { EmptyState } from '../src/components/EmptyState';
import { IconChip } from '../src/components/IconChip';
import { colors, spacing } from '../src/theme/tokens';
import { formatMoney } from '../src/lib/money';
import { useAccountsStore } from '../src/stores/accountsStore';
import { useRecurringStore } from '../src/stores/recurringStore';

export default function CashFlowScreen() {
  const accounts = useAccountsStore((s) => s.accounts);
  const rules = useRecurringStore((s) => s.rules);

  const startBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const timeline = useMemo(() => {
    let running = startBalance;
    return [...rules]
      .sort((a, b) => (a.nextDueDate < b.nextDueDate ? -1 : 1))
      .map((r) => {
        running -= r.amount;
        return { id: r.id, name: r.name, date: r.nextDueDate, amount: r.amount, runningBalance: running };
      });
  }, [rules, startBalance]);

  return (
    <Screen>
      <Text style={styles.title}>Cash Flow</Text>
      <Card style={styles.startCard}>
        <Text style={styles.eyebrow}>CURRENT BALANCE</Text>
        <Text style={styles.startFigure}>{formatMoney(startBalance)}</Text>
      </Card>
      {timeline.length === 0 ? (
        <EmptyState icon={<IconChip><TrendingUp size={16} color={colors.textMuted} /></IconChip>} message="No upcoming bills to project." />
      ) : (
        timeline.map((item) => (
          <Card key={item.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.rowAmounts}>
              <Text style={styles.rowAmount}>-{formatMoney(item.amount)}</Text>
              <Text style={styles.rowRunning}>Bal: {formatMoney(item.runningBalance)}</Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  startCard: { marginBottom: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1 },
  startFigure: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowText: { gap: 2 },
  rowName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowDate: { color: colors.textMuted, fontSize: 12 },
  rowAmounts: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowRunning: { color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Verify in Expo web preview**

With no recurring bills: empty state shows. After adding 2 recurring bills with different `nextDueDate` values (via Task 15's onboarding screen or Task 25's Recurring management screen once built): timeline lists them chronologically with a correctly decrementing running balance.
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/cash-flow.tsx
git commit -m "feat: build Cash Flow screen with upcoming bills timeline"
```

### Task 24: More screen + Account management

**Files:**
- Modify: `app/(tabs)/more.tsx` (replace Task 13's stub)
- Create: `app/accounts/index.tsx`, `app/accounts/[id].tsx`

**Interfaces:**
- Consumes: `useAccountsStore` (Task 8); `Screen`, `Card`, `ListRow`, `EmptyState`, `IconChip`, `FormField`, `Button`, `SegmentedControl` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: the More tab (settings hub) linking to `/accounts`, `/categories` (Task 25), `/recurring` (Task 25), `/notifications` (Task 26); and full Account CRUD at `/accounts` and `/accounts/[id]`.

- [ ] **Step 1: Replace the More screen**

Overwrite `app/(tabs)/more.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Wallet, Tag, Repeat, Bell, Info } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListRow } from '../../src/components/ListRow';
import { colors, spacing } from '../../src/theme/tokens';

const ITEMS = [
  { label: 'Accounts', icon: Wallet, route: '/accounts' as const },
  { label: 'Categories', icon: Tag, route: '/categories' as const },
  { label: 'Recurring Bills', icon: Repeat, route: '/recurring' as const },
  { label: 'Notifications', icon: Bell, route: '/notifications' as const },
];

export default function MoreScreen() {
  return (
    <Screen>
      <Text style={styles.title}>More</Text>
      <Card>
        {ITEMS.map((item, i) => (
          <ListRow
            key={item.route}
            icon={<item.icon size={16} color={colors.textSecondary} />}
            title={item.label}
            showChevron
            isLast={i === ITEMS.length - 1}
            onPress={() => router.push(item.route)}
          />
        ))}
      </Card>
      <View style={styles.footer}>
        <Info size={14} color={colors.textMuted} />
        <Text style={styles.footerText}>JM Finance Tracker v1.0</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
```

- [ ] **Step 2: Create the Accounts list screen**

Create `app/accounts/index.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Wallet, Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListRow } from '../../src/components/ListRow';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { colors, spacing } from '../../src/theme/tokens';
import { useAccountsStore } from '../../src/stores/accountsStore';

export default function AccountsScreen() {
  const accounts = useAccountsStore((s) => s.accounts);
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <Pressable onPress={() => router.push('/accounts/new')}>
          <Plus size={22} color={colors.accent} />
        </Pressable>
      </View>
      {accounts.length === 0 ? (
        <EmptyState
          icon={<IconChip><Wallet size={16} color={colors.textMuted} /></IconChip>}
          message="No accounts yet."
          ctaLabel="Add Account"
          onPressCta={() => router.push('/accounts/new')}
        />
      ) : (
        <Card>
          {accounts.map((a, i) => (
            <ListRow
              key={a.id}
              icon={<Wallet size={16} color={colors.textSecondary} />}
              title={a.name}
              caption={a.type}
              amount={a.balance}
              isLast={i === accounts.length - 1}
              onPress={() => router.push(`/accounts/${a.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
```

- [ ] **Step 3: Create the Add/Edit Account screen**

Create `app/accounts/[id].tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert as RNAlert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors, spacing } from '../../src/theme/tokens';
import { useAccountsStore } from '../../src/stores/accountsStore';

const TYPES = [
  { label: 'Checking', value: 'checking' },
  { label: 'Savings', value: 'savings' },
  { label: 'Cash', value: 'cash' },
  { label: 'Credit', value: 'credit' },
] as const;

export default function AccountEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const account = useAccountsStore((s) => s.accounts.find((a) => a.id === id));
  const addAccount = useAccountsStore((s) => s.addAccount);
  const updateAccount = useAccountsStore((s) => s.updateAccount);
  const removeAccount = useAccountsStore((s) => s.removeAccount);

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<(typeof TYPES)[number]['value']>(account?.type ?? 'checking');
  const [balanceText, setBalanceText] = useState(account ? account.balance.toString() : '0');

  function handleSave() {
    const balance = parseFloat(balanceText);
    if (!name || isNaN(balance)) return;
    if (isNew) {
      addAccount({ name, type, balance });
    } else if (account) {
      updateAccount(account.id, { name, type, balance });
    }
    router.back();
  }

  function handleDelete() {
    if (!account) return;
    RNAlert.alert('Delete account?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeAccount(account.id); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.title}>{isNew ? 'Add Account' : 'Edit Account'}</Text>
      <FormField label="Account name" value={name} onChangeText={setName} placeholder="e.g. NCB Checking" />
      <View style={{ height: spacing.md }} />
      <SegmentedControl options={TYPES} value={type} onChange={setType} />
      <View style={{ height: spacing.md }} />
      <FormField label="Balance (J$)" value={balanceText} onChangeText={setBalanceText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.xl }} />
      <Button label="Save" onPress={handleSave} disabled={!name || balanceText === ''} />
      {!isNew ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Delete" variant="secondary" onPress={handleDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
});
```

- [ ] **Step 4: Verify in Expo web preview**

From More, tap Accounts. Add a second account, edit its balance, then delete it — confirm the list updates each time and the confirmation alert appears before delete.
Expected: no errors; note that changing an account's balance here does **not** retroactively adjust past transactions (it is a direct balance edit, same as onboarding) — this matches the spec's manual-entry model.

- [ ] **Step 5: Commit**

```bash
git add app/"(tabs)"/more.tsx app/accounts
git commit -m "feat: build More settings hub and Account management screens"
```

---

### Task 25: Category management + Recurring bills management

**Files:**
- Create: `app/categories/index.tsx`, `app/categories/add.tsx`, `app/recurring/index.tsx`, `app/recurring/[id].tsx`

**Interfaces:**
- Consumes: `useCategoriesStore`, `useRecurringStore`, `useAccountsStore` (Task 8); `Screen`, `Card`, `ListRow`, `EmptyState`, `IconChip`, `CategoryIcon`, `FormField`, `Button`, `SegmentedControl` (Tasks 10–12).
- Produces: `/categories`, `/categories/add`, `/recurring`, `/recurring/[id]` — all linked from the More screen (Task 24).

- [ ] **Step 1: Create the Categories list screen**

Create `app/categories/index.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListRow } from '../../src/components/ListRow';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { colors, spacing } from '../../src/theme/tokens';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

export default function CategoriesScreen() {
  const categories = useCategoriesStore((s) => s.categories);
  const removeCategory = useCategoriesStore((s) => s.removeCategory);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Pressable onPress={() => router.push('/categories/add')}>
          <Plus size={22} color={colors.accent} />
        </Pressable>
      </View>
      <Card>
        {categories.map((c, i) => (
          <ListRow
            key={c.id}
            icon={<CategoryIcon name={c.icon} />}
            title={c.name}
            caption={c.isCustom ? 'Custom — tap to remove' : 'Preset'}
            isLast={i === categories.length - 1}
            onPress={c.isCustom ? () => removeCategory(c.id) : undefined}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
```

- [ ] **Step 2: Create the Add Category screen**

Create `app/categories/add.tsx`:
```tsx
import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors, spacing } from '../../src/theme/tokens';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

export default function AddCategoryScreen() {
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  function handleSave() {
    if (!name) return;
    addCategory(name, 'more-horizontal', kind === 'income');
    router.back();
  }

  return (
    <Screen>
      <Text style={styles.title}>Add Category</Text>
      <FormField label="Category name" value={name} onChangeText={setName} placeholder="e.g. Subscriptions" />
      <View style={{ height: spacing.md }} />
      <SegmentedControl
        options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }] as const}
        value={kind}
        onChange={setKind}
      />
      <View style={{ height: spacing.xl }} />
      <Button label="Save" onPress={handleSave} disabled={!name} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
});
```

- [ ] **Step 3: Create the Recurring bills list screen**

Create `app/recurring/index.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Repeat, Plus } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListRow } from '../../src/components/ListRow';
import { EmptyState } from '../../src/components/EmptyState';
import { IconChip } from '../../src/components/IconChip';
import { colors, spacing } from '../../src/theme/tokens';
import { useRecurringStore } from '../../src/stores/recurringStore';

export default function RecurringScreen() {
  const rules = useRecurringStore((s) => s.rules);
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Recurring Bills</Text>
        <Pressable onPress={() => router.push('/recurring/new')}>
          <Plus size={22} color={colors.accent} />
        </Pressable>
      </View>
      {rules.length === 0 ? (
        <EmptyState
          icon={<IconChip><Repeat size={16} color={colors.textMuted} /></IconChip>}
          message="No recurring bills."
          ctaLabel="Add Bill"
          onPressCta={() => router.push('/recurring/new')}
        />
      ) : (
        <Card>
          {rules.map((r, i) => (
            <ListRow
              key={r.id}
              icon={<Repeat size={16} color={colors.textSecondary} />}
              title={r.name}
              caption={`${r.frequency} · due ${new Date(r.nextDueDate).toLocaleDateString()}`}
              amount={-r.amount}
              isLast={i === rules.length - 1}
              onPress={() => router.push(`/recurring/${r.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
```

- [ ] **Step 4: Create the Add/Edit Recurring Bill screen**

Create `app/recurring/[id].tsx`:
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert as RNAlert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { colors, spacing } from '../../src/theme/tokens';
import { useRecurringStore } from '../../src/stores/recurringStore';
import { useAccountsStore } from '../../src/stores/accountsStore';
import { useCategoriesStore } from '../../src/stores/categoriesStore';

const FREQUENCIES = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
] as const;

export default function RecurringEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const rule = useRecurringStore((s) => s.rules.find((r) => r.id === id));
  const addRule = useRecurringStore((s) => s.addRule);
  const updateRule = useRecurringStore((s) => s.updateRule);
  const removeRule = useRecurringStore((s) => s.removeRule);
  const accounts = useAccountsStore((s) => s.accounts);
  const categories = useCategoriesStore((s) => s.categories);

  const [name, setName] = useState(rule?.name ?? '');
  const [amountText, setAmountText] = useState(rule ? rule.amount.toString() : '');
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]['value']>(rule?.frequency ?? 'monthly');
  const [nextDueDate] = useState(rule?.nextDueDate ?? new Date().toISOString());

  function handleSave() {
    const amount = parseFloat(amountText);
    if (!name || isNaN(amount) || accounts.length === 0 || categories.length === 0) return;
    if (isNew) {
      addRule({ name, categoryId: categories[0].id, accountId: accounts[0].id, amount, frequency, nextDueDate });
    } else if (rule) {
      updateRule(rule.id, { name, amount, frequency });
    }
    router.back();
  }

  function handleDelete() {
    if (!rule) return;
    RNAlert.alert('Delete recurring bill?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeRule(rule.id); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.title}>{isNew ? 'Add Recurring Bill' : 'Edit Recurring Bill'}</Text>
      <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Netflix" />
      <View style={{ height: spacing.md }} />
      <FormField label="Amount (J$)" value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" />
      <View style={{ height: spacing.md }} />
      <SegmentedControl options={FREQUENCIES} value={frequency} onChange={setFrequency} />
      <View style={{ height: spacing.xl }} />
      <Button label="Save" onPress={handleSave} disabled={!name || !amountText} />
      {!isNew ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Delete" variant="secondary" onPress={handleDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
});
```

- [ ] **Step 5: Verify in Expo web preview**

From More → Categories: add a custom category, confirm it appears tagged "Custom", tap it to remove it, confirm preset categories cannot be tapped/removed. From More → Recurring Bills: add, edit, and delete a bill, confirming the Cash Flow screen (Task 23) reflects the change.
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/categories app/recurring
git commit -m "feat: build Category and Recurring Bills management screens"
```

### Task 26: Notifications list screen

**Files:**
- Create: `app/notifications.tsx`

**Interfaces:**
- Consumes: `useRecurringStore`, `useGoalsStore` (Task 8); `isBefore`, `addDays` (Task 4); `Screen`, `Card`, `ListRow`, `EmptyState`, `IconChip` (Tasks 10–12).
- Produces: `/notifications`, linked from More (Task 24) — locally generated reminders only (bills due within 7 days, goals that have reached their target). No push notifications, per spec.

- [ ] **Step 1: Create the Notifications screen**

Create `app/notifications.tsx`:
```tsx
import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { ListRow } from '../src/components/ListRow';
import { EmptyState } from '../src/components/EmptyState';
import { IconChip } from '../src/components/IconChip';
import { colors, spacing } from '../src/theme/tokens';
import { useRecurringStore } from '../src/stores/recurringStore';
import { useGoalsStore } from '../src/stores/goalsStore';
import { isBefore, addDays } from '../src/lib/date';

export default function NotificationsScreen() {
  const rules = useRecurringStore((s) => s.rules);
  const goals = useGoalsStore((s) => s.goals);

  const notifications = useMemo(() => {
    const now = new Date().toISOString();
    const soon = addDays(now, 7);
    const billNotifications = rules
      .filter((r) => isBefore(r.nextDueDate, soon))
      .map((r) => ({ id: `bill-${r.id}`, title: `${r.name} due soon`, caption: new Date(r.nextDueDate).toLocaleDateString() }));
    const goalNotifications = goals
      .filter((g) => g.currentAmount >= g.targetAmount)
      .map((g) => ({ id: `goal-${g.id}`, title: `${g.name} goal reached!`, caption: 'Milestone hit' }));
    return [...billNotifications, ...goalNotifications];
  }, [rules, goals]);

  return (
    <Screen>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <EmptyState icon={<IconChip><Bell size={16} color={colors.textMuted} /></IconChip>} message="No notifications." />
      ) : (
        <Card>
          {notifications.map((n, i) => (
            <ListRow
              key={n.id}
              icon={<Bell size={16} color={colors.textSecondary} />}
              title={n.title}
              caption={n.caption}
              isLast={i === notifications.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
});
```

- [ ] **Step 2: Verify in Expo web preview**

Add a recurring bill due within the next 7 days — confirm a "due soon" notification appears. Push a goal's `currentAmount` to meet its `targetAmount` via a contribution (Task 21) — confirm a "goal reached" notification appears.
Expected: no errors; empty state shows otherwise.

- [ ] **Step 3: Commit**

```bash
git add app/notifications.tsx
git commit -m "feat: build Notifications screen with local bill and goal-milestone reminders"
```

---

### Task 27: Final integration — error banner polish, empty/loading state audit, full manual verification pass

**Files:**
- Modify: `src/components/ErrorBanner.tsx` (upgrade Task 13's minimal version with auto-hide + tap-to-dismiss)
- No other files are expected to change; this task is an audit-and-fix pass across everything built in Tasks 1–26.

**Interfaces:**
- Consumes: `useErrorBannerStore` (Task 8).
- Produces: a polished error banner and a verified, click-through-complete app.

- [ ] **Step 1: Upgrade the error banner with auto-hide and tap-to-dismiss**

Overwrite `src/components/ErrorBanner.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useErrorBannerStore } from '../stores/errorBannerStore';
import { colors, radius, spacing } from '../theme/tokens';

export function ErrorBanner() {
  const message = useErrorBannerStore((s) => s.message);
  const hide = useErrorBannerStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 4000);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;
  return (
    <Pressable style={styles.container} onPress={hide}>
      <Text style={styles.text}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { color: colors.text, fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 2: Run the full automated test suite**

Run: `npx jest`
Expected: PASS — all suites from Tasks 4–9 (money, date, safeToSpend, debtPayoff, insights, transactionActions), no failures.

- [ ] **Step 3: Run a full type-check**

Run: `npx tsc --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 4: Empty/loading state audit**

Re-read spec §6's requirement: "every list-driven screen (Transactions, Goals, Debt, Insights, Notifications) has an empty state." Confirm each already has one from its task:
- Transactions (Task 18) ✓, Goals (Task 21) ✓, Debt (Task 22) ✓, Insights (Task 20) ✓, Notifications (Task 26) ✓, Home recent transactions (Task 17) ✓, Accounts (Task 24) ✓, Recurring (Task 25) ✓, Cash Flow (Task 23) ✓.
If any screen is missing its `EmptyState`, add it now following the same pattern used elsewhere in that screen's task.

- [ ] **Step 5: Full manual click-through in Expo web preview**

Run: `npx expo start --web`. Starting from a clean install (clear browser storage for the preview's origin, or use a private window), walk the entire app in order:
1. Onboarding: Welcome → add 2 accounts → set income → add 1 recurring bill → add 1 goal → Done.
2. Home: confirm Safe to Spend, stat row, and quick actions all work.
3. Add 3–4 transactions across different categories and both accounts (Task 19), including one edit and one delete.
4. Transactions: confirm search and account filter narrow the list correctly.
5. Insights: confirm category breakdown, weekly trend, and top transactions all populate.
6. Goals: add a contribution to the goal created in onboarding; confirm progress bar and Notifications (goal reached, if target is hit) update.
7. Debt: add 2 debts, toggle snowball/avalanche, adjust extra payment, confirm the projection updates; edit and delete a debt.
8. Cash Flow: confirm the timeline reflects the recurring bill(s).
9. More → Accounts/Categories/Recurring Bills/Notifications: exercise add/edit/delete on each.
10. Force an AsyncStorage failure is impractical in web preview — instead confirm no console errors appear during the entire walkthrough, and re-check that reloading the page at any point preserves all entered data (proving persistence works).

Expected: zero console errors/warnings beyond expected React Native web shims; all data entered survives a full page reload; every navigation link resolves to a real screen (no more stub text anywhere).

- [ ] **Step 6: Start Expo Go verification on the user's physical iOS device**

Run: `npx expo start` (not `--web`) and scan the printed QR code with the iOS Camera app or Expo Go app.
Expected: app loads in Expo Go; repeat a shortened version of Step 5's walkthrough (onboarding + one transaction + one goal contribution) to confirm native rendering (fonts, icons, safe-area insets, tab bar) matches the web preview.

- [ ] **Step 7: Commit**

```bash
git add src/components/ErrorBanner.tsx
git commit -m "polish: upgrade error banner with auto-hide, complete full manual verification pass"
```










