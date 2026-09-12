# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the existing JM Finance Tracker Flutter app with a true responsive layout (sidebar nav + wider dashboard-style screens on desktop/tablet, unchanged mobile UI below 840px), popup-based add/edit for all six entity CRUD flows, and a verification pass confirming every money display uses comma formatting.

**Architecture:** Two new breakpoint-aware shared widgets (`ResponsiveShell` replacing the tab bar's chrome, `ContentBounds` capping/centering content width on wide screens) plus a shared `AppDialog` chrome widget. Six existing full-page edit screens are converted in place to dialog widgets shown via `showDialog`, and their routes are removed from `go_router`. No data-model, store, or calculation changes.

**Tech Stack:** Same as the existing app — Flutter, `provider`, `go_router`, `lucide_icons_flutter`. No new dependencies.

## Global Constraints

- Breakpoint: `< 840` logical pixels width = Compact (today's mobile UI, unchanged); `>= 840` = Expanded (sidebar nav, wider/multi-column layouts).
- Six entities convert to popup dialogs closing on save: Transaction, Account, Category, Recurring Bill, Debt, Goal (split into an edit dialog and a separate contribution dialog). Settings (income) stays a full-page route — unchanged.
- Every dialog keeps the existing delete-confirmation pattern (nested `AlertDialog`, Cancel/Delete, Delete styled `AppColors.warning`) and the established defensive null-safety pattern: a delete button/handler must never be reachable when the looked-up entity is null.
- Design tokens (`AppColors`/`AppSpacing`/`AppRadius`/`AppTypography`) are unchanged — this is layout composition only.
- No new automated tests required (UI composition is outside this project's testing policy) except for the one pure, testable function this plan introduces (`windowSizeForWidth`).
- Onboarding stays Compact-only; not touched by this plan.
- Package name `jm_finance_tracker`; Lucide icons import from `package:lucide_icons_flutter/lucide_icons.dart` (if a specific icon identifier used in this plan doesn't exist in the installed version, substitute the closest equivalent and note it — same standing allowance as the original 27-task plan).

---

## File Structure Overview

```
lib/
  theme/
    breakpoints.dart              NEW — WindowSize enum, windowSizeForWidth(), windowSizeOf(), isExpanded()
  widgets/
    content_bounds.dart            NEW — centers/caps content width on Expanded
    app_dialog.dart                 NEW — shared dialog chrome (title, close button, sizing per breakpoint)
    main_shell.dart                 MODIFIED — sidebar nav on Expanded, unchanged bottom bar on Compact
    phone_frame.dart                DELETED — replaced by ResponsiveShell + ContentBounds
  main.dart                         MODIFIED — remove PhoneFrame wrapper
  app_router.dart                   MODIFIED — remove 6 entity detail/edit routes
  screens/
    home_screen.dart                MODIFIED — two-column dashboard on Expanded; dialog-based Add Transaction
    goals_list_screen.dart          MODIFIED — responsive grid; dialog-based create/edit/contribute
    debt_screen.dart                MODIFIED — responsive grid; dialog-based add/edit
    transactions_screen.dart        MODIFIED — ContentBounds; dialog-based add/edit
    insights_screen.dart            MODIFIED — ContentBounds only
    accounts_management_screen.dart MODIFIED — ContentBounds; dialog-based add/edit
    categories_screen.dart          MODIFIED — ContentBounds; dialog-based add
    recurring_management_screen.dart MODIFIED — ContentBounds; dialog-based add/edit
    notifications_screen.dart       MODIFIED — ContentBounds only
    more_screen.dart                MODIFIED — ContentBounds only
    transaction_edit_screen.dart    DELETED — replaced by transaction_edit_dialog.dart
    transaction_edit_dialog.dart    NEW
    account_edit_screen.dart        DELETED — replaced by account_edit_dialog.dart
    account_edit_dialog.dart        NEW
    category_add_screen.dart        DELETED — replaced by category_add_dialog.dart
    category_add_dialog.dart        NEW
    recurring_edit_screen.dart      DELETED — replaced by recurring_edit_dialog.dart
    recurring_edit_dialog.dart      NEW
    debt_edit_screen.dart           DELETED — replaced by debt_edit_dialog.dart
    debt_edit_dialog.dart           NEW
    goal_detail_screen.dart         DELETED — split into goal_edit_dialog.dart + goal_contribution_dialog.dart
    goal_edit_dialog.dart           NEW
    goal_contribution_dialog.dart   NEW
test/
  theme/breakpoints_test.dart       NEW
```

---

### Task 1: Breakpoints helper (TDD)

**Files:**
- Create: `lib/theme/breakpoints.dart`
- Test: `test/theme/breakpoints_test.dart`

**Interfaces:**
- Produces: `enum WindowSize { compact, expanded }`; `const double kExpandedBreakpoint = 840`; `WindowSize windowSizeForWidth(double width)` (pure, testable); `WindowSize windowSizeOf(BuildContext context)`; `bool isExpanded(BuildContext context)`. Every screen and widget touched by this plan imports `isExpanded`/`windowSizeOf` from here.

- [ ] **Step 1: Write the failing test**

Create `test/theme/breakpoints_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/theme/breakpoints.dart';

void main() {
  group('windowSizeForWidth', () {
    test('returns compact below the breakpoint', () {
      expect(windowSizeForWidth(839), WindowSize.compact);
    });

    test('returns expanded at and above the breakpoint', () {
      expect(windowSizeForWidth(840), WindowSize.expanded);
      expect(windowSizeForWidth(1280), WindowSize.expanded);
    });
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test test/theme/breakpoints_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/theme/breakpoints.dart': No such file or directory`.

- [ ] **Step 3: Implement `breakpoints.dart`**

Create `lib/theme/breakpoints.dart`:
```dart
import 'package:flutter/widgets.dart';

enum WindowSize { compact, expanded }

const double kExpandedBreakpoint = 840;

WindowSize windowSizeForWidth(double width) {
  return width >= kExpandedBreakpoint ? WindowSize.expanded : WindowSize.compact;
}

WindowSize windowSizeOf(BuildContext context) {
  return windowSizeForWidth(MediaQuery.sizeOf(context).width);
}

bool isExpanded(BuildContext context) => windowSizeOf(context) == WindowSize.expanded;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `flutter test test/theme/breakpoints_test.dart`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/theme/breakpoints.dart test/theme/breakpoints_test.dart
git commit -m "feat: add breakpoint helper for responsive layout"
```

---

### Task 2: Shared `ContentBounds` and `AppDialog` widgets

**Files:**
- Create: `lib/widgets/content_bounds.dart`, `lib/widgets/app_dialog.dart`

**Interfaces:**
- Consumes: `isExpanded` from Task 1; `AppColors`/`AppSpacing`/`AppRadius` from `lib/theme/app_theme.dart`.
- Produces: `ContentBounds({required Widget child})` — centers and caps content at 1200px wide on Expanded, passes through unchanged on Compact. `AppDialog({required String title, required Widget child})` — a `StatelessWidget` returning a sized, chrome-wrapped `Dialog` (title row with a close button, scrollable body) for use as a `showDialog` builder's return value. Every screen from Task 5 onward wraps its `AppScreen` child in `ContentBounds`; every entity dialog from Task 9 onward returns an `AppDialog` from its `build()`.

- [ ] **Step 1: Create `ContentBounds`**

Create `lib/widgets/content_bounds.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

/// Centers and caps content width on Expanded (wide) screens; passes
/// through unchanged on Compact (mobile) screens.
class ContentBounds extends StatelessWidget {
  final Widget child;
  const ContentBounds({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    if (!isExpanded(context)) return child;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1200),
        child: Padding(padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxxl), child: child),
      ),
    );
  }
}
```

- [ ] **Step 2: Create `AppDialog`**

Create `lib/widgets/app_dialog.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

/// Shared chrome for every entity add/edit popup: a titled, closable,
/// scrollable card sized appropriately for the current breakpoint.
/// Each entity dialog widget's build() should return this directly.
class AppDialog extends StatelessWidget {
  final String title;
  final Widget child;

  const AppDialog({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final expanded = isExpanded(context);
    return Dialog(
      backgroundColor: AppColors.bg,
      insetPadding: expanded ? const EdgeInsets.symmetric(horizontal: 24, vertical: 40) : const EdgeInsets.all(AppSpacing.lg),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: expanded ? 480 : double.infinity,
          maxHeight: MediaQuery.sizeOf(context).height * 0.85,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(title, style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textMuted),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `flutter analyze lib/widgets/content_bounds.dart lib/widgets/app_dialog.dart`
Expected: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add lib/widgets/content_bounds.dart lib/widgets/app_dialog.dart
git commit -m "feat: add ContentBounds and AppDialog shared responsive widgets"
```

---

### Task 3: Responsive `MainShell` (sidebar nav on Expanded)

**Files:**
- Modify: `lib/widgets/main_shell.dart` (full rewrite, same class name/constructor — `app_router.dart` needs no changes)

**Interfaces:**
- Consumes: `isExpanded` from Task 1; existing `StatefulNavigationShell` from `go_router` (unchanged usage).
- Produces: `MainShell({required StatefulNavigationShell navigationShell})` — identical public API to before. On Compact, renders exactly today's bottom-tab-bar UI. On Expanded, renders a persistent left sidebar with the same 5 destinations instead.

- [ ] **Step 1: Rewrite `main_shell.dart`**

Overwrite `lib/widgets/main_shell.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';

class _NavDestination {
  final IconData icon;
  final String label;
  const _NavDestination(this.icon, this.label);
}

const _destinations = [
  _NavDestination(LucideIcons.home, 'Home'),
  _NavDestination(LucideIcons.list, 'Transactions'),
  _NavDestination(LucideIcons.pieChart, 'Insights'),
  _NavDestination(LucideIcons.target, 'Goals'),
  _NavDestination(LucideIcons.menu, 'More'),
];

class MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const MainShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    if (isExpanded(context)) {
      return _ExpandedShell(navigationShell: navigationShell);
    }
    return _CompactShell(navigationShell: navigationShell);
  }
}

class _CompactShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _CompactShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(color: AppColors.bg, border: Border(top: BorderSide(color: AppColors.borderStrong, width: 1))),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: navigationShell.currentIndex,
            onTap: (index) => navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex),
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.bg,
            selectedItemColor: AppColors.accent,
            unselectedItemColor: AppColors.textMuted,
            selectedLabelStyle: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600),
            unselectedLabelStyle: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600),
            items: [
              for (final d in _destinations) BottomNavigationBarItem(icon: Icon(d.icon), label: d.label.toUpperCase()),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExpandedShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const _ExpandedShell({required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Row(
        children: [
          Container(
            width: 220,
            decoration: const BoxDecoration(color: AppColors.bg, border: Border(right: BorderSide(color: AppColors.borderStrong, width: 1))),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.xl),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    child: Text('JM Finance', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  for (var i = 0; i < _destinations.length; i++)
                    _SidebarItem(
                      destination: _destinations[i],
                      active: navigationShell.currentIndex == i,
                      onTap: () => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
                    ),
                ],
              ),
            ),
          ),
          Expanded(child: navigationShell),
        ],
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final _NavDestination destination;
  final bool active;
  final VoidCallback onTap;

  const _SidebarItem({required this.destination, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm2),
        decoration: BoxDecoration(
          color: active ? AppColors.surfaceMuted : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Icon(destination.icon, size: 20, color: active ? AppColors.accent : AppColors.textMuted),
            const SizedBox(width: AppSpacing.md),
            Text(destination.label, style: TextStyle(color: active ? AppColors.text : AppColors.textMuted, fontSize: 14, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Verify it compiles and builds**

Run: `flutter analyze lib/widgets/main_shell.dart` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 3: Verify in the browser at both breakpoints**

Run `flutter run -d chrome`. At a window width below 840px, confirm the bottom tab bar renders exactly as before. Resize the browser window above 840px and confirm a left sidebar with the same 5 destinations appears instead, and that tapping a destination switches tabs correctly at both widths.

- [ ] **Step 4: Commit**

```bash
git add lib/widgets/main_shell.dart
git commit -m "feat: add responsive sidebar nav for Expanded window size"
```

---

### Task 4: Remove `PhoneFrame`

**Files:**
- Delete: `lib/widgets/phone_frame.dart`
- Modify: `lib/main.dart`

**Interfaces:**
- Produces: the app root `MaterialApp.router`'s `builder` no longer wraps content in a fixed-width phone shell — `ResponsiveShell`'s work (Task 3) and `ContentBounds` (Task 2, used per-screen from Task 5 onward) take over that job.

- [ ] **Step 1: Remove the `PhoneFrame` wrapper from `main.dart`**

In `lib/main.dart`, remove the import:
```dart
import 'widgets/phone_frame.dart';
```

Replace the `builder` callback's body — change:
```dart
      builder: (context, child) {
        return PhoneFrame(
          child: Stack(
            children: [
              ?child,
              const ErrorBanner(),
            ],
          ),
        );
      },
```
to:
```dart
      builder: (context, child) {
        return ColoredBox(
          color: AppColors.bg,
          child: Stack(
            children: [
              ?child,
              const ErrorBanner(),
            ],
          ),
        );
      },
```

- [ ] **Step 2: Delete `phone_frame.dart`**

Run:
```bash
rm lib/widgets/phone_frame.dart
```

- [ ] **Step 3: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 4: Verify in the browser**

Run `flutter run -d chrome` at a wide browser window. Confirm the app now fills the window (no centered phone-width card with empty space on the sides) — content will look unstyled/full-bleed at this point since no screen has adopted `ContentBounds` yet; that's expected until Task 5.

- [ ] **Step 5: Commit**

```bash
git add lib/main.dart
git rm lib/widgets/phone_frame.dart
git commit -m "feat: remove fixed-width PhoneFrame, app now fills the browser window"
```

---

### Task 5: Wrap single-column screens in `ContentBounds`

**Files:**
- Modify: `lib/screens/transactions_screen.dart`, `lib/screens/insights_screen.dart`, `lib/screens/accounts_management_screen.dart`, `lib/screens/categories_screen.dart`, `lib/screens/recurring_management_screen.dart`, `lib/screens/notifications_screen.dart`, `lib/screens/more_screen.dart`

**Interfaces:**
- Consumes: `ContentBounds` from Task 2.
- Produces: these 7 screens render inside the same centered, width-capped container as every other screen on Expanded, while staying pixel-identical on Compact. This task does not touch any dialog/popup behavior (that's Tasks 9–14) — it's purely the wrapping.

- [ ] **Step 1: Wrap `insights_screen.dart`**

In `lib/screens/insights_screen.dart`, add the import:
```dart
import '../widgets/content_bounds.dart';
```
Then wrap **both** `return AppScreen(child: Column(...))` occurrences (the empty-state early return and the main return) so each becomes `return AppScreen(child: ContentBounds(child: Column(...)))` — i.e. insert `ContentBounds(child: ` immediately after `child: ` and close it with an extra `)` before the final `);` of that `AppScreen(...)` call. Concretely, change:
```dart
      return AppScreen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Insights', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.lg),
            const EmptyState(
              icon: IconChip(child: Icon(LucideIcons.pieChart, size: 16, color: AppColors.textMuted)),
              message: 'Add transactions to see insights.',
            ),
          ],
        ),
      );
