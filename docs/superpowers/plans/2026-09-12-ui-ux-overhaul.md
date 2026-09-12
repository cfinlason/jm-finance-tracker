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

---

### Task 9: Transaction popup dialog

**Files:**
- Create: `lib/screens/transaction_edit_dialog.dart`
- Delete: `lib/screens/transaction_edit_screen.dart`
- Modify: `lib/screens/home_screen.dart`, `lib/screens/transactions_screen.dart`, `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` from Task 2; `TransactionActions` (unchanged, from the original 27-task plan's Task 9).
- Produces: `TransactionEditDialog({required String id})` — a `StatefulWidget` whose `build()` returns an `AppDialog`. `id == 'new'` creates; any other `id` edits/deletes. Shown via `showDialog(context: context, builder: (_) => TransactionEditDialog(id: ...))`; closes itself via `Navigator.of(context).pop()` on save/delete instead of `context.pop()`.

- [ ] **Step 1: Create `transaction_edit_dialog.dart`**

Create `lib/screens/transaction_edit_dialog.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../stores/goals_store.dart';
import '../logic/transaction_actions.dart';

class TransactionEditDialog extends StatefulWidget {
  final String id;
  const TransactionEditDialog({super.key, required this.id});

  @override
  State<TransactionEditDialog> createState() => _TransactionEditDialogState();
}

class _TransactionEditDialogState extends State<TransactionEditDialog> {
  late String _type;
  late String _amountText;
  late String _accountId;
  late String _categoryId;
  late String _note;
  String _error = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final categories = context.watch<CategoriesStore>().categories;
    final transactionsStore = context.watch<TransactionsStore>();
    final isNew = widget.id == 'new';

    Transaction? existing;
    if (!isNew) {
      for (final t in transactionsStore.transactions) {
        if (t.id == widget.id) {
          existing = t;
          break;
        }
      }
    }

    if (!_initialized) {
      _type = existing?.type == 'income' ? 'income' : 'expense';
      _amountText = existing != null ? existing.amount.abs().toString() : '';
      _accountId = existing?.accountId ?? (accounts.isNotEmpty ? accounts[0].id : '');
      _categoryId = existing?.categoryId ?? (categories.isNotEmpty ? categories[0].id : '');
      _note = existing?.note ?? '';
      _initialized = true;
    }

    final amount = double.tryParse(_amountText);
    final isValid = amount != null && amount > 0 && _accountId.isNotEmpty && _categoryId.isNotEmpty;

    final actions = TransactionActions(
      accountsStore: context.read<AccountsStore>(),
      transactionsStore: transactionsStore,
      goalsStore: context.read<GoalsStore>(),
    );

    void handleSave() {
      if (!isValid) {
        setState(() => _error = 'Enter a valid amount, account, and category.');
        return;
      }
      final signedAmount = _type == 'income' ? amount! : -amount!;
      if (isNew) {
        actions.createTransaction(
          accountId: _accountId,
          categoryId: _categoryId,
          amount: signedAmount,
          note: _note,
          date: DateTime.now().toIso8601String(),
          type: _type,
        );
      } else if (existing != null) {
        actions.editTransaction(existing.id, accountId: _accountId, categoryId: _categoryId, amount: signedAmount, note: _note, type: _type);
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = existing;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete transaction?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                actions.deleteTransaction(target.id);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppDialog(
      title: isNew ? 'Add Transaction' : 'Edit Transaction',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppSegmentedControl<String>(
            options: const [SegmentOption(label: 'Expense', value: 'expense'), SegmentOption(label: 'Income', value: 'income')],
            value: _type,
            onChanged: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(
            label: 'Amount (J\$)',
            value: _amountText,
            onChanged: (v) => setState(() => _amountText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
            error: _error.isNotEmpty ? _error : null,
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('ACCOUNT', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [for (final a in accounts) _Chip(label: a.name, active: _accountId == a.id, onTap: () => setState(() => _accountId = a.id))],
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('CATEGORY', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [for (final c in categories) _Chip(label: c.name, active: _categoryId == c.id, onTap: () => setState(() => _categoryId = c.id))],
          ),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Note', value: _note, onChanged: (v) => setState(() => _note = v), placeholder: 'Optional note'),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          if (!isNew && existing != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: active ? AppColors.accent : Colors.transparent,
          border: Border.all(color: active ? AppColors.accent : AppColors.border),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label, style: TextStyle(color: active ? AppColors.accentInk : AppColors.text, fontSize: 13, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
```

- [ ] **Step 2: Delete the old routed screen**

Run: `rm lib/screens/transaction_edit_screen.dart`

- [ ] **Step 3: Wire `home_screen.dart` to open the dialog**

In `lib/screens/home_screen.dart`, add the import:
```dart
import 'transaction_edit_dialog.dart';
```
Change `onTap: () => context.push('/transaction/new')` (in `_QuickAction`'s "Add Transaction" and in `_RecentTransactionsSection`'s empty-state CTA) to:
```dart
onTap: () => showDialog(context: context, builder: (_) => const TransactionEditDialog(id: 'new')),
```
Change `onTap: () => context.push('/transaction/${recentTop5[i].id}')` to:
```dart
onTap: () => showDialog(context: context, builder: (_) => TransactionEditDialog(id: recentTop5[i].id)),
```

- [ ] **Step 4: Wire `transactions_screen.dart` to open the dialog**

Add the import `import 'transaction_edit_dialog.dart';`. Change the empty state's `onPressCta: () => context.push('/transaction/new')` to `onPressCta: () => showDialog(context: context, builder: (_) => const TransactionEditDialog(id: 'new'))`. Change the transaction row's `onTap: () => context.push('/transaction/${t.id}')` to `onTap: () => showDialog(context: context, builder: (_) => TransactionEditDialog(id: t.id))`.

- [ ] **Step 5: Remove the route from `app_router.dart`**

Remove this line from the `routes:` list:
```dart
      GoRoute(path: '/transaction/:id', builder: (context, state) => TransactionEditScreen(id: state.pathParameters['id']!)),
```
Remove the now-unused import:
```dart
import 'screens/transaction_edit_screen.dart';
```

- [ ] **Step 6: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 7: Verify the full add → edit → delete cycle in the browser**

From Home or Transactions, tap "Add Transaction". Confirm a popup opens (not a full-page navigation), fill it out, tap Save, confirm it closes itself and the transaction appears in both lists. Tap an existing transaction, confirm the popup pre-fills, edit it, Save, confirm it closes and the change is reflected. Tap Delete, confirm the nested confirmation dialog, confirm on Delete it removes the transaction and closes both dialogs.

- [ ] **Step 8: Commit**

```bash
git add lib/screens/transaction_edit_dialog.dart lib/screens/home_screen.dart lib/screens/transactions_screen.dart lib/app_router.dart
git rm lib/screens/transaction_edit_screen.dart
git commit -m "feat: convert Add/Edit Transaction to a popup dialog"
```

### Task 10: Account popup dialog

**Files:**
- Create: `lib/screens/account_edit_dialog.dart`
- Delete: `lib/screens/account_edit_screen.dart`
- Modify: `lib/screens/accounts_management_screen.dart`
- Modify: `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` (Task 2), `AccountActions` (`lib/logic/account_actions.dart`, unchanged), `AccountsStore`/`TransactionsStore`/`RecurringStore` (unchanged)
- Produces: `AccountEditDialog({required String id})` — a `StatefulWidget` shown via `showDialog`

- [ ] **Step 1: Create `lib/screens/account_edit_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';
import '../stores/transactions_store.dart';
import '../stores/recurring_store.dart';
import '../logic/account_actions.dart';

const _accountTypes = [
  SegmentOption(label: 'Checking', value: 'checking'),
  SegmentOption(label: 'Savings', value: 'savings'),
  SegmentOption(label: 'Cash', value: 'cash'),
  SegmentOption(label: 'Credit', value: 'credit'),
];

class AccountEditDialog extends StatefulWidget {
  final String id;
  const AccountEditDialog({super.key, required this.id});

  @override
  State<AccountEditDialog> createState() => _AccountEditDialogState();
}

class _AccountEditDialogState extends State<AccountEditDialog> {
  String _name = '';
  String _type = 'checking';
  String _balanceText = '0';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final accountsStore = context.watch<AccountsStore>();
    final isNew = widget.id == 'new';

    Account? account;
    if (!isNew) {
      for (final a in accountsStore.accounts) {
        if (a.id == widget.id) {
          account = a;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = account?.name ?? '';
      _type = account?.type ?? 'checking';
      _balanceText = account != null ? account.balance.toString() : '0';
      _initialized = true;
    }

    void handleSave() {
      final balance = double.tryParse(_balanceText);
      if (_name.isEmpty || balance == null) return;
      if (isNew) {
        accountsStore.addAccount(name: _name, type: _type, balance: balance);
      } else if (account != null) {
        accountsStore.updateAccount(account.id, name: _name, type: _type, balance: balance);
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = account;
      if (target == null) return;
      final accountActions = AccountActions(
        accountsStore: accountsStore,
        transactionsStore: context.read<TransactionsStore>(),
        recurringStore: context.read<RecurringStore>(),
      );
      final dependents = accountActions.countDependents(target.id);
      final hasDependents = dependents.transactionCount > 0 || dependents.recurringRuleCount > 0;
      final message = hasDependents
          ? 'Delete account? This will also delete ${dependents.transactionCount} associated transaction(s) '
              'and ${dependents.recurringRuleCount} recurring bill(s). This cannot be undone.'
          : 'This cannot be undone.';

      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete account?', style: TextStyle(color: AppColors.text)),
          content: Text(message, style: const TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                accountActions.deleteAccountCascade(target.id);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppDialog(
      title: isNew ? 'Add Account' : 'Edit Account',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Account name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. NCB Checking'),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(options: _accountTypes, value: _type, onChanged: (v) => setState(() => _type = v)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: (_name.isNotEmpty && _balanceText.isNotEmpty) ? handleSave : null),
          if (!isNew && account != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Delete `lib/screens/account_edit_screen.dart`**

- [ ] **Step 3: Wire `lib/screens/accounts_management_screen.dart` to open the dialog**

Add the import:

```dart
import 'account_edit_dialog.dart';
```

Replace both `onPressed: () => context.push('/accounts/new')` call sites (the `IconButton` and the `EmptyState`'s `onPressCta`) with:

```dart
onPressed: () => showDialog(context: context, builder: (_) => const AccountEditDialog(id: 'new')),
```

(For the `EmptyState`, the parameter is `onPressCta:` — same replacement body.)

Replace the `ListRow`'s `onTap: () => context.push('/accounts/${accounts[i].id}')` with:

```dart
onTap: () => showDialog(context: context, builder: (_) => AccountEditDialog(id: accounts[i].id)),
```

- [ ] **Step 4: Remove the account route from `lib/app_router.dart`**

Delete this line:

```dart
GoRoute(path: '/accounts/:id', builder: (context, state) => AccountEditScreen(id: state.pathParameters['id']!)),
```

Delete the now-unused import:

```dart
import 'screens/account_edit_screen.dart';
```

- [ ] **Step 5: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 6: Verify in the browser**

From Accounts, tap "+" — confirm a popup opens, save a new account, confirm it appears and the popup closed. Tap an existing account row, confirm it pre-fills, edit and save, confirm the popup closes and change is reflected. Tap Delete on an account with transactions, confirm the cascade-delete confirmation message shows the correct counts, confirm Delete removes everything and closes both dialogs.

- [ ] **Step 7: Commit**

```bash
git add lib/screens/account_edit_dialog.dart lib/screens/accounts_management_screen.dart lib/app_router.dart
git rm lib/screens/account_edit_screen.dart
git commit -m "feat: convert Add/Edit Account to a popup dialog"
```

### Task 11: Category popup dialog

**Files:**
- Create: `lib/screens/category_add_dialog.dart`
- Delete: `lib/screens/category_add_screen.dart`
- Modify: `lib/screens/categories_screen.dart`
- Modify: `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` (Task 2), `CategoriesStore` (unchanged)
- Produces: `CategoryAddDialog` — a `StatefulWidget` shown via `showDialog` (create-only; categories have no edit form, only delete, which stays inline on the list screen as today)

- [ ] **Step 1: Create `lib/screens/category_add_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/categories_store.dart';

class CategoryAddDialog extends StatefulWidget {
  const CategoryAddDialog({super.key});

  @override
  State<CategoryAddDialog> createState() => _CategoryAddDialogState();
}

class _CategoryAddDialogState extends State<CategoryAddDialog> {
  String _name = '';
  String _kind = 'expense';

  @override
  Widget build(BuildContext context) {
    final categoriesStore = context.watch<CategoriesStore>();

    void handleSave() {
      if (_name.isEmpty) return;
      categoriesStore.addCategory(_name, 'more-horizontal', _kind == 'income');
      Navigator.of(context).pop();
    }

    return AppDialog(
      title: 'Add Category',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Category name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Subscriptions'),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(
            options: const [SegmentOption(label: 'Expense', value: 'expense'), SegmentOption(label: 'Income', value: 'income')],
            value: _kind,
            onChanged: (v) => setState(() => _kind = v),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: _name.isNotEmpty ? handleSave : null),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Delete `lib/screens/category_add_screen.dart`**

- [ ] **Step 3: Wire `lib/screens/categories_screen.dart` to open the dialog**

Add the import:

```dart
import 'category_add_dialog.dart';
```

Replace `onPressed: () => context.push('/categories/add')` on the `IconButton` with:

```dart
onPressed: () => showDialog(context: context, builder: (_) => const CategoryAddDialog()),
```

(The `handleDelete` inline confirmation and `ListRow.onTap` for custom categories stay unchanged — deletion was never a routed screen.)

- [ ] **Step 4: Remove the category-add route from `lib/app_router.dart`**

Delete this line:

```dart
GoRoute(path: '/categories/add', builder: (context, state) => const CategoryAddScreen()),
```

Delete the now-unused import:

```dart
import 'screens/category_add_screen.dart';
```

- [ ] **Step 5: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 6: Verify in the browser**

From Categories, tap "+", confirm a popup opens, save a new category, confirm it appears in the list and the popup closed itself. Confirm deleting a custom category still works via its existing inline confirmation dialog (unchanged).

- [ ] **Step 7: Commit**

```bash
git add lib/screens/category_add_dialog.dart lib/screens/categories_screen.dart lib/app_router.dart
git rm lib/screens/category_add_screen.dart
git commit -m "feat: convert Add Category to a popup dialog"
```

### Task 12: Recurring Bill popup dialog

**Files:**
- Create: `lib/screens/recurring_edit_dialog.dart`
- Delete: `lib/screens/recurring_edit_screen.dart`
- Modify: `lib/screens/recurring_management_screen.dart`
- Modify: `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` (Task 2), `RecurringStore`/`AccountsStore`/`CategoriesStore` (unchanged, including `RecurringStore.advanceNextDueDate`)
- Produces: `RecurringEditDialog({required String id})` — a `StatefulWidget` shown via `showDialog`

This task ports `recurring_edit_screen.dart` **as it exists today** (including its due-date picker and "Mark Paid" button added by the earlier CRUD-audit fix) into dialog form — no behavior changes beyond the dialog chrome and `pop()` mechanics.

- [ ] **Step 1: Create `lib/screens/recurring_edit_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/recurring_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';

const _frequencies = [
  SegmentOption(label: 'Weekly', value: 'weekly'),
  SegmentOption(label: 'Biweekly', value: 'biweekly'),
  SegmentOption(label: 'Monthly', value: 'monthly'),
];

class RecurringEditDialog extends StatefulWidget {
  final String id;
  const RecurringEditDialog({super.key, required this.id});

  @override
  State<RecurringEditDialog> createState() => _RecurringEditDialogState();
}

class _RecurringEditDialogState extends State<RecurringEditDialog> {
  String _name = '';
  String _amountText = '';
  String _frequency = 'monthly';
  String _nextDueDate = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final recurringStore = context.watch<RecurringStore>();
    final accountsStore = context.watch<AccountsStore>();
    final categoriesStore = context.watch<CategoriesStore>();
    final isNew = widget.id == 'new';

    RecurringRule? rule;
    if (!isNew) {
      for (final r in recurringStore.rules) {
        if (r.id == widget.id) {
          rule = r;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = rule?.name ?? '';
      _amountText = rule != null ? rule.amount.toString() : '';
      _frequency = rule?.frequency ?? 'monthly';
      _nextDueDate = rule?.nextDueDate ?? DateTime.now().toIso8601String();
      _initialized = true;
    }

    void handleSave() {
      final amount = double.tryParse(_amountText);
      if (_name.isEmpty || amount == null || accountsStore.accounts.isEmpty || categoriesStore.categories.isEmpty) return;
      if (isNew) {
        recurringStore.addRule(
          name: _name,
          categoryId: categoriesStore.categories[0].id,
          accountId: accountsStore.accounts[0].id,
          amount: amount,
          frequency: _frequency,
          nextDueDate: _nextDueDate,
        );
      } else if (rule != null) {
        recurringStore.updateRule(rule.id, name: _name, amount: amount, frequency: _frequency, nextDueDate: _nextDueDate);
      }
      Navigator.of(context).pop();
    }

    void handleMarkPaid() {
      if (rule != null) {
        recurringStore.advanceNextDueDate(rule.id);
      }
    }

    Future<void> handlePickDate() async {
      final current = DateTime.tryParse(_nextDueDate) ?? DateTime.now();
      final picked = await showDatePicker(
        context: context,
        initialDate: current,
        firstDate: DateTime(current.year - 5),
        lastDate: DateTime(current.year + 5),
      );
      if (picked != null) {
        setState(() => _nextDueDate = picked.toIso8601String());
      }
    }

    void handleDelete() {
      final target = rule;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete recurring bill?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                if (target != null) {
                  recurringStore.removeRule(target.id);
                }
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppDialog(
      title: isNew ? 'Add Recurring Bill' : 'Edit Recurring Bill',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Netflix'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Amount (J\$)', value: _amountText, onChanged: (v) => setState(() => _amountText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(options: _frequencies, value: _frequency, onChanged: (v) => setState(() => _frequency = v)),
          const SizedBox(height: AppSpacing.md),
          GestureDetector(
            onTap: handlePickDate,
            child: AbsorbPointer(
              child: AppFormField(label: 'Next due date', value: _nextDueDate.substring(0, 10), onChanged: (_) {}),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: (_name.isNotEmpty && _amountText.isNotEmpty) ? handleSave : null),
          if (!isNew && rule != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Mark Paid', variant: AppButtonVariant.secondary, onPressed: handleMarkPaid),
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Delete `lib/screens/recurring_edit_screen.dart`**

- [ ] **Step 3: Wire `lib/screens/recurring_management_screen.dart` to open the dialog**

Add the import (no state change needed — `showDialog` doesn't require a `StatefulWidget`):

```dart
import 'recurring_edit_dialog.dart';
```

Replace `onPressed: () => context.push('/recurring/new')` (both the `IconButton` and the `EmptyState`'s `onPressCta`) with:

```dart
onPressed: () => showDialog(context: context, builder: (_) => const RecurringEditDialog(id: 'new')),
```

Replace `onTap: () => context.push('/recurring/${rules[i].id}')` with:

```dart
onTap: () => showDialog(context: context, builder: (_) => RecurringEditDialog(id: rules[i].id)),
```

- [ ] **Step 4: Remove the recurring-edit route from `lib/app_router.dart`**

Delete this line:

```dart
GoRoute(path: '/recurring/:id', builder: (context, state) => RecurringEditScreen(id: state.pathParameters['id']!)),
```

Delete the now-unused import:

```dart
import 'screens/recurring_edit_screen.dart';
```

- [ ] **Step 5: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 6: Verify in the browser**

From Recurring, tap "+", confirm a popup opens, save a new bill, confirm it appears and the popup closed. Tap an existing bill, confirm it pre-fills including its due date, tap "Mark Paid", confirm the due date advances (dialog stays open — this is not a save/close action). Edit and Save, confirm the popup closes. Tap Delete, confirm the nested confirmation, confirm it removes the bill and closes both dialogs.

- [ ] **Step 7: Commit**

```bash
git add lib/screens/recurring_edit_dialog.dart lib/screens/recurring_management_screen.dart lib/app_router.dart
git rm lib/screens/recurring_edit_screen.dart
git commit -m "feat: convert Add/Edit Recurring Bill to a popup dialog"
```

### Task 13: Debt popup dialog

**Files:**
- Create: `lib/screens/debt_edit_dialog.dart`
- Delete: `lib/screens/debt_edit_screen.dart`
- Modify: `lib/screens/debt_screen.dart`
- Modify: `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` (Task 2), `DebtsStore` (unchanged)
- Produces: `DebtEditDialog({required String id})` — a `StatefulWidget` shown via `showDialog`

**Note:** Task 8 already converted `debt_screen.dart`'s per-debt list into a `GridView.count`, but kept the `GestureDetector(onTap: () => context.push('/debts/${d.id}'))` navigation as a placeholder pending this task. This task replaces that with `showDialog`.

- [ ] **Step 1: Create `lib/screens/debt_edit_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/debts_store.dart';

class DebtEditDialog extends StatefulWidget {
  final String id;
  const DebtEditDialog({super.key, required this.id});

  @override
  State<DebtEditDialog> createState() => _DebtEditDialogState();
}

class _DebtEditDialogState extends State<DebtEditDialog> {
  String _name = '';
  String _balanceText = '';
  String _rateText = '';
  String _minPaymentText = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final debtsStore = context.watch<DebtsStore>();
    final isNew = widget.id == 'new';

    Debt? debt;
    if (!isNew) {
      for (final d in debtsStore.debts) {
        if (d.id == widget.id) {
          debt = d;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = debt?.name ?? '';
      _balanceText = debt != null ? debt.balance.toString() : '';
      _rateText = debt != null ? debt.interestRate.toString() : '';
      _minPaymentText = debt != null ? debt.minPayment.toString() : '';
      _initialized = true;
    }

    void handleSave() {
      final balance = double.tryParse(_balanceText);
      final interestRate = double.tryParse(_rateText);
      final minPayment = double.tryParse(_minPaymentText);
      if (_name.isEmpty || balance == null || interestRate == null || minPayment == null) return;
      if (isNew) {
        debtsStore.addDebt(name: _name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: 1);
      } else if (debt != null) {
        debtsStore.updateDebt(debt.id, name: _name, balance: balance, interestRate: interestRate, minPayment: minPayment);
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = debt;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete debt?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                debtsStore.removeDebt(target.id);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isValid = _name.isNotEmpty && _balanceText.isNotEmpty && _rateText.isNotEmpty && _minPaymentText.isNotEmpty;

    return AppDialog(
      title: isNew ? 'Add Debt' : 'Edit Debt',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Debt name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Credit Card'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Interest rate (APR %)', value: _rateText, onChanged: (v) => setState(() => _rateText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Minimum payment (J\$)', value: _minPaymentText, onChanged: (v) => setState(() => _minPaymentText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          if (!isNew && debt != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Delete `lib/screens/debt_edit_screen.dart`**

- [ ] **Step 3: Wire `lib/screens/debt_screen.dart` to open the dialog**

Add the import:

```dart
import 'debt_edit_dialog.dart';
```

Replace both `onPressed: () => context.push('/debts/new')` call sites (the `IconButton` and the `EmptyState`'s `onPressCta`) with:

```dart
onPressed: () => showDialog(context: context, builder: (_) => const DebtEditDialog(id: 'new')),
```

Replace the per-debt `GestureDetector(onTap: () => context.push('/debts/${d.id}'), ...)` with:

```dart
GestureDetector(
  onTap: () => showDialog(context: context, builder: (_) => DebtEditDialog(id: d.id)),
  ...
)
```

(keep the rest of that `GestureDetector`'s `child:` unchanged.)

- [ ] **Step 4: Remove the debt-edit route from `lib/app_router.dart`**

Delete this line:

```dart
GoRoute(path: '/debts/:id', builder: (context, state) => DebtEditScreen(id: state.pathParameters['id']!)),
```

Delete the now-unused import:

```dart
import 'screens/debt_edit_screen.dart';
```

(the `/debts` list-screen route stays unchanged.)

- [ ] **Step 5: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 6: Verify in the browser**

From Debt, tap "+", confirm a popup opens, save a new debt, confirm it appears in the grid and the popup closed. Tap an existing debt card, confirm it pre-fills, edit and Save, confirm the popup closes and the change is reflected. Tap Delete, confirm the nested confirmation, confirm it removes the debt and closes both dialogs.

- [ ] **Step 7: Commit**

```bash
git add lib/screens/debt_edit_dialog.dart lib/screens/debt_screen.dart lib/app_router.dart
git rm lib/screens/debt_edit_screen.dart
git commit -m "feat: convert Add/Edit Debt to a popup dialog"
```

### Task 14: Goal popup dialogs (edit + contribution split)

**Files:**
- Create: `lib/screens/goal_edit_dialog.dart`
- Create: `lib/screens/goal_contribution_dialog.dart`
- Delete: `lib/screens/goal_detail_screen.dart`
- Modify: `lib/screens/goals_list_screen.dart`
- Modify: `lib/app_router.dart`

**Interfaces:**
- Consumes: `AppDialog` (Task 2), `GoalsStore`/`AccountsStore`/`CategoriesStore`/`TransactionsStore`/`TransactionActions` (unchanged)
- Produces: `GoalEditDialog({required String id})` (create/edit/delete, no contribution UI) and `GoalContributionDialog({required String goalId})` (progress + contribution form only) — both `StatefulWidget`s shown via `showDialog`

Per the design spec (§3), tapping a goal card opens the contribution dialog; a pencil icon on the card opens the edit dialog. `GoalContributionDialog` assumes the goal already exists (it is never shown for `isNew`), so it takes a non-nullable `goalId` and returns early with a "Goal not found" message if the goal has been deleted out from under it.

- [ ] **Step 1: Create `lib/screens/goal_edit_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/goals_store.dart';

class GoalEditDialog extends StatefulWidget {
  final String id;
  const GoalEditDialog({super.key, required this.id});

  @override
  State<GoalEditDialog> createState() => _GoalEditDialogState();
}

class _GoalEditDialogState extends State<GoalEditDialog> {
  String _name = '';
  String _targetText = '';
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final isNew = widget.id == 'new';

    Goal? goal;
    if (!isNew) {
      for (final g in goalsStore.goals) {
        if (g.id == widget.id) {
          goal = g;
          break;
        }
      }
    }

    if (!_initialized) {
      _name = goal?.name ?? '';
      _targetText = goal != null ? goal.targetAmount.toString() : '';
      _initialized = true;
    }

    void handleSave() {
      final target = double.tryParse(_targetText);
      if (_name.isEmpty || target == null || target <= 0) return;
      if (isNew) {
        goalsStore.addGoal(name: _name, icon: 'target', targetAmount: target);
      } else if (goal != null) {
        goalsStore.updateGoal(goal.id, name: _name, targetAmount: target);
      }
      Navigator.of(context).pop();
    }

    void handleDelete() {
      final target = goal;
      if (target == null) return;
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete goal?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                goalsStore.removeGoal(target.id);
                Navigator.pop(dialogContext);
                Navigator.of(context).pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isNameValid = _name.isNotEmpty && (double.tryParse(_targetText) ?? 0) > 0;

    return AppDialog(
      title: isNew ? 'Add Goal' : 'Edit Goal',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppFormField(label: 'Goal name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Emergency Fund'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Target amount (J\$)',
            value: _targetText,
            onChanged: (v) => setState(() => _targetText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: isNew ? 'Create Goal' : 'Save', onPressed: isNameValid ? handleSave : null),
          if (!isNew && goal != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create `lib/screens/goal_contribution_dialog.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_dialog.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_progress_bar.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../logic/transaction_actions.dart';

class GoalContributionDialog extends StatefulWidget {
  final String goalId;
  const GoalContributionDialog({super.key, required this.goalId});

  @override
  State<GoalContributionDialog> createState() => _GoalContributionDialogState();
}

class _GoalContributionDialogState extends State<GoalContributionDialog> {
  String _contribution = '';

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();

    Goal? goal;
    for (final g in goalsStore.goals) {
      if (g.id == widget.goalId) {
        goal = g;
        break;
      }
    }

    if (goal == null) {
      return AppDialog(
        title: 'Goal not found',
        child: const SizedBox(height: 40, child: Center(child: Text('This goal was deleted.', style: TextStyle(color: AppColors.textSecondary)))),
      );
    }
    final resolvedGoal = goal;

    final accounts = context.watch<AccountsStore>().accounts;
    final categories = context.watch<CategoriesStore>().categories;
    Category? transferCategory;
    for (final c in categories) {
      if (c.name == 'Transfer') {
        transferCategory = c;
        break;
      }
    }

    final actions = TransactionActions(
      accountsStore: context.read<AccountsStore>(),
      transactionsStore: context.read<TransactionsStore>(),
      goalsStore: goalsStore,
    );

    void handleAddContribution() {
      final amount = double.tryParse(_contribution);
      if (amount == null || amount <= 0 || accounts.isEmpty || transferCategory == null) return;
      actions.createTransaction(
        accountId: accounts[0].id,
        categoryId: transferCategory.id,
        amount: -amount,
        note: 'Contribution to ${resolvedGoal.name}',
        date: DateTime.now().toIso8601String(),
        type: 'goal_contribution',
        goalId: resolvedGoal.id,
      );
      setState(() => _contribution = '');
    }

    return AppDialog(
      title: resolvedGoal.name,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AppProgressBar(progress: resolvedGoal.targetAmount == 0 ? 0 : resolvedGoal.currentAmount / resolvedGoal.targetAmount),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${formatMoney(resolvedGoal.currentAmount)} of ${formatMoney(resolvedGoal.targetAmount)}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontFeatures: [FontFeature.tabularFigures()]),
          ),
          const SizedBox(height: AppSpacing.xl),
          AppFormField(
            label: 'Add contribution (J\$)',
            value: _contribution,
            onChanged: (v) => setState(() => _contribution = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Add Contribution', onPressed: _contribution.isNotEmpty ? handleAddContribution : null),
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Delete `lib/screens/goal_detail_screen.dart`**

- [ ] **Step 4: Wire `lib/screens/goals_list_screen.dart` to open both dialogs**

Add the imports:

```dart
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'goal_edit_dialog.dart';
import 'goal_contribution_dialog.dart';
```

Replace both `onPressed: () => context.push('/goal/new')` call sites (the `IconButton` and the `EmptyState`'s `onPressCta`) with:

```dart
onPressed: () => showDialog(context: context, builder: (_) => const GoalEditDialog(id: 'new')),
```

Replace the per-goal card's `onTap: () => context.push('/goal/${g.id}')` with:

```dart
onTap: () => showDialog(context: context, builder: (_) => GoalContributionDialog(goalId: g.id)),
```

Add a pencil-icon edit affordance to each `_GoalCard` (built in Task 7): add a `Row` with `mainAxisAlignment: MainAxisAlignment.spaceBetween` around the existing name `Text`, adding an `IconButton` on the trailing side:

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  children: [
    Expanded(child: Text(g.name, style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700))),
    IconButton(
      icon: const Icon(LucideIcons.pencil, size: 16, color: AppColors.textMuted),
      onPressed: () => showDialog(context: context, builder: (_) => GoalEditDialog(id: g.id)),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
    ),
  ],
),
```

(replacing the bare `Text(g.name, ...)` line that Task 7's `_GoalCard` currently renders).

- [ ] **Step 5: Remove the goal-detail route from `lib/app_router.dart`**

Delete this line:

```dart
GoRoute(path: '/goal/:id', builder: (context, state) => GoalDetailScreen(id: state.pathParameters['id']!)),
```

Delete the now-unused import:

```dart
import 'screens/goal_detail_screen.dart';
```

- [ ] **Step 6: Verify it compiles and builds**

Run: `flutter analyze lib` — expected `No issues found!`
Run: `flutter build web` — expected `√ Built build/web`.

- [ ] **Step 7: Verify in the browser**

From Goals, tap "+", confirm the edit popup opens, create a goal, confirm it appears and the popup closed. Tap a goal card (not the pencil), confirm the contribution popup opens showing progress, add a contribution, confirm the progress bar updates and the popup stays open (contribution isn't a close-on-save action per the original screen's behavior — confirm this matches, then close it manually). Tap the pencil icon, confirm the edit popup opens pre-filled, edit and Save, confirm it closes and the change is reflected. Tap Delete, confirm the nested confirmation, confirm it removes the goal and closes both dialogs.

- [ ] **Step 8: Commit**

```bash
git add lib/screens/goal_edit_dialog.dart lib/screens/goal_contribution_dialog.dart lib/screens/goals_list_screen.dart lib/app_router.dart
git rm lib/screens/goal_detail_screen.dart
git commit -m "feat: split Goal detail into edit and contribution popup dialogs"
```

### Task 15: Comma-formatting audit

**Files:**
- Modify: any screen found to display a raw money value without `formatMoney()` (expected: none — this task is a verification pass)

**Interfaces:**
- Consumes: `formatMoney()` (`lib/utils/money.dart`, unchanged)

- [ ] **Step 1: Grep every screen for money-shaped `Text` widgets**

Run:

```bash
grep -rn "amount\|balance\|Amount\|Balance\|totalOwed\|totalInterest\|currentAmount\|targetAmount" lib/screens lib/widgets --include="*.dart" -l
```

For each file returned, open it and check every `Text(...)` (not `AppFormField`, which is an editable field showing a raw parseable string while typing — those are correctly out of scope per the spec) that renders a `double` money value. Confirm it's wrapped in `formatMoney(...)`, not `'${value}'`/`value.toString()`/bare string interpolation of a `double`.

Based on the files already read and written in this plan, the known correct sites are: `home_screen.dart`'s hero/stat amounts, `transactions_screen.dart`'s `ListRow.amount`/`AppCard` money text, `debt_screen.dart`'s TOTAL OWED/interest/per-debt amounts, `goals_list_screen.dart`'s progress text, `goal_edit_dialog.dart`/`goal_contribution_dialog.dart`'s progress text, `accounts_management_screen.dart`'s `ListRow.amount`, `recurring_management_screen.dart`'s `ListRow.amount`, and `insights_screen.dart`'s chart/summary figures — all of these already call `formatMoney()` per the original 27-task plan and subsequent CRUD-audit fix. `ListRow`'s own `amount` parameter (a `double?`) formats internally via `formatMoney()` in `lib/widgets/list_row.dart` — confirm this by reading that file's `amount`-rendering `Text`.

- [ ] **Step 2: Fix any gap found**

If a raw `.toString()`/interpolation is found, replace it with `formatMoney(value)` (import `../utils/money.dart` if not already imported) and re-run `flutter analyze lib`.

- [ ] **Step 3: Commit (only if a fix was needed)**

```bash
git add -A
git commit -m "fix: ensure all money displays use comma formatting"
```

If no gap was found, skip this commit — record in the plan's final integration notes (Task 16) that the audit passed with zero changes.

### Task 16: Final integration

**Files:** none created; this task only runs verification across everything built in Tasks 1–15.

- [ ] **Step 1: Run the full automated test suite**

Run: `flutter test`
Expected: all tests pass, including the new `test/theme/breakpoints_test.dart` from Task 1 and every pre-existing test untouched by this plan.

- [ ] **Step 2: Run static analysis**

Run: `flutter analyze lib test`
Expected: `No issues found!`

- [ ] **Step 3: Build for web**

Run: `flutter build web --release`
Expected: `√ Built build/web`.

- [ ] **Step 4: Manual click-through at Compact width (390px)**

Using the browser preview resized to 390px wide, confirm: bottom tab bar still renders (not the sidebar), every screen looks unchanged from before this plan, and every popup (Transaction, Account, Category, Recurring, Debt, Goal edit, Goal contribution) opens as a near-full-width sheet, saves, and auto-closes; delete confirmations work on each.

- [ ] **Step 5: Manual click-through at Expanded width (1280px)**

Resize to 1280px wide. Confirm: a persistent left sidebar replaces the bottom tab bar and navigating between its 5 destinations works; Home renders as a two-column layout (hero+stats+actions on the left, recent transactions on the right); Goals and Debt render as multi-column grids; every other screen (Transactions, Insights, Accounts, Categories, Recurring, Notifications, More) renders inside the centered 1200px-max content area rather than stretching edge-to-edge; every popup opens as a fixed ~480px-wide dialog centered on screen (not full-width), saves, and auto-closes; delete confirmations work on each.

- [ ] **Step 6: Confirm no dead code remains**

Run:

```bash
grep -rn "PhoneFrame\|transaction_edit_screen\|account_edit_screen\|category_add_screen\|recurring_edit_screen\|debt_edit_screen\|goal_detail_screen" lib
```

Expected: no matches (all six old screens plus `PhoneFrame` were deleted across Tasks 4 and 9–14; nothing should still reference them).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: final integration pass for UI/UX overhaul"
```
