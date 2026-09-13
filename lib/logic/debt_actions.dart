import '../stores/debts_store.dart';
import '../stores/recurring_store.dart';
import '../stores/accounts_store.dart';
import '../stores/categories_store.dart';
import '../utils/date_utils.dart' as date_utils;

/// Orchestrates keeping a Debt's minimum payment in sync with a linked
/// RecurringRule, so the user only enters the due date once instead of
/// separately on the debt and on a recurring bill.
///
/// This lives outside DebtsStore/RecurringStore themselves (same pattern as
/// AccountActions) since it needs both stores plus AccountsStore/
/// CategoriesStore to pick a placeholder account/category for a new rule —
/// stores shouldn't depend on each other directly.
class DebtActions {
  final DebtsStore debtsStore;
  final RecurringStore recurringStore;
  final AccountsStore accountsStore;
  final CategoriesStore categoriesStore;

  DebtActions({
    required this.debtsStore,
    required this.recurringStore,
    required this.accountsStore,
    required this.categoriesStore,
  });

  /// Creates a new debt and a linked recurring bill for its minimum payment.
  String createDebtWithRecurring({
    required String name,
    required double balance,
    required double interestRate,
    required double minPayment,
    required int dueDayOfMonth,
  }) {
    final debtId = debtsStore.addDebt(name: name, balance: balance, interestRate: interestRate, minPayment: minPayment, dueDayOfMonth: dueDayOfMonth);
    final ruleId = _upsertRecurringRule(existingRuleId: null, name: name, amount: minPayment, dueDayOfMonth: dueDayOfMonth);
    if (ruleId != null) {
      debtsStore.updateDebt(debtId, recurringRuleId: ruleId);
    }
    return debtId;
  }

  /// Updates an existing debt's fields and keeps its linked recurring bill
  /// in sync — creating one if this debt predates the linkage feature and
  /// doesn't have one yet.
  void updateDebtWithRecurring(
    String debtId, {
    required String name,
    required double balance,
    required double interestRate,
    required double minPayment,
    required int dueDayOfMonth,
    required String? existingRecurringRuleId,
  }) {
    debtsStore.updateDebt(
      debtId,
      name: name,
      balance: balance,
      interestRate: interestRate,
      minPayment: minPayment,
      dueDayOfMonth: dueDayOfMonth,
    );
    final ruleId = _upsertRecurringRule(existingRuleId: existingRecurringRuleId, name: name, amount: minPayment, dueDayOfMonth: dueDayOfMonth);
    if (ruleId != null && ruleId != existingRecurringRuleId) {
      debtsStore.updateDebt(debtId, recurringRuleId: ruleId);
    }
  }

  /// Deletes a debt along with its linked recurring bill, if it has one.
  void deleteDebtCascade(String debtId, {String? recurringRuleId}) {
    if (recurringRuleId != null) {
      recurringStore.removeRule(recurringRuleId);
    }
    debtsStore.removeDebt(debtId);
  }

  /// Updates [existingRuleId] in place if it still exists, otherwise creates
  /// a new rule. Returns null (leaving any existing link untouched) only
  /// when there's no account/category yet to attach a brand-new rule to.
  String? _upsertRecurringRule({
    required String? existingRuleId,
    required String name,
    required double amount,
    required int dueDayOfMonth,
  }) {
    final nextDueDate = date_utils.nextDateForDayOfMonth(DateTime.now(), dueDayOfMonth).toIso8601String();

    if (existingRuleId != null && recurringStore.rules.any((r) => r.id == existingRuleId)) {
      recurringStore.updateRule(existingRuleId, name: name, amount: amount, nextDueDate: nextDueDate);
      return existingRuleId;
    }

    if (accountsStore.accounts.isEmpty || categoriesStore.categories.isEmpty) {
      return null;
    }

    return recurringStore.addRule(
      name: name,
      categoryId: categoriesStore.categories[0].id,
      accountId: accountsStore.accounts[0].id,
      amount: amount,
      frequency: 'monthly',
      nextDueDate: nextDueDate,
    );
  }
}
