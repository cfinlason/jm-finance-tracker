import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jm_finance_tracker/logic/account_actions.dart';
import 'package:jm_finance_tracker/stores/accounts_store.dart';
import 'package:jm_finance_tracker/stores/transactions_store.dart';
import 'package:jm_finance_tracker/stores/recurring_store.dart';
import 'package:jm_finance_tracker/stores/error_banner_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ErrorBannerStore errorBanner;
  late AccountsStore accountsStore;
  late TransactionsStore transactionsStore;
  late RecurringStore recurringStore;
  late AccountActions actions;
  late String accountId;
  late String otherAccountId;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    errorBanner = ErrorBannerStore();
    accountsStore = AccountsStore(errorBanner);
    transactionsStore = TransactionsStore(errorBanner);
    recurringStore = RecurringStore(errorBanner);
    actions = AccountActions(
      accountsStore: accountsStore,
      transactionsStore: transactionsStore,
      recurringStore: recurringStore,
    );

    accountId = accountsStore.addAccount(name: 'Checking', type: 'checking', balance: 1000);
    otherAccountId = accountsStore.addAccount(name: 'Savings', type: 'savings', balance: 500);
  });

  group('countDependents', () {
    test('counts transactions and recurring rules referencing the account', () {
      transactionsStore.addTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'expense',
      );
      transactionsStore.addTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -50,
        note: '',
        date: '2026-01-03T00:00:00.000Z',
        type: 'expense',
      );
      transactionsStore.addTransaction(
        accountId: otherAccountId,
        categoryId: 'c1',
        amount: -10,
        note: '',
        date: '2026-01-03T00:00:00.000Z',
        type: 'expense',
      );
      recurringStore.addRule(
        name: 'Rent',
        categoryId: 'c1',
        accountId: accountId,
        amount: -100,
        frequency: 'monthly',
        nextDueDate: '2026-02-01T00:00:00.000Z',
      );

      final result = actions.countDependents(accountId);
      expect(result.transactionCount, 2);
      expect(result.recurringRuleCount, 1);
    });

    test('returns zero counts when nothing references the account', () {
      final result = actions.countDependents(accountId);
      expect(result.transactionCount, 0);
      expect(result.recurringRuleCount, 0);
    });
  });

  group('deleteAccountCascade', () {
    test('deletes the account, its transactions, and its recurring rules, leaving other accounts intact', () {
      final txId = transactionsStore.addTransaction(
        accountId: accountId,
        categoryId: 'c1',
        amount: -100,
        note: '',
        date: '2026-01-02T00:00:00.000Z',
        type: 'expense',
      );
      final otherTxId = transactionsStore.addTransaction(
        accountId: otherAccountId,
        categoryId: 'c1',
        amount: -10,
        note: '',
        date: '2026-01-03T00:00:00.000Z',
        type: 'expense',
      );
      final ruleId = recurringStore.addRule(
        name: 'Rent',
        categoryId: 'c1',
        accountId: accountId,
        amount: -100,
        frequency: 'monthly',
        nextDueDate: '2026-02-01T00:00:00.000Z',
      );

      actions.deleteAccountCascade(accountId);

      expect(accountsStore.accounts.any((a) => a.id == accountId), false);
      expect(accountsStore.accounts.any((a) => a.id == otherAccountId), true);
      expect(transactionsStore.transactions.any((t) => t.id == txId), false);
      expect(transactionsStore.transactions.any((t) => t.id == otherTxId), true);
      expect(recurringStore.rules.any((r) => r.id == ruleId), false);
    });
  });
}
