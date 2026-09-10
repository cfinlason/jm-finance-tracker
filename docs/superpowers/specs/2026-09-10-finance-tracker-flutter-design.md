# JM Finance Tracker — Flutter Web Design Spec

Date: 2026-09-10
Status: Approved for implementation planning
Supersedes: `docs/superpowers/specs/2026-09-09-finance-tracker-design.md` (React Native + Expo direction — abandoned before implementation; kept for history). Feature scope, data model, screen list, and calculation logic are carried over unchanged from that spec; only the delivery platform changes.

## 1. Summary

A fully functional personal finance tracking app, built once in **Flutter** and shipped as a **Flutter Web** site on Vercel now, with a real native iOS build (`flutter build ios`) as an explicit future phase from the same codebase — not built in this plan, the same way the original spec deferred Jamaican bank-linking. Manual data entry for v1 (accounts, transactions, recurring bills, goals, debts). All amounts in Jamaican Dollars (JMD, `J$`). Data persists locally in the browser only — no backend, no auth, single local profile.

**Why Flutter over the original React Native/Expo plan:** the user's firm goal is a real native iOS App Store app later. Flutter shares ~95% of its codebase between web and iOS builds, so building the web version now in Flutter means the iOS app later is mostly a native build of existing code, not a rewrite. A React Native/Expo or Next.js web app would not carry forward into a native iOS build without a substantial separate effort.

## 2. Visual design system

Fully specified in `design.md.txt` — dark/premium, near-black background (`#101110`), single neon-lime accent (`#CFFF3B`), Archivo typeface, rounded corners (10–20px radii), 2px strong dividers between sections, tabular figures for all money values, neutral (non-color-coded) category icons. Expressed in Flutter as a Dart `AppTheme` (const token classes + a `ThemeData`) rather than CSS — same values, Flutter-native form. See §3 for the exact token module.

**Phone-size constraint:** Flutter is mobile-shaped by default, not fluid-responsive. On Flutter Web at desktop browser widths, the app renders inside a fixed max-width (~430px) container, horizontally centered, with the surrounding viewport painted in `--bg`. This means the app always looks and behaves like a phone screen regardless of browser window size — matching `design.md.txt` §8's existing "iOS device-frame scale (402×874)" reference.

Two reference files (`Home - Design System.dc.html`, `App Screens.dc.html`) mentioned in `design.md.txt` are not available — per the original spec's decision, all screens are built fresh from the token/component system, not recreated from those files.

## 3. Tech stack

- **Framework:** Flutter (Dart), targeting **Flutter Web** for this plan; iOS is a later `flutter build ios` from the same code — out of scope here
- **Routing:** `go_router` — declarative, URL-aware routing; handles the bottom-tab shell, the onboarding stack, and modal-style pushed routes
- **State management:** `provider` package, one `ChangeNotifier` per domain entity (accounts, categories, transactions, recurring, goals, debts, settings) — mirrors the original plan's "one store per entity" shape
- **Persistence:** `shared_preferences`, JSON-serialized, one key per store — the direct Flutter equivalent of AsyncStorage; backed by `localStorage` under the hood on Flutter Web
- **Fonts:** `google_fonts` package, Archivo (400/600/700/800)
- **Icons:** `lucide_icons` (community package mirroring the same Lucide icon set the visual spec already references)
- **Testing:** `flutter_test`, unit tests on pure calculation logic only (no widget/integration tests in v1)
- **Deployment:** `flutter build web` → static output in `build/web` → deployed to Vercel (framework preset "Other", output directory `build/web`); a single deploy once the app is feature-complete

Rationale for `provider` + `shared_preferences` over Riverpod/Bloc/Hive: simplest option that still gives one-notifier-per-domain isolation and full testability, no code generation step, and it is the most direct conceptual port of the original Zustand + AsyncStorage design — easy to swap later (e.g. for Hive or a real backend) without changing consuming widgets.

## 4. Data model

All persisted via `shared_preferences` (one JSON string per key, one key per entity list below), hand-written `toJson`/`fromJson` (no code generation).

