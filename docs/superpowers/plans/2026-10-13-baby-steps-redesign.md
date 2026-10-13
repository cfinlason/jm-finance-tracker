# Baby Steps Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home around Dave Ramsey's 7 Baby Steps (auto-tracked steps 1-3, manual steps 4-7), add a US$1,000,000 net-worth goal with live USD/JMD conversion, and restyle the app toward the reference image.

**Architecture:** Pure calculators (`currency`, `net_worth`, `baby_steps`, `spending_period`) hold all the logic and are unit-tested. An `ExchangeRateStore` (injectable fetcher, cached in the `settings` row) supplies the rate. New widgets (`StepRing`, `StepCard`, `NetWorthCard`) compose into a rebuilt Home; shared theme/`AppCard` changes carry the restyle to other tabs.

**Tech Stack:** Flutter/Dart, provider, go_router, supabase_flutter (Postgres + RLS), `http` for the rate API, `flutter_test`.

**Spec:** `docs/superpowers/specs/2026-10-13-baby-steps-redesign-design.md`

## Global Constraints

- Starter fund default **US$1,000**; emergency months default **3** (allowed 3-6); net-worth goal default **US$1,000,000**; retirement target **15%** of income (Step 4).
- All stored balances are JMD. USD appears only for targets, net worth, and display.
- Exchange rate: free no-key API, candidate `https://open.er-api.com/v6/latest/USD` (`rates.JMD`); on failure fall back to the last cached rate, never block the UI.
- Icons only from `package:lucide_icons_flutter/lucide_icons.dart`.
- Stores keep their existing pattern: in-memory update first, fire-and-forget Supabase write inside try/catch (tests construct stores with no Supabase session and must keep passing).
- Only pure logic gets unit tests; UI is verified manually in the browser at phone (375px) and desktop (1280px) widths, signed in.
- No `IntrinsicHeight` around anything containing a `GridView` (caused dead taps earlier).
- Existing 48 tests must keep passing after every task.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Exchange API down on first ever load (no cached rate): JMD-only values, Step 1 shows "rate needed", no crash, retry available. (Task 5)
2. User has zero debts, or only a mortgage: Step 2 is done, no divide-by-zero. (Task 4)
3. No account tagged as emergency fund: Step 1 is 0% with a prompt, not an error. (Task 4)
4. Debts added after the Step 2 baseline was set (balance now above baseline): progress clamps to 0, baseline rises. (Tasks 4, 3)
5. Zero expense history and zero bills, or negative net worth: no division by zero; ring/percent show 0, numbers still render. (Tasks 3, 4)
6. Existing users' `settings` rows predate the new columns: migration defaults must make them load normally. (Tasks 1, 2)

---

### Task 1: Supabase migration

**Files:**
- Create: `supabase/migrations/20261013_baby_steps.sql` (record of the applied migration)

**Interfaces:**
- Produces: columns `accounts.is_emergency_fund boolean not null default false`; `debts.is_mortgage boolean not null default false`; on `settings`: `starter_fund_usd numeric not null default 1000`, `emergency_months int not null default 3`, `net_worth_goal_usd numeric not null default 1000000`, `steps_completed jsonb not null default '{}'`, `step_amounts jsonb not null default '{}'`, `step2_start_total numeric not null default 0`, `cached_usd_jmd_rate numeric`, `rate_updated_at timestamptz`.

- [ ] **Step 1:** Apply the migration to project `jqxwsejvdigtjenmiwcb` with the Supabase MCP `apply_migration` (name `baby_steps`), using `alter table ... add column` statements for exactly the columns above. Save the same SQL in the file above.
- [ ] **Step 2:** Run the Supabase MCP `get_advisors` (security). Expected: no new lints (existing RLS policies already cover these tables).
- [ ] **Step 3:** Run `select is_emergency_fund from accounts limit 1; select starter_fund_usd, emergency_months, net_worth_goal_usd from settings;` via `execute_sql`. Expected: columns exist, existing settings row shows 1000 / 3 / 1000000.
- [ ] **Step 4: Commit** `feat: add Baby Steps columns migration`.