```
to:
```dart
      return AppScreen(
        child: ContentBounds(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Insights', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppSpacing.lg),
              const EmptyState(
                icon: IconChip(child: Icon(LucideIcons.pieChart, size: 16, color: AppColors.textMuted)),
                message: 'Add transactions to see insights.',
              ),
            ],
          ),
        ),
      );
```
And apply the same transformation to the screen's second (main-content) `return AppScreen(child: Column(...));` — same wrapping pattern, just around the longer children list (Category Breakdown / Weekly Trend / Top Transactions cards). Re-indent the body one level deeper; do not otherwise change any of its content.

- [ ] **Step 2: Wrap `accounts_management_screen.dart`**

Add the import `import '../widgets/content_bounds.dart';`. Change:
```dart
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
```
to:
```dart
    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
```
and add one closing `)` before the final `);` that ends the `AppScreen(...)` call, re-indenting the body one level deeper. The body content (the `Row` header + `EmptyState`/`AppCard` list) is otherwise unchanged.

- [ ] **Step 3: Wrap `categories_screen.dart`**

Same transformation as Step 2 — add the `content_bounds.dart` import, wrap the single `return AppScreen(child: Column(...));` in `ContentBounds(...)`, re-indent, no other changes.

- [ ] **Step 4: Wrap `recurring_management_screen.dart`**

Same transformation as Step 2.

- [ ] **Step 5: Wrap `notifications_screen.dart`**

Same transformation as Step 2.

- [ ] **Step 6: Wrap `more_screen.dart`**

Same transformation as Step 2.

- [ ] **Step 7: Wrap `transactions_screen.dart`**

This screen uses `AppScreen(scroll: false, padded: false, child: Column(...))` (not the plain `AppScreen(child: ...)` shape the others use) because it manages its own `ListView`/padding internally. Add the import, then wrap only the outer `Column`'s content in `ContentBounds` so the search box, filter, and list all get the same width treatment as everything else:
```dart
    return AppScreen(
      scroll: false,
      padded: false,
      child: ContentBounds(
        child: Column(
          children: [
```
...(re-indent the existing body one level deeper)...
```dart
          ],
        ),
      ),
    );
