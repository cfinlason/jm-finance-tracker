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
