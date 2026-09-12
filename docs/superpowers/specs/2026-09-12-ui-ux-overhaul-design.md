# JM Finance Tracker — UI/UX Overhaul Design Spec

Date: 2026-09-12
Status: Approved for implementation planning
Depends on: the existing Flutter app built per `docs/superpowers/plans/2026-09-10-jm-finance-tracker-flutter.md` (27 tasks, all merged to `master`) plus its post-review CRUD-completeness fixes.
Precedes: a separate, later spec for real cloud accounts (Supabase-backed auth + data migration) — explicitly out of scope here. This spec's changes are purely presentational/UI-layer and must work unchanged against the current local `shared_preferences` storage.

## 1. Summary

Three related UI/UX changes to the existing app, done together as one project since they touch overlapping screens:

1. **True responsive redesign** — replace the fixed 430px phone-width shell with a breakpoint-aware layout: today's mobile UI below 840px, a sidebar-nav dashboard-style layout at 840px and above.
2. **Popup-based add/edit** — convert the six entity add/edit screens (Transaction, Account, Category, Recurring Bill, Debt, Goal) from full-page routes to modal dialogs that close automatically on save.
3. **Comma-formatting audit** — confirm every read-only money display uses `formatMoney()` (comma thousands separators); no functional change expected, this is verification only.

No backend, no auth, no data-model changes. Every store, calculation module, and the entity CRUD logic built in the original 27-task plan is unchanged — this spec only touches `lib/widgets/`, `lib/screens/`, and `lib/app_router.dart`.

## 2. Responsive layout redesign

**Breakpoints:** two tiers, checked via `MediaQuery.sizeOf(context).width`:
- **Compact** (`< 840`): today's UI, unchanged — bottom tab bar (`MainShell`), single-column screens, existing padding.
- **Expanded** (`>= 840`): a persistent left sidebar nav replaces the bottom tab bar; main content area to the right.

**New shared widgets:**
- `Breakpoints` (`lib/theme/breakpoints.dart`): a small helper exposing `isExpanded(BuildContext)` (or an enum `WindowSize { compact, expanded }` via a `windowSizeOf(context)` function) so screens don't hardcode `840` in multiple places.
- `ResponsiveShell` (replaces today's `MainShell` as the tab-shell's builder): on Compact, renders exactly what `MainShell` renders today (bottom `BottomNavigationBar` + `navigationShell`). On Expanded, renders a `Row`: a fixed-width sidebar (icon + label per tab, same 5 destinations, active state styled with `AppColors.accent` matching the bottom bar's existing active/inactive convention) on the left, `Expanded(child: navigationShell)` on the right. Both branches use the same `StatefulNavigationShell` from `go_router` — only the chrome around it changes.
- `ContentBounds` (a small wrapper): on Expanded, centers its child with `ConstrainedBox(maxWidth: 1200)` and horizontal margins; on Compact, passes through unchanged (full width, existing screen padding). Every screen's top-level content wraps in this instead of relying on `PhoneFrame`'s old fixed cap.
- `PhoneFrame` (`lib/widgets/phone_frame.dart`) is removed; `ResponsiveShell`/`ContentBounds` replace its job. `AppScreen` itself is otherwise unchanged (still provides the `Material` ancestor, `SafeArea`, scroll behavior).

**Per-screen adaptation on Expanded** (Compact behavior is unchanged for all of these):
- **Home**: two-column dashboard — left column: Safe-to-Spend hero card + stat row + quick actions; right column: recent transactions card. Below `840`, stacks vertically exactly as today.
- **Goals** and **Debt** list screens: cards lay out in a responsive `Wrap`/`GridView` (2 columns at 840–1200px, 3 columns above 1200px) instead of one stacked column.
- **Transactions, Insights, Accounts, Categories, Recurring, Notifications, More**: stay single-column (they're inherently list/detail-shaped), but render inside `ContentBounds`' wider canvas instead of the old 430px cap — meaning more comfortable padding and a wider (not multi-column) list.

**Explicitly unchanged:** onboarding screens stay Compact-only (a first-run wizard doesn't need a desktop treatment for v1); the visual design tokens (`AppColors`/`AppSpacing`/`AppRadius`/`AppTypography`) are untouched — this is a layout-composition change, not a re-theme.

## 3. Popup-based add/edit

**Scope:** `TransactionEditScreen`, `AccountEditScreen`, `CategoryAddScreen`/category delete, `RecurringEditScreen`, `DebtEditScreen`, `GoalDetailScreen`'s edit/create mode. Each becomes a dialog widget shown via `showDialog(context, builder: ...)` from its list screen (tapping "+" or a row), instead of `context.push('/entity/:id')`.

**Shape:** each dialog widget keeps its existing form body (the `AppFormField`/`AppSegmentedControl`/`AppButton` composition already built) but wraps it in a `Dialog` (or `AlertDialog` with a custom content widget, whichever renders more cleanly at this app's typical field-count) sized to a comfortable fixed width on Expanded (e.g. 480px) and a near-full-width sheet on Compact. On successful save, the dialog calls `Navigator.of(context).pop()` (closing itself) instead of `context.pop()` (which was popping a route). Delete confirmation stays a nested `AlertDialog` shown from within the edit dialog's context — same pattern already used, just one level deeper.

**Router changes:** `/transaction/:id`, `/accounts/:id`, `/categories/add`, `/recurring/:id`, `/debts/:id`, and `/goal/:id` are removed from `lib/app_router.dart` — these six entities no longer have routable detail pages. `/accounts`, `/categories`, `/recurring`, `/debt` (soon `/debts`), and `/goals` (the tab) remain as-is; they're the list screens that now open dialogs directly rather than pushing to a child route.

**Goal contribution flow (Task 21's `GoalDetailScreen`) is a special case:** it currently combines create, edit, AND "add a contribution" in one screen reached via `/goal/:id`. Since contribution-adding isn't itself a CRUD form on the Goal entity (it creates a `Transaction`), it needs a decision: the create/edit/delete portion becomes a popup like every other entity, and "view progress + add a contribution" becomes what a goal card's tap opens instead (a lighter-weight popup showing progress + a contribution field, separate from the "Edit Goal" popup reached via an edit icon on that same card). Two popups per goal (a "view/contribute" one from tapping the card, an "edit" one from a pencil icon) rather than one screen doing everything.

## 4. Comma-formatting audit

No design decisions needed — this is a verification pass during implementation: grep every screen for a `Text(...)` displaying a money value and confirm it routes through `formatMoney()`, not a raw `.toString()`/string interpolation of a `double`. Editable text fields showing a raw parseable number while being typed into are correct as-is and out of scope for this audit.

## 5. Testing approach

No new automated tests are needed for this spec — it is UI composition/layout, which this project's testing policy already excludes from automated coverage (only pure calculation logic and cross-store orchestration get unit tests). Verification is manual: click through every screen at both a Compact width (e.g. 390px) and an Expanded width (e.g. 1280px) in a browser, and exercise every popup's open → edit → save → auto-close cycle plus its delete-confirmation path.

## 6. Out of scope (explicitly deferred to the cloud-accounts spec)

Login/signup screens, Supabase (or any backend) integration, per-account data storage, data migration from local storage to the cloud, and any change to how `shared_preferences`-backed stores persist data. This spec assumes the app continues to run exactly as it does today, data-wise.