```
Note: `ContentBounds` passes through unchanged on Compact (as built in Task 2), so this screen's existing `scroll: false`/manual `Expanded`+`ListView` behavior is unaffected at the Compact breakpoint; on Expanded it now centers within the 1200px cap.

- [ ] **Step 8: Verify it compiles and builds**

Run: `flutter analyze lib/screens` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 9: Verify in the browser**

At a Compact width, confirm all 7 screens are pixel-identical to before this task. At an Expanded width (e.g. 1280px), confirm each screen's content is centered with visible margins rather than stretching edge-to-edge.

- [ ] **Step 10: Commit**

```bash
git add lib/screens/transactions_screen.dart lib/screens/insights_screen.dart lib/screens/accounts_management_screen.dart lib/screens/categories_screen.dart lib/screens/recurring_management_screen.dart lib/screens/notifications_screen.dart lib/screens/more_screen.dart
git commit -m "feat: wrap single-column screens in ContentBounds for responsive width"
```

---

### Task 6: Home screen — two-column dashboard on Expanded

**Files:**
- Modify: `lib/screens/home_screen.dart`

**Interfaces:**
- Consumes: `isExpanded` from Task 1, `ContentBounds` from Task 2.
- Produces: on Compact, identical output to today (hero → stats → quick actions → recent transactions, stacked). On Expanded, hero+stats+quick-actions form a left column and recent transactions form a right column, side by side.

- [ ] **Step 1: Split the build method into a shared data-prep section and two layout branches**

Overwrite `lib/screens/home_screen.dart`:
```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/stat_figure.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../utils/money.dart';
import '../logic/safe_to_spend.dart';
import '../stores/accounts_store.dart';
import '../stores/recurring_store.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final recurringRules = context.watch<RecurringStore>().rules;
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;

    final safeToSpend = calculateSafeToSpend(accounts, recurringRules);
    final recentTop5 = ([...transactions]..sort((a, b) => b.date.compareTo(a.date))).take(5).toList();
    final monthIncome = transactions.where((t) => t.type == 'income').fold<double>(0, (s, t) => s + t.amount);
    final monthSpending = transactions.where((t) => t.type == 'expense').fold<double>(0, (s, t) => s + t.amount.abs());
    final upcoming = recurringRules.fold<double>(0, (s, r) => s + r.amount);

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    final heroSection = _HeroSection(safeToSpend: safeToSpend, monthIncome: monthIncome, monthSpending: monthSpending, upcoming: upcoming);
    final recentSection = _RecentTransactionsSection(recentTop5: recentTop5, categoryFor: categoryFor);

    return AppScreen(
      child: ContentBounds(
        child: isExpanded(context)
            ? IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: heroSection),
                    const SizedBox(width: AppSpacing.xl),
                    Expanded(child: recentSection),
                  ],
                ),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [heroSection, recentSection],
              ),
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  final double safeToSpend;
  final double monthIncome;
  final double monthSpending;
  final double upcoming;

  const _HeroSection({required this.safeToSpend, required this.monthIncome, required this.monthSpending, required this.upcoming});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          emphasis: true,
          margin: const EdgeInsets.only(bottom: AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('SAFE TO SPEND', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
              const SizedBox(height: AppSpacing.sm),
              Text(
                formatMoney(safeToSpend),
                style: const TextStyle(color: AppColors.text, fontSize: 60, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
              ),
            ],
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            StatFigure(label: 'Income', amount: monthIncome, tone: StatTone.positive),
            StatFigure(label: 'Spending', amount: monthSpending),
            StatFigure(label: 'Upcoming', amount: upcoming),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        Container(
          decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
          child: Row(
            children: [
              Expanded(child: _QuickAction(icon: LucideIcons.plus, label: 'Add Transaction', onTap: () => context.push('/transaction/new'))),
              Expanded(child: _QuickAction(icon: LucideIcons.creditCard, label: 'View Debt', onTap: () => context.push('/debts'))),
              Expanded(child: _QuickAction(icon: LucideIcons.trendingUp, label: 'Cash Flow', onTap: () => context.push('/cash-flow'))),
            ],
          ),
        ),
      ],
    );
  }
}