```dart
class Account {
  final String id;
  final String name;
  final String type; // 'checking' | 'savings' | 'cash' | 'credit'
  final double balance; // JMD, signed
  final String currency; // always 'JMD'
  final String createdAt; // ISO 8601
}

class Category {
  final String id;
  final String name;
  final String icon; // lucide_icons identifier
  final bool isCustom;
  final bool isIncome;
}
// Seeded presets: Food, Transport, Bills & Utilities, Shopping, Entertainment,
// Health, Housing, Income, Transfer, Other. User can add custom categories.

class Transaction {
  final String id;
  final String accountId;
  final String categoryId;
  final double amount; // JMD, signed (+income / -expense)
  final String note;
  final String date; // ISO 8601
  final String type; // 'income' | 'expense' | 'goal_contribution'
  final String? recurringRuleId;
  final String? goalId; // set when type == 'goal_contribution'
}

class RecurringRule {
  final String id;
  final String name;
  final String categoryId;
  final String accountId;
  final double amount;
  final String frequency; // 'weekly' | 'biweekly' | 'monthly'
  final String nextDueDate; // ISO 8601
  final int? dayOfMonth;
  final int? dayOfWeek;
}

class Goal {
  final String id;
  final String name;
  final String icon;
  final double targetAmount;
  final double currentAmount; // derived from sum of goal_contribution transactions, cached
  final String? targetDate;
}

class Debt {
  final String id;
  final String name;
  final double balance;
  final double interestRate; // APR %
  final double minPayment;
  final int dueDayOfMonth;
}

class UserSettings {
  final bool hasCompletedOnboarding;
  final double monthlyIncomeEstimate;
  final String currency; // fixed 'JMD' for v1
}
```

### Derived values (computed, not stored)

- **Safe to Spend** = Σ account balances − Σ (recurring rule amounts due before the next expected income date, using `monthlyIncomeEstimate` cadence). Next expected income date = exactly one calendar month after "now" (same open-ended spec point resolved the same way as the original design). Goal contributions are modeled as `goal_contribution` transactions that already reduce the source account's balance — goals never need a separate "reserved" bucket.
- **Debt payoff projection**: month-by-month simulation to zero balance, computed twice — **snowball** (smallest balance → largest) and **avalanche** (highest interest rate → lowest) — given minimum payments plus a user-adjustable extra-monthly-payment amount. Output: months to debt-free, total interest paid, for both strategies side by side.
- **Insights**: category totals for current vs. previous period (% change), income-vs-spending trend bucketed by week or month, top 5 transactions by absolute amount in the period.

## 5. Navigation structure (`go_router`)

**Onboarding stack** (shown once, gated on `!hasCompletedOnboarding`):
`/onboarding/welcome` → `/onboarding/accounts` → `/onboarding/income` → `/onboarding/recurring` (skippable) → `/onboarding/goals` → `/onboarding/done`, which replaces the route stack with `/home`.

**Main shell** (`StatefulShellRoute`, persistent bottom tab bar, 5 tabs, matches `design.md.txt` §7 bottom nav spec): `/home`, `/transactions`, `/insights`, `/goals`, `/more`.