### Task 2: Models and money formatting

**Files:**
- Modify: `lib/models/models.dart` (`Account`, `Debt`, `UserSettings`), `lib/utils/money.dart`
- Test: `test/models/baby_steps_models_test.dart`, `test/utils/money_test.dart`

**Interfaces:**
- Produces: `Account.isEmergencyFund` (bool, default false; in `copyWith`, `toSupabaseInsert` as `is_emergency_fund`, `fromSupabaseRow`); `Debt.isMortgage` (same pattern, `is_mortgage`); `UserSettings` gains `double starterFundUsd=1000`, `int emergencyMonths=3`, `double netWorthGoalUsd=1000000`, `Map<int,bool> stepsCompleted={}`, `Map<int,double> stepAmounts={}`, `double step2StartTotal=0`, `double? cachedUsdJmdRate`, `String? rateUpdatedAt`, all in `copyWith` and `fromSupabaseRow` (jsonb maps arrive as `Map<String,dynamic>` with string keys; absent/null columns fall back to defaults). `String formatUsd(double)` returning e.g. `US$1,234.56` (negative: `-US$1,234.56`).

- [ ] **Step 1: Write failing tests:** `UserSettings.fromSupabaseRow({})` yields the defaults above; `fromSupabaseRow` with `steps_completed: {'4': true}` and `step_amounts: {'5': 1200}` yields `stepsCompleted[4]==true`, `stepAmounts[5]==1200.0`; `Account.fromSupabaseRow` reads `is_emergency_fund: true`; `Debt.fromSupabaseRow` reads `is_mortgage: true` and `toSupabaseInsert` writes both flags; `formatUsd(1234.5)=='US$1,234.50'`, `formatUsd(-5)=='-US$5.00'`.
- [ ] **Step 2:** Run `flutter test test/models test/utils/money_test.dart`. Expected: FAIL (members undefined).
- [ ] **Step 3:** Implement per Interfaces; reuse the grouping logic already in `formatMoney`.
- [ ] **Step 4:** Run `flutter test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: models for emergency-fund/mortgage flags and Baby Steps settings`.

### Task 3: Store plumbing

**Files:**
- Modify: `lib/stores/accounts_store.dart`, `lib/stores/debts_store.dart`, `lib/stores/settings_store.dart`, `lib/logic/debt_actions.dart`
- Test: `test/stores/settings_store_test.dart`

**Interfaces:**
- Produces: `AccountsStore.addAccount({..., bool isEmergencyFund=false})` and `updateAccount(id, {..., bool? isEmergencyFund})` (writes `is_emergency_fund`); `DebtsStore.addDebt({..., bool isMortgage=false})` and `updateDebt(id, {..., bool? isMortgage})` (writes `is_mortgage`); `DebtActions.createDebtWithRecurring/updateDebtWithRecurring` gain an optional `bool isMortgage` passed through. `SettingsStore` setters (each updates memory, `notifyListeners()`, then a fire-and-forget persist of the matching column): `setStarterFundUsd(double)`, `setEmergencyMonths(int)` (clamped 3-6), `setNetWorthGoalUsd(double)`, `setStepCompleted(int step, bool done)`, `setStepAmount(int step, double? amount)` (null removes), `raiseStep2Baseline(double currentTotal)` (only raises `step2StartTotal`, never lowers), `setCachedRate(double rate, DateTime at)`.

