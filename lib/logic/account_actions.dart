import '../stores/accounts_store.dart';
import '../stores/transactions_store.dart';
import '../stores/recurring_store.dart';

/// Orchestrates cascade-deleting an account together with everything that
/// references it (transactions and recurring rules), since an orphaned
/// transaction/rule pointing at a deleted account can never have its
/// balance effect correctly reversed (see TransactionActions._applyToAccount,
/// which silently no-ops when the account is missing).
class AccountActions {
  final AccountsStore accountsStore;
  final TransactionsStore transactionsStore;
  final RecurringStore recurringStore;

  AccountActions({
    required this.accountsStore,
    required this.transactionsStore,
    required this.recurringStore,
  });

  /// Returns the number of transactions and recurring rules that reference
  /// [accountId], so callers can show an accurate confirmation message
  /// before deleting.
  ({int transactionCount, int recurringRuleCount}) countDependents(String accountId) {
    final transactionCount = transactionsStore.transactions.where((t) => t.accountId == accountId).length;
    final recurringRuleCount = recurringStore.rules.where((r) => r.accountId == accountId).length;
    return (transactionCount: transactionCount, recurringRuleCount: recurringRuleCount);
  }

  /// Deletes the account with [accountId] along with every transaction and
  /// recurring rule that references it.
  ///
  /// Dependent transactions are removed directly via
  /// TransactionsStore.removeTransaction rather than through
  /// TransactionActions.deleteTransaction: since the account is being
  /// deleted anyway, reversing each transaction's balance effect onto it
  /// would be pointless work applied to a record that's about to disappear.
  void deleteAccountCascade(String accountId) {
    final transactionIds = transactionsStore.transactions.where((t) => t.accountId == accountId).map((t) => t.id).toList();
    for (final id in transactionIds) {
      transactionsStore.removeTransaction(id);
    }

    final ruleIds = recurringStore.rules.where((r) => r.accountId == accountId).map((r) => r.id).toList();
    for (final id in ruleIds) {
      recurringStore.removeRule(id);
    }

    accountsStore.removeAccount(accountId);
  }
}
