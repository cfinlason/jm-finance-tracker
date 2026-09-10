# JM Finance Tracker Flutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the JM Finance Tracker as a Flutter Web app (phone-width shell, deployed to Vercel) per `docs/superpowers/specs/2026-09-10-finance-tracker-flutter-design.md`, with a real native iOS build left as an explicit later phase from the same codebase.

**Architecture:** Flutter (Dart) targeting Flutter Web. `go_router` for navigation (onboarding stack, 5-tab `StatefulShellRoute` shell, pushed routes). `provider` package, one `ChangeNotifier` per domain entity, persisted to `shared_preferences` (JSON per key). Pure-Dart calculation modules for Safe to Spend, debt payoff, and insights. A small shared widget library implements the design token system from `design.md.txt`.

**Tech Stack:** Flutter (stable channel) + Dart, `go_router`, `provider`, `shared_preferences`, `google_fonts` (Archivo), `lucide_icons`, `flutter_test`.

## Global Constraints

- All money is JMD, formatted `J$1,234.50` (comma thousands, 2 decimals, tabular figures via `FontFeature.tabularFigures()`). Never use red for negative/expense amounts — plain text color; only income uses accent lime with a `+` prefix.
- Colors, spacing, radius, and typography values come from `design.md.txt` §2–§7 exactly (see Task 2 for the full token module) — never hardcode a color/spacing value in a screen file; always reference `AppColors`/`AppSpacing`/`AppRadius`.
- Categories are never color-coded — neutral icon-on-chip treatment only, per `design.md.txt` §2.
- Every list-driven screen needs an empty state (icon + message + CTA); first-launch `shared_preferences` hydration shows a loading state — no screen may render against un-hydrated store data.
- Destructive actions (delete account/transaction/goal/debt/recurring rule): confirmation dialog before proceeding.
- No widget/integration tests in v1 — only `flutter_test` unit tests on pure calculation logic and the cross-store transaction actions, per spec §8. Manual verification is via `flutter run -d chrome` at phone width.
- No backend, no auth, no bank-linking — manual data entry only, single local profile.
- The app renders inside a fixed max-width (~430px) centered `PhoneFrame`, background-painted outside it, on every screen size — per spec §2's phone-size constraint.
- Package name is `jm_finance_tracker` — every internal import uses `package:jm_finance_tracker/...`.

---

## File Structure Overview

```
pubspec.yaml
lib/
  main.dart                        App entry: MultiProvider wiring, MaterialApp.router, PhoneFrame + ErrorBanner
  app_router.dart                  go_router config: redirect/hydration gate, onboarding stack, tab shell, pushed routes
  theme/
    app_theme.dart                 AppColors, AppSpacing, AppRadius, AppTypography, buildAppTheme()
  models/
    models.dart                    Account, Category, Transaction, RecurringRule, Goal, Debt, UserSettings
  utils/
    id.dart  money.dart  date_utils.dart  icon_map.dart  persistence.dart
  logic/
    safe_to_spend.dart  debt_payoff.dart  insights.dart  transaction_actions.dart
  stores/
    error_banner_store.dart  settings_store.dart  accounts_store.dart  categories_store.dart
    transactions_store.dart  recurring_store.dart  goals_store.dart  debts_store.dart
  widgets/
    phone_frame.dart  app_screen.dart  app_card.dart  icon_chip.dart  category_icon.dart  list_row.dart
    app_button.dart  app_progress_bar.dart  app_toggle.dart  app_segmented_control.dart  app_alert.dart
    stat_figure.dart  empty_state.dart  loading_state.dart  app_form_field.dart  error_banner.dart
    main_shell.dart
  screens/
    onboarding/
      welcome_screen.dart  accounts_screen.dart  income_screen.dart
      recurring_screen.dart  goals_screen.dart  done_screen.dart
    home_screen.dart  transactions_screen.dart  transaction_edit_screen.dart
    insights_screen.dart  goals_list_screen.dart  goal_detail_screen.dart
    debt_screen.dart  debt_edit_screen.dart  cash_flow_screen.dart  more_screen.dart
    accounts_management_screen.dart  account_edit_screen.dart
    categories_screen.dart  category_add_screen.dart
    recurring_management_screen.dart  recurring_edit_screen.dart
    notifications_screen.dart
test/
  utils/money_test.dart  utils/date_utils_test.dart
  logic/safe_to_spend_test.dart  logic/debt_payoff_test.dart  logic/insights_test.dart  logic/transaction_actions_test.dart
```

`go_router` requires every route to be registered centrally (unlike file-based routing) — each screen-building task from Task 14 onward includes a step that edits `lib/app_router.dart` to add its import and `GoRoute` entry. Tasks 1–13 build the shell with only the routes that exist at that point.

---

### Task 1: Project scaffolding & dependencies

**Files:**
- Create: `pubspec.yaml` (via `flutter create`, then `flutter pub add`), `lib/main.dart` (placeholder), `.gitignore` additions
- Delete: `test/widget_test.dart` (default counter-app template test — references code this plan removes)

**Interfaces:**
- Produces: a `flutter build web` — compilable Flutter project named `jm_finance_tracker`, with `go_router`, `provider`, `shared_preferences`, `google_fonts`, `lucide_icons` available as dependencies, ready for every later task to add files into `lib/` and `test/`.

- [ ] **Step 1: Scaffold the Flutter project**

Run (from the repository root, which already contains `design.md.txt` and `docs/` — these are not Flutter files and `flutter create` will not touch them):
```bash
flutter create --platforms=web --org com.jmfinancetracker --project-name jm_finance_tracker .
```
Expected: `pubspec.yaml`, `lib/main.dart`, `test/widget_test.dart`, `web/`, and platform-neutral project files created. `pubspec.yaml`'s `name:` field must read `jm_finance_tracker` — if `flutter create` derived a different name from the directory, edit `pubspec.yaml`'s `name:` field to `jm_finance_tracker` by hand and confirm `lib/main.dart`'s default content still compiles under that name (or just proceed to Step 3, which replaces `lib/main.dart` entirely).

- [ ] **Step 2: Add dependencies**

Run:
```bash
flutter pub add go_router provider shared_preferences google_fonts lucide_icons
```
Expected: `pubspec.yaml`'s `dependencies:` section gains all five packages at their current resolvable versions; `flutter pub get` runs automatically and succeeds.

- [ ] **Step 3: Replace the default counter-app main.dart with a placeholder**

Overwrite `lib/main.dart`:
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const _ScaffoldPlaceholderApp());
}

class _ScaffoldPlaceholderApp extends StatelessWidget {
  const _ScaffoldPlaceholderApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(child: Text('JM Finance Tracker — scaffold OK')),
      ),
    );
  }
}
```
This is fully replaced in Task 13 with real routing and store wiring — no app logic belongs in this task.

- [ ] **Step 4: Remove the default counter-app test**

Run:
```bash
rm test/widget_test.dart
```
It references the counter-app widget this task just removed. Task 4 onward adds this project's real tests under `test/utils/` and `test/logic/`.

- [ ] **Step 5: Verify the project compiles for web**

Run: `flutter build web`
Expected: `Compiling lib/main.dart for the Web...` followed by a successful build summary (`√ Built build/web`), no errors.

- [ ] **Step 6: Verify the test runner works with zero tests**

Run: `flutter test`
Expected: `No tests were found` (Task 4's tests are what makes this suite non-empty) — this should not error, just report nothing to run.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Flutter web project with core dependencies"
```

---

### Task 2: Design tokens (`AppTheme`)

**Files:**
- Create: `lib/theme/app_theme.dart`

**Interfaces:**
- Produces: `AppColors` (bg, surface, surfaceMuted, text, textSecondary, textMuted, accent, accentInk, warning, border, borderStrong, borderHairline — all `Color` constants), `AppSpacing` (xs, sm, sm2, md, md2, lg, xl, xxl, xxxl — `double` constants), `AppRadius` (sm, md, lg, pill — `double` constants), and `buildAppTheme(): ThemeData` — imported by every widget and screen from here on.

- [ ] **Step 1: Create the token module**

Create `lib/theme/app_theme.dart`:
```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const bg = Color(0xFF101110);
  static const surface = Color(0xFF1B1D18);
  static const surfaceMuted = Color(0x0FFFFFFF); // rgba(255,255,255,0.06)
  static const text = Color(0xFFF4F5F0);
  static const textSecondary = Color(0xFFC7C9C2);
  static const textMuted = Color(0xFF8B8D86);
  static const accent = Color(0xFFCFFF3B);
  static const accentInk = Color(0xFF101110);
  static const warning = Color(0xFFFFB020);
  static const warningBorder = Color(0x66FFB020); // rgba(255,176,32,0.4)
  static const border = Color(0x1FFFFFFF); // rgba(255,255,255,0.12)
  static const borderStrong = Color(0x24FFFFFF); // rgba(255,255,255,0.14)
  static const borderHairline = Color(0x14FFFFFF); // rgba(255,255,255,0.08)
}

class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const sm2 = 10.0;
  static const md = 12.0;
  static const md2 = 14.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 24.0;
  static const xxxl = 32.0;
}

class AppRadius {
  static const sm = 11.0;
  static const md = 14.0;
  static const lg = 19.0;
  static const pill = 999.0;
}

class AppTypography {
  static TextStyle get hero => GoogleFonts.archivo(fontSize: 60, height: 1.0, fontWeight: FontWeight.w800, letterSpacing: -1.2, color: AppColors.text);
  static TextStyle get sectionStat => GoogleFonts.archivo(fontSize: 22, height: 1.1, fontWeight: FontWeight.w800, color: AppColors.text);
  static TextStyle get cardTitle => GoogleFonts.archivo(fontSize: 24, height: 1.2, fontWeight: FontWeight.w700, color: AppColors.text);
  static TextStyle get subHeader => GoogleFonts.archivo(fontSize: 21, height: 1.2, fontWeight: FontWeight.w700, color: AppColors.text);
  static TextStyle get body => GoogleFonts.archivo(fontSize: 14, height: 1.4, fontWeight: FontWeight.w400, color: AppColors.text);
  static TextStyle get bodyStrong => GoogleFonts.archivo(fontSize: 14, height: 1.4, fontWeight: FontWeight.w600, color: AppColors.text);
  static TextStyle get caption => GoogleFonts.archivo(fontSize: 10, height: 1.2, fontWeight: FontWeight.w600, letterSpacing: 1.1, color: AppColors.textMuted);
  static TextStyle get amount => GoogleFonts.archivo(
        fontSize: 16,
        height: 1.2,
        fontWeight: FontWeight.w800,
        color: AppColors.text,
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg,
    fontFamily: GoogleFonts.archivo().fontFamily,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.accent,
      onPrimary: AppColors.accentInk,
      surface: AppColors.surface,
      onSurface: AppColors.text,
    ),
  );
  return base;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `flutter analyze lib/theme/app_theme.dart`
Expected: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/theme/app_theme.dart
git commit -m "feat: add design token module (colors, spacing, radius, typography)"
```

---

### Task 3: Data models

**Files:**
- Create: `lib/models/models.dart`

**Interfaces:**
- Produces: `Account`, `Category`, `Transaction`, `RecurringRule`, `Goal`, `Debt`, `UserSettings` classes, each with a `copyWith` (except `Category`, which is immutable after creation) and `toJson`/`fromJson` — consumed by every store, calculation, and screen from here on.

- [ ] **Step 1: Create the models module**

Create `lib/models/models.dart`:
```dart
class Account {
  final String id;
  final String name;
  final String type; // 'checking' | 'savings' | 'cash' | 'credit'
  final double balance; // JMD, signed
  final String currency; // always 'JMD'
  final String createdAt; // ISO 8601

  Account({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    this.currency = 'JMD',
    required this.createdAt,
  });

  Account copyWith({String? name, String? type, double? balance}) => Account(
        id: id,
        name: name ?? this.name,
        type: type ?? this.type,
        balance: balance ?? this.balance,
        currency: currency,
        createdAt: createdAt,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'type': type, 'balance': balance, 'currency': currency, 'createdAt': createdAt};

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        balance: (json['balance'] as num).toDouble(),
        currency: json['currency'] as String? ?? 'JMD',
        createdAt: json['createdAt'] as String,
      );
}

class Category {
  final String id;
  final String name;
  final String icon;
  final bool isCustom;
  final bool isIncome;

  Category({required this.id, required this.name, required this.icon, required this.isCustom, required this.isIncome});

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'icon': icon, 'isCustom': isCustom, 'isIncome': isIncome};

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: json['icon'] as String,
        isCustom: json['isCustom'] as bool,
        isIncome: json['isIncome'] as bool,
      );
}

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

  Transaction({
    required this.id,
    required this.accountId,
    required this.categoryId,
    required this.amount,
    required this.note,
    required this.date,
    required this.type,
    this.recurringRuleId,
    this.goalId,
  });

  Transaction copyWith({String? accountId, String? categoryId, double? amount, String? note, String? date, String? type, String? goalId}) => Transaction(
        id: id,
        accountId: accountId ?? this.accountId,
        categoryId: categoryId ?? this.categoryId,
        amount: amount ?? this.amount,
        note: note ?? this.note,
        date: date ?? this.date,
        type: type ?? this.type,
        recurringRuleId: recurringRuleId,
        goalId: goalId ?? this.goalId,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'accountId': accountId,
        'categoryId': categoryId,
        'amount': amount,
        'note': note,
        'date': date,
        'type': type,
        'recurringRuleId': recurringRuleId,
        'goalId': goalId,
      };

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        categoryId: json['categoryId'] as String,
        amount: (json['amount'] as num).toDouble(),
        note: json['note'] as String,
        date: json['date'] as String,
        type: json['type'] as String,
        recurringRuleId: json['recurringRuleId'] as String?,
        goalId: json['goalId'] as String?,
      );
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

  RecurringRule({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.accountId,
    required this.amount,
    required this.frequency,
    required this.nextDueDate,
    this.dayOfMonth,
    this.dayOfWeek,
  });

  RecurringRule copyWith({String? name, double? amount, String? frequency, String? nextDueDate}) => RecurringRule(
        id: id,
        name: name ?? this.name,
        categoryId: categoryId,
        accountId: accountId,
        amount: amount ?? this.amount,
        frequency: frequency ?? this.frequency,
        nextDueDate: nextDueDate ?? this.nextDueDate,
        dayOfMonth: dayOfMonth,
        dayOfWeek: dayOfWeek,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'categoryId': categoryId,
        'accountId': accountId,
        'amount': amount,
        'frequency': frequency,
        'nextDueDate': nextDueDate,
        'dayOfMonth': dayOfMonth,
        'dayOfWeek': dayOfWeek,
      };

  factory RecurringRule.fromJson(Map<String, dynamic> json) => RecurringRule(
        id: json['id'] as String,
        name: json['name'] as String,
        categoryId: json['categoryId'] as String,
        accountId: json['accountId'] as String,
        amount: (json['amount'] as num).toDouble(),
        frequency: json['frequency'] as String,
        nextDueDate: json['nextDueDate'] as String,
        dayOfMonth: json['dayOfMonth'] as int?,
        dayOfWeek: json['dayOfWeek'] as int?,
      );
}

class Goal {
  final String id;
  final String name;
  final String icon;
  final double targetAmount;
  final double currentAmount; // derived from sum of goal_contribution transactions, cached
  final String? targetDate;

  Goal({required this.id, required this.name, required this.icon, required this.targetAmount, this.currentAmount = 0, this.targetDate});

  Goal copyWith({String? name, double? targetAmount, double? currentAmount}) => Goal(
        id: id,
        name: name ?? this.name,
        icon: icon,
        targetAmount: targetAmount ?? this.targetAmount,
        currentAmount: currentAmount ?? this.currentAmount,
        targetDate: targetDate,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'icon': icon, 'targetAmount': targetAmount, 'currentAmount': currentAmount, 'targetDate': targetDate};

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: json['icon'] as String,
        targetAmount: (json['targetAmount'] as num).toDouble(),
        currentAmount: (json['currentAmount'] as num?)?.toDouble() ?? 0,
        targetDate: json['targetDate'] as String?,
      );
}

class Debt {
  final String id;
  final String name;
  final double balance;
  final double interestRate; // APR %
  final double minPayment;
  final int dueDayOfMonth;

  Debt({required this.id, required this.name, required this.balance, required this.interestRate, required this.minPayment, required this.dueDayOfMonth});

  Debt copyWith({String? name, double? balance, double? interestRate, double? minPayment}) => Debt(
        id: id,
        name: name ?? this.name,
        balance: balance ?? this.balance,
        interestRate: interestRate ?? this.interestRate,
        minPayment: minPayment ?? this.minPayment,
        dueDayOfMonth: dueDayOfMonth,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'balance': balance, 'interestRate': interestRate, 'minPayment': minPayment, 'dueDayOfMonth': dueDayOfMonth};

  factory Debt.fromJson(Map<String, dynamic> json) => Debt(
        id: json['id'] as String,
        name: json['name'] as String,
        balance: (json['balance'] as num).toDouble(),
        interestRate: (json['interestRate'] as num).toDouble(),
        minPayment: (json['minPayment'] as num).toDouble(),
        dueDayOfMonth: json['dueDayOfMonth'] as int,
      );
}

class UserSettings {
  final bool hasCompletedOnboarding;
  final double monthlyIncomeEstimate;
  final String currency; // fixed 'JMD' for v1

  UserSettings({this.hasCompletedOnboarding = false, this.monthlyIncomeEstimate = 0, this.currency = 'JMD'});

  UserSettings copyWith({bool? hasCompletedOnboarding, double? monthlyIncomeEstimate}) => UserSettings(
        hasCompletedOnboarding: hasCompletedOnboarding ?? this.hasCompletedOnboarding,
        monthlyIncomeEstimate: monthlyIncomeEstimate ?? this.monthlyIncomeEstimate,
        currency: currency,
      );

  Map<String, dynamic> toJson() => {'hasCompletedOnboarding': hasCompletedOnboarding, 'monthlyIncomeEstimate': monthlyIncomeEstimate, 'currency': currency};

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
        hasCompletedOnboarding: json['hasCompletedOnboarding'] as bool? ?? false,
        monthlyIncomeEstimate: (json['monthlyIncomeEstimate'] as num?)?.toDouble() ?? 0,
        currency: json['currency'] as String? ?? 'JMD',
      );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `flutter analyze lib/models/models.dart`
Expected: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add lib/models/models.dart
git commit -m "feat: add core data model classes"
```

