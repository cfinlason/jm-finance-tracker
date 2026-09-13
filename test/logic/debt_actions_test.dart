import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jm_finance_tracker/logic/debt_actions.dart';
import 'package:jm_finance_tracker/stores/debts_store.dart';
import 'package:jm_finance_tracker/stores/recurring_store.dart';
import 'package:jm_finance_tracker/stores/accounts_store.dart';
import 'package:jm_finance_tracker/stores/categories_store.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ErrorBannerStore errorBanner;
  late DebtsStore debtsStore;
  late RecurringStore recurringStore;
  late AccountsStore accountsStore;
  late CategoriesStore categoriesStore;
  late DebtActions actions;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    errorBanner = ErrorBannerStore();
    debtsStore = DebtsStore(errorBanner);
    recurringStore = RecurringStore(errorBanner);
    accountsStore = AccountsStore(errorBanner);
    categoriesStore = CategoriesStore(errorBanner);
    actions = DebtActions(
      debtsStore: debtsStore,
      recurringStore: recurringStore,
      accountsStore: accountsStore,
      categoriesStore: categoriesStore,
    );

    accountsStore.addAccount(name: 'Checking', type: 'checking', balance: 1000);
    categoriesStore.addCategory('Bills & Utilities', 'zap', false);
  });

  group('createDebtWithRecurring', () {
    test('creates a debt and a linked recurring bill for its minimum payment', () {
      final debtId = actions.createDebtWithRecurring(name: 'Credit Card', balance: 5000, interestRate: 20, minPayment: 200, dueDayOfMonth: 15);

      final debt = debtsStore.debts.firstWhere((d) => d.id == debtId);
      expect(debt.recurringRuleId, isNotNull);

      final rule = recurringStore.rules.firstWhere((r) => r.id == debt.recurringRuleId);
      expect(rule.name, 'Credit Card');
      expect(rule.amount, 200);
      expect(rule.frequency, 'monthly');
    });

    test('leaves the debt unlinked when there are no accounts/categories yet to attach a rule to', () {
      final emptyAccounts = AccountsStore(errorBanner);
      final emptyCategories = CategoriesStore(errorBanner);
      final actionsNoData = DebtActions(
        debtsStore: debtsStore,
        recurringStore: recurringStore,
        accountsStore: emptyAccounts,
        categoriesStore: emptyCategories,
      );

      final debtId = actionsNoData.createDebtWithRecurring(name: 'Credit Card', balance: 5000, interestRate: 20, minPayment: 200, dueDayOfMonth: 15);

      final debt = debtsStore.debts.firstWhere((d) => d.id == debtId);
      expect(debt.recurringRuleId, isNull);
      expect(recurringStore.rules, isEmpty);
    });
  });

  group('updateDebtWithRecurring', () {
    test('updates the debt and its already-linked recurring bill in place', () {
      final debtId = actions.createDebtWithRecurring(name: 'Credit Card', balance: 5000, interestRate: 20, minPayment: 200, dueDayOfMonth: 15);
      final ruleId = debtsStore.debts.firstWhere((d) => d.id == debtId).recurringRuleId;

      actions.updateDebtWithRecurring(
        debtId,
        name: 'Credit Card',
        balance: 4800,
        interestRate: 20,
        minPayment: 250,
        dueDayOfMonth: 20,
        existingRecurringRuleId: ruleId,
      );

      final debt = debtsStore.debts.firstWhere((d) => d.id == debtId);
      expect(debt.balance, 4800);
      expect(debt.recurringRuleId, ruleId);

      final rule = recurringStore.rules.firstWhere((r) => r.id == ruleId);
      expect(rule.amount, 250);
    });

    test('creates a recurring bill for a pre-existing debt that never had one', () {
      final debtId = debtsStore.addDebt(name: 'Old Loan', balance: 1000, interestRate: 5, minPayment: 50, dueDayOfMonth: 1);
      expect(debtsStore.debts.firstWhere((d) => d.id == debtId).recurringRuleId, isNull);

      actions.updateDebtWithRecurring(
        debtId,
        name: 'Old Loan',
        balance: 1000,
        interestRate: 5,
        minPayment: 50,
        dueDayOfMonth: 10,
        existingRecurringRuleId: null,
      );

      final debt = debtsStore.debts.firstWhere((d) => d.id == debtId);
      expect(debt.recurringRuleId, isNotNull);
      expect(recurringStore.rules.any((r) => r.id == debt.recurringRuleId), true);
    });
  });

  group('deleteDebtCascade', () {
    test('removes the debt and its linked recurring bill', () {
      final debtId = actions.createDebtWithRecurring(name: 'Credit Card', balance: 5000, interestRate: 20, minPayment: 200, dueDayOfMonth: 15);
      final ruleId = debtsStore.debts.firstWhere((d) => d.id == debtId).recurringRuleId;

      actions.deleteDebtCascade(debtId, recurringRuleId: ruleId);

      expect(debtsStore.debts.any((d) => d.id == debtId), false);
      expect(recurringStore.rules.any((r) => r.id == ruleId), false);
    });

    test('removes a debt with no linked bill without touching other rules', () {
      final debtId = debtsStore.addDebt(name: 'Old Loan', balance: 1000, interestRate: 5, minPayment: 50, dueDayOfMonth: 1);
      final unrelatedRuleId = recurringStore.addRule(
        name: 'Rent',
        categoryId: 'c1',
        accountId: 'a1',
        amount: 500,
        frequency: 'monthly',
        nextDueDate: '2026-02-01T00:00:00.000Z',
      );

      actions.deleteDebtCascade(debtId, recurringRuleId: null);

      expect(debtsStore.debts.any((d) => d.id == debtId), false);
      expect(recurringStore.rules.any((r) => r.id == unrelatedRuleId), true);
    });
  });
}
