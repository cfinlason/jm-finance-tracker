# Allot

A calm, private, offline budgeting app for iOS. Give every dollar a job.

React Native + Expo (SDK 57), TypeScript, expo-router. No backend, no accounts, no API keys: all data lives on the device (AsyncStorage). Purchases are mocked (a local `isPremium` flag).

## Run it

```bash
npm install --legacy-peer-deps
npx expo start --ios        # simulator, or scan the QR in Expo Go
npx tsc --noEmit            # type-check
npx expo export --platform ios   # prove the production bundle builds
```

App Store build: `npx eas build --platform ios --profile production` (bundle id `com.allot.budget`, change in `app.json`).

## Install on your phone (Vercel)

`vercel.json` builds the app as an installable web app (PWA) and serves the debt-coach function from the same project.

1. Push this branch to GitHub, then in Vercel choose **Add New → Project**, import the repo, pick the `allot-native` branch (Framework preset: *Other*; the build settings come from `vercel.json`).
2. In **Settings → Environment Variables** add `ANTHROPIC_API_KEY` (a fresh key). Leave `EXPO_PUBLIC_DEBT_COACH_URL` unset; the web build defaults to `/api/debt-coach`.
3. Deploy, open the URL in **Safari** on your iPhone, tap **Share → Add to Home Screen**.

Web limits: no scheduled reminders (browsers can't), and data lives in that browser/home-screen app only. `npm run web:build` produces `dist/`.

## Switches & settings

- `src/config.ts` → `FEATURES.paywall` is **off** (all tools are unlocked; flip to `true` to bring Allot Plus back).
- Settings → Currency: pick the main currency and enter your own exchange rates for foreign debts/accounts (kept offline, no live rate feed).
- Deleting a line, group, debt, fund, income, entry or transaction shows an **Undo** toast.

## Debt coach & Budget coach (Claude)

Two coaches share one proxy: `api/debt-coach.mjs` (payoff plan) and `api/budget-coach.mjs` (suggests a zero-based allocation of your income that minimises debt cost; you review and apply). If the server isn't reachable the app falls back to an offline rule-based plan and says why. The debt roadmap computes payoff dates exactly in the app; the optional **Ask the debt coach** button sends those figures (debt names replaced by "Debt A/B…") to a small proxy in `server/`, which calls Claude and returns a written plan. The Anthropic key lives only in `server/.env` (git-ignored) and is never bundled in the app.

```bash
cd server && node dev.mjs        # local proxy on :8787 (uses server/.env; code is in api/debt-coach.mjs)
# .env in the project root:  EXPO_PUBLIC_DEBT_COACH_URL=http://localhost:8787/api/debt-coach
```

For release, deploy this repo to Vercel (see above) with `ANTHROPIC_API_KEY` set as an environment variable and point `EXPO_PUBLIC_DEBT_COACH_URL` at the deployed URL. A physical iPhone can't reach `localhost`; use your computer's LAN IP or the deployed URL.

## Where things are

| Path | What |
| --- | --- |
| `src/theme/tokens.ts` | Design system: light + dark palettes, type scale (Fraunces + Inter), spacing, radii, shadows, spring presets |
| `src/ui/` | Primitives (Text, Press, Button, Card, Field, Segmented…), charts (Ring, Donut, Bars, Sparkline), feedback (empty/locked/error states, celebration) |
| `src/data/` | Zustand store (persisted), budget math (`selectors.ts`), templates |
| `src/content/learn.ts` | All bundled guides and tips |
| `src/services/` | Local notifications, CSV export |
| `app/` | Screens (expo-router): onboarding, tabs (Budget, Activity, Plan, Learn), paywall, editors, reports |
| `tools/make-icons.js` | Regenerates `assets/icon.png` and `assets/splash-icon.png` |

## Product rules worth knowing

- **Zero-based:** *Left to budget* = max(planned income, received income) − planned spending. Extra income counts immediately.
- **Funds are their own lane:** contributions are normal budget lines; spending *from* a fund (or adding a windfall to it) never touches the monthly budget.
- **Free:** budgeting, transactions, splits, funds, bills calendar, reminders, month history and category charts, all of Learn.
- **Allot Plus (mocked):** 6/12-month trends, paycheck planner, debt roadmap, net worth, CSV export.