class _RecentTransactionsSection extends StatelessWidget {
  final List<Transaction> recentTop5;
  final Category? Function(String) categoryFor;

  const _RecentTransactionsSection({required this.recentTop5, required this.categoryFor});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Transactions', style: TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        if (recentTop5.isEmpty)
          EmptyState(
            icon: const IconChip(child: Icon(LucideIcons.plus, size: 16, color: AppColors.textMuted)),
            message: 'No transactions yet.',
            ctaLabel: 'Add Transaction',
            onPressCta: () => context.push('/transaction/new'),
          )
        else
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < recentTop5.length; i++)
                  ListRow(
                    icon: CategoryIcon(name: categoryFor(recentTop5[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(recentTop5[i].categoryId)?.name ?? 'Uncategorized',
                    caption: recentTop5[i].note.isNotEmpty ? recentTop5[i].note : recentTop5[i].date.substring(0, 10),
                    amount: recentTop5[i].amount,
                    isLast: i == recentTop5.length - 1,
                    onTap: () => context.push('/transaction/${recentTop5[i].id}'),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.text),
            const SizedBox(height: 6),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.text, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
```
This task keeps today's `context.push('/transaction/...')` navigation unchanged — only the layout is restructured into two reusable sections (`_HeroSection`, `_RecentTransactionsSection`) arranged as a `Row` on Expanded or stacked on Compact. Task 12 (later) converts these same navigation calls to popups once the dialog widgets exist.

- [ ] **Step 2: Verify it compiles and builds**

Run: `flutter analyze lib/screens/home_screen.dart` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 3: Verify in the browser**

At Compact width, confirm Home looks pixel-identical to before this task (hero, stats, quick actions, recent transactions all stacked). At Expanded width, confirm the hero/stats/quick-actions column sits to the left of the recent-transactions column, side by side.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/home_screen.dart
git commit -m "feat: split Home screen into a two-column dashboard on Expanded"
```

---

### Task 7: Goals list screen — responsive grid

**Files:**
- Modify: `lib/screens/goals_list_screen.dart`

**Interfaces:**
- Consumes: `isExpanded` from Task 1, `ContentBounds` from Task 2.
- Produces: on Compact, one goal card per row (unchanged). On Expanded, goal cards lay out in a grid — 2 columns between 840–1200px, 3 columns above 1200px.

- [ ] **Step 1: Rewrite the goals list into a responsive grid**

Overwrite `lib/screens/goals_list_screen.dart`:
```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../theme/breakpoints.dart';
import '../widgets/app_screen.dart';
import '../widgets/content_bounds.dart';
import '../widgets/app_card.dart';
import '../widgets/app_progress_bar.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../models/models.dart';

class GoalsListScreen extends StatelessWidget {
  const GoalsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final goals = context.watch<GoalsStore>().goals;
    final width = MediaQuery.sizeOf(context).width;
    final columns = !isExpanded(context) ? 1 : (width >= 1200 ? 3 : 2);

    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Goals', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/goal/new')),
              ],
            ),
            if (goals.isEmpty)
              EmptyState(
                icon: const IconChip(child: Icon(LucideIcons.target, size: 16, color: AppColors.textMuted)),
                message: 'No goals yet.',
                ctaLabel: 'Add Goal',
                onPressCta: () => context.push('/goal/new'),
              )
            else
              GridView.count(
                crossAxisCount: columns,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.md,
                crossAxisSpacing: AppSpacing.md,
                childAspectRatio: columns == 1 ? 3.2 : 2.2,
                children: [for (final g in goals) _GoalCard(goal: g)],
              ),
          ],
        ),
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  final Goal goal;
  const _GoalCard({required this.goal});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/goal/${goal.id}'),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              goal.name,
              style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700),
              overflow: TextOverflow.ellipsis,
            ),
            AppProgressBar(progress: goal.targetAmount == 0 ? 0 : goal.currentAmount / goal.targetAmount),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${formatMoney(goal.currentAmount)} of ${formatMoney(goal.targetAmount)}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
            ),
          ],
        ),
      ),
    );
  }
}
```
This task keeps today's `context.push('/goal/...')` navigation and single-screen `GoalDetailScreen` unchanged — only the list layout is gridded. The card's edit-pencil affordance and the split into two separate popups (edit vs. contribute) are introduced in Task 14, which also removes this temporary `_GoalCard` in favor of the dialog-opening version.

- [ ] **Step 2: Verify it compiles and builds**

Run: `flutter analyze lib/screens/goals_list_screen.dart` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 3: Verify in the browser**

At Compact width, confirm one goal card per row, unchanged from before. At Expanded width (≥840px), confirm 2 columns; at ≥1200px, confirm 3 columns.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/goals_list_screen.dart
git commit -m "feat: lay out Goals as a responsive grid on Expanded"
```

---

### Task 8: Debt screen — responsive grid for debt rows

**Files:**
- Modify: `lib/screens/debt_screen.dart`

**Interfaces:**
- Consumes: `isExpanded` from Task 1, `ContentBounds` from Task 2.
- Produces: the total-owed card and payoff-projection card stay full-width at every breakpoint (they're already dashboard-shaped, a grid wouldn't suit them); only the per-debt list below them becomes a responsive grid (2 columns Expanded, 1 column Compact) matching the Goals screen's treatment.

- [ ] **Step 1: Wrap the screen in `ContentBounds` and grid the debt rows**

In `lib/screens/debt_screen.dart`, add the imports:
```dart
import '../theme/breakpoints.dart';
import '../widgets/content_bounds.dart';
```
Change the outer return from:
```dart
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
```
to:
```dart
    return AppScreen(
      child: ContentBounds(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
```
(re-indenting the existing body one level deeper, and adding one closing `)` before the final `);`).

Then replace the per-debt list — change:
```dart
            for (final d in debts)
              GestureDetector(
                onTap: () => context.push('/debts/${d.id}'),
                child: AppCard(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(d.name, style: const TextStyle(color: AppColors.text, fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(
                        '${formatMoney(d.balance)} · ${d.interestRate}% APR · Min ${formatMoney(d.minPayment)}',
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontFeatures: [FontFeature.tabularFigures()]),
                      ),
                    ],
                  ),
                ),
              ),
```
to:
```dart
            GridView.count(
              crossAxisCount: isExpanded(context) ? 2 : 1,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.md,
              childAspectRatio: isExpanded(context) ? 3.4 : 4.2,
              children: [
                for (final d in debts)
                  GestureDetector(
                    onTap: () => context.push('/debts/${d.id}'),
                    child: AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(d.name, style: const TextStyle(color: AppColors.text, fontSize: 15, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(
                            '${formatMoney(d.balance)} · ${d.interestRate}% APR · Min ${formatMoney(d.minPayment)}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontFeatures: [FontFeature.tabularFigures()]),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
```
This task's header "+" button and empty-state CTA keep their existing `context.push('/debts/new')` calls unchanged — only the per-debt list becomes a grid. Task 13 (later) converts these same navigation calls to popups once `DebtEditDialog` exists.

- [ ] **Step 2: Verify it compiles and builds**

Run: `flutter analyze lib/screens/debt_screen.dart` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 3: Verify in the browser**

At Compact width, confirm the debt list is unchanged (one card per row). At Expanded width, confirm 2 debt cards per row while the total-owed and payoff-projection cards above stay full-width.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/debt_screen.dart
git commit -m "feat: lay out Debt list as a responsive grid on Expanded"
```