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
