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