---

### Task 4: Utilities — id, money formatting, date helpers (TDD)

**Files:**
- Create: `lib/utils/id.dart`, `lib/utils/money.dart`, `lib/utils/date_utils.dart`
- Test: `test/utils/money_test.dart`, `test/utils/date_utils_test.dart`

**Interfaces:**
- Produces: `String generateId()`; `String formatMoney(double amount)`; `DateTime addDays(DateTime date, int days)`, `DateTime addMonths(DateTime date, int months)`, `bool isBefore(DateTime a, DateTime b)`, `DateTime nextOccurrence(DateTime from, String frequency)`. Consumed by every store and calculation module from here on.

- [ ] **Step 1: Write the failing tests for `formatMoney`**

Create `test/utils/money_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/utils/money.dart';

void main() {
  group('formatMoney', () {
    test('formats a positive amount with commas and two decimals', () {
      expect(formatMoney(1234.5), 'J\$1,234.50');
    });

    test('formats a negative amount with a leading minus', () {
      expect(formatMoney(-42), '-J\$42.00');
    });

    test('formats zero', () {
      expect(formatMoney(0), 'J\$0.00');
    });

    test('formats large amounts with multiple comma groups', () {
      expect(formatMoney(1234567.89), 'J\$1,234,567.89');
    });
  });
}
```

- [ ] **Step 2: Write the failing tests for the date helpers**

Create `test/utils/date_utils_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/utils/date_utils.dart';

void main() {
  group('date utils', () {
    test('addDays adds the given number of days', () {
      expect(addDays(DateTime(2026, 1, 1), 7), DateTime(2026, 1, 8));
    });

    test('addMonths adds the given number of months', () {
      expect(addMonths(DateTime(2026, 1, 15), 1), DateTime(2026, 2, 15));
    });

    test('addMonths supports negative months', () {
      expect(addMonths(DateTime(2026, 3, 15), -1), DateTime(2026, 2, 15));
    });

    test('addMonths crossing a year boundary', () {
      expect(addMonths(DateTime(2026, 12, 1), 1), DateTime(2027, 1, 1));
      expect(addMonths(DateTime(2026, 1, 1), -1), DateTime(2025, 12, 1));
    });

    test('isBefore compares dates correctly', () {
      expect(isBefore(DateTime(2026, 1, 1), DateTime(2026, 1, 2)), true);
      expect(isBefore(DateTime(2026, 1, 2), DateTime(2026, 1, 1)), false);
    });

    test('nextOccurrence advances weekly/biweekly/monthly correctly', () {
      final start = DateTime(2026, 1, 1);
      expect(nextOccurrence(start, 'weekly'), DateTime(2026, 1, 8));
      expect(nextOccurrence(start, 'biweekly'), DateTime(2026, 1, 15));
      expect(nextOccurrence(start, 'monthly'), DateTime(2026, 2, 1));
    });
  });
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `flutter test test/utils/money_test.dart test/utils/date_utils_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/utils/money.dart': No such file or directory` (and the same for `date_utils.dart`).

- [ ] **Step 4: Implement `id.dart`**

Create `lib/utils/id.dart`:
```dart
import 'dart:math';

String generateId() {
  final timePart = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  final randPart = Random().nextInt(1 << 32).toRadixString(36).padLeft(6, '0');
  return '$timePart-$randPart';
}
```

- [ ] **Step 5: Implement `money.dart`**

Create `lib/utils/money.dart`:
```dart
String formatMoney(double amount) {
  final sign = amount < 0 ? '-' : '';
  final abs = amount.abs();
  final fixed = abs.toStringAsFixed(2);
  final parts = fixed.split('.');
  final withCommas = _addThousandsSeparators(parts[0]);
  return '${sign}J\$$withCommas.${parts[1]}';
}

String _addThousandsSeparators(String intPart) {
  final reversed = intPart.split('').reversed.toList();
  final buffer = StringBuffer();
  for (var i = 0; i < reversed.length; i++) {
    if (i != 0 && i % 3 == 0) buffer.write(',');
    buffer.write(reversed[i]);
  }
  return buffer.toString().split('').reversed.join();
}
```

- [ ] **Step 6: Implement `date_utils.dart`**

Create `lib/utils/date_utils.dart`:
```dart
DateTime addDays(DateTime date, int days) => date.add(Duration(days: days));

/// Adds [months] to [date], clamping the day-of-month if the target month
/// is shorter (e.g. Jan 31 + 1 month -> Feb 28/29). Uses floor-style month
/// arithmetic so negative [months] crosses year boundaries correctly.
DateTime addMonths(DateTime date, int months) {
  final totalMonths = date.month - 1 + months;
  final monthIndex = totalMonths % 12; // Dart's % is Euclidean: always 0..11
  final yearOffset = (totalMonths - monthIndex) ~/ 12;
  final year = date.year + yearOffset;
  final month = monthIndex + 1;
  final daysInMonth = DateTime(year, month + 1, 0).day;
  final day = date.day > daysInMonth ? daysInMonth : date.day;
  return DateTime(year, month, day, date.hour, date.minute, date.second, date.millisecond);
}

bool isBefore(DateTime a, DateTime b) => a.isBefore(b);

DateTime nextOccurrence(DateTime from, String frequency) {
  switch (frequency) {
    case 'weekly':
      return addDays(from, 7);
    case 'biweekly':
      return addDays(from, 14);
    case 'monthly':
      return addMonths(from, 1);
    default:
      throw ArgumentError('Unknown frequency: $frequency');
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `flutter test test/utils/money_test.dart test/utils/date_utils_test.dart`
Expected: PASS, 10 tests total (`+10: All tests passed!`).

- [ ] **Step 8: Commit**

```bash
git add lib/utils/id.dart lib/utils/money.dart lib/utils/date_utils.dart test/utils/money_test.dart test/utils/date_utils_test.dart
git commit -m "feat: add id, money formatting, and date utilities with tests"
```

---

### Task 5: Calculation — Safe to Spend (TDD)

**Files:**
- Create: `lib/logic/safe_to_spend.dart`
- Test: `test/logic/safe_to_spend_test.dart`

**Interfaces:**
- Consumes: `Account`, `RecurringRule` from `lib/models/models.dart`; `isBefore`, `addMonths` from `lib/utils/date_utils.dart`.
- Produces: `double calculateSafeToSpend(List<Account> accounts, List<RecurringRule> recurringRules, {DateTime? now})` — used by the Home screen (Task 17).
- Design decision (spec left this open, resolved in §4 of the spec): "next expected income date" = exactly one calendar month after `now`.

- [ ] **Step 1: Write the failing tests**

Create `test/logic/safe_to_spend_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/safe_to_spend.dart';
import 'package:jm_finance_tracker/models/models.dart';

Account _account(double balance, {String id = 'a1'}) => Account(
      id: id,
      name: 'Checking',
      type: 'checking',
      balance: balance,
      createdAt: '2026-01-01T00:00:00.000Z',
    );

RecurringRule _rule(double amount, String nextDueDate) => RecurringRule(
      id: 'r1',
      name: 'Rent',
      categoryId: 'c1',
      accountId: 'a1',
      amount: amount,
      frequency: 'monthly',
      nextDueDate: nextDueDate,
    );