**Pushed routes** (full-screen, back-navigable; Add/Edit Transaction uses a custom slide-up page transition to read as modal):
- `/transaction/new` and `/transaction/:id` — Add/Edit Transaction, pre-filled on edit
- `/debt` — Debt overview (from Home quick action or More)
- `/debts/new` and `/debts/:id` — Add/Edit Debt (no dedicated debt-entry screen existed in the original spec's screen table; debts are managed the same way as every other entity, via a "+" on the Debt overview, for consistency)
- `/cash-flow` — Cash Flow (from Home)
- `/accounts` and `/accounts/:id` — Account list + add/edit/delete (from More)
- `/categories` and `/categories/add` — Category list + add custom (from More)
- `/recurring` and `/recurring/:id` — Recurring bills list + add/edit/delete (from More)
- `/notifications` — Notifications list — locally generated reminders only (upcoming bill due, goal milestone hit); no push notifications in v1 (from More)
- `/goal/new` and `/goal/:id` — Goal create / detail (from tapping a Goal card) — progress detail + "Add contribution" action

**Root redirect:** `go_router`'s `redirect` callback checks store hydration (all `ChangeNotifier`s loaded from `shared_preferences`) + `hasCompletedOnboarding`, routing to `/onboarding/welcome` or `/home` accordingly. A loading screen shows until hydration completes.

## 6. Screens (full list — unchanged from the original spec)

| Screen | Nav | Key content |
|---|---|---|
| Onboarding (6 steps) | Stack, pre-shell | Welcome, add account(s), income estimate, recurring bills (skippable), goal selection, done |
| Home | Tab | Safe-to-Spend hero, income/spending/upcoming stat row, recent transactions, quick actions (Add Transaction, View Debt, View Cash Flow) |
| Transactions | Tab | Grouped-by-date list, filter by account, search |
| Add / Edit Transaction | Pushed (modal-style) | Amount, account, category, note, date, type; edit pre-fills from existing transaction |
| Insights | Tab | Category breakdown w/ % change, income-vs-spend trend, top 5 transactions |
| Goals | Tab | Goal cards w/ progress bar; tap → Goal detail |
| Goal detail / create | Stack | Progress, "Add contribution" (creates a `goal_contribution` transaction); create mode when navigated with `new` |
| Debt | Stack | Debt list, total owed, payoff-projection card w/ snowball/avalanche toggle + extra-payment field |
| Add / Edit Debt | Stack | Add/edit/delete a debt (name, balance, APR, min payment) |
| Cash Flow | Stack | Timeline: upcoming bills plotted against a running projected balance |
| More | Tab | Settings hub: links to Accounts, Categories, Recurring Bills, Notifications, app info |
| Account management | Stack | Add/edit/delete accounts |
| Category management | Stack | Add custom categories (presets are fixed) |
| Recurring bills management | Stack | Add/edit/delete recurring rules |
| Notifications list | Stack | Local reminders (bill due soon, goal milestone) |

**Empty/loading states:** every list-driven screen (Transactions, Goals, Debt, Insights, Notifications, Accounts, Recurring, Cash Flow) has an empty state (icon + message + CTA in the existing card style); first-launch `shared_preferences` hydration shows a brief loading state — no screen renders against un-hydrated store data.

**Explicitly out of scope for this plan:** real bank-linking, push notifications (in-app list only), tablet/desktop-optimized layouts (desktop browsers get the centered phone-width shell, not a redesigned wide layout), multi-user/auth, and the native iOS build itself (`flutter build ios` / App Store submission — a later phase using the same codebase this plan produces).

## 7. Error handling

- Form validation: required fields + numeric validation on all amount inputs, submit disabled until valid.
- Destructive actions (delete account/transaction/goal/debt/recurring rule): confirmation dialog before proceeding.
- `shared_preferences` read/write failures: caught, surfaced via a non-blocking banner ("Couldn't save — try again"); never fail silently or lose in-memory state.
- Money formatting: JMD with comma thousands separators and 2 decimals throughout; tabular figures for alignment, per `design.md.txt`. Negative amounts use a minus glyph and plain text color (not red); income is the only value shown in accent lime with a `+` prefix.

## 8. Testing approach

`flutter_test` unit tests covering the pure calculation functions only:
- Safe to Spend calculation
- Debt payoff projection (snowball & avalanche)
- Insights aggregation (category totals/%, trend buckets, top-N)
- The cross-notifier transaction actions (create/edit/delete keeping account balances and goal progress in sync)

No widget or integration test suite in this plan — disproportionate effort for this scope; manual verification via `flutter run -d chrome` (resized to phone width) covers UI/flow correctness.

## 9. Dev / deploy workflow

Local iteration via `flutter run -d chrome`, checked at phone width (browser devtools device toolbar, or a manually resized window) to verify the centered phone-shell layout. One `flutter build web` → Vercel deploy (framework preset "Other", output directory `build/web`) once the app is feature-complete, per the user's decision to deploy once at the end rather than continuously. Real iOS Simulator/device testing (`flutter run -d ios`) and App Store submission are explicitly a later phase, not part of this plan's verification loop.
