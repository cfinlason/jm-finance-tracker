# JM Finance Tracker — Baby Steps Redesign Design Spec

Date: 2026-10-13
Status: Awaiting user review
Depends on: the current Flutter + Supabase app on `master` (cloud accounts, responsive shell, recurring-bill calendar, debt payoff with rollover).

## 1. Summary and intent

Redesign the app around Dave Ramsey's 7 Baby Steps, using the user's reference image (dark UI, rounded cards, a large multi-color ring chart, a categories grid, an accounts list) as the visual target.

**What the user asked for (stated):**
- Emulate the 7 Baby Steps.
- Home is built around the steps (user chose this over a separate tab or full feature-gating).
- Emergency-fund accounts are chosen by tagging specific accounts.
- Step targets are expressed in USD and converted to JMD with a live exchange rate from a free API.
- Long-term goal: **US$1,000,000 net worth**.

**Assumptions (to confirm in review):**
- All account and debt balances are stored in JMD (including the account named "JMMB USD").
- The user's primary currency view stays JMD; USD appears for targets and net worth.
- Steps 4-7 cannot be auto-tracked from current data, so they are manual check-offs with an optional amount.

**Success criteria:**
- Home shows the current step, its progress, and the net-worth ring at a glance.
- Steps 1-3 progress updates automatically from accounts, debts, and bills.
- The rest of the app visibly matches the new style without per-screen rebuilds.
- Existing data and flows keep working; no regressions in tests.

## 2. The steps and how each is measured

| Step | Meaning | Measurement |
|---|---|---|
| 1 | $1,000 starter emergency fund | Sum of balances of accounts tagged `is_emergency_fund` vs. US$1,000 converted to JMD |
| 2 | Pay off all debt except the house (debt snowball) | Percent of non-mortgage debt paid off vs. the starting total (snapshotted when Step 2 begins) |
| 3 | 3-6 months of expenses saved | Emergency-fund total vs. N months of expenses (default N=3, adjustable 3-6) |
| 4 | Invest 15% of household income for retirement | Manual check-off, optional monthly invested amount vs. 15% of income |
| 5 | Save for children's college | Manual check-off, optional amount |
| 6 | Pay off the home early | Manual check-off, optional remaining mortgage balance |
| 7 | Build wealth and give | Net worth vs. US$1,000,000 goal; optional giving note |

- **Monthly expenses (Step 3):** sum of recurring-bill amounts plus the average of the last 3 months' expense transactions, whichever is larger.
- **Current step:** the first step not marked done. A step is done when its measure reaches 100% or the user checks it off manually.
- **Mortgage:** a debt can be flagged `is_mortgage` so Step 2 excludes it and Step 6 uses it. If no debt is flagged, Step 6 stays manual.

## 3. Architecture

- `lib/logic/baby_steps.dart`: pure function `computeBabySteps(...)` returning a list of `StepStatus` (state, progress 0-1, headline numbers). Fully unit-tested.
- `lib/logic/net_worth.dart`: pure function for assets minus debts, plus USD conversion. Unit-tested.
- `lib/logic/currency.dart`: USD/JMD conversion helpers over a given rate.
- `lib/stores/exchange_rate_store.dart`: fetches the rate from a free no-key API (candidate: `open.er-api.com`; verify CORS on web during implementation), caches the last good rate and its timestamp, and falls back to the cached rate with a "rate as of ..." note if the call fails. Never blocks the UI.
- Settings additions (stored in the existing `settings` table): `starter_fund_usd` (default 1000), `emergency_months` (default 3), `net_worth_goal_usd` (default 1,000,000), `steps_completed` (map of step number to done flag), `step_amounts` (optional amounts for steps 4-7), `step2_start_total` (debt snapshot), `cached_usd_jmd_rate`, `rate_updated_at`.
- Schema changes (Supabase migration): `accounts.is_emergency_fund boolean default false`, `debts.is_mortgage boolean default false`, and the settings columns above. Existing RLS policies already cover these tables.
- UI: reusable `StepRing`, `StepCard`, and `NetWorthCard` widgets under `lib/widgets/`; Home composes them.

## 4. Home redesign

Matching the reference image:
- **Hero ring:** a large multi-segment ring showing overall Baby Steps progress with the current step name in the center ("Step 2: Pay off debt") and its percentage; a week/month/year selector below for the spending summary.
- **7 step cards:** a vertical list of cards with states done (green check), current (accent, expanded with progress detail), and locked/upcoming (muted).
- **Net worth card:** current net worth in USD, progress ring toward US$1,000,000, JMD equivalent underneath.
- **Existing sections restyled:** accounts (with an emergency-fund badge), "Bills This Month" calendar, recent transactions.
- Expanded (desktop) layout keeps two columns; Compact (phone) stacks them.

## 5. App-wide restyle

Update shared theme and widgets (`AppColors`, `AppCard`, typography, buttons, list rows, dialog chrome) toward the reference: softer rounded cards, subtle surface elevation, colored accents (blue, purple, yellow, green, red) used for categories and steps. Other tabs inherit the new look through those shared pieces; no per-screen rebuilds. Navigation structure is unchanged.

## 6. Settings and account changes

- Settings gains: starter-fund USD amount, emergency-fund months (3-6), net-worth goal, and exchange-rate status with a manual refresh.
- Account dialog gains an "Emergency fund" toggle.
- Debt dialog gains a "Mortgage" toggle.

## 7. Error handling and edge cases

- Exchange-rate failure: use cached rate; if none exists yet, show JMD-only values with a prompt to retry.
- No emergency accounts tagged: Step 1 shows 0% with a call to action to tag an account.
- No debts: Step 2 is immediately done.
- Zero expenses data: Step 3 falls back to the recurring-bill total; if both are zero, show "add bills to set a target".
- Negative net worth: ring shows 0%, number still shown.

## 8. Testing

- Unit tests: step calculator (each step's state and progress, current-step selection, mortgage exclusion), net worth, currency conversion, exchange-rate fallback logic.
- Existing tests must keep passing.
- Manual browser verification at phone and desktop widths, signed in to the real account.

## 9. Out of scope

Feature gating by step, an investing/portfolio tracker, college-fund per-child detail, push notifications, and per-screen custom layouts.