void main() {
  final now = DateTime(2026, 1, 1);

  group('calculateSafeToSpend', () {
    test('subtracts bills due before the next expected income date', () {
      final accounts = [_account(10000)];
      final rules = [_rule(3000, '2026-01-15T00:00:00.000Z')];
      expect(calculateSafeToSpend(accounts, rules, now: now), 7000);
    });

    test('ignores bills due after the next expected income date', () {
      final accounts = [_account(10000)];
      final rules = [_rule(3000, '2026-03-01T00:00:00.000Z')];
      expect(calculateSafeToSpend(accounts, rules, now: now), 10000);
    });

    test('sums balances across multiple accounts', () {
      final accounts = [_account(5000, id: 'a1'), _account(2000, id: 'a2')];
      expect(calculateSafeToSpend(accounts, [], now: now), 7000);
    });
  });
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `flutter test test/logic/safe_to_spend_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/logic/safe_to_spend.dart': No such file or directory`.

- [ ] **Step 3: Implement `safe_to_spend.dart`**

Create `lib/logic/safe_to_spend.dart`:
```dart
import '../models/models.dart';
import '../utils/date_utils.dart' as date_utils;

double calculateSafeToSpend(List<Account> accounts, List<RecurringRule> recurringRules, {DateTime? now}) {
  final effectiveNow = now ?? DateTime.now();
  final totalBalance = accounts.fold<double>(0, (sum, a) => sum + a.balance);
  final nextIncomeDate = date_utils.addMonths(effectiveNow, 1);
  final upcomingBills = recurringRules
      .where((r) => date_utils.isBefore(DateTime.parse(r.nextDueDate), nextIncomeDate))
      .fold<double>(0, (sum, r) => sum + r.amount);
  return totalBalance - upcomingBills;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `flutter test test/logic/safe_to_spend_test.dart`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/logic/safe_to_spend.dart test/logic/safe_to_spend_test.dart
git commit -m "feat: add Safe to Spend calculation with tests"
```

---

### Task 6: Calculation — Debt payoff projection, snowball & avalanche (TDD)

**Files:**
- Create: `lib/logic/debt_payoff.dart`
- Test: `test/logic/debt_payoff_test.dart`

**Interfaces:**
- Consumes: `Debt` from `lib/models/models.dart`.
- Produces: `class PayoffResult { final int months; final double totalInterest; }`; `class DebtPayoffProjection { final PayoffResult snowball; final PayoffResult avalanche; }`; `DebtPayoffProjection projectDebtPayoff(List<Debt> debts, double extraPayment)` — used by the Debt screen (Task 22).

- [ ] **Step 1: Write the failing tests**

Create `test/logic/debt_payoff_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/debt_payoff.dart';
import 'package:jm_finance_tracker/models/models.dart';

Debt _debt({String id = 'd1', double balance = 1200, double interestRate = 0, double minPayment = 100}) => Debt(
      id: id,
      name: 'Card',
      balance: balance,
      interestRate: interestRate,
      minPayment: minPayment,
      dueDayOfMonth: 1,
    );

void main() {
  group('projectDebtPayoff', () {
    test('pays off a single zero-interest debt in balance/minPayment months', () {
      final debts = [_debt(balance: 1200, minPayment: 100)];
      final result = projectDebtPayoff(debts, 0);
      expect(result.snowball.months, 12);
      expect(result.snowball.totalInterest, 0);
    });

    test('avalanche never accrues more total interest than snowball for the same debts', () {
      final debts = [
        _debt(id: 'd1', balance: 500, interestRate: 5, minPayment: 50),
        _debt(id: 'd2', balance: 3000, interestRate: 22, minPayment: 100),
      ];
      final result = projectDebtPayoff(debts, 200);
      expect(result.avalanche.totalInterest <= result.snowball.totalInterest, true);
    });

    test('extra payments reduce months to debt-free', () {
      final debts = [_debt(balance: 1200, minPayment: 100, interestRate: 0)];
      final withoutExtra = projectDebtPayoff(debts, 0);
      final withExtra = projectDebtPayoff(debts, 200);
      expect(withExtra.snowball.months < withoutExtra.snowball.months, true);
    });
  });
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `flutter test test/logic/debt_payoff_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/logic/debt_payoff.dart': No such file or directory`.

- [ ] **Step 3: Implement `debt_payoff.dart`**

Create `lib/logic/debt_payoff.dart`:
```dart
import '../models/models.dart';

class PayoffResult {
  final int months;
  final double totalInterest;
  PayoffResult({required this.months, required this.totalInterest});
}

class DebtPayoffProjection {
  final PayoffResult snowball;
  final PayoffResult avalanche;
  DebtPayoffProjection({required this.snowball, required this.avalanche});
}

const _maxMonths = 600; // 50-year safety cap against infinite loops

class _WorkingDebt {
  double balance;
  final double interestRate;
  final double minPayment;
  _WorkingDebt({required this.balance, required this.interestRate, required this.minPayment});
}

PayoffResult _simulate(List<Debt> debts, double extraPayment, bool isSnowball) {
  final order = debts
      .map((d) => _WorkingDebt(balance: d.balance, interestRate: d.interestRate, minPayment: d.minPayment))
      .toList();
  if (isSnowball) {
    order.sort((a, b) => a.balance.compareTo(b.balance));
  } else {
    order.sort((a, b) => b.interestRate.compareTo(a.interestRate));
  }

  var months = 0;
  var totalInterest = 0.0;

  while (order.any((d) => d.balance > 0.01) && months < _maxMonths) {
    months++;
    for (final debt in order) {
      if (debt.balance <= 0) continue;
      final monthlyInterest = debt.balance * (debt.interestRate / 100 / 12);
      totalInterest += monthlyInterest;
      debt.balance += monthlyInterest;
      debt.balance -= debt.balance < debt.minPayment ? debt.balance : debt.minPayment;
    }
    var remainingExtra = extraPayment;
    for (final debt in order) {
      if (remainingExtra <= 0) break;
      if (debt.balance <= 0) continue;
      final applied = debt.balance < remainingExtra ? debt.balance : remainingExtra;
      debt.balance -= applied;
      remainingExtra -= applied;
    }
  }

  return PayoffResult(months: months, totalInterest: (totalInterest * 100).round() / 100);
}

DebtPayoffProjection projectDebtPayoff(List<Debt> debts, double extraPayment) {
  return DebtPayoffProjection(
    snowball: _simulate(debts, extraPayment, true),
    avalanche: _simulate(debts, extraPayment, false),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `flutter test test/logic/debt_payoff_test.dart`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/logic/debt_payoff.dart test/logic/debt_payoff_test.dart
git commit -m "feat: add debt payoff projection (snowball/avalanche) with tests"
```

---

### Task 7: Calculation — Insights aggregation (TDD)

**Files:**
- Create: `lib/logic/insights.dart`
- Test: `test/logic/insights_test.dart`

**Interfaces:**
- Consumes: `Transaction` from `lib/models/models.dart`.
- Produces: `class CategoryTotal { final String categoryId; final double total; final double previousTotal; final double? percentChange; }`; `List<CategoryTotal> categoryTotals(List<Transaction> transactions, DateTime periodStart, DateTime periodEnd, DateTime previousPeriodStart, DateTime previousPeriodEnd)`; `class TrendBucket { final String label; final double income; final double spending; }`; `List<TrendBucket> incomeVsSpendingTrend(List<Transaction> transactions, String bucketBy, int numBuckets, DateTime end)`; `List<Transaction> topTransactions(List<Transaction> transactions, DateTime periodStart, DateTime periodEnd, {int n = 5})`. Used by the Insights screen (Task 20).

- [ ] **Step 1: Write the failing tests**

Create `test/logic/insights_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:jm_finance_tracker/logic/insights.dart';
import 'package:jm_finance_tracker/models/models.dart';

Transaction _tx({
  String id = 'tx',
  String categoryId = 'food',
  double amount = -100,
  String date = '2026-01-15T00:00:00.000Z',
  String type = 'expense',
}) =>
    Transaction(id: id, accountId: 'a1', categoryId: categoryId, amount: amount, note: '', date: date, type: type);

void main() {
  group('categoryTotals', () {
    test('sums current-period expenses by category and computes percent change', () {
      final transactions = [
        _tx(categoryId: 'food', amount: -100, date: '2026-01-15T00:00:00.000Z'),
        _tx(categoryId: 'food', amount: -50, date: '2025-12-15T00:00:00.000Z'),
      ];
      final result = categoryTotals(
        transactions,
        DateTime.parse('2026-01-01T00:00:00.000Z'),
        DateTime.parse('2026-02-01T00:00:00.000Z'),
        DateTime.parse('2025-12-01T00:00:00.000Z'),
        DateTime.parse('2026-01-01T00:00:00.000Z'),
      );
      expect(result[0].categoryId, 'food');
      expect(result[0].total, 100);
      expect(result[0].previousTotal, 50);
      expect(result[0].percentChange, 100);
    });
  });

  group('incomeVsSpendingTrend', () {
    test('buckets income and spending by week', () {
      final transactions = [
        _tx(type: 'income', amount: 500, date: '2026-01-14T00:00:00.000Z'),
        _tx(type: 'expense', amount: -200, date: '2026-01-14T00:00:00.000Z'),
      ];
      final buckets = incomeVsSpendingTrend(transactions, 'week', 2, DateTime.parse('2026-01-15T00:00:00.000Z'));
      expect(buckets.length, 2);
      expect(buckets[1].income, 500);
      expect(buckets[1].spending, 200);
    });
  });

  group('topTransactions', () {
    test('returns the top N transactions by absolute amount within the period', () {
      final transactions = [
        _tx(amount: -50, date: '2026-01-05T00:00:00.000Z'),
        _tx(amount: -900, date: '2026-01-10T00:00:00.000Z'),
        _tx(amount: 300, date: '2026-01-12T00:00:00.000Z'),
      ];
      final top = topTransactions(
        transactions,
        DateTime.parse('2026-01-01T00:00:00.000Z'),
        DateTime.parse('2026-02-01T00:00:00.000Z'),
        n: 2,
      );
      expect(top.map((t) => t.amount).toList(), [-900, 300]);
    });
  });
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `flutter test test/logic/insights_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/logic/insights.dart': No such file or directory`.

- [ ] **Step 3: Implement `insights.dart`**

Create `lib/logic/insights.dart`:
```dart
import '../models/models.dart';

class CategoryTotal {
  final String categoryId;
  final double total;
  final double previousTotal;
  final double? percentChange;
  CategoryTotal({required this.categoryId, required this.total, required this.previousTotal, this.percentChange});
}

class TrendBucket {
  final String label;
  final double income;
  final double spending;
  TrendBucket({required this.label, required this.income, required this.spending});
}

bool _inRange(Transaction t, DateTime start, DateTime end) {
  final date = DateTime.parse(t.date);
  return !date.isBefore(start) && date.isBefore(end);
}

Map<String, double> _sumByCategory(List<Transaction> list) {
  final map = <String, double>{};
  for (final t in list) {
    map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount.abs();
  }
  return map;
}

List<CategoryTotal> categoryTotals(
  List<Transaction> transactions,
  DateTime periodStart,
  DateTime periodEnd,
  DateTime previousPeriodStart,
  DateTime previousPeriodEnd,
) {
  final current = transactions.where((t) => _inRange(t, periodStart, periodEnd) && t.type == 'expense').toList();
  final previous =
      transactions.where((t) => _inRange(t, previousPeriodStart, previousPeriodEnd) && t.type == 'expense').toList();

  final currentMap = _sumByCategory(current);
  final previousMap = _sumByCategory(previous);
  final categoryIds = {...currentMap.keys, ...previousMap.keys};

  final results = categoryIds.map((categoryId) {
    final total = currentMap[categoryId] ?? 0;
    final previousTotal = previousMap[categoryId] ?? 0;
    final percentChange = previousTotal == 0 ? null : ((total - previousTotal) / previousTotal * 1000).round() / 10;
    return CategoryTotal(categoryId: categoryId, total: total, previousTotal: previousTotal, percentChange: percentChange);
  }).toList();

  results.sort((a, b) => b.total.compareTo(a.total));
  return results;
}

List<TrendBucket> incomeVsSpendingTrend(
  List<Transaction> transactions,
  String bucketBy, // 'week' | 'month'
  int numBuckets,
  DateTime end,
) {
  final bucketDuration = bucketBy == 'week' ? const Duration(days: 7) : const Duration(days: 30);
  final buckets = <TrendBucket>[];

  for (var i = numBuckets - 1; i >= 0; i--) {
    final bucketEnd = end.subtract(bucketDuration * i);
    final bucketStart = bucketEnd.subtract(bucketDuration);
    final inBucket = transactions.where((t) {
      final date = DateTime.parse(t.date);
      return !date.isBefore(bucketStart) && date.isBefore(bucketEnd);
    });
    final income = inBucket.where((t) => t.type == 'income').fold<double>(0, (s, t) => s + t.amount);
    final spending = inBucket.where((t) => t.type == 'expense').fold<double>(0, (s, t) => s + t.amount.abs());
    buckets.add(TrendBucket(
      label:
          '${bucketStart.year.toString().padLeft(4, '0')}-${bucketStart.month.toString().padLeft(2, '0')}-${bucketStart.day.toString().padLeft(2, '0')}',
      income: income,
      spending: spending,
    ));
  }
  return buckets;
}

List<Transaction> topTransactions(List<Transaction> transactions, DateTime periodStart, DateTime periodEnd, {int n = 5}) {
  final inPeriod = transactions.where((t) => _inRange(t, periodStart, periodEnd)).toList();
  inPeriod.sort((a, b) => b.amount.abs().compareTo(a.amount.abs()));
  return inPeriod.take(n).toList();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `flutter test test/logic/insights_test.dart`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/logic/insights.dart test/logic/insights_test.dart
git commit -m "feat: add insights aggregation (category totals, trend, top transactions) with tests"
```

---

### Task 8: Persistence wrapper + `ChangeNotifier` stores for all domain entities

**Files:**
- Create: `lib/stores/error_banner_store.dart`, `lib/utils/persistence.dart`
- Create: `lib/stores/settings_store.dart`, `lib/stores/accounts_store.dart`, `lib/stores/categories_store.dart`, `lib/stores/transactions_store.dart`, `lib/stores/recurring_store.dart`, `lib/stores/goals_store.dart`, `lib/stores/debts_store.dart`

**Interfaces:**
- Consumes: `generateId` from `lib/utils/id.dart`; `nextOccurrence` from `lib/utils/date_utils.dart`; all model classes from `lib/models/models.dart`.
- Produces: `ErrorBannerStore` (`message`, `show(String)`, `hide()`), and `SettingsStore`, `AccountsStore`, `CategoriesStore`, `TransactionsStore`, `RecurringStore`, `GoalsStore`, `DebtsStore` — each a `ChangeNotifier` constructed with an `ErrorBannerStore`, exposing a `hasHydrated` getter, a `Future<void> hydrate()` method, and CRUD methods. Every screen from Task 14 onward reads from these via `provider`; Task 9's `TransactionActions` calls their methods directly.

- [ ] **Step 1: Create the error banner store (not persisted)**

Create `lib/stores/error_banner_store.dart`:
```dart
import 'package:flutter/foundation.dart';

class ErrorBannerStore extends ChangeNotifier {
  String? _message;
  String? get message => _message;

  void show(String message) {
    _message = message;
    notifyListeners();
  }

  void hide() {
    _message = null;
    notifyListeners();
  }
}
```

- [ ] **Step 2: Create the `shared_preferences` wrapper that surfaces failures via the error banner**

Create `lib/utils/persistence.dart`:
```dart
import 'package:shared_preferences/shared_preferences.dart';
import '../stores/error_banner_store.dart';

Future<String?> loadJson(String key, ErrorBannerStore errorBanner) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  } catch (_) {
    errorBanner.show("Couldn't load — try again");
    return null;
  }
}

Future<void> saveJson(String key, String value, ErrorBannerStore errorBanner) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  } catch (_) {
    errorBanner.show("Couldn't save — try again");
  }
}
```

- [ ] **Step 3: Create `settings_store.dart`**

Create `lib/stores/settings_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class SettingsStore extends ChangeNotifier {
  static const _key = 'settings-store';
  final ErrorBannerStore errorBanner;

  SettingsStore(this.errorBanner);

  UserSettings _settings = UserSettings();
  bool _hasHydrated = false;

  UserSettings get settings => _settings;
  bool get hasHydrated => _hasHydrated;
  bool get hasCompletedOnboarding => _settings.hasCompletedOnboarding;
  double get monthlyIncomeEstimate => _settings.monthlyIncomeEstimate;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      _settings = UserSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_settings.toJson()), errorBanner);

  void setHasCompletedOnboarding(bool value) {
    _settings = _settings.copyWith(hasCompletedOnboarding: value);
    notifyListeners();
    _persist();
  }

  void setMonthlyIncomeEstimate(double value) {
    _settings = _settings.copyWith(monthlyIncomeEstimate: value);
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 4: Create `accounts_store.dart`**

Create `lib/stores/accounts_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class AccountsStore extends ChangeNotifier {
  static const _key = 'accounts-store';
  final ErrorBannerStore errorBanner;

  AccountsStore(this.errorBanner);

  List<Account> _accounts = [];
  bool _hasHydrated = false;

  List<Account> get accounts => List.unmodifiable(_accounts);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _accounts = list.map((e) => Account.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_accounts.map((a) => a.toJson()).toList()), errorBanner);

  String addAccount({required String name, required String type, required double balance}) {
    final id = generateId();
    final account = Account(id: id, name: name, type: type, balance: balance, createdAt: DateTime.now().toIso8601String());
    _accounts = [..._accounts, account];
    notifyListeners();
    _persist();
    return id;
  }

  void updateAccount(String id, {String? name, String? type, double? balance}) {
    _accounts = _accounts.map((a) => a.id == id ? a.copyWith(name: name, type: type, balance: balance) : a).toList();
    notifyListeners();
    _persist();
  }

  void removeAccount(String id) {
    _accounts = _accounts.where((a) => a.id != id).toList();
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 5: Create `categories_store.dart` with seeded presets**

Create `lib/stores/categories_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

final List<Category> presetCategories = [
  Category(id: 'preset-food', name: 'Food', icon: 'utensils', isCustom: false, isIncome: false),
  Category(id: 'preset-transport', name: 'Transport', icon: 'car', isCustom: false, isIncome: false),
  Category(id: 'preset-bills', name: 'Bills & Utilities', icon: 'receipt', isCustom: false, isIncome: false),
  Category(id: 'preset-shopping', name: 'Shopping', icon: 'shopping-bag', isCustom: false, isIncome: false),
  Category(id: 'preset-entertainment', name: 'Entertainment', icon: 'film', isCustom: false, isIncome: false),
  Category(id: 'preset-health', name: 'Health', icon: 'heart-pulse', isCustom: false, isIncome: false),
  Category(id: 'preset-housing', name: 'Housing', icon: 'home', isCustom: false, isIncome: false),
  Category(id: 'preset-income', name: 'Income', icon: 'wallet', isCustom: false, isIncome: true),
  Category(id: 'preset-transfer', name: 'Transfer', icon: 'arrow-left-right', isCustom: false, isIncome: false),
  Category(id: 'preset-other', name: 'Other', icon: 'more-horizontal', isCustom: false, isIncome: false),
];

class CategoriesStore extends ChangeNotifier {
  static const _key = 'categories-store';
  final ErrorBannerStore errorBanner;

  CategoriesStore(this.errorBanner);

  List<Category> _categories = presetCategories;
  bool _hasHydrated = false;

  List<Category> get categories => List.unmodifiable(_categories);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _categories = list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_categories.map((c) => c.toJson()).toList()), errorBanner);

  void addCategory(String name, String icon, bool isIncome) {
    final category = Category(id: generateId(), name: name, icon: icon, isCustom: true, isIncome: isIncome);
    _categories = [..._categories, category];
    notifyListeners();
    _persist();
  }

  void removeCategory(String id) {
    _categories = _categories.where((c) => c.id != id).toList();
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 6: Create `transactions_store.dart`**

Create `lib/stores/transactions_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class TransactionsStore extends ChangeNotifier {
  static const _key = 'transactions-store';
  final ErrorBannerStore errorBanner;

  TransactionsStore(this.errorBanner);

  List<Transaction> _transactions = [];
  bool _hasHydrated = false;

  List<Transaction> get transactions => List.unmodifiable(_transactions);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _transactions = list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_transactions.map((t) => t.toJson()).toList()), errorBanner);

  String addTransaction({
    required String accountId,
    required String categoryId,
    required double amount,
    required String note,
    required String date,
    required String type,
    String? recurringRuleId,
    String? goalId,
  }) {
    final id = generateId();
    final transaction = Transaction(
      id: id,
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      note: note,
      date: date,
      type: type,
      recurringRuleId: recurringRuleId,
      goalId: goalId,
    );
    _transactions = [..._transactions, transaction];
    notifyListeners();
    _persist();
    return id;
  }

  void updateTransaction(
    String id, {
    String? accountId,
    String? categoryId,
    double? amount,
    String? note,
    String? date,
    String? type,
    String? goalId,
  }) {
    _transactions = _transactions
        .map((t) => t.id == id
            ? t.copyWith(accountId: accountId, categoryId: categoryId, amount: amount, note: note, date: date, type: type, goalId: goalId)
            : t)
        .toList();
    notifyListeners();
    _persist();
  }

  void removeTransaction(String id) {
    _transactions = _transactions.where((t) => t.id != id).toList();
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 7: Create `recurring_store.dart`**

Create `lib/stores/recurring_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/date_utils.dart' as date_utils;
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class RecurringStore extends ChangeNotifier {
  static const _key = 'recurring-store';
  final ErrorBannerStore errorBanner;

  RecurringStore(this.errorBanner);

  List<RecurringRule> _rules = [];
  bool _hasHydrated = false;

  List<RecurringRule> get rules => List.unmodifiable(_rules);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _rules = list.map((e) => RecurringRule.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_rules.map((r) => r.toJson()).toList()), errorBanner);

  String addRule({
    required String name,
    required String categoryId,
    required String accountId,
    required double amount,
    required String frequency,
    required String nextDueDate,
  }) {
    final id = generateId();
    final rule = RecurringRule(
      id: id,
      name: name,
      categoryId: categoryId,
      accountId: accountId,
      amount: amount,
      frequency: frequency,
      nextDueDate: nextDueDate,
    );
    _rules = [..._rules, rule];
    notifyListeners();
    _persist();
    return id;
  }

  void updateRule(String id, {String? name, double? amount, String? frequency, String? nextDueDate}) {
    _rules = _rules.map((r) => r.id == id ? r.copyWith(name: name, amount: amount, frequency: frequency, nextDueDate: nextDueDate) : r).toList();
    notifyListeners();
    _persist();
  }

  void removeRule(String id) {
    _rules = _rules.where((r) => r.id != id).toList();
    notifyListeners();
    _persist();
  }

  void advanceNextDueDate(String id) {
    RecurringRule? rule;
    for (final r in _rules) {
      if (r.id == id) {
        rule = r;
        break;
      }
    }
    if (rule == null) return;
    final next = date_utils.nextOccurrence(DateTime.parse(rule.nextDueDate), rule.frequency);
    updateRule(id, nextDueDate: next.toIso8601String());
  }
}
```

- [ ] **Step 8: Create `goals_store.dart`**

Create `lib/stores/goals_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class GoalsStore extends ChangeNotifier {
  static const _key = 'goals-store';
  final ErrorBannerStore errorBanner;

  GoalsStore(this.errorBanner);

  List<Goal> _goals = [];
  bool _hasHydrated = false;

  List<Goal> get goals => List.unmodifiable(_goals);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _goals = list.map((e) => Goal.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_goals.map((g) => g.toJson()).toList()), errorBanner);

  String addGoal({required String name, required String icon, required double targetAmount, String? targetDate}) {
    final id = generateId();
    final goal = Goal(id: id, name: name, icon: icon, targetAmount: targetAmount, currentAmount: 0, targetDate: targetDate);
    _goals = [..._goals, goal];
    notifyListeners();
    _persist();
    return id;
  }

  void updateGoal(String id, {String? name, double? targetAmount}) {
    _goals = _goals.map((g) => g.id == id ? g.copyWith(name: name, targetAmount: targetAmount) : g).toList();
    notifyListeners();
    _persist();
  }

  void removeGoal(String id) {
    _goals = _goals.where((g) => g.id != id).toList();
    notifyListeners();
    _persist();
  }

  void incrementCurrentAmount(String id, double amount) {
    _goals = _goals.map((g) => g.id == id ? g.copyWith(currentAmount: g.currentAmount + amount) : g).toList();
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 9: Create `debts_store.dart`**

Create `lib/stores/debts_store.dart`:
```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../utils/id.dart';
import '../utils/persistence.dart';
import 'error_banner_store.dart';

class DebtsStore extends ChangeNotifier {
  static const _key = 'debts-store';
  final ErrorBannerStore errorBanner;

  DebtsStore(this.errorBanner);

  List<Debt> _debts = [];
  bool _hasHydrated = false;

  List<Debt> get debts => List.unmodifiable(_debts);
  bool get hasHydrated => _hasHydrated;

  Future<void> hydrate() async {
    final raw = await loadJson(_key, errorBanner);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _debts = list.map((e) => Debt.fromJson(e as Map<String, dynamic>)).toList();
    }
    _hasHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() => saveJson(_key, jsonEncode(_debts.map((d) => d.toJson()).toList()), errorBanner);

  String addDebt({
    required String name,
    required double balance,
    required double interestRate,
    required double minPayment,
    required int dueDayOfMonth,
  }) {
    final id = generateId();
    final debt = Debt(id: id, name: name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: dueDayOfMonth);
    _debts = [..._debts, debt];
    notifyListeners();
    _persist();
    return id;
  }

  void updateDebt(String id, {String? name, double? balance, double? interestRate, double? minPayment}) {
    _debts = _debts.map((d) => d.id == id ? d.copyWith(name: name, balance: balance, interestRate: interestRate, minPayment: minPayment) : d).toList();
    notifyListeners();
    _persist();
  }

  void removeDebt(String id) {
    _debts = _debts.where((d) => d.id != id).toList();
    notifyListeners();
    _persist();
  }
}
```

- [ ] **Step 10: Verify everything compiles**

Run: `flutter analyze lib/stores lib/utils/persistence.dart`
Expected: `No issues found!`

- [ ] **Step 11: Commit**

```bash
git add lib/stores lib/utils/persistence.dart
git commit -m "feat: add ChangeNotifier stores for all domain entities with shared_preferences persistence"
```

---

### Task 9: Transaction actions — cross-store orchestration (TDD)

**Files:**
- Create: `lib/logic/transaction_actions.dart`
- Test: `test/logic/transaction_actions_test.dart`

**Interfaces:**
- Consumes: `AccountsStore`, `TransactionsStore`, `GoalsStore` from Task 8; `Transaction` from `lib/models/models.dart`.
- Produces: `class TransactionActions` constructed with `{required AccountsStore accountsStore, required TransactionsStore transactionsStore, required GoalsStore goalsStore}`, exposing `String createTransaction({...})`, `void editTransaction(String id, {...})`, `void deleteTransaction(String id)` — the **only** way screens should create/edit/delete transactions (Tasks 17, 19, 21), since these methods keep account balances and goal progress in sync.

- [ ] **Step 1: Write the failing tests**

Create `test/logic/transaction_actions_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jm_finance_tracker/logic/transaction_actions.dart';
import 'package:jm_finance_tracker/stores/accounts_store.dart';
import 'package:jm_finance_tracker/stores/transactions_store.dart';
import 'package:jm_finance_tracker/stores/goals_store.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ErrorBannerStore errorBanner;
  late AccountsStore accountsStore;
  late TransactionsStore transactionsStore;
  late GoalsStore goalsStore;
  late TransactionActions actions;
  late String accountId;
  late String goalId;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    errorBanner = ErrorBannerStore();
    accountsStore = AccountsStore(errorBanner);
    transactionsStore = TransactionsStore(errorBanner);
    goalsStore = GoalsStore(errorBanner);
    actions = TransactionActions(accountsStore: accountsStore, transactionsStore: transactionsStore, goalsStore: goalsStore);

    accountId = accountsStore.addAccount(name: 'Checking', type: 'checking', balance: 1000);
    goalId = goalsStore.addGoal(name: 'Fund', icon: 'target', targetAmount: 1000);
  });

  group('createTransaction', () {
    test('adjusts the account balance by the transaction amount', () {
      actions.createTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'expense',
      );
      expect(accountsStore.accounts[0].balance, 900);
    });

    test('increments the goal current amount for a goal_contribution', () {
      actions.createTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'goal_contribution',
        goalId: goalId,
      );
      expect(goalsStore.goals[0].currentAmount, 100);
    });
  });

  group('deleteTransaction', () {
    test('reverses the account balance effect and removes the transaction', () {
      final id = actions.createTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'expense',
      );
      actions.deleteTransaction(id);
      expect(accountsStore.accounts[0].balance, 1000);
      expect(transactionsStore.transactions.length, 0);
    });
  });

  group('editTransaction', () {
    test('reverses the old amount and applies the new one', () {
      final id = actions.createTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'expense',
      );
      actions.editTransaction(id, amount: -300);
      expect(accountsStore.accounts[0].balance, 700);
    });
  });
}
```
`TestWidgetsFlutterBinding.ensureInitialized()` plus `SharedPreferences.setMockInitialValues({})` are required here (unlike Tasks 4–7's tests) because these stores call through to `shared_preferences` on every mutation — without the mock, the first `SharedPreferences.getInstance()` call throws `MissingPluginException`. That exception is already caught inside `saveJson`/`loadJson` (Task 8, Step 2), so tests would still pass even without this setup, but output would carry stray plugin-exception noise — the mock keeps output pristine.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `flutter test test/logic/transaction_actions_test.dart`
Expected: FAIL — `Error: Error when reading 'lib/logic/transaction_actions.dart': No such file or directory`.

- [ ] **Step 3: Implement `transaction_actions.dart`**

Create `lib/logic/transaction_actions.dart`:
```dart
import '../models/models.dart';
import '../stores/accounts_store.dart';
import '../stores/transactions_store.dart';
import '../stores/goals_store.dart';

