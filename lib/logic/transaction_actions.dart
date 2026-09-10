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
