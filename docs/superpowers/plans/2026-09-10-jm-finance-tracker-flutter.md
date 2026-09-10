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