class TransactionActions {
  final AccountsStore accountsStore;
  final TransactionsStore transactionsStore;
  final GoalsStore goalsStore;

  TransactionActions({required this.accountsStore, required this.transactionsStore, required this.goalsStore});

  void _applyToAccount(String accountId, double delta) {
    Account? account;
    for (final a in accountsStore.accounts) {
      if (a.id == accountId) {
        account = a;
        break;
      }
    }
    if (account == null) return;
    accountsStore.updateAccount(accountId, balance: account.balance + delta);
  }

  void _applyToGoal({required String type, String? goalId, required double amount, required int sign}) {
    if (type == 'goal_contribution' && goalId != null) {
      goalsStore.incrementCurrentAmount(goalId, sign * amount.abs());
    }
  }

  String createTransaction({
    required String accountId,
    required String categoryId,
    required double amount,
    required String note,
    required String date,
    required String type,
    String? goalId,
  }) {
    final id = transactionsStore.addTransaction(
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      note: note,
      date: date,
      type: type,
      goalId: goalId,
    );
    _applyToAccount(accountId, amount);
    _applyToGoal(type: type, goalId: goalId, amount: amount, sign: 1);
    return id;
  }

  void deleteTransaction(String id) {
    Transaction? tx;
    for (final t in transactionsStore.transactions) {
      if (t.id == id) {
        tx = t;
        break;
      }
    }
    if (tx == null) return;
    _applyToAccount(tx.accountId, -tx.amount);
    _applyToGoal(type: tx.type, goalId: tx.goalId, amount: tx.amount, sign: -1);
    transactionsStore.removeTransaction(id);
  }

  void editTransaction(
    String id, {
    String? accountId,
    String? categoryId,
    double? amount,
    String? note,
    String? date,
    String? type,
    String? goalId,
  }) {
    Transaction? original;
    for (final t in transactionsStore.transactions) {
      if (t.id == id) {
        original = t;
        break;
      }
    }
    if (original == null) return;

    _applyToAccount(original.accountId, -original.amount);
    _applyToGoal(type: original.type, goalId: original.goalId, amount: original.amount, sign: -1);

    final merged = original.copyWith(
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      note: note,
      date: date,
      type: type,
      goalId: goalId,
    );
    _applyToAccount(merged.accountId, merged.amount);
    _applyToGoal(type: merged.type, goalId: merged.goalId, amount: merged.amount, sign: 1);

    transactionsStore.updateTransaction(
      id,
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      note: note,
      date: date,
      type: type,
      goalId: goalId,
    );
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `flutter test test/logic/transaction_actions_test.dart`
Expected: PASS, 4 tests, no stray plugin-exception output.

- [ ] **Step 5: Run the full test suite so far**

Run: `flutter test`
Expected: PASS, all suites from Tasks 4–9 (money, date_utils, safe_to_spend, debt_payoff, insights, transaction_actions).

- [ ] **Step 6: Commit**

```bash
git add lib/logic/transaction_actions.dart test/logic/transaction_actions_test.dart
git commit -m "feat: add transaction actions that keep account balances and goal progress in sync"
```

---

### Task 10: Icon mapping + shared widgets part 1 (`PhoneFrame`, `AppScreen`, `AppCard`, `IconChip`, `CategoryIcon`, `ListRow`)

**Files:**
- Create: `lib/utils/icon_map.dart`
- Create: `lib/widgets/phone_frame.dart`, `lib/widgets/app_screen.dart`, `lib/widgets/app_card.dart`, `lib/widgets/icon_chip.dart`, `lib/widgets/category_icon.dart`, `lib/widgets/list_row.dart`

**Interfaces:**
- Consumes: `AppColors`/`AppSpacing`/`AppRadius` from `lib/theme/app_theme.dart`; `formatMoney` from `lib/utils/money.dart`.
- Produces: `IconData getIcon(String name)`; `PhoneFrame({required Widget child})`; `AppScreen({required Widget child, bool scroll, bool padded})`; `AppCard({required Widget child, bool emphasis, EdgeInsetsGeometry? margin})`; `IconChip({required Widget child, double size})`; `CategoryIcon({required String name, double size})`; `ListRow({required Widget icon, required String title, String? caption, double? amount, bool showChevron, VoidCallback? onTap, bool isLast})` — used by every screen from Task 14 onward.

- [ ] **Step 1: Create the icon name → Lucide `IconData` map**

Create `lib/utils/icon_map.dart`:
```dart
import 'package:flutter/widgets.dart';
import 'package:lucide_icons/lucide_icons.dart';

final Map<String, IconData> iconMap = {
  'utensils': LucideIcons.utensils,
  'car': LucideIcons.car,
  'receipt': LucideIcons.receipt,
  'shopping-bag': LucideIcons.shoppingBag,
  'film': LucideIcons.film,
  'heart-pulse': LucideIcons.heartPulse,
  'home': LucideIcons.home,
  'wallet': LucideIcons.wallet,
  'arrow-left-right': LucideIcons.arrowLeftRight,
  'more-horizontal': LucideIcons.moreHorizontal,
  'target': LucideIcons.target,
};

IconData getIcon(String name) => iconMap[name] ?? LucideIcons.moreHorizontal;
```
If the installed `lucide_icons` version names any of these constants differently, use the closest equivalent available in that version and note the substitution in your report — do not block the task on an exact identifier match.

- [ ] **Step 2: Create `PhoneFrame`**

Create `lib/widgets/phone_frame.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Wraps the entire app once (in main.dart) so it always renders inside a
/// fixed max-width phone-sized shell, centered, regardless of browser
/// window size — per design spec §2's phone-size constraint.
class PhoneFrame extends StatelessWidget {
  final Widget child;
  const PhoneFrame({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.bg,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: child,
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Create `AppScreen`**

Create `lib/widgets/app_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Per-screen wrapper: safe-area handling, optional scrolling, optional
/// horizontal/bottom padding. Every screen body renders inside this.
class AppScreen extends StatelessWidget {
  final Widget child;
  final bool scroll;
  final bool padded;

  const AppScreen({super.key, required this.child, this.scroll = true, this.padded = true});

  @override
  Widget build(BuildContext context) {
    final content = padded
        ? Padding(padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xxxl), child: child)
        : child;

    return Container(
      color: AppColors.bg,
      child: SafeArea(
        child: scroll ? SingleChildScrollView(child: content) : content,
      ),
    );
  }
}
```

- [ ] **Step 4: Create `AppCard`**

Create `lib/widgets/app_card.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Emphasis variant: 2px accent top rule + surface fill, per design.md.txt §7
/// (hero, debt-projection cards). Normal variant: plain 1px border.
class AppCard extends StatelessWidget {
  final Widget child;
  final bool emphasis;
  final EdgeInsetsGeometry? margin;

  const AppCard({super.key, required this.child, this.emphasis = false, this.margin});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: emphasis ? AppColors.surface : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: emphasis
            ? const Border(
                top: BorderSide(color: AppColors.accent, width: 2),
                left: BorderSide(color: AppColors.border, width: 1),
                right: BorderSide(color: AppColors.border, width: 1),
                bottom: BorderSide(color: AppColors.border, width: 1),
              )
            : Border.all(color: AppColors.border, width: 1),
      ),
      child: child,
    );
  }
}
```

- [ ] **Step 5: Create `IconChip`**

Create `lib/widgets/icon_chip.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class IconChip extends StatelessWidget {
  final Widget child;
  final double size;

  const IconChip({super.key, required this.child, this.size = 34});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.sm)),
      alignment: Alignment.center,
      child: child,
    );
  }
}
```

- [ ] **Step 6: Create `CategoryIcon`**

Create `lib/widgets/category_icon.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/icon_map.dart';

class CategoryIcon extends StatelessWidget {
  final String name;
  final double size;

  const CategoryIcon({super.key, required this.name, this.size = 16});

  @override
  Widget build(BuildContext context) {
    return Icon(getIcon(name), size: size, color: AppColors.textSecondary);
  }
}
```

- [ ] **Step 7: Create `ListRow`**

Create `lib/widgets/list_row.dart`:
```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/money.dart';
import 'icon_chip.dart';