- [ ] **Step 1: Write failing tests** on `SettingsStore` (no Supabase): `setEmergencyMonths(9)` stores 6 and `setEmergencyMonths(1)` stores 3; `raiseStep2Baseline(500)` then `raiseStep2Baseline(300)` leaves 500; `setStepCompleted(4,true)` then `setStepCompleted(4,false)` leaves `stepsCompleted[4]==false`; `setStepAmount(5,100)` then `setStepAmount(5,null)` removes the key; `setCachedRate(160.5, t)` exposes both on `settings`.
- [ ] **Step 2:** Run `flutter test test/stores/settings_store_test.dart`. Expected: FAIL.
- [ ] **Step 3:** Implement the store changes. Persist patch keys are the snake_case column names from Task 1; jsonb maps are written with string keys.
- [ ] **Step 4:** Run `flutter analyze lib test` then `flutter test`. Expected: no issues, all pass.
- [ ] **Step 5: Commit** `feat: store support for Baby Steps settings and account/debt flags`.

### Task 4: Pure calculators

**Files:**
- Create: `lib/logic/currency.dart`, `lib/logic/net_worth.dart`, `lib/logic/baby_steps.dart`, `lib/logic/spending_period.dart`
- Test: `test/logic/currency_test.dart`, `test/logic/net_worth_test.dart`, `test/logic/baby_steps_test.dart`, `test/logic/spending_period_test.dart`

