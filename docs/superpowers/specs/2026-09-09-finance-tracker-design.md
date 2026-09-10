# JM Finance Tracker — App Design Spec

Date: 2026-09-09
Status: Approved for implementation planning

## 1. Summary

A fully functional personal finance tracking iOS app, built with React Native + Expo (Expo Go compatible), styled per the existing visual design system in [`design.md.txt`](../../../design.md.txt). Manual data entry for v1 (accounts, transactions, recurring bills, goals, debts); Jamaican bank-account linking is an explicit future phase, not built now. All amounts in Jamaican Dollars (JMD, `J$`). Data persists locally on-device only — no backend, no auth, single local profile.

## 2. Visual design system

Fully specified in `design.md.txt` — dark/premium, near-black background (`#101110`), single neon-lime accent (`#CFFF3B`), Archivo typeface, rounded corners (10–20px radii), 2px strong dividers between sections, tabular figures for all money values, neutral (non-color-coded) category icons. This spec does not repeat those tokens — implementation should translate them directly into a React Native theme module (see §4).

Two reference files (`Home - Design System.dc.html`, `App Screens.dc.html`) mentioned in design.md.txt are not available. Per user decision, all 9 originally-scoped screens plus the additional screens in §6 will be designed fresh by extending the same token/component system — not recreated from those files.

## 3. Tech stack

- **Framework:** Expo (managed workflow), React Native, TypeScript
- **Navigation:** Expo Router (file-based) — bottom tabs + stack screens + a one-time onboarding stack
- **State management:** Zustand, one store per domain
- **Persistence:** `@react-native-async-storage/async-storage`, via Zustand's `persist` middleware — JSON-serialized, one key per store
- **Fonts:** `@expo-google-fonts/archivo` (400/600/700/800)
- **Icons:** `lucide-react-native`
- **Testing:** Jest, unit tests on pure calculation logic only (no component/E2E tests in v1)

Rationale for Zustand + AsyncStorage over SQLite: simpler, less boilerplate, fully sufficient for a personal finance app's data volume (computations run in-memory over plain JS arrays); easy to swap the data source later when real bank-linking is added, without changing the screens/consuming code.

## 4. Data model

All persisted via Zustand `persist` (AsyncStorage), one store per entity below.

```ts
type Account = {
  id: string
  name: string
  type: 'checking' | 'savings' | 'cash' | 'credit'
  balance: number       // JMD, signed
  currency: 'JMD'
  createdAt: string
}

type Category = {
  id: string
  name: string
  icon: string           // lucide icon name
  isCustom: boolean
  isIncome: boolean
}
// Seeded presets: Food, Transport, Bills & Utilities, Shopping, Entertainment,
// Health, Housing, Income, Transfer, Other. User can add custom categories.

type Transaction = {
  id: string
  accountId: string
  categoryId: string
  amount: number          // JMD, signed (+income / -expense)
  note: string
  date: string             // ISO
  type: 'income' | 'expense' | 'goal_contribution'
  recurringRuleId?: string
  goalId?: string           // set when type === 'goal_contribution'
}

type RecurringRule = {
  id: string
  name: string
  categoryId: string
  accountId: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  nextDueDate: string
  dayOfMonth?: number
  dayOfWeek?: number
}

type Goal = {
  id: string
  name: string
  icon: string
  targetAmount: number
  currentAmount: number     // derived from sum of goal_contribution transactions, cached
  targetDate?: string
}

type Debt = {
  id: string
  name: string
  balance: number
  interestRate: number       // APR %
  minPayment: number
  dueDayOfMonth: number
}

type UserSettings = {
  hasCompletedOnboarding: boolean
  monthlyIncomeEstimate: number
  currency: 'JMD'            // fixed for v1
}
```

### Derived values (computed, not stored)

- **Safe to Spend** = Σ account balances − Σ (recurring rule amounts due before the next expected income date, using `monthlyIncomeEstimate` cadence). Goal contributions are modeled as `goal_contribution` transactions that already reduce the source account's balance — so goals never need a separate "reserved" bucket; they're just already-spent-into-savings.
- **Debt payoff projection**: month-by-month simulation to zero balance, computed twice — **snowball** (order debts smallest balance → largest) and **avalanche** (order by highest interest rate → lowest) — given the debts' minimum payments plus a user-adjustable extra-monthly-payment amount. Output: months to debt-free, total interest paid, for both strategies side by side.
- **Insights**: category totals for current vs. previous period (% change), income-vs-spending trend bucketed by week or month, top 5 transactions by absolute amount in the period.