class ListRow extends StatelessWidget {
  final Widget icon;
  final String title;
  final String? caption;
  final double? amount;
  final bool showChevron;
  final VoidCallback? onTap;
  final bool isLast;

  const ListRow({
    super.key,
    required this.icon,
    required this.title,
    this.caption,
    this.amount,
    this.showChevron = false,
    this.onTap,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final row = Container(
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: AppColors.borderHairline, width: 1)),
      ),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md2),
      child: Row(
        children: [
          IconChip(child: icon),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                if (caption != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(caption!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ),
              ],
            ),
          ),
          if (amount != null)
            Text(
              '${amount! > 0 ? '+' : ''}${formatMoney(amount!)}',
              style: TextStyle(
                color: amount! > 0 ? AppColors.accent : AppColors.text,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          if (showChevron)
            const Padding(padding: EdgeInsets.only(left: AppSpacing.sm), child: Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted)),
        ],
      ),
    );

    return onTap != null ? InkWell(onTap: onTap, child: row) : row;
  }
}
```

- [ ] **Step 8: Verify everything compiles**

Run: `flutter analyze lib/utils/icon_map.dart lib/widgets`
Expected: `No issues found!`

- [ ] **Step 9: Commit**

```bash
git add lib/utils/icon_map.dart lib/widgets/phone_frame.dart lib/widgets/app_screen.dart lib/widgets/app_card.dart lib/widgets/icon_chip.dart lib/widgets/category_icon.dart lib/widgets/list_row.dart
git commit -m "feat: add icon map and phone frame/screen/card/list-row widgets"
```

---

### Task 11: Shared widgets part 2 (`AppButton`, `AppProgressBar`, `AppToggle`, `AppSegmentedControl`, `AppAlert`)

**Files:**
- Create: `lib/widgets/app_button.dart`, `lib/widgets/app_progress_bar.dart`, `lib/widgets/app_toggle.dart`, `lib/widgets/app_segmented_control.dart`, `lib/widgets/app_alert.dart`

**Interfaces:**
- Consumes: `AppColors`/`AppSpacing`/`AppRadius` from `lib/theme/app_theme.dart`.
- Produces: `enum AppButtonVariant { primary, secondary }`; `AppButton({required String label, required VoidCallback? onPressed, bool loading, AppButtonVariant variant})` (pass `onPressed: null` for a disabled button); `AppProgressBar({required double progress})`; `AppToggle({required bool value, required ValueChanged<bool> onChanged})`; `class SegmentOption<T> { final String label; final T value; }` and `AppSegmentedControl<T>({required List<SegmentOption<T>> options, required T value, required ValueChanged<T> onChanged})`; `enum AppAlertVariant { normal, warning }` and `AppAlert({AppAlertVariant variant, required String text})` — used throughout every form and the Debt screen (Task 22).

- [ ] **Step 1: Create `AppButton`**

Create `lib/widgets/app_button.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppButtonVariant { primary, secondary }

/// Pass `onPressed: null` to render a disabled button.
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final AppButtonVariant variant;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.variant = AppButtonVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    final isPrimary = variant == AppButtonVariant.primary;
    final disabled = onPressed == null || loading;

    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: disabled ? null : onPressed,
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md2),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isPrimary ? AppColors.accent : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: isPrimary ? null : Border.all(color: AppColors.border),
            ),
            child: loading
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: isPrimary ? AppColors.accentInk : AppColors.text),
                  )
                : Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: isPrimary ? AppColors.accentInk : AppColors.text)),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Create `AppProgressBar`**

Create `lib/widgets/app_progress_bar.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppProgressBar extends StatelessWidget {
  final double progress;
  const AppProgressBar({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    final clamped = progress.isFinite ? progress.clamp(0.0, 1.0) : 0.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          height: 6,
          decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(3)),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: constraints.maxWidth * clamped,
              height: 6,
              decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(3)),
            ),
          ),
        );
      },
    );
  }
}
```

- [ ] **Step 3: Create `AppToggle`**

Create `lib/widgets/app_toggle.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const AppToggle({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 40,
        height: 24,
        decoration: BoxDecoration(color: value ? AppColors.accent : AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.pill)),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 150),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: 20,
            height: 20,
            decoration: const BoxDecoration(color: AppColors.text, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Create `AppSegmentedControl`**

Create `lib/widgets/app_segmented_control.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SegmentOption<T> {
  final String label;
  final T value;
  const SegmentOption({required this.label, required this.value});
}

class AppSegmentedControl<T> extends StatelessWidget {
  final List<SegmentOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  const AppSegmentedControl({super.key, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(
        children: options.map((opt) {
          final active = opt.value == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(opt.value),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm2),
                decoration: BoxDecoration(color: active ? AppColors.accent : Colors.transparent, borderRadius: BorderRadius.circular(AppRadius.pill)),
                alignment: Alignment.center,
                child: Text(opt.label, style: TextStyle(color: active ? AppColors.accentInk : AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
```

- [ ] **Step 5: Create `AppAlert`**

Create `lib/widgets/app_alert.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppAlertVariant { normal, warning }

class AppAlert extends StatelessWidget {
  final AppAlertVariant variant;
  final String text;

  const AppAlert({super.key, this.variant = AppAlertVariant.normal, required this.text});

  @override
  Widget build(BuildContext context) {
    final isWarning = variant == AppAlertVariant.warning;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isWarning ? AppColors.warningBorder : AppColors.border),
      ),
      child: Row(
        children: [
          Icon(isWarning ? Icons.warning_amber_rounded : Icons.check_circle_outline, size: 16, color: isWarning ? AppColors.warning : AppColors.accent),
          const SizedBox(width: AppSpacing.sm2),
          Expanded(child: Text(text, style: const TextStyle(color: AppColors.text, fontSize: 13))),
        ],
      ),
    );
  }
}
```

- [ ] **Step 6: Verify everything compiles**

Run: `flutter analyze lib/widgets/app_button.dart lib/widgets/app_progress_bar.dart lib/widgets/app_toggle.dart lib/widgets/app_segmented_control.dart lib/widgets/app_alert.dart`
Expected: `No issues found!`

- [ ] **Step 7: Commit**

```bash
git add lib/widgets/app_button.dart lib/widgets/app_progress_bar.dart lib/widgets/app_toggle.dart lib/widgets/app_segmented_control.dart lib/widgets/app_alert.dart
git commit -m "feat: add button, progress bar, toggle, segmented control, and alert widgets"
```

---

### Task 12: Shared widgets part 3 (`StatFigure`, `EmptyState`, `LoadingState`, `AppFormField`, `ErrorBanner`)

**Files:**
- Create: `lib/widgets/stat_figure.dart`, `lib/widgets/empty_state.dart`, `lib/widgets/loading_state.dart`, `lib/widgets/app_form_field.dart`, `lib/widgets/error_banner.dart`

**Interfaces:**
- Consumes: `AppColors`/`AppSpacing`/`AppRadius` from `lib/theme/app_theme.dart`; `formatMoney` from `lib/utils/money.dart`; `AppButton` from Task 11; `ErrorBannerStore` from Task 8 (via `provider`).
- Produces: `enum StatTone { neutral, positive }` and `StatFigure({required String label, required double amount, StatTone tone})`; `EmptyState({required Widget icon, required String message, String? ctaLabel, VoidCallback? onPressCta})`; `LoadingState()`; `AppFormField({required String label, required String value, required ValueChanged<String> onChanged, TextInputType keyboardType, String? placeholder, String? error})`; `ErrorBanner()` — used by nearly every screen from Task 13 onward.

- [ ] **Step 1: Create `StatFigure`**

Create `lib/widgets/stat_figure.dart`:
```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/money.dart';

enum StatTone { neutral, positive }

class StatFigure extends StatelessWidget {
  final String label;
  final double amount;
  final StatTone tone;

  const StatFigure({super.key, required this.label, required this.amount, this.tone = StatTone.neutral});

  @override
  Widget build(BuildContext context) {
    final positive = tone == StatTone.positive;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
        const SizedBox(height: AppSpacing.xs),
        Text(
          '${positive && amount > 0 ? '+' : ''}${formatMoney(amount)}',
          style: TextStyle(
            color: positive ? AppColors.accent : AppColors.text,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Create `EmptyState`**

Create `lib/widgets/empty_state.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'app_button.dart';

class EmptyState extends StatelessWidget {
  final Widget icon;
  final String message;
  final String? ctaLabel;
  final VoidCallback? onPressCta;

  const EmptyState({super.key, required this.icon, required this.message, this.ctaLabel, this.onPressCta});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxxl),
      child: Column(
        children: [
          icon,
          const SizedBox(height: AppSpacing.md),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
          if (ctaLabel != null && onPressCta != null) ...[
            const SizedBox(height: AppSpacing.sm),
            SizedBox(width: 160, child: AppButton(label: ctaLabel!, onPressed: onPressCta)),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Create `LoadingState`**

Create `lib/widgets/loading_state.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LoadingState extends StatelessWidget {
  const LoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.bg,
      alignment: Alignment.center,
      child: const CircularProgressIndicator(color: AppColors.accent),
    );
  }
}
```

- [ ] **Step 4: Create `AppFormField`**

`AppFormField` must be a `StatefulWidget` that owns its own `TextEditingController`, syncing it from `widget.value` in `didUpdateWidget` (only when the incoming value actually differs from the controller's current text). A stateless field using `TextFormField(initialValue: ...)` looks correct but silently breaks any screen that clears its text fields after submit (several onboarding screens do this to let the user add another item) — `initialValue` is only honored on first build, so a later `setState` clearing the parent's string would not clear the visible field.

Create `lib/widgets/app_form_field.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppFormField extends StatefulWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final TextInputType keyboardType;
  final String? placeholder;
  final String? error;

  const AppFormField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.keyboardType = TextInputType.text,
    this.placeholder,
    this.error,
  });

  @override
  State<AppFormField> createState() => _AppFormFieldState();
}

class _AppFormFieldState extends State<AppFormField> {
  late final TextEditingController _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(AppFormField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
        const SizedBox(height: AppSpacing.xs),
        TextFormField(
          controller: _controller,
          onChanged: widget.onChanged,
          keyboardType: widget.keyboardType,
          style: const TextStyle(color: AppColors.text, fontSize: 15),
          decoration: InputDecoration(
            hintText: widget.placeholder,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: widget.error != null ? AppColors.warning : AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: const BorderSide(color: AppColors.accent)),
          ),
        ),
        if (widget.error != null)
          Padding(padding: const EdgeInsets.only(top: 4), child: Text(widget.error!, style: const TextStyle(color: AppColors.warning, fontSize: 12))),
      ],
    );
  }
}
```

- [ ] **Step 5: Create `ErrorBanner`**

Create `lib/widgets/error_banner.dart`:
```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../stores/error_banner_store.dart';
import '../theme/app_theme.dart';

/// Overlays a dismissible, auto-hiding banner when ErrorBannerStore has a
/// message. Must be placed inside a Stack (main.dart, Task 13) since it
/// positions itself absolutely.
class ErrorBanner extends StatefulWidget {
  const ErrorBanner({super.key});

  @override
  State<ErrorBanner> createState() => _ErrorBannerState();
}

class _ErrorBannerState extends State<ErrorBanner> {
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ErrorBannerStore>();
    final message = store.message;

    if (message != null) {
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 4), () {
        if (mounted) context.read<ErrorBannerStore>().hide();
      });
    }

    if (message == null) return const SizedBox.shrink();

    return Positioned(
      left: AppSpacing.xl,
      right: AppSpacing.xl,
      bottom: 24,
      child: GestureDetector(
        onTap: () => context.read<ErrorBannerStore>().hide(),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: AppColors.surface, border: Border.all(color: AppColors.warning), borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.text, fontSize: 13)),
        ),
      ),
    );
  }
}
```

- [ ] **Step 6: Verify everything compiles**

Run: `flutter analyze lib/widgets/stat_figure.dart lib/widgets/empty_state.dart lib/widgets/loading_state.dart lib/widgets/app_form_field.dart lib/widgets/error_banner.dart`
Expected: `No issues found!`

- [ ] **Step 7: Commit**

```bash
git add lib/widgets/stat_figure.dart lib/widgets/empty_state.dart lib/widgets/loading_state.dart lib/widgets/app_form_field.dart lib/widgets/error_banner.dart
git commit -m "feat: add stat figure, empty/loading state, form field, and error banner widgets"
```

---

### Task 13: Router + app shell (main.dart, app_router.dart, MainShell, hydration gate)

**Files:**
- Modify: `lib/main.dart` (replace Task 1's placeholder)
- Create: `lib/app_router.dart`, `lib/widgets/main_shell.dart`
- Create stub screens (fully built out by later tasks): `lib/screens/onboarding/welcome_screen.dart`, `lib/screens/home_screen.dart`, `lib/screens/transactions_screen.dart`, `lib/screens/insights_screen.dart`, `lib/screens/goals_list_screen.dart`, `lib/screens/more_screen.dart`

**Interfaces:**
- Consumes: all 7 stores + `ErrorBannerStore` from Task 8; `PhoneFrame`, `AppScreen`, `LoadingState`, `ErrorBanner` from Tasks 10–12.
- Produces: the app now boots, hydrates all stores, and redirects to either `/onboarding/welcome` or the 5-tab shell (`/home`) depending on `hasCompletedOnboarding` — with a working bottom nav bar in place for Tasks 17–24 to fill in. Every later screen-adding task edits `lib/app_router.dart` to register its own route(s) inside this file's `routes:` list.

- [ ] **Step 1: Create stub screens for the onboarding welcome route and the 5 tabs**

Create `lib/screens/onboarding/welcome_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../../widgets/app_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Welcome — built in Task 14'));
  }
}
```

Create `lib/screens/home_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../widgets/app_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Home — built in Task 17'));
  }
}
```

Create `lib/screens/transactions_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../widgets/app_screen.dart';

class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Transactions — built in Task 18'));
  }
}
```

Create `lib/screens/insights_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../widgets/app_screen.dart';

class InsightsScreen extends StatelessWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Insights — built in Task 20'));
  }
}
```

Create `lib/screens/goals_list_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../widgets/app_screen.dart';

class GoalsListScreen extends StatelessWidget {
  const GoalsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('Goals — built in Task 21'));
  }
}
```

Create `lib/screens/more_screen.dart`:
```dart
import 'package:flutter/material.dart';
import '../widgets/app_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScreen(child: Text('More — built in Task 24'));
  }
}
```

- [ ] **Step 2: Create `MainShell` (bottom tab bar)**

Create `lib/widgets/main_shell.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

class MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const MainShell({super.key, required this.navigationShell});

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
            items: const [
              BottomNavigationBarItem(icon: Icon(LucideIcons.home), label: 'HOME'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.list), label: 'TRANSACTIONS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.pieChart), label: 'INSIGHTS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.target), label: 'GOALS'),
              BottomNavigationBarItem(icon: Icon(LucideIcons.menu), label: 'MORE'),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 3: Create `app_router.dart`**