**Interfaces:**
- Produces:
  - `double usdToJmd(double usd, double rate)`, `double jmdToUsd(double jmd, double rate)`; both throw `ArgumentError` if `rate <= 0`.
  - `class NetWorth { final double jmd; final double? usd; final double progress; }` and `NetWorth computeNetWorth({required List<Account> accounts, required List<Debt> debts, required double? usdToJmdRate, required double goalUsd})`: `jmd` = sum of account balances minus sum of debt balances; `usd` null when rate null; `progress` = `(usd/goalUsd)` clamped 0-1, 0 when usd is null or negative.
  - `enum StepState { done, current, locked }`; `class StepStatus { final int step; final String title; final StepState state; final double progress; final String detail; final bool isManual; }`.
  - `double estimateMonthlyExpenses({required List<RecurringRule> rules, required List<Transaction> transactions, required DateTime now})`: max of (recurring amounts normalized to monthly: weekly×52/12, biweekly×26/12, monthly×1) and (total of `type=='expense'` absolute amounts in the 3 full months before `now`'s month, divided by 3).
  - `List<StepStatus> computeBabySteps({required List<Account> accounts, required List<Debt> debts, required UserSettings settings, required double monthlyExpenses, required double? usdToJmdRate, required NetWorth netWorth})` returning exactly 7 entries (steps 1-7 in order).
  - `enum SpendingPeriod { week, month, year }`; `double spendingInPeriod(List<Transaction> transactions, SpendingPeriod period, DateTime now)`: sum of `type=='expense'` absolute amounts from the start of the period (Monday of this week / first of this month / Jan 1) through `now`.
- Step rules (from spec section 2): Step 1 progress = emergency-fund total ÷ (`starterFundUsd`×rate), done at ≥1; rate null → progress 0, detail "Exchange rate needed", no throw. Step 2 uses non-mortgage debts only; baseline = max(`settings.step2StartTotal`, current non-mortgage total); progress = 1 - current/baseline clamped 0-1; no non-mortgage debt (or total 0) → done. Step 3 target = `emergencyMonths`×`monthlyExpenses`; `monthlyExpenses==0` → progress 0, detail "Add bills to set a target", not done; else done at emergency total ≥ target. Step 4's `detail` states the target as 15% of `settings.monthlyIncomeEstimate` per month (e.g. `'Target: 15% of income = J$82,500/mo'` formatted with `formatMoney`). Steps 4-6 manual: done iff `stepsCompleted[n]==true`; progress 1 if done else 0 (Step 6: if a debt has `isMortgage`, progress = 1 - mortgage balance / max(`stepAmounts[6]`, mortgage balance) when `stepAmounts[6]` is set, else manual). Step 7 progress = `netWorth.progress`, done at 1. `state`: a step is `done` if its done rule holds; the first non-done step is `current`; every later non-done step is `locked`.

- [ ] **Step 1: Write failing tests** (names with exact assertions):
  - currency: `usdToJmd(1000,160)==160000`; `jmdToUsd(160000,160)==1000`; rate 0 throws `ArgumentError`.
  - net worth: accounts 300 + 200, debts 100, rate 100, goal 1000 → `jmd==400`, `usd==4`, `progress==0.004`; rate null → `usd==null`, `progress==0`; debts exceeding accounts → `progress==0`, `jmd` negative.
  - baby steps: (a) emergency account J$80,000, rate 160 → step 1 progress 0.5 and state `current`; (b) no tagged accounts → step 1 progress 0 (no throw); (c) rate null → step 1 detail `'Exchange rate needed'`; (d) only a mortgage debt → step 2 done, step 6 detail not empty; (e) debts 1000 now, baseline 2000 → step 2 progress 0.5; (f) debts 3000, baseline 2000 → progress 0 (baseline treated as 3000); (g) expenses 0 → step 3 not done, detail `'Add bills to set a target'`; (h) emergency total ≥ 3×expenses → step 3 done; (i) `stepsCompleted {4:true}` → step 4 done; (j) exactly one `current` step among the 7, and all steps after it are `locked`.
  - expenses: monthly rule 100 + weekly rule 100 → ≥ 100 + 100×52/12; transactions only → three-month average; rules dominate when larger.
  - spending period: week/month/year boundaries with `now = DateTime(2026,10,14)` (Wednesday) — week starts Mon 2026-10-12, month 2026-10-01, year 2026-01-01; income transactions excluded.
- [ ] **Step 2:** Run the four test files. Expected: FAIL (files missing).
- [ ] **Step 3:** Implement the four logic files per Interfaces. Reuse nothing from stores; take plain lists as inputs.
- [ ] **Step 4:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 5: Commit** `feat: Baby Steps, net worth, currency and spending-period calculators`.

### Task 5: ExchangeRateStore

**Files:**
- Create: `lib/stores/exchange_rate_store.dart`
- Modify: `pubspec.yaml` (add `http: ^1.2.0`), `lib/main.dart` (provider after `SettingsStore`), `lib/logic/app_bootstrap.dart`
- Test: `test/stores/exchange_rate_store_test.dart`

**Interfaces:**
- Produces: `class ExchangeRateStore extends ChangeNotifier` with `ExchangeRateStore(SettingsStore settings, {Future<double> Function()? fetcher})`; getters `double? rate`, `DateTime? updatedAt`, `bool refreshFailed`, `bool isLoading`; `void loadCached()` (reads `settings.settings.cachedUsdJmdRate`/`rateUpdatedAt`); `Future<void> refresh()` (success: set rate, `updatedAt=now`, call `settings.setCachedRate`, `refreshFailed=false`; failure: keep existing rate, `refreshFailed=true`; always `notifyListeners()`; never throws). Default fetcher: `http.get(Uri.parse('https://open.er-api.com/v6/latest/USD'))`, parse `rates.JMD` as double, 10-second timeout, throw on non-200 or missing value. `hydrateAllStores` calls `loadCached()` then `refresh()` (not awaited) after the settings hydrate.

- [ ] **Step 1: Write failing tests** with a fake fetcher: success sets `rate==157.3` and `refreshFailed==false`; failure after a cached rate keeps the cached rate and sets `refreshFailed==true`; failure with no cache leaves `rate==null` and does not throw; `loadCached` picks up a rate set via `settings.setCachedRate`.
- [ ] **Step 2:** Run the test file. Expected: FAIL.
- [ ] **Step 3:** Implement the store; register `ChangeNotifierProvider(create: (c) => ExchangeRateStore(c.read<SettingsStore>()))` in `main.dart`; wire into `hydrateAllStores`. Run `flutter pub get`.
- [ ] **Step 4:** In a browser console on the running web build, confirm `fetch('https://open.er-api.com/v6/latest/USD')` succeeds cross-origin (CORS) and contains `rates.JMD`. If CORS blocks it, switch the default fetcher URL to another free no-key API that allows CORS and note it in the commit.
- [ ] **Step 5:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 6: Commit** `feat: live USD/JMD exchange rate store with cached fallback`.

### Task 6: Theme and shared-widget restyle

**Files:**
- Modify: `lib/theme/app_theme.dart`, `lib/widgets/app_card.dart`

**Interfaces:**
- Produces: `AppColors.stepBlue = 0xFF4C7DFF`, `stepPurple = 0xFF7B5CE6`, `stepYellow = 0xFFFFB92E`, `stepGreen = 0xFF7DD87F`, `stepRed = 0xFFFF4D4D`, `surfaceCard = 0xFF17191A`; `AppCard` default fill becomes `surfaceCard` (was transparent) with radius `AppRadius.lg`, keeping `emphasis` and `margin` behavior and its public constructor unchanged.

- [ ] **Step 1:** Add the constants and change `AppCard`'s default decoration only.
- [ ] **Step 2:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 3:** Build web, open Accounts, Recurring, Goals, Debt tabs signed in at 375px and 1280px; confirm cards render with the soft fill and nothing is clipped or unreadable.
- [ ] **Step 4: Commit** `style: soft card surfaces and Baby Steps accent palette`.

### Task 7: StepRing, StepCard, NetWorthCard widgets

**Files:**
- Create: `lib/widgets/step_ring.dart`, `lib/widgets/step_card.dart`, `lib/widgets/net_worth_card.dart`

**Interfaces:**
- Consumes: `StepStatus`, `StepState`, `NetWorth` (Task 4); `formatMoney`, `formatUsd` (Task 2); `AppColors.step*` (Task 6).
- Produces:
  - `StepRing({required List<StepStatus> steps, required String centerTitle, required String centerSubtitle, double size = 240})`: `CustomPainter` drawing 7 arc segments separated by gaps, each in one of the five step colors cycling by step number; done segments full, current segment filled to its `progress`, locked segments dim (`AppColors.surfaceMuted`); center text from the two strings.
  - `StepCard({required StepStatus status, VoidCallback? onToggleDone, ValueChanged<double?>? onAmountChanged, double? amount})`: shows step number, title, detail, a progress bar for the current step, a green check when done, muted when locked; for `isManual` steps shows an `AppToggle` bound to done via `onToggleDone` and, when expanded (current or done), an `AppFormField` for the optional amount calling `onAmountChanged` with the parsed number or null.
  - `NetWorthCard({required NetWorth netWorth, required double goalUsd, double? rate, DateTime? rateUpdatedAt, bool rateFailed = false})`: US$ net worth, a progress bar toward `goalUsd` (text "x% of US$1,000,000"), JMD underneath; when `rate==null` shows "Exchange rate unavailable — retry in Settings" and the JMD figure only; when `rateFailed` and a rate exists shows "Using saved rate from <date>".

- [ ] **Step 1:** Implement the three widgets (no test file; UI is verified in Task 8).
- [ ] **Step 2:** Run `flutter analyze lib test`. Expected: clean.
- [ ] **Step 3: Commit** `feat: StepRing, StepCard and NetWorthCard widgets`.

### Task 8: Home redesign

**Files:**
- Modify: `lib/screens/home_screen.dart`

**Interfaces:**
- Consumes: Tasks 4-7 outputs; stores `AccountsStore`, `DebtsStore`, `RecurringStore`, `TransactionsStore`, `SettingsStore`, `ExchangeRateStore`.
- Produces: Home layout top to bottom — `StepRing` (center title "Step N: <title>", subtitle "<progress>% complete"), `AppSegmentedControl<SpendingPeriod>` (Week/Month/Year) with "Spent this <period>: J$x" from `spendingInPeriod`, `NetWorthCard`, the 7 `StepCard`s (manual cards wired to `SettingsStore.setStepCompleted`/`setStepAmount`), then the existing accounts panel, bills calendar section, and recent transactions, restyled with `AppCard`. Expanded: ring + selector left, net worth + accounts right, steps in a column below, existing sections under; Compact: single column in the same order. Home calls `SettingsStore.raiseStep2Baseline(nonMortgageDebtTotal)` from a post-frame callback only when the total exceeds the stored baseline.

- [ ] **Step 1:** Rewrite `HomeScreen.build` to compute `monthlyExpenses`, `netWorth`, and `steps` via the Task 4 functions and compose the layout. Keep `_AccountsSidebar`, `_BillsCalendarSection`, `_RecentTransactionsSection` and the transaction preview behavior intact. No `IntrinsicHeight` anywhere.
- [ ] **Step 2:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 3:** Build web; signed in at 375px and 1280px, confirm: the ring and current step are right for the real data; net worth shows USD and JMD; toggling a manual step persists after refresh (check the `settings.steps_completed` row via `execute_sql`); the period selector changes the spent figure; accounts, calendar and recent transactions still work; the Add Transaction live balance preview still works.
- [ ] **Step 4: Commit** `feat: Baby Steps home with ring, step cards, net worth and spending period`.

### Task 9: Account and debt toggles

**Files:**
- Modify: `lib/screens/account_edit_dialog.dart`, `lib/screens/debt_edit_dialog.dart`, `lib/screens/accounts_management_screen.dart`

**Interfaces:**
- Consumes: `AccountsStore.addAccount/updateAccount` and `DebtActions` signatures from Task 3; `AppToggle`.
- Produces: an "Emergency fund" `AppToggle` row in the account dialog (saved via the store calls) and a "Mortgage / house loan" toggle in the debt dialog (saved via `DebtActions`); accounts list rows for tagged accounts show a small "Emergency fund" badge in `AppColors.stepGreen`.

- [ ] **Step 1:** Add the toggles, initialized from the existing entity when editing, defaulting false for new.
- [ ] **Step 2:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 3:** In the browser: tag an account as emergency fund, confirm Home Step 1 progress changes and the row shows the badge; mark a debt as mortgage, confirm Step 2 excludes it; confirm `accounts.is_emergency_fund` / `debts.is_mortgage` in Supabase via `execute_sql`.
- [ ] **Step 4: Commit** `feat: emergency-fund and mortgage toggles`.

### Task 10: Settings additions

**Files:**
- Modify: `lib/screens/settings_screen.dart`

**Interfaces:**
- Consumes: `SettingsStore` setters (Task 3), `ExchangeRateStore` (Task 5).
- Produces: new Settings sections — starter fund (US$) field, emergency-fund months selector (3-6, segmented), net-worth goal (US$) field, and an exchange-rate row showing the rate, "as of <time>", a failure note, and a Refresh button calling `ExchangeRateStore.refresh()`. Existing monthly-income field and Save behavior unchanged; each new value saves when its field is submitted/changed with a valid number.

- [ ] **Step 1:** Add the sections using `AppFormField`, `AppSegmentedControl`, `AppButton`.
- [ ] **Step 2:** Run `flutter analyze lib test` and `flutter test`. Expected: clean, all pass.
- [ ] **Step 3:** In the browser: change the starter fund and goal, confirm Home targets update; refresh the rate and confirm the timestamp changes.
- [ ] **Step 4: Commit** `feat: Baby Steps settings and exchange-rate refresh`.

### Task 11: Final verification and push

**Files:** none new.

- [ ] **Step 1:** Run `flutter analyze lib test`, `flutter test`, `flutter build web`. Expected: no issues, all tests pass, build succeeds.
- [ ] **Step 2:** Full browser pass signed in at 375px and 1280px across Home, Transactions, Recurring, Goals, More sheet, Accounts, Categories, Settings, Debt; confirm nothing regressed and the new look is consistent.
- [ ] **Step 3:** `git push origin master`.