## 5. Navigation structure

**Onboarding stack** (shown once, gated on `!hasCompletedOnboarding`):
Welcome → Add Account(s) → Set Monthly Income → Recurring Bills (optional, skippable) → Choose Goals → Done → enters main tabs.

**Main tab bar** (5 items, matches design.md §7 bottom nav spec): Home, Transactions, Insights, Goals, More.

**Stack screens** (pushed from tabs, not in the tab bar):
- Add / Edit Transaction (modal presentation) — reused for both add and edit, pre-filled on edit
- Debt (from Home quick action or More)
- Cash Flow (from Home)
- Account management: list + add/edit/delete (from More)
- Category management: list + add custom (from More)
- Recurring bills management: list + add/edit/delete (from More)
- Notifications list — locally generated reminders only (upcoming bill due, goal milestone hit); no push notifications in v1 (from More)
- Goal detail (from tapping a Goal card) — progress detail + "Add contribution" action

## 6. Screens (full list)

| Screen | Nav | Key content |
|---|---|---|
| Onboarding (5 steps) | Stack, pre-tabs | Welcome, add account(s), income estimate, recurring bills (skippable), goal selection |
| Home | Tab | Safe-to-Spend hero, income/spending/upcoming stat row, recent transactions, insight-of-the-day card, quick actions (Add Transaction, View Debt, View Cash Flow) |
| Transactions | Tab | Grouped-by-date list, filter by category/account, search |
| Add / Edit Transaction | Modal | Amount, account, category, note, date, type; edit pre-fills from existing transaction |
| Insights | Tab | Category breakdown w/ % change, income-vs-spend trend, top 5 transactions, insight-of-the-day |
| Goals | Tab | Goal cards w/ progress bar; tap → Goal detail |
| Goal detail | Stack | Progress, contribution history, "Add contribution" (creates a `goal_contribution` transaction) |
| Debt | Stack | Debt list, total owed, payoff-projection emphasis card w/ snowball/avalanche toggle + extra-payment slider |
| Cash Flow | Stack | Timeline: upcoming bills/income plotted against projected balance |
| More | Tab | Settings hub: links to Accounts, Categories, Recurring Bills, Notifications, app info |
| Account management | Stack | Add/edit/delete accounts |
| Category management | Stack | Add custom categories (presets are fixed) |
| Recurring bills management | Stack | Add/edit/delete recurring rules |
| Notifications list | Stack | Local reminders (bill due soon, goal milestone) |

**Empty/loading states:** every list-driven screen (Transactions, Goals, Debt, Insights, Notifications) has an empty state (icon + message + CTA in the existing card style); first-launch Zustand/AsyncStorage hydration shows a brief loading state.

**Explicitly out of scope for v1:** real bank-linking (Jamaican banks — planned as a later phase, replacing/augmenting manual entry without changing the screens), push notifications (in-app list only), tablet/desktop layouts, multi-user/auth.

## 7. Error handling

- Form validation: required fields + numeric validation on all amount inputs, submit disabled until valid.
- Destructive actions (delete account/transaction/goal/debt/recurring rule): confirmation alert before proceeding.
- AsyncStorage read/write failures: caught, surfaced via a non-blocking banner/toast ("Couldn't save — try again"); never fail silently or lose in-memory state.
- Money formatting: JMD with comma thousands separators and 2 decimals throughout; tabular figures (`font-feature-settings: 'tnum' 1`) for alignment, per design.md.

## 8. Testing approach

Jest unit tests covering the pure calculation functions only:
- Safe to Spend calculation
- Debt payoff projection (snowball & avalanche)
- Insights aggregation (category totals/%, trend buckets, top-N)

No component or E2E test suite in v1 — disproportionate effort for this scope; manual verification via the interactive preview (Expo web in-browser + Expo Go on device) covers UI/flow correctness.

## 9. Preview / dev workflow

`expo start` run with both a web preview (opened in-browser for interactive click-through during development) and a QR code for Expo Go on the user's iOS device. No EAS build/deployment in scope — Expo Go only.