Create `lib/app_router.dart`:
```dart
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';

import 'screens/onboarding/welcome_screen.dart';
import 'screens/home_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/insights_screen.dart';
import 'screens/goals_list_screen.dart';
import 'screens/more_screen.dart';

import 'widgets/loading_state.dart';
import 'widgets/main_shell.dart';

bool _allHydrated(BuildContext context) {
  return context.read<SettingsStore>().hasHydrated &&
      context.read<AccountsStore>().hasHydrated &&
      context.read<CategoriesStore>().hasHydrated &&
      context.read<TransactionsStore>().hasHydrated &&
      context.read<RecurringStore>().hasHydrated &&
      context.read<GoalsStore>().hasHydrated &&
      context.read<DebtsStore>().hasHydrated;
}

GoRouter buildAppRouter({required Listenable refreshListenable}) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      if (!_allHydrated(context)) {
        return state.matchedLocation == '/' ? null : '/';
      }
      final hasCompletedOnboarding = context.read<SettingsStore>().hasCompletedOnboarding;
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');

      if (state.matchedLocation == '/') {
        return hasCompletedOnboarding ? '/home' : '/onboarding/welcome';
      }
      if (!hasCompletedOnboarding && !isOnboardingRoute) {
        return '/onboarding/welcome';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const LoadingState()),

      // ONBOARDING ROUTES — Tasks 14-16 add the remaining 5 GoRoute entries here
      GoRoute(path: '/onboarding/welcome', builder: (context, state) => const WelcomeScreen()),

      // TAB SHELL
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (context, state) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/transactions', builder: (context, state) => const TransactionsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/insights', builder: (context, state) => const InsightsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/goals', builder: (context, state) => const GoalsListScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/more', builder: (context, state) => const MoreScreen())]),
        ],
      ),

      // PUSHED ROUTES — Tasks 19, 21, 22, 23, 24, 25, 26 add their GoRoute entries here
    ],
  );
}
```

- [ ] **Step 4: Replace `main.dart`**

