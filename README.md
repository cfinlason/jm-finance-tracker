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