Overwrite `lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';
import 'theme/app_theme.dart';
import 'widgets/phone_frame.dart';
import 'widgets/error_banner.dart';

import 'stores/error_banner_store.dart';
import 'stores/settings_store.dart';
import 'stores/accounts_store.dart';
import 'stores/categories_store.dart';
import 'stores/transactions_store.dart';
import 'stores/recurring_store.dart';
import 'stores/goals_store.dart';
import 'stores/debts_store.dart';

void main() {
  runApp(const AppRoot());
}

class AppRoot extends StatelessWidget {
  const AppRoot({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ErrorBannerStore()),
        ChangeNotifierProvider(create: (context) => SettingsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => AccountsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => CategoriesStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => TransactionsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => RecurringStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => GoalsStore(context.read<ErrorBannerStore>())..hydrate()),
        ChangeNotifierProvider(create: (context) => DebtsStore(context.read<ErrorBannerStore>())..hydrate()),
      ],
      child: const _RouterHost(),
    );
  }
}

class _RouterHost extends StatefulWidget {
  const _RouterHost();

  @override
  State<_RouterHost> createState() => _RouterHostState();
}

class _RouterHostState extends State<_RouterHost> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    final refresh = Listenable.merge([
      context.read<SettingsStore>(),
      context.read<AccountsStore>(),
      context.read<CategoriesStore>(),
      context.read<TransactionsStore>(),
      context.read<RecurringStore>(),
      context.read<GoalsStore>(),
      context.read<DebtsStore>(),
    ]);
    _router = buildAppRouter(refreshListenable: refresh);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'JM Finance Tracker',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: _router,
      builder: (context, child) {
        return PhoneFrame(
          child: Stack(
            children: [
              if (child != null) child,
              const ErrorBanner(),
            ],
          ),
        );
      },
    );
  }
}
```
`refreshListenable` is what makes hydration completion (each store's `hydrate()` calling `notifyListeners()`) trigger `go_router` to re-run its `redirect` callback — without it, the router would only re-evaluate on user-initiated navigation and could get stuck on the loading screen.

- [ ] **Step 5: Verify it compiles and boots**

Run: `flutter analyze lib`
Expected: `No issues found!`

Run: `flutter build web`
Expected: `√ Built build/web` with no errors.

- [ ] **Step 6: Manually verify the redirect flow**

Run: `flutter run -d chrome`, resize the browser to phone width (or open devtools' device toolbar).
Expected: a brief loading spinner, then redirect to `/onboarding/welcome` (fresh install has no `hasCompletedOnboarding`) showing "Welcome — built in Task 14" inside the centered phone-width frame. Stop the run once confirmed (`q` in the terminal, or close the tab).

- [ ] **Step 7: Commit**

```bash
git add lib/main.dart lib/app_router.dart lib/widgets/main_shell.dart lib/screens/onboarding/welcome_screen.dart lib/screens/home_screen.dart lib/screens/transactions_screen.dart lib/screens/insights_screen.dart lib/screens/goals_list_screen.dart lib/screens/more_screen.dart
git commit -m "feat: wire up router, hydration-gated redirect, and 5-tab shell"
```

---

### Task 14: Onboarding — Welcome + Add Account(s)

**Files:**
- Modify: `lib/screens/onboarding/welcome_screen.dart` (replace Task 13's stub), `lib/app_router.dart` (register the new route)
- Create: `lib/screens/onboarding/accounts_screen.dart`

**Interfaces:**
- Consumes: `AppScreen`, `AppButton`, `AppFormField`, `AppCard`, `ListRow` from Tasks 10–12; `AccountsStore` from Task 8 (via `provider`).
- Produces: the first two onboarding steps; navigates to `/onboarding/income` on completion (built in Task 15).

- [ ] **Step 1: Replace the Welcome screen**

Overwrite `lib/screens/onboarding/welcome_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_button.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          const Text('WELCOME TO', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
          const SizedBox(height: AppSpacing.sm),
          const Text('JM Finance Tracker', style: TextStyle(color: AppColors.text, fontSize: 32, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.lg),
          const Text(
            'Track your accounts, transactions, bills, and goals — all in Jamaican dollars, all on your device.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.5),
          ),
          const SizedBox(height: AppSpacing.xxxl),
          AppButton(label: 'Get Started', onPressed: () => context.push('/onboarding/accounts')),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the Add Account(s) screen**

Create `lib/screens/onboarding/accounts_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/list_row.dart';
import '../../stores/accounts_store.dart';

class OnboardingAccountsScreen extends StatefulWidget {
  const OnboardingAccountsScreen({super.key});

  @override
  State<OnboardingAccountsScreen> createState() => _OnboardingAccountsScreenState();
}

class _OnboardingAccountsScreenState extends State<OnboardingAccountsScreen> {
  String _name = '';
  String _balanceText = '';

  void _handleAdd(AccountsStore store) {
    final balance = double.tryParse(_balanceText);
    if (_name.isEmpty || balance == null) return;
    store.addAccount(name: _name, type: 'checking', balance: balance);
    setState(() {
      _name = '';
      _balanceText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final accountsStore = context.watch<AccountsStore>();
    final accounts = accountsStore.accounts;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Add your accounts', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Add at least one account to get started. You can add more or edit later.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (accounts.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < accounts.length; i++)
                    ListRow(
                      icon: const Icon(LucideIcons.wallet, size: 16, color: AppColors.textSecondary),
                      title: accounts[i].name,
                      amount: accounts[i].balance,
                      isLast: i == accounts.length - 1,
                    ),
                ],
              ),
            ),
          AppFormField(label: 'Account name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. NCB Checking'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Balance (J\$)',
            value: _balanceText,
            onChanged: (v) => setState(() => _balanceText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Account',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _balanceText.isNotEmpty) ? () => _handleAdd(accountsStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: accounts.isNotEmpty ? () => context.push('/onboarding/income') : null),
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Register the route in `lib/app_router.dart`**

Add the import near the other onboarding screen imports:
```dart
import 'screens/onboarding/accounts_screen.dart';
```
Then add this line directly below the `// ONBOARDING ROUTES` comment's existing welcome route:
```dart
      GoRoute(path: '/onboarding/accounts', builder: (context, state) => const OnboardingAccountsScreen()),
```

- [ ] **Step 4: Verify in the browser**

Run: `flutter run -d chrome` at phone width. From Welcome, tap "Get Started". Add an account with a name and balance; confirm it appears in the list and "Continue" becomes enabled only once at least one account exists.
Expected: no errors; navigating to `/onboarding/income` shows a blank/404 route, which is expected until Task 15 creates it.

- [ ] **Step 5: Commit**

```bash
git add lib/screens/onboarding/welcome_screen.dart lib/screens/onboarding/accounts_screen.dart lib/app_router.dart
git commit -m "feat: build onboarding Welcome and Add Account(s) screens"
```

---

### Task 15: Onboarding — Set Monthly Income + Recurring Bills (skippable)

**Files:**
- Create: `lib/screens/onboarding/income_screen.dart`, `lib/screens/onboarding/recurring_screen.dart`
- Modify: `lib/app_router.dart` (register both routes)

**Interfaces:**
- Consumes: `SettingsStore`, `RecurringStore`, `AccountsStore`, `CategoriesStore` from Task 8; `AppScreen`/`AppFormField`/`AppButton`/`AppCard`/`ListRow` from Tasks 10–12.
- Produces: navigates `/onboarding/income` → `/onboarding/recurring` → `/onboarding/goals` (built in Task 16).

- [ ] **Step 1: Create the income estimate screen**

Create `lib/screens/onboarding/income_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../stores/settings_store.dart';

class OnboardingIncomeScreen extends StatefulWidget {
  const OnboardingIncomeScreen({super.key});

  @override
  State<OnboardingIncomeScreen> createState() => _OnboardingIncomeScreenState();
}

class _OnboardingIncomeScreenState extends State<OnboardingIncomeScreen> {
  String _incomeText = '';

  void _handleContinue() {
    final income = double.tryParse(_incomeText);
    if (income != null) {
      context.read<SettingsStore>().setMonthlyIncomeEstimate(income);
    }
    context.push('/onboarding/recurring');
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Estimate your monthly income', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('This helps calculate your Safe to Spend figure.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          AppFormField(
            label: 'Monthly income (J\$)',
            value: _incomeText,
            onChanged: (v) => setState(() => _incomeText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            placeholder: '0.00',
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: _incomeText.isNotEmpty ? _handleContinue : null),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the recurring bills screen (skippable)**

Create `lib/screens/onboarding/recurring_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/list_row.dart';
import '../../stores/recurring_store.dart';
import '../../stores/accounts_store.dart';
import '../../stores/categories_store.dart';

class OnboardingRecurringScreen extends StatefulWidget {
  const OnboardingRecurringScreen({super.key});

  @override
  State<OnboardingRecurringScreen> createState() => _OnboardingRecurringScreenState();
}

class _OnboardingRecurringScreenState extends State<OnboardingRecurringScreen> {
  String _name = '';
  String _amountText = '';

  void _handleAdd(RecurringStore store, AccountsStore accountsStore, CategoriesStore categoriesStore) {
    final amount = double.tryParse(_amountText);
    if (_name.isEmpty || amount == null || accountsStore.accounts.isEmpty || categoriesStore.categories.isEmpty) return;
    store.addRule(
      name: _name,
      amount: amount,
      frequency: 'monthly',
      accountId: accountsStore.accounts[0].id,
      categoryId: categoriesStore.categories[0].id,
      nextDueDate: DateTime.now().toIso8601String(),
    );
    setState(() {
      _name = '';
      _amountText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final recurringStore = context.watch<RecurringStore>();
    final accountsStore = context.watch<AccountsStore>();
    final categoriesStore = context.watch<CategoriesStore>();
    final rules = recurringStore.rules;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Recurring bills', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Add any regular bills. You can skip this and add them later.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (rules.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < rules.length; i++)
                    ListRow(icon: const Icon(LucideIcons.repeat, size: 16, color: AppColors.textSecondary), title: rules[i].name, amount: -rules[i].amount, isLast: i == rules.length - 1),
                ],
              ),
            ),
          AppFormField(label: 'Bill name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Rent'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Amount (J\$)',
            value: _amountText,
            onChanged: (v) => setState(() => _amountText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Bill',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _amountText.isNotEmpty) ? () => _handleAdd(recurringStore, accountsStore, categoriesStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: () => context.push('/onboarding/goals')),
        ],
      ),
    );
  }
}
```
Note this screen is "skippable" per spec: unlike the accounts step, "Continue" here is never disabled — a user can proceed with zero recurring rules.

- [ ] **Step 3: Register both routes in `lib/app_router.dart`**

Add the imports near the other onboarding screen imports:
```dart
import 'screens/onboarding/income_screen.dart';
import 'screens/onboarding/recurring_screen.dart';
```
Then add these two lines under `// ONBOARDING ROUTES`, after the accounts route:
```dart
      GoRoute(path: '/onboarding/income', builder: (context, state) => const OnboardingIncomeScreen()),
      GoRoute(path: '/onboarding/recurring', builder: (context, state) => const OnboardingRecurringScreen()),
```

- [ ] **Step 4: Verify in the browser**

Walk through Welcome → Add Account → Income (enter a number, Continue) → Recurring (tap Continue without adding a bill — should proceed).
Expected: no errors; income screen requires a value; recurring screen does not.

- [ ] **Step 5: Commit**

```bash
git add lib/screens/onboarding/income_screen.dart lib/screens/onboarding/recurring_screen.dart lib/app_router.dart
git commit -m "feat: build onboarding income estimate and skippable recurring bills screens"
```

---

### Task 16: Onboarding — Choose Goals + Done

**Files:**
- Create: `lib/screens/onboarding/goals_screen.dart`, `lib/screens/onboarding/done_screen.dart`
- Modify: `lib/app_router.dart` (register both routes)

**Interfaces:**
- Consumes: `GoalsStore` from Task 8; `SettingsStore.setHasCompletedOnboarding` from Task 8; `AppScreen`/`AppFormField`/`AppButton`/`AppCard`/`ListRow` from Tasks 10–12.
- Produces: completes the onboarding stack — `done_screen.dart` sets `hasCompletedOnboarding = true` and navigates to `/home` (`context.go`, replacing history so back doesn't return to onboarding), closing the loop back to `app_router.dart`'s redirect logic (Task 13).

- [ ] **Step 1: Create the goals selection screen**

Create `lib/screens/onboarding/goals_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../../widgets/list_row.dart';
import '../../stores/goals_store.dart';

class OnboardingGoalsScreen extends StatefulWidget {
  const OnboardingGoalsScreen({super.key});

  @override
  State<OnboardingGoalsScreen> createState() => _OnboardingGoalsScreenState();
}

class _OnboardingGoalsScreenState extends State<OnboardingGoalsScreen> {
  String _name = '';
  String _targetText = '';

  void _handleAdd(GoalsStore store) {
    final target = double.tryParse(_targetText);
    if (_name.isEmpty || target == null) return;
    store.addGoal(name: _name, icon: 'target', targetAmount: target);
    setState(() {
      _name = '';
      _targetText = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final goals = goalsStore.goals;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Text('Choose your goals', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Set savings goals to work toward. Optional — you can add these later too.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: AppSpacing.xl),
          if (goals.isNotEmpty)
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                children: [
                  for (var i = 0; i < goals.length; i++)
                    ListRow(icon: const Icon(LucideIcons.target, size: 16, color: AppColors.textSecondary), title: goals[i].name, amount: goals[i].targetAmount, isLast: i == goals.length - 1),
                ],
              ),
            ),
          AppFormField(label: 'Goal name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Emergency Fund'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: 'Target amount (J\$)',
            value: _targetText,
            onChanged: (v) => setState(() => _targetText = v),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Add Goal',
            variant: AppButtonVariant.secondary,
            onPressed: (_name.isNotEmpty && _targetText.isNotEmpty) ? () => _handleAdd(goalsStore) : null,
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Continue', onPressed: () => context.push('/onboarding/done')),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the Done screen**

Create `lib/screens/onboarding/done_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_screen.dart';
import '../../widgets/app_button.dart';
import '../../stores/settings_store.dart';

class OnboardingDoneScreen extends StatelessWidget {
  const OnboardingDoneScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          const Text("You're all set", style: TextStyle(color: AppColors.text, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.sm),
          const Text('Your finance tracker is ready to go.', style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
          const SizedBox(height: AppSpacing.xxxl),
          AppButton(
            label: 'Go to Home',
            onPressed: () {
              context.read<SettingsStore>().setHasCompletedOnboarding(true);
              context.go('/home');
            },
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Register both routes in `lib/app_router.dart`**

Add the imports near the other onboarding screen imports:
```dart
import 'screens/onboarding/goals_screen.dart';
import 'screens/onboarding/done_screen.dart';
```
Then add these two lines under `// ONBOARDING ROUTES`, after the recurring route:
```dart
      GoRoute(path: '/onboarding/goals', builder: (context, state) => const OnboardingGoalsScreen()),
      GoRoute(path: '/onboarding/done', builder: (context, state) => const OnboardingDoneScreen()),
```

- [ ] **Step 4: Verify the full onboarding flow end-to-end in the browser**

Walk through all 6 steps: Welcome → Add Account → Income → Recurring (skip) → Goals (skip) → Done → tap "Go to Home".
Expected: lands on the Home tab stub ("Home — built in Task 17"); reloading the page now skips onboarding entirely and goes straight to the tab stub, proving `hasCompletedOnboarding` persisted to `shared_preferences`/`localStorage`.

- [ ] **Step 5: Commit**

```bash
git add lib/screens/onboarding/goals_screen.dart lib/screens/onboarding/done_screen.dart lib/app_router.dart
git commit -m "feat: build onboarding goals selection and done screens, completing the onboarding flow"
```

---

### Task 17: Home screen

**Files:**
- Modify: `lib/screens/home_screen.dart` (replace Task 13's stub)

**Interfaces:**
- Consumes: `calculateSafeToSpend` (Task 5); `AccountsStore`, `RecurringStore`, `TransactionsStore`, `CategoriesStore` (Task 8, via `provider`); `AppScreen`, `AppCard`, `StatFigure`, `ListRow`, `EmptyState`, `IconChip`, `CategoryIcon` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: the Home tab — Safe-to-Spend hero, income/spending/upcoming stat row, quick actions, recent transactions. Links to `/transaction/new` (Task 19), `/debt` (Task 22), `/cash-flow` (Task 23) — no new routes registered by this task since Home already exists in the tab shell.

- [ ] **Step 1: Replace the Home screen**

Overwrite `lib/screens/home_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
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

    return AppScreen(
      child: Column(
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
                Text(formatMoney(safeToSpend), style: const TextStyle(color: AppColors.text, fontSize: 60, fontWeight: FontWeight.w800)),
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
            margin: const EdgeInsets.only(bottom: AppSpacing.xl),
            child: Row(
              children: [
                Expanded(child: _QuickAction(icon: LucideIcons.plus, label: 'Add Transaction', onTap: () => context.push('/transaction/new'))),
                Expanded(child: _QuickAction(icon: LucideIcons.creditCard, label: 'View Debt', onTap: () => context.push('/debt'))),
                Expanded(child: _QuickAction(icon: LucideIcons.trendingUp, label: 'Cash Flow', onTap: () => context.push('/cash-flow'))),
              ],
            ),
          ),
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
      ),
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

- [ ] **Step 2: Verify in the browser**

Run `flutter run -d chrome` at phone width. Complete onboarding with one account and no transactions.
Expected: Home shows Safe to Spend equal to the account balance, all stat figures at `J$0.00`, and the empty state under "Recent Transactions" with a working "Add Transaction" CTA (navigates to a blank/404 route until Task 19 — expected for now).

- [ ] **Step 3: Commit**

```bash
git add lib/screens/home_screen.dart
git commit -m "feat: build Home screen with Safe to Spend hero and recent transactions"
```

---

### Task 18: Transactions screen (grouped list, search, account filter)

**Files:**
- Modify: `lib/screens/transactions_screen.dart` (replace Task 13's stub)

**Interfaces:**
- Consumes: `TransactionsStore`, `CategoriesStore`, `AccountsStore` (Task 8); `AppScreen`, `AppCard`, `ListRow`, `EmptyState`, `IconChip`, `CategoryIcon`, `AppSegmentedControl` (Tasks 10–12).
- Produces: the Transactions tab. Links to `/transaction/new` and `/transaction/:id` (Task 19).

- [ ] **Step 1: Replace the Transactions screen**

Overwrite `lib/screens/transactions_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';
import '../stores/accounts_store.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String _query = '';
  String _accountFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;
    final accounts = context.watch<AccountsStore>().accounts;

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    final filtered = transactions.where((t) {
      final category = categoryFor(t.categoryId);
      final matchesQuery = _query.isEmpty ||
          t.note.toLowerCase().contains(_query.toLowerCase()) ||
          (category?.name.toLowerCase().contains(_query.toLowerCase()) ?? false);
      final matchesAccount = _accountFilter == 'all' || t.accountId == _accountFilter;
      return matchesQuery && matchesAccount;
    }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final grouped = <String, List<Transaction>>{};
    for (final t in filtered) {
      grouped.putIfAbsent(t.date.substring(0, 10), () => []).add(t);
    }
    final days = grouped.keys.toList();

    return AppScreen(
      scroll: false,
      padded: false,
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xl),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Transactions', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  const Icon(LucideIcons.search, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _query = v),
                      style: const TextStyle(color: AppColors.text),
                      decoration: const InputDecoration(
                        hintText: 'Search transactions',
                        hintStyle: TextStyle(color: AppColors.textMuted),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: AppSegmentedControl<String>(
              options: [
                const SegmentOption(label: 'All Accounts', value: 'all'),
                for (final a in accounts) SegmentOption(label: a.name, value: a.id),
              ],
              value: _accountFilter,
              onChanged: (v) => setState(() => _accountFilter = v),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: days.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                    child: EmptyState(
                      icon: const IconChip(child: Icon(LucideIcons.plus, size: 16, color: AppColors.textMuted)),
                      message: 'No transactions match.',
                      ctaLabel: 'Add Transaction',
                      onPressCta: () => context.push('/transaction/new'),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xxxl),
                    children: [
                      for (final day in days) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: AppSpacing.md, bottom: AppSpacing.xs),
                          child: Text(day, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                        for (final t in grouped[day]!)
                          AppCard(
                            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                            child: ListRow(
                              icon: CategoryIcon(name: categoryFor(t.categoryId)?.icon ?? 'more-horizontal'),
                              title: categoryFor(t.categoryId)?.name ?? 'Uncategorized',
                              caption: t.note,
                              amount: t.amount,
                              isLast: true,
                              onTap: () => context.push('/transaction/${t.id}'),
                            ),
                          ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Verify in the browser**

Expected: empty state shows with zero transactions; search box and account filter render without errors (filter has no visible effect yet since there's nothing to filter).

- [ ] **Step 3: Commit**

```bash
git add lib/screens/transactions_screen.dart
git commit -m "feat: build Transactions screen with search, account filter, and date grouping"
```

---

### Task 19: Add/Edit Transaction screen

**Files:**
- Create: `lib/screens/transaction_edit_screen.dart`
- Modify: `lib/app_router.dart` (register the pushed route)

**Interfaces:**
- Consumes: `TransactionActions` (Task 9); `AccountsStore`, `CategoriesStore`, `TransactionsStore`, `GoalsStore` (Task 8); `AppScreen`, `AppFormField`, `AppButton`, `AppSegmentedControl` (Tasks 10–12).
- Produces: the shared add/edit screen reused by every "Add Transaction" entry point (Home, Transactions, Goal detail's contribution flow in Task 21). `id == 'new'` renders create mode; any other `id` loads and pre-fills that transaction for editing, with a Delete action behind a confirmation dialog.

- [ ] **Step 1: Create the Add/Edit Transaction screen**

Create `lib/screens/transaction_edit_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../stores/goals_store.dart';
import '../logic/transaction_actions.dart';

class TransactionEditScreen extends StatefulWidget {
  final String id;
  const TransactionEditScreen({super.key, required this.id});

  @override
  State<TransactionEditScreen> createState() => _TransactionEditScreenState();
}

class _TransactionEditScreenState extends State<TransactionEditScreen> {
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
      context.pop();
    }

    void handleDelete() {
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
                actions.deleteTransaction(existing!.id);
                Navigator.pop(dialogContext);
                context.pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(isNew ? 'Add Transaction' : 'Edit Transaction', style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
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
          if (!isNew) ...[
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

- [ ] **Step 2: Register the pushed route in `lib/app_router.dart`**

Add the import near the other screen imports:
```dart
import 'screens/transaction_edit_screen.dart';
```
Then add this line under the `// PUSHED ROUTES` comment:
```dart
      GoRoute(path: '/transaction/:id', builder: (context, state) => TransactionEditScreen(id: state.pathParameters['id']!)),
```

- [ ] **Step 3: Verify the full add → edit → delete cycle in the browser**

From Home or Transactions, tap "Add Transaction". Enter an amount, pick an account/category, save. Confirm: the transaction now appears on Home and Transactions. Tap it to edit, change the amount, save, confirm Home's Safe to Spend shifts by the difference. Tap Delete, confirm it disappears from both lists and Safe to Spend returns to its pre-transaction value.
Expected: all three flows work with no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/transaction_edit_screen.dart lib/app_router.dart
git commit -m "feat: build Add/Edit Transaction screen with delete confirmation"
```

---

### Task 20: Insights screen

**Files:**
- Modify: `lib/screens/insights_screen.dart` (replace Task 13's stub)

**Interfaces:**
- Consumes: `categoryTotals`, `incomeVsSpendingTrend`, `topTransactions` (Task 7); `addMonths` (Task 4); `TransactionsStore`, `CategoriesStore` (Task 8); `AppScreen`, `AppCard`, `EmptyState`, `IconChip`, `CategoryIcon` (Tasks 10–12).
- Produces: the Insights tab — category breakdown with % change, weekly income-vs-spending trend, top 5 transactions.

- [ ] **Step 1: Replace the Insights screen**

Overwrite `lib/screens/insights_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/category_icon.dart';
import '../utils/money.dart';
import '../utils/date_utils.dart' as date_utils;
import '../logic/insights.dart';
import '../stores/transactions_store.dart';
import '../stores/categories_store.dart';

class InsightsScreen extends StatelessWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final transactions = context.watch<TransactionsStore>().transactions;
    final categories = context.watch<CategoriesStore>().categories;

    if (transactions.isEmpty) {
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
    }

    final now = DateTime.now();
    final periodStart = date_utils.addMonths(now, -1);
    final previousPeriodStart = date_utils.addMonths(now, -2);

    final totals = categoryTotals(transactions, periodStart, now, previousPeriodStart, periodStart);
    final trend = incomeVsSpendingTrend(transactions, 'week', 6, now);
    final top5 = topTransactions(transactions, periodStart, now, n: 5);

    Category? categoryFor(String id) {
      for (final c in categories) {
        if (c.id == id) return c;
      }
      return null;
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Insights', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          const Text('Category Breakdown', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Column(
              children: [
                for (var i = 0; i < totals.length; i++)
                  _InsightRow(
                    icon: CategoryIcon(name: categoryFor(totals[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(totals[i].categoryId)?.name ?? 'Uncategorized',
                    subtitle: totals[i].percentChange != null
                        ? '${totals[i].percentChange! > 0 ? '+' : ''}${totals[i].percentChange}% vs last period'
                        : null,
                    amount: formatMoney(totals[i].total),
                    isLast: i == totals.length - 1,
                  ),
              ],
            ),
          ),
          const Text('Weekly Trend', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Column(
              children: [
                for (final bucket in trend)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    child: Row(
                      children: [
                        Expanded(child: Text(bucket.label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
                        Text('+${formatMoney(bucket.income)}', style: const TextStyle(color: AppColors.accent, fontSize: 13, fontWeight: FontWeight.w700)),
                        const SizedBox(width: AppSpacing.md),
                        Text('-${formatMoney(bucket.spending)}', style: const TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const Text('Top Transactions', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < top5.length; i++)
                  _InsightRow(
                    icon: CategoryIcon(name: categoryFor(top5[i].categoryId)?.icon ?? 'more-horizontal'),
                    title: categoryFor(top5[i].categoryId)?.name ?? 'Uncategorized',
                    subtitle: null,
                    amount: formatMoney(top5[i].amount),
                    isLast: i == top5.length - 1,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InsightRow extends StatelessWidget {
  final Widget icon;
  final String title;
  final String? subtitle;
  final String amount;
  final bool isLast;

  const _InsightRow({required this.icon, required this.title, this.subtitle, required this.amount, required this.isLast});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: isLast ? null : const Border(bottom: BorderSide(color: AppColors.borderHairline, width: 1))),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm2),
      child: Row(
        children: [
          IconChip(child: icon),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                if (subtitle != null) Text(subtitle!, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Text(amount, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Verify in the browser**

With zero transactions: Insights shows the empty state. After adding 2–3 transactions in different categories (via Task 19's screen): Category Breakdown lists them sorted by total descending, Weekly Trend shows 6 week buckets, Top Transactions lists up to 5 sorted by absolute amount.
Expected: no errors; percent-change text only appears where a previous-period value exists.

- [ ] **Step 3: Commit**

```bash
git add lib/screens/insights_screen.dart
git commit -m "feat: build Insights screen with category breakdown, trend, and top transactions"
```

---

### Task 21: Goals list + Goal detail/create screen

**Files:**
- Modify: `lib/screens/goals_list_screen.dart` (replace Task 13's stub)
- Create: `lib/screens/goal_detail_screen.dart`
- Modify: `lib/app_router.dart` (register the pushed route)

**Interfaces:**
- Consumes: `GoalsStore`, `AccountsStore`, `CategoriesStore`, `TransactionsStore` (Task 8); `TransactionActions` (Task 9); `AppScreen`, `AppCard`, `AppProgressBar`, `EmptyState`, `IconChip`, `AppFormField`, `AppButton` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: the Goals tab (list + progress bars) and a single route `/goal/:id` — `id == 'new'` creates a goal, any other `id` shows progress + an "Add contribution" action that creates a `goal_contribution` transaction via `TransactionActions`.

- [ ] **Step 1: Replace the Goals list screen**

Overwrite `lib/screens/goals_list_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/app_progress_bar.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';

class GoalsListScreen extends StatelessWidget {
  const GoalsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final goals = context.watch<GoalsStore>().goals;

    return AppScreen(
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
            for (final g in goals)
              GestureDetector(
                onTap: () => context.push('/goal/${g.id}'),
                child: AppCard(
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(g.name, style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: AppSpacing.sm),
                      AppProgressBar(progress: g.targetAmount == 0 ? 0 : g.currentAmount / g.targetAmount),
                      const SizedBox(height: AppSpacing.sm),
                      Text('${formatMoney(g.currentAmount)} of ${formatMoney(g.targetAmount)}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the Goal detail/create screen**

Create `lib/screens/goal_detail_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_progress_bar.dart';
import '../utils/money.dart';
import '../stores/goals_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../stores/transactions_store.dart';
import '../logic/transaction_actions.dart';

class GoalDetailScreen extends StatefulWidget {
  final String id;
  const GoalDetailScreen({super.key, required this.id});

  @override
  State<GoalDetailScreen> createState() => _GoalDetailScreenState();
}

class _GoalDetailScreenState extends State<GoalDetailScreen> {
  String _name = '';
  String _targetText = '';
  String _contribution = '';

  @override
  Widget build(BuildContext context) {
    final goalsStore = context.watch<GoalsStore>();
    final isNew = widget.id == 'new';

    if (isNew) {
      return AppScreen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('New Goal', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.lg),
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
            AppButton(
              label: 'Create Goal',
              onPressed: (_name.isNotEmpty && _targetText.isNotEmpty)
                  ? () {
                      final target = double.tryParse(_targetText);
                      if (target == null || target <= 0) return;
                      goalsStore.addGoal(name: _name, icon: 'target', targetAmount: target);
                      context.pop();
                    }
                  : null,
            ),
          ],
        ),
      );
    }

    Goal? goal;
    for (final g in goalsStore.goals) {
      if (g.id == widget.id) {
        goal = g;
        break;
      }
    }

    if (goal == null) {
      return const AppScreen(child: Text('Goal not found', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)));
    }

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
    final resolvedGoal = goal;

    void handleAddContribution() {
      final amount = double.tryParse(_contribution);
      if (amount == null || amount <= 0 || accounts.isEmpty || transferCategory == null) return;
      actions.createTransaction(
        accountId: accounts[0].id,
        categoryId: transferCategory!.id,
        amount: -amount,
        note: 'Contribution to ${resolvedGoal.name}',
        date: DateTime.now().toIso8601String(),
        type: 'goal_contribution',
        goalId: resolvedGoal.id,
      );
      setState(() => _contribution = '');
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(resolvedGoal.name, style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          AppProgressBar(progress: resolvedGoal.targetAmount == 0 ? 0 : resolvedGoal.currentAmount / resolvedGoal.targetAmount),
          const SizedBox(height: AppSpacing.sm),
          Text('${formatMoney(resolvedGoal.currentAmount)} of ${formatMoney(resolvedGoal.targetAmount)}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
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

- [ ] **Step 3: Register the pushed route in `lib/app_router.dart`**

Add the import near the other screen imports:
```dart
import 'screens/goal_detail_screen.dart';
```
Then add this line under `// PUSHED ROUTES` (one route handles both create and detail, same pattern as `/transaction/:id`):
```dart
      GoRoute(path: '/goal/:id', builder: (context, state) => GoalDetailScreen(id: state.pathParameters['id']!)),
```

- [ ] **Step 4: Verify the full create → contribute cycle in the browser**

Tap "+" on Goals, create a goal with a target. Tap into it, add a contribution smaller than the target. Confirm the progress bar and amounts update, and the contribution shows up as a Transfer-category transaction on the Transactions screen.
Expected: no errors; progress bar clamps at 100% if a contribution exceeds the target.

- [ ] **Step 5: Commit**

```bash
git add lib/screens/goals_list_screen.dart lib/screens/goal_detail_screen.dart lib/app_router.dart
git commit -m "feat: build Goals list and Goal detail/create screen with contributions"
```

---

### Task 22: Debt screen + Add/Edit Debt

**Files:**
- Create: `lib/screens/debt_screen.dart`, `lib/screens/debt_edit_screen.dart`
- Modify: `lib/app_router.dart` (register both routes)

**Interfaces:**
- Consumes: `projectDebtPayoff` (Task 6); `DebtsStore` (Task 8); `AppScreen`, `AppCard`, `EmptyState`, `IconChip`, `AppSegmentedControl`, `AppFormField`, `AppButton` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: `/debt` (linked from Home's quick actions and More, Task 24) and a single route `/debts/:id` for add/edit/delete. The spec's Screens table (§6) doesn't list a separate debt-entry screen, so debts are managed the same way as every other entity — via a "+" on the Debt overview — for consistency (spec §5 makes this decision explicit).

- [ ] **Step 1: Create the Debt overview screen**

Create `lib/screens/debt_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../widgets/app_segmented_control.dart';
import '../widgets/app_form_field.dart';
import '../utils/money.dart';
import '../logic/debt_payoff.dart';
import '../stores/debts_store.dart';

class DebtScreen extends StatefulWidget {
  const DebtScreen({super.key});

  @override
  State<DebtScreen> createState() => _DebtScreenState();
}

class _DebtScreenState extends State<DebtScreen> {
  String _strategy = 'snowball';
  String _extraText = '0';

  @override
  Widget build(BuildContext context) {
    final debts = context.watch<DebtsStore>().debts;
    final totalOwed = debts.fold<double>(0, (s, d) => s + d.balance);
    final extra = double.tryParse(_extraText) ?? 0;
    final projection = projectDebtPayoff(debts, extra);
    final result = _strategy == 'snowball' ? projection.snowball : projection.avalanche;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Debt', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
              IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/debts/new')),
            ],
          ),
          if (debts.isEmpty)
            EmptyState(
              icon: const IconChip(child: Icon(LucideIcons.creditCard, size: 16, color: AppColors.textMuted)),
              message: 'No debts tracked.',
              ctaLabel: 'Add Debt',
              onPressCta: () => context.push('/debts/new'),
            )
          else ...[
            AppCard(
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TOTAL OWED', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(formatMoney(totalOwed), style: const TextStyle(color: AppColors.text, fontSize: 32, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            AppCard(
              emphasis: true,
              margin: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Payoff Projection', style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: AppSpacing.md),
                  AppSegmentedControl<String>(
                    options: const [SegmentOption(label: 'Snowball', value: 'snowball'), SegmentOption(label: 'Avalanche', value: 'avalanche')],
                    value: _strategy,
                    onChanged: (v) => setState(() => _strategy = v),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppFormField(
                    label: 'Extra monthly payment (J\$)',
                    value: _extraText,
                    onChanged: (v) => setState(() => _extraText = v),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('MONTHS TO DEBT-FREE', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('${result.months}', style: const TextStyle(color: AppColors.accent, fontSize: 22, fontWeight: FontWeight.w800)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('TOTAL INTEREST', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(formatMoney(result.totalInterest), style: const TextStyle(color: AppColors.accent, fontSize: 22, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
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
                      Text('${formatMoney(d.balance)} · ${d.interestRate}% APR · Min ${formatMoney(d.minPayment)}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the Add/Edit Debt screen**

Create `lib/screens/debt_edit_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../stores/debts_store.dart';

class DebtEditScreen extends StatefulWidget {
  final String id;
  const DebtEditScreen({super.key, required this.id});

  @override
  State<DebtEditScreen> createState() => _DebtEditScreenState();
}

class _DebtEditScreenState extends State<DebtEditScreen> {
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
      context.pop();
    }

    void handleDelete() {
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
                debtsStore.removeDebt(debt!.id);
                Navigator.pop(dialogContext);
                context.pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    final isValid = _name.isNotEmpty && _balanceText.isNotEmpty && _rateText.isNotEmpty && _minPaymentText.isNotEmpty;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(isNew ? 'Add Debt' : 'Edit Debt', style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(label: 'Debt name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. Credit Card'),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Interest rate (APR %)', value: _rateText, onChanged: (v) => setState(() => _rateText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Minimum payment (J\$)', value: _minPaymentText, onChanged: (v) => setState(() => _minPaymentText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: isValid ? handleSave : null),
          if (!isNew) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Register both routes in `lib/app_router.dart`**

Add the imports near the other screen imports:
```dart
import 'screens/debt_screen.dart';
import 'screens/debt_edit_screen.dart';
```
Then add these two lines under `// PUSHED ROUTES`:
```dart
      GoRoute(path: '/debt', builder: (context, state) => const DebtScreen()),
      GoRoute(path: '/debts/:id', builder: (context, state) => DebtEditScreen(id: state.pathParameters['id']!)),
```

- [ ] **Step 4: Verify in the browser**

Add two debts with different balances/interest rates. On the Debt screen, toggle Snowball/Avalanche and adjust the extra payment field; confirm months/interest update live. Edit a debt's balance and confirm the projection recalculates. Delete a debt and confirm it's removed and the total updates.
Expected: no errors; empty state shows with zero debts.

- [ ] **Step 5: Commit**

```bash
git add lib/screens/debt_screen.dart lib/screens/debt_edit_screen.dart lib/app_router.dart
git commit -m "feat: build Debt overview with snowball/avalanche projection and Add/Edit Debt"
```

---

### Task 23: Cash Flow screen

**Files:**
- Create: `lib/screens/cash_flow_screen.dart`
- Modify: `lib/app_router.dart` (register the route)

**Interfaces:**
- Consumes: `AccountsStore`, `RecurringStore` (Task 8); `AppScreen`, `AppCard`, `EmptyState`, `IconChip` (Tasks 10–12); `formatMoney` (Task 4).
- Produces: `/cash-flow`, linked from Home's quick actions — a timeline of upcoming recurring bills plotted against a running projected balance.

- [ ] **Step 1: Create the Cash Flow screen**

Create `lib/screens/cash_flow_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../utils/money.dart';
import '../stores/accounts_store.dart';
import '../stores/recurring_store.dart';

class _TimelineItem {
  final RecurringRule rule;
  final double runningBalance;
  _TimelineItem({required this.rule, required this.runningBalance});
}

class CashFlowScreen extends StatelessWidget {
  const CashFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;
    final rules = context.watch<RecurringStore>().rules;
    final startBalance = accounts.fold<double>(0, (s, a) => s + a.balance);

    final sortedRules = [...rules]..sort((a, b) => a.nextDueDate.compareTo(b.nextDueDate));
    var running = startBalance;
    final timeline = <_TimelineItem>[];
    for (final r in sortedRules) {
      running -= r.amount;
      timeline.add(_TimelineItem(rule: r, runningBalance: running));
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cash Flow', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('CURRENT BALANCE', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                const SizedBox(height: AppSpacing.sm),
                Text(formatMoney(startBalance), style: const TextStyle(color: AppColors.text, fontSize: 28, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          if (timeline.isEmpty)
            const EmptyState(icon: IconChip(child: Icon(LucideIcons.trendingUp, size: 16, color: AppColors.textMuted)), message: 'No upcoming bills to project.')
          else
            for (final item in timeline)
              AppCard(
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.rule.name, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w600)),
                        Text(item.rule.nextDueDate.substring(0, 10), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('-${formatMoney(item.rule.amount)}', style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700)),
                        Text('Bal: ${formatMoney(item.runningBalance)}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Register the route in `lib/app_router.dart`**

Add the import near the other screen imports:
```dart
import 'screens/cash_flow_screen.dart';
```
Then add this line under `// PUSHED ROUTES`:
```dart
      GoRoute(path: '/cash-flow', builder: (context, state) => const CashFlowScreen()),
```

- [ ] **Step 3: Verify in the browser**

With no recurring bills: empty state shows. After adding 2 recurring bills with different `nextDueDate` values (via Task 15's onboarding screen or Task 25's Recurring management screen once built): timeline lists them chronologically with a correctly decrementing running balance.
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/screens/cash_flow_screen.dart lib/app_router.dart
git commit -m "feat: build Cash Flow screen with upcoming bills timeline"
```

---

### Task 24: More screen + Account management

**Files:**
- Modify: `lib/screens/more_screen.dart` (replace Task 13's stub)
- Create: `lib/screens/accounts_management_screen.dart`, `lib/screens/account_edit_screen.dart`
- Modify: `lib/app_router.dart` (register both new routes)

**Interfaces:**
- Consumes: `AccountsStore` (Task 8); `AppScreen`, `AppCard`, `ListRow`, `EmptyState`, `IconChip`, `AppFormField`, `AppButton`, `AppSegmentedControl` (Tasks 10–12); `formatMoney` (Task 4, via `ListRow`).
- Produces: the More tab (settings hub) linking to `/accounts`, `/categories` (Task 25), `/recurring` (Task 25), `/notifications` (Task 26); and full Account CRUD at `/accounts` and `/accounts/:id`.

- [ ] **Step 1: Replace the More screen**

Overwrite `lib/screens/more_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';

class _MoreItem {
  final String label;
  final IconData icon;
  final String route;
  const _MoreItem({required this.label, required this.icon, required this.route});
}

const _items = [
  _MoreItem(label: 'Accounts', icon: LucideIcons.wallet, route: '/accounts'),
  _MoreItem(label: 'Categories', icon: LucideIcons.tag, route: '/categories'),
  _MoreItem(label: 'Recurring Bills', icon: LucideIcons.repeat, route: '/recurring'),
  _MoreItem(label: 'Notifications', icon: LucideIcons.bell, route: '/notifications'),
];

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('More', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < _items.length; i++)
                  ListRow(
                    icon: Icon(_items[i].icon, size: 16, color: AppColors.textSecondary),
                    title: _items[i].label,
                    showChevron: true,
                    isLast: i == _items.length - 1,
                    onTap: () => context.push(_items[i].route),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(LucideIcons.info, size: 14, color: AppColors.textMuted),
              SizedBox(width: AppSpacing.sm),
              Text('JM Finance Tracker v1.0', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create the Accounts list screen**

Create `lib/screens/accounts_management_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_card.dart';
import '../widgets/list_row.dart';
import '../widgets/empty_state.dart';
import '../widgets/icon_chip.dart';
import '../stores/accounts_store.dart';

class AccountsManagementScreen extends StatelessWidget {
  const AccountsManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = context.watch<AccountsStore>().accounts;

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Accounts', style: TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
              IconButton(icon: const Icon(LucideIcons.plus, color: AppColors.accent), onPressed: () => context.push('/accounts/new')),
            ],
          ),
          if (accounts.isEmpty)
            EmptyState(
              icon: const IconChip(child: Icon(LucideIcons.wallet, size: 16, color: AppColors.textMuted)),
              message: 'No accounts yet.',
              ctaLabel: 'Add Account',
              onPressCta: () => context.push('/accounts/new'),
            )
          else
            AppCard(
              child: Column(
                children: [
                  for (var i = 0; i < accounts.length; i++)
                    ListRow(
                      icon: const Icon(LucideIcons.wallet, size: 16, color: AppColors.textSecondary),
                      title: accounts[i].name,
                      caption: accounts[i].type,
                      amount: accounts[i].balance,
                      isLast: i == accounts.length - 1,
                      onTap: () => context.push('/accounts/${accounts[i].id}'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Create the Add/Edit Account screen**

Create `lib/screens/account_edit_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/models.dart';
import '../widgets/app_screen.dart';
import '../widgets/app_form_field.dart';
import '../widgets/app_button.dart';
import '../widgets/app_segmented_control.dart';
import '../stores/accounts_store.dart';

const _accountTypes = [
  SegmentOption(label: 'Checking', value: 'checking'),
  SegmentOption(label: 'Savings', value: 'savings'),
  SegmentOption(label: 'Cash', value: 'cash'),
  SegmentOption(label: 'Credit', value: 'credit'),
];

class AccountEditScreen extends StatefulWidget {
  final String id;
  const AccountEditScreen({super.key, required this.id});

  @override
  State<AccountEditScreen> createState() => _AccountEditScreenState();
}

class _AccountEditScreenState extends State<AccountEditScreen> {
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
      context.pop();
    }

    void handleDelete() {
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Delete account?', style: TextStyle(color: AppColors.text)),
          content: const Text('This cannot be undone.', style: TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            TextButton(
              onPressed: () {
                accountsStore.removeAccount(account!.id);
                Navigator.pop(dialogContext);
                context.pop();
              },
              child: const Text('Delete', style: TextStyle(color: AppColors.warning)),
            ),
          ],
        ),
      );
    }

    return AppScreen(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(isNew ? 'Add Account' : 'Edit Account', style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.lg),
          AppFormField(label: 'Account name', value: _name, onChanged: (v) => setState(() => _name = v), placeholder: 'e.g. NCB Checking'),
          const SizedBox(height: AppSpacing.md),
          AppSegmentedControl<String>(options: _accountTypes, value: _type, onChanged: (v) => setState(() => _type = v)),
          const SizedBox(height: AppSpacing.md),
          AppFormField(label: 'Balance (J\$)', value: _balanceText, onChanged: (v) => setState(() => _balanceText = v), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: AppSpacing.xl),
          AppButton(label: 'Save', onPressed: (_name.isNotEmpty && _balanceText.isNotEmpty) ? handleSave : null),
          if (!isNew) ...[
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Delete', variant: AppButtonVariant.secondary, onPressed: handleDelete),
          ],
        ],
      ),
    );
  }
}
```

- [ ] **Step 4: Register both routes in `lib/app_router.dart`**

Add the imports near the other screen imports:
```dart
import 'screens/accounts_management_screen.dart';
import 'screens/account_edit_screen.dart';
```
Then add these two lines under `// PUSHED ROUTES`:
```dart
      GoRoute(path: '/accounts', builder: (context, state) => const AccountsManagementScreen()),
      GoRoute(path: '/accounts/:id', builder: (context, state) => AccountEditScreen(id: state.pathParameters['id']!)),
```

- [ ] **Step 5: Verify in the browser**

From More, tap Accounts. Add a second account, edit its balance, then delete it — confirm the list updates each time and the confirmation dialog appears before delete.
Expected: no errors; note that changing an account's balance here does **not** retroactively adjust past transactions (it is a direct balance edit, same as onboarding) — this matches the spec's manual-entry model.

- [ ] **Step 6: Commit**

```bash
git add lib/screens/more_screen.dart lib/screens/accounts_management_screen.dart lib/screens/account_edit_screen.dart lib/app_router.dart
git commit -m "feat: build More settings hub and Account management screens"
```